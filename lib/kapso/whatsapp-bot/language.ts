import type { ChatTurn } from "@/lib/kapso/whatsapp-bot/gemini";

const DARIJA_MARKERS =
  /\b(dyali|dyal|dyli|wslat|wsalat|wach|chno|fin|imta|ghadi|daba|mzyan|salam|bghit|wslatni|atwslni|tlaba|mochkil|wakha|bzaaf|khouya|khti|m3ak|3lach|wakha|bghiti)\b|وين|واش|فين|متى|غادي|دابا|كوموند|ديالي/i;

export type BotLanguage = "darija" | "fr";

export function detectConversationLanguage(
  message: string,
  history: ChatTurn[] = []
): BotLanguage {
  const sample = [
    message,
    ...history.filter((t) => t.role === "user").slice(-3).map((t) => t.text),
  ].join(" ");

  return DARIJA_MARKERS.test(sample) ? "darija" : "fr";
}

export function clientFirstName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return "";
  const first = trimmed.split(/\s+/)[0];
  if (/^client(\s|$)/i.test(first)) return trimmed.split(/\s+/)[1] || first;
  return first;
}
