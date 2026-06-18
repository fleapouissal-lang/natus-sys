import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  handleInboundWhatsAppMessage,
  type InboundKapsoMessage,
} from "@/lib/kapso/whatsapp-bot/handler";

type KapsoIncomingMessage = {
  type?: string;
  from?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string };
  };
};

type KapsoWebhookBatchItem = {
  message?: KapsoIncomingMessage;
  conversation?: { phone_number?: string };
};

type KapsoWebhookData = {
  message?: KapsoIncomingMessage;
  messages?: KapsoIncomingMessage[];
  conversation?: { phone_number?: string };
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
  conversation?: { phone_number?: string };
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

function resolveFrom(
  message: KapsoIncomingMessage | undefined,
  conversation?: { phone_number?: string }
): string | null {
  if (message?.from) return message.from;
  if (conversation?.phone_number) return conversation.phone_number;
  return null;
}

function messageToInbound(
  message: KapsoIncomingMessage | undefined,
  conversation?: { phone_number?: string }
): InboundKapsoMessage | null {
  if (!message) return null;

  const from = resolveFrom(message, conversation);
  if (!from) return null;

  const buttonId = message.interactive?.button_reply?.id;
  const text = message.text?.body;

  if (!buttonId && !text?.trim()) return null;

  return {
    from,
    text: text?.trim(),
    buttonId,
  };
}

function extractInboundMessages(payload: KapsoWebhookPayload): InboundKapsoMessage[] {
  const items: InboundKapsoMessage[] = [];

  const push = (
    message: KapsoIncomingMessage | undefined,
    conversation?: { phone_number?: string }
  ) => {
    const inbound = messageToInbound(message, conversation);
    if (inbound) items.push(inbound);
  };

  if (Array.isArray(payload.data)) {
    for (const item of payload.data) {
      push(item.message, item.conversation);
    }
  } else if (payload.data) {
    push(payload.data.message, payload.data.conversation);
    for (const message of payload.data.messages || []) {
      push(message, payload.data.conversation);
    }
  }

  push(payload.message, payload.conversation);
  for (const message of payload.messages || []) {
    push(message, payload.conversation);
  }

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      for (const message of change.value?.messages || []) {
        push(message);
      }
    }
  }

  return items;
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

  const inbound = extractInboundMessages(payload);

  for (const msg of inbound) {
    try {
      await handleInboundWhatsAppMessage(msg);
      if (msg.buttonId?.startsWith("natus_confirm:")) {
        revalidatePath("/manager/orders");
        revalidatePath("/director/orders");
        revalidatePath("/cashier/orders");
      }
    } catch (error) {
      console.error("[Kapso webhook] inbound:", error);
    }
  }

  return NextResponse.json({ ok: true, processed: inbound.length });
}
