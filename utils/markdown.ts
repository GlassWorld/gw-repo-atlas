function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyInlineMarkdown(text: string) {
  const escaped = escapeHtml(text);

  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function renderMarkdown(text: string) {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();

  if (!normalized) {
    return "";
  }

  const lines = normalized.split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let orderedItems: string[] = [];
  let unorderedItems: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }

    html.push(`<p>${paragraph.map((line) => applyInlineMarkdown(line)).join("<br />")}</p>`);
    paragraph = [];
  }

  function flushOrderedList() {
    if (!orderedItems.length) {
      return;
    }

    html.push(`<ol>${orderedItems.map((item) => `<li>${applyInlineMarkdown(item)}</li>`).join("")}</ol>`);
    orderedItems = [];
  }

  function flushUnorderedList() {
    if (!unorderedItems.length) {
      return;
    }

    html.push(`<ul>${unorderedItems.map((item) => `<li>${applyInlineMarkdown(item)}</li>`).join("")}</ul>`);
    unorderedItems = [];
  }

  function flushAll() {
    flushParagraph();
    flushOrderedList();
    flushUnorderedList();
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${applyInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      flushUnorderedList();
      orderedItems.push(orderedMatch[1]);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushOrderedList();
      unorderedItems.push(unorderedMatch[1]);
      continue;
    }

    flushOrderedList();
    flushUnorderedList();
    paragraph.push(trimmed);
  }

  flushAll();

  return html.join("");
}
