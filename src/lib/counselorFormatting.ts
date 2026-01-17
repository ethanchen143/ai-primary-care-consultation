const DEFAULT_CLOSING_LINE = "How does this sound to you?";

function stripLeadingListMarker(text: string): string {
  return text
    .replace(/^\s*\d+\s*[.)]\s*/i, "")
    .replace(/^\s*[-•*]\s*/i, "");
}

function removeClosingLine(text: string): { text: string; hadClosing: boolean } {
  const closingRegex = /how does this sound to you\??/i;
  if (!closingRegex.test(text)) {
    return { text, hadClosing: false };
  }

  const withoutClosing = text
    .replace(closingRegex, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+[.,;:]$/, "")
    .trim();

  return { text: withoutClosing, hadClosing: true };
}

export function normalizeTreatmentPlan(
  planItems: string[],
  enforceClosingLine = false
): { items: string[]; closingLine?: string } {
  const cleaned: string[] = [];
  let closingLine: string | undefined;

  for (const rawItem of planItems) {
    let text = stripLeadingListMarker(String(rawItem ?? "")).trim();
    if (!text) continue;

    const { text: withoutClosing, hadClosing } = removeClosingLine(text);
    if (hadClosing && !closingLine) {
      closingLine = DEFAULT_CLOSING_LINE;
    }

    text = withoutClosing.trim();
    if (text) cleaned.push(text);
  }

  if (!closingLine && enforceClosingLine && cleaned.length > 0) {
    closingLine = DEFAULT_CLOSING_LINE;
  }

  return { items: cleaned, closingLine };
}
