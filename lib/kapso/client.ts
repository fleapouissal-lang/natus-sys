import type { KapsoConfig } from "@/lib/kapso/config";

const KAPSO_WHATSAPP_API = "https://api.kapso.ai/meta/whatsapp/v24.0";

export type KapsoSendResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

function parseKapsoError(status: number, detail: string): string {
  let message = detail || `Kapso HTTP ${status}`;
  try {
    const parsed = JSON.parse(detail) as {
      error?: string | { message?: string; error_user_msg?: string };
    };
    if (typeof parsed.error === "string") {
      try {
        const inner = JSON.parse(parsed.error) as { error?: string };
        message = inner.error || parsed.error;
      } catch {
        message = parsed.error;
      }
    } else {
      message =
        parsed.error?.error_user_msg ||
        parsed.error?.message ||
        message;
    }
  } catch {
    /* raw text */
  }
  return message;
}

async function postKapsoMessage(
  config: KapsoConfig,
  to: string,
  payload: Record<string, unknown>
): Promise<KapsoSendResult> {
  const url = `${KAPSO_WHATSAPP_API}/${config.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        ...payload,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const message = parseKapsoError(response.status, detail);
      console.error("[Kapso] send failed:", response.status, message, { to });
      return { ok: false, error: message, status: response.status };
    }

    console.info("[Kapso] message envoyé à", to);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau Kapso";
    console.error("[Kapso] network error:", message);
    return { ok: false, error: message };
  }
}

export async function sendKapsoTextMessage(
  config: KapsoConfig,
  to: string,
  body: string
): Promise<KapsoSendResult> {
  return postKapsoMessage(config, to, {
    type: "text",
    text: { body },
  });
}

export async function sendKapsoTemplateMessage(
  config: KapsoConfig,
  to: string,
  templateName: string,
  languageCode: string,
  bodyParameters: string[]
): Promise<KapsoSendResult> {
  return postKapsoMessage(config, to, {
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: bodyParameters.map((text) => ({ type: "text", text })),
        },
      ],
    },
  });
}

