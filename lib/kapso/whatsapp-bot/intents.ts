const STATUS_PATTERNS = [
  /\bétat\b/i,
  /\bstatut\b/i,
  /\bcommande\b/i,
  /\bsuivi\b/i,
  /\blivraison\b/i,
  /\boù\s+en\s+est/i,
  /\bwhere\s+is\s+my\s+order/i,
  /\bstatus\b/i,
];

const PROBLEM_PATTERNS = [
  /\bprobl[eè]me\b/i,
  /\br[eé]clamation\b/i,
  /\berreur\b/i,
  /\bpas\s+re[cç]u\b/i,
  /\bretard\b/i,
  /\bplainte\b/i,
];

const GREETING_PATTERNS = [
  /^bonjour\b/i,
  /^salut\b/i,
  /^hello\b/i,
  /^bonsoir\b/i,
  /^coucou\b/i,
];

export type DetectedIntent =
  | "status"
  | "problem"
  | "yes"
  | "no"
  | "greeting"
  | "unknown";

export function detectIntent(text: string): DetectedIntent {
  const t = text.trim().toLowerCase();
  if (!t) return "unknown";

  if (/^(oui|yes|ok|d'accord|dac|👍)$/.test(t)) return "yes";
  if (/^(non|no|nop|pas\s+maintenant)$/.test(t)) return "no";

  if (PROBLEM_PATTERNS.some((p) => p.test(t))) return "problem";
  if (STATUS_PATTERNS.some((p) => p.test(t))) return "status";
  if (GREETING_PATTERNS.some((p) => p.test(t))) return "greeting";

  return "unknown";
}
