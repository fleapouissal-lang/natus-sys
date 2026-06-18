/** « imta atwslni », « fin wslat », etc. */
export function isDarijaOrderStatusQuestion(text: string): boolean {
  const t = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const patterns = [
    /\b(imta|qach|wa9tach)\b.*\b(atwsl|twsl|twasl|wsel|wsal|noussel)\b/i,
    /\bfin\b.*\b(wslat|wsalat|wselat|wsel|salat|sali)\b/i,
    /\b(wslat|wsalat|wselat)\b.*\bcommande\b/i,
    /\bcommande\b.*\b(dyali|dyal|dyalii|dyli|dial|diali)\b/i,
    /\bfin\b.*\bcommande\b/i,
    /\bwach\b.*\b(wslat|wsalat|wsel)\b/i,
    /\bchno\b.*\b(lhal|hal)\b/i,
    /\bfin\b.*\b(tlaba|tlabat|tlbna)\b/i,
    /\bkatl3\b|\btlaba\b.*\bcommande\b/i,
    /\bou en est\b|\boù en est\b/i,
    /وين\s+وصلت|فين\s+وصلت|واش\s+وصلت|كوموند\s+ديالي|الطلب\s+ديالي|فين\s+الكوموند/i,
  ];
  return patterns.some((p) => p.test(t));
}

export function isDarijaProblem(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\b(mazal|mazalch|mawsalch|mawsal)\b/i.test(t) ||
    /\b(makayench|makaynch|makaynach)\b/i.test(t) ||
    /\b(mochkil|mochkila|problem)\b/i.test(t) ||
    /ماوصل|مشكل|ماكاين|تأخر|ماوصلتش/i.test(t)
  );
}
