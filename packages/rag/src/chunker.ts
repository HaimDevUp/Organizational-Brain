export interface TextChunk {
  index: number;
  content: string;
  headingPath: string[];
}

const MAX_CHUNK = 1800;
const OVERLAP = 200;

export function chunkMarkdown(body: string): TextChunk[] {
  const lines = body.split("\n");
  const sections: { headingPath: string[]; lines: string[] }[] = [];
  let currentPath: string[] = [];
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLines.length) {
      sections.push({ headingPath: [...currentPath], lines: [...currentLines] });
      currentLines = [];
    }
  };

  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      flush();
      const level = h[1].length;
      currentPath = currentPath.slice(0, level - 1);
      currentPath.push(h[2].trim());
      continue;
    }
    currentLines.push(line);
  }
  flush();

  if (!sections.length) {
    sections.push({ headingPath: [], lines: lines });
  }

  const chunks: TextChunk[] = [];
  let index = 0;

  for (const section of sections) {
    const text = section.lines.join("\n").trim();
    if (!text) continue;

    if (text.length <= MAX_CHUNK) {
      chunks.push({ index: index++, content: text, headingPath: section.headingPath });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + MAX_CHUNK, text.length);
      chunks.push({
        index: index++,
        content: text.slice(start, end),
        headingPath: section.headingPath,
      });
      if (end >= text.length) break;
      start = end - OVERLAP;
    }
  }

  return chunks;
}
