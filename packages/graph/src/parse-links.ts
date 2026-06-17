/** Obsidian-style wiki links: [[Target]], [[Target#heading]], [[Target|Alias]] */
const WIKI_LINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

export type ParsedWikiLink = {
  raw: string;
  target: string;
  alias?: string;
};

export function parseWikiLinks(markdown: string): ParsedWikiLink[] {
  const links: ParsedWikiLink[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  WIKI_LINK_RE.lastIndex = 0;
  while ((match = WIKI_LINK_RE.exec(markdown)) !== null) {
    const target = match[1].trim();
    if (!target || seen.has(target.toLowerCase())) continue;
    seen.add(target.toLowerCase());
    links.push({
      raw: match[0],
      target,
      alias: match[2]?.trim(),
    });
  }
  return links;
}

export function normalizeLinkTarget(target: string): string {
  return target.trim().toLowerCase().replace(/\s+/g, " ");
}
