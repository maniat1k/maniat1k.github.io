import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const BLOG_DIR = path.join(ROOT_DIR, "blog");
const DATA_DIR = path.join(ROOT_DIR, "data");
const OUTPUT_FILE = path.join(DATA_DIR, "blog.json");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitFrontmatter(raw, fileName) {
  const normalized = String(raw || "").replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);
  if (lines[0] !== "---") {
    throw new Error(`El archivo ${fileName} no tiene frontmatter YAML valido.`);
  }

  const endIndex = lines.slice(1).findIndex((line) => line === "---");
  if (endIndex === -1) {
    throw new Error(`El archivo ${fileName} no tiene frontmatter YAML valido.`);
  }

  const frontmatter = lines.slice(1, endIndex + 1).join("\n");
  const body = lines.slice(endIndex + 2).join("\n");

  return {
    frontmatter,
    body
  };
}

function stripQuotes(value) {
  const text = String(value || "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function parseYamlFrontmatter(source, fileName) {
  const lines = String(source || "").split(/\r?\n/);
  const result = {};
  let currentArrayKey = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const arrayMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (arrayMatch) {
      if (!currentArrayKey) {
        throw new Error(`Lista YAML fuera de contexto en ${fileName}.`);
      }
      result[currentArrayKey].push(stripQuotes(arrayMatch[1]));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
    if (!keyMatch) {
      throw new Error(`Linea YAML no soportada en ${fileName}: ${line}`);
    }

    const [, key, rawValue] = keyMatch;
    if (typeof rawValue === "undefined" || rawValue === "") {
      result[key] = [];
      currentArrayKey = key;
      continue;
    }

    result[key] = stripQuotes(rawValue);
    currentArrayKey = null;
  }

  return result;
}

function parseIsoDate(rawValue, fileName) {
  const value = String(rawValue || "").trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`La fecha debe usar formato YYYY-MM-DD en ${fileName}.`);
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`La fecha no es valida en ${fileName}.`);
  }

  return date.toISOString();
}

function createInlineTokens(text) {
  const tokens = [];
  const replaced = String(text || "").replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODE_${tokens.length}@@`;
    tokens.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });
  return { replaced, tokens };
}

function restoreTokens(text, tokens) {
  return tokens.reduce(
    (output, token, index) => output.replaceAll(`@@CODE_${index}@@`, token),
    text
  );
}

function renderInline(text) {
  const { replaced, tokens } = createInlineTokens(text);
  let output = escapeHtml(replaced);

  output = output.replace(
    /\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+("([^"]*)"|'([^']*)'))?\s*\)/g,
    (_, label, url, match, titleDouble, titleSingle) => {
      const title = titleDouble || titleSingle || "";
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${escapeHtml(url)}"${titleAttr} target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
  );
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  output = output.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?:;])/g, "$1<em>$2</em>");
  output = output.replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?:;])/g, "$1<em>$2</em>");

  return restoreTokens(output, tokens);
}

function renderParagraph(lines) {
  return `<p>${renderInline(lines.join(" "))}</p>`;
}

function renderList(type, items) {
  const tag = type === "ol" ? "ol" : "ul";
  return `<${tag}>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`;
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\t/g, "  ").split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(renderParagraph(paragraph));
    paragraph = [];
  }

  function flushList() {
    if (!listType || !listItems.length) return;
    html.push(renderList(listType, listItems));
    listType = null;
    listItems = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const fenceMatch = trimmed.match(/^```([A-Za-z0-9_-]+)?$/);
    if (fenceMatch) {
      flushParagraph();
      flushList();

      const language = fenceMatch[1] ? ` class="language-${escapeHtml(fenceMatch[1])}"` : "";
      const block = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().match(/^```$/)) {
        block.push(lines[index]);
        index += 1;
      }
      html.push(`<pre><code${language}>${escapeHtml(block.join("\n"))}</code></pre>`);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^([-*_])(?:\s*\1){2,}$/.test(trimmed)) {
      flushParagraph();
      flushList();
      html.push("<hr>");
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      const quoteLines = [trimmed.replace(/^>\s?/, "")];
      while (index + 1 < lines.length) {
        const next = lines[index + 1];
        if (!next.trim()) {
          quoteLines.push("");
          index += 1;
          continue;
        }
        if (!next.trim().startsWith(">")) break;
        quoteLines.push(next.trim().replace(/^>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${markdownToHtml(quoteLines.join("\n"))}</blockquote>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(unorderedMatch[1]);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(orderedMatch[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return html.join("\n");
}

function normalizeTags(rawTags) {
  if (!Array.isArray(rawTags)) return [];
  return rawTags.map((tag) => String(tag || "").trim()).filter(Boolean);
}

function toBlogEntry(fileName, rawContent) {
  const { frontmatter, body } = splitFrontmatter(rawContent, fileName);
  const meta = parseYamlFrontmatter(frontmatter, fileName);

  const title = String(meta.title || "").trim();
  const summary = String(meta.summary || "").trim();
  if (!title || !summary || !meta.date) {
    throw new Error(`Faltan campos requeridos (title, date, summary) en ${fileName}.`);
  }

  const slug = path.basename(fileName, path.extname(fileName));
  const date = parseIsoDate(meta.date, fileName);

  return {
    slug,
    file: fileName,
    title,
    date,
    summary,
    tags: normalizeTags(meta.tags),
    html: markdownToHtml(body),
    url: `blog.html?slug=${encodeURIComponent(slug)}`
  };
}

async function getMarkdownFiles() {
  try {
    const entries = await fs.readdir(BLOG_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".md")
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(BLOG_DIR, { recursive: true });

  const files = await getMarkdownFiles();
  const posts = [];

  for (const fileName of files) {
    const fullPath = path.join(BLOG_DIR, fileName);
    const rawContent = await fs.readFile(fullPath, "utf8");
    posts.push(toBlogEntry(fileName, rawContent));
  }

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const latest = posts[0]
    ? {
        slug: posts[0].slug,
        title: posts[0].title,
        date: posts[0].date,
        summary: posts[0].summary,
        tags: posts[0].tags,
        url: posts[0].url
      }
    : null;

  const payload = {
    source: "blog-markdown",
    generated_at: new Date().toISOString(),
    total: posts.length,
    latest,
    posts
  };

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Generated ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
