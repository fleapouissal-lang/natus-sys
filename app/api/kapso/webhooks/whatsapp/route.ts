import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  handleShopifyOrderConfirmButton,
  parseShopifyConfirmButtonId,
} from "@/lib/kapso/shopify-order-whatsapp";

type KapsoIncomingMessage = {
  type?: string;
  interactive?: {
    type?: string;
    button_reply?: { id?: string };
  };
};

type KapsoWebhookBatchItem = {
  message?: KapsoIncomingMessage;
};

type KapsoWebhookData = {
  message?: KapsoIncomingMessage;
  messages?: KapsoIncomingMessage[];
};

type KapsoWebhookPayload = {
  event?: string;
  type?: string;
  batch?: boolean;
  data?: KapsoWebhookData | KapsoWebhookBatchItem[];
  entry?: {
    changes?: {
      value?: {
        messages?: KapsoIncomingMessage[];
      };
    }[];
  }[];
  message?: KapsoIncomingMessage;
  messages?: KapsoIncomingMessage[];
};

function verifyKapsoSignature(
  rawBody: string,
  payload: KapsoWebhookPayload,
  signature: string,
  secret: string
): boolean {
  const candidates = [rawBody, JSON.stringify(payload)];

  for (const material of candidates) {
    try {
      const expected = createHmac("sha256", secret)
        .update(material)
        .digest("hex");
      const sigBuffer = Buffer.from(signature, "utf8");
      const expectedBuffer = Buffer.from(expected, "utf8");
      if (sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer)) {
        return true;
      }
    } catch {
      /* try next */
    }
  }

  return false;
}

function extractButtonIds(payload: KapsoWebhookPayload): string[] {
  const ids: string[] = [];

  const collect = (message: KapsoIncomingMessage | undefined) => {
    const id = message?.interactive?.button_reply?.id;
    if (id) ids.push(id);
  };

  if (Array.isArray(payload.data)) {
    for (const item of payload.data) collect(item.message);
  } else if (payload.data) {
    collect(payload.data.message);
    for (const message of payload.data.messages || []) collect(message);
  }

  collect(payload.message);
  for (const message of payload.messages || []) collect(message);

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      for (const message of change.value?.messages || []) collect(message);
    }
  }

  return ids;
}

export async function POST(request: NextRequest) {
  const secret = process.env.KAPSO_WEBHOOK_SECRET?.trim();

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  let payload: KapsoWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as KapsoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (secret) {
    const signature = request.headers.get("x-webhook-signature");
    if (signature && !verifyKapsoSignature(rawBody, payload, signature, secret)) {
      console.error("[Kapso webhook] signature invalide");
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }
  }

  const buttonIds = extractButtonIds(payload);
  if (buttonIds.length > 0) {
    console.info("[Kapso webhook] boutons reçus:", buttonIds);
  }

  for (const buttonId of buttonIds) {
    const token = parseShopifyConfirmButtonId(buttonId);
    if (token) {
      try {
        await handleShopifyOrderConfirmButton(token);
        revalidatePath("/manager/orders");
        revalidatePath("/director/orders");
        revalidatePath("/cashier/orders");
      } catch (error) {
        console.error("[Kapso webhook] confirm:", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
