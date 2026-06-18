export type KapsoConfig = {
  apiKey: string;
  phoneNumberId: string;
};

export type KapsoTemplateConfig = {
  name: string;
  language: string;
};

export function getKapsoConfig(): KapsoConfig | null {
  if (process.env.KAPSO_WHATSAPP_ENABLED === "false") return null;

  const apiKey = process.env.KAPSO_API_KEY?.trim();
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID?.trim();
  if (!apiKey || !phoneNumberId) return null;

  return { apiKey, phoneNumberId };
}

export function getKapsoTemplateConfig(): KapsoTemplateConfig | null {
  const name = process.env.KAPSO_TEMPLATE_NAME?.trim();
  if (!name) return null;
  return {
    name,
    language: process.env.KAPSO_TEMPLATE_LANGUAGE?.trim() || "fr",
  };
}

/** true = envoi vers KAPSO_SANDBOX_OVERRIDE_TO (tests uniquement) */
export function isKapsoSandboxMode(): boolean {
  return Boolean(process.env.KAPSO_SANDBOX_OVERRIDE_TO?.trim());
}

/** Bot suivi commande + réponses clients (webhook entrant). */
export function isKapsoBotEnabled(): boolean {
  if (process.env.KAPSO_BOT_ENABLED === "false") return false;
  return Boolean(getKapsoConfig());
}
