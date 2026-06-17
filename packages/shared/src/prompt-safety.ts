const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(the\s+)?(system|above)/i,
  /you\s+are\s+now\s+/i,
  /<\s*\/?\s*system\s*>/i,
  /\[\s*INST\s*\]/i,
  /###\s*instruction/i,
];

const MAX_USER_PROMPT_LENGTH = 8000;

/** Strip control chars and common prompt-injection phrases from user-supplied LLM input. */
export function sanitizeUserPrompt(input: string): string {
  let text = input
    .replace(/\0/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  if (text.length > MAX_USER_PROMPT_LENGTH) {
    text = text.slice(0, MAX_USER_PROMPT_LENGTH);
  }

  for (const pattern of INJECTION_PATTERNS) {
    text = text.replace(pattern, "[filtered]");
  }

  return text;
}

/** Wrap retrieved context so the model treats it as data, not instructions. */
export function wrapRetrievedContext(context: string): string {
  return `<<<RETRIEVED_CONTEXT>>>\n${context}\n<<<END_CONTEXT>>>`;
}
