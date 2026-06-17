import { createHash } from "crypto";

export type MarkdownFrontmatter = {
  title?: string;
  tags?: string[];
  owner?: string;
  reviewers?: string[];
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFrontmatter(content: string): {
  frontmatter: MarkdownFrontmatter;
  body: string;
} {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yaml = match[1];
  const body = match[2] ?? "";
  const frontmatter: MarkdownFrontmatter = {};

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    let value = trimmed.slice(colon + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      const items = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
      if (key === "tags") frontmatter.tags = items;
      if (key === "reviewers") frontmatter.reviewers = items;
      continue;
    }
    value = value.replace(/^['"]|['"]$/g, "");
    if (key === "title") frontmatter.title = value;
    if (key === "owner") frontmatter.owner = value;
  }

  return { frontmatter, body };
}

export function buildMarkdownWithFrontmatter(
  body: string,
  frontmatter: MarkdownFrontmatter
): string {
  const lines: string[] = ["---"];
  if (frontmatter.title) lines.push(`title: ${frontmatter.title}`);
  if (frontmatter.tags?.length) {
    lines.push(`tags: [${frontmatter.tags.map((t) => `"${t}"`).join(", ")}]`);
  }
  if (frontmatter.owner) lines.push(`owner: ${frontmatter.owner}`);
  lines.push("---", "", body.trim());
  return lines.join("\n");
}

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
  if (base.length > 0) return base;
  return `doc-${createHash("sha256").update(title.trim()).digest("hex").slice(0, 12)}`;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function contentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}
