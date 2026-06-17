const RTL_SCRIPT =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0780-\u07BF\u08A0-\u08FF]/g;
const LTR_LETTER = /[A-Za-z\u00C0-\u024F]/g;

/** True when the text is predominantly Hebrew / other RTL scripts. */
export function isRtlText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const rtl = (trimmed.match(RTL_SCRIPT) ?? []).length;
  if (rtl === 0) return false;

  const ltr = (trimmed.match(LTR_LETTER) ?? []).length;
  return rtl >= ltr;
}

export function textDirection(text: string): "rtl" | "ltr" {
  return isRtlText(text) ? "rtl" : "ltr";
}
