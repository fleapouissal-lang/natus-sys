/**
 * Convertit KeyboardEvent.code en caractère US (layout lecteur code-barres).
 * Ignore le layout OS (AZERTY, etc.) qui corrompt e.key lors d'un scan USB.
 */
const DIGIT_CODES: Record<string, string> = {
  Digit0: "0",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Numpad0: "0",
  Numpad1: "1",
  Numpad2: "2",
  Numpad3: "3",
  Numpad4: "4",
  Numpad5: "5",
  Numpad6: "6",
  Numpad7: "7",
  Numpad8: "8",
  Numpad9: "9",
};

const SHIFT_DIGIT_CODES: Record<string, string> = {
  Digit0: ")",
  Digit1: "!",
  Digit2: "@",
  Digit3: "#",
  Digit4: "$",
  Digit5: "%",
  Digit6: "^",
  Digit7: "&",
  Digit8: "*",
  Digit9: "(",
};

const PLAIN_CODES: Record<string, string> = {
  Minus: "-",
  NumpadSubtract: "-",
  Equal: "=",
  NumpadAdd: "+",
  Period: ".",
  NumpadDecimal: ".",
  Comma: ",",
  Slash: "/",
  NumpadDivide: "/",
  NumpadMultiply: "*",
  Space: " ",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
};

const SHIFT_PLAIN_CODES: Record<string, string> = {
  Minus: "_",
  Equal: "+",
  BracketLeft: "{",
  BracketRight: "}",
  Backslash: "|",
  Semicolon: ":",
  Quote: '"',
  Backquote: "~",
};

export function charFromScannerKeyCode(
  e: Pick<KeyboardEvent, "code" | "shiftKey">
): string | null {
  if (e.code in DIGIT_CODES) {
    const table = e.shiftKey ? SHIFT_DIGIT_CODES : DIGIT_CODES;
    return table[e.code] ?? DIGIT_CODES[e.code] ?? null;
  }

  const letterMatch = /^Key([A-Z])$/.exec(e.code);
  if (letterMatch) {
    const letter = letterMatch[1].toLowerCase();
    return e.shiftKey ? letter.toUpperCase() : letter;
  }

  const table = e.shiftKey ? SHIFT_PLAIN_CODES : PLAIN_CODES;
  return table[e.code] ?? null;
}

/** Scan USB : frappes rapides (< gapMs). Saisie manuelle : plus lent. */
export function isScannerKeyBurst(lastKeyTime: number, gapMs = 50): boolean {
  return Date.now() - lastKeyTime < gapMs;
}
