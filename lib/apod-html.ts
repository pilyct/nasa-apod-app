// Helpers for NASA's new APOD API (science.nasa.gov/wp-json/wp/v2/apod-basic),
// whose text fields contain HTML and whose structured `url`/`hdurl` fields
// don't reliably point at the picture: `url` is the article page, and for
// videos and many older entries `hdurl` is a generic NASA thumbnail. The
// real media lives in `basic_html`, a copy of the classic APOD page.
//
// Deliberately regex-based rather than a DOM parser: the page is NASA's own
// fixed APOD template, we only read a handful of attributes from it, and
// everything extracted is still checked against the scheme/host allowlists
// in lib/nasa-client.ts before it reaches the UI.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  deg: "°",
  times: "×",
  eacute: "é",
  aacute: "á",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

// Tags that separate words visually; every other tag (links, bold, italics)
// is removed without adding a space, so "<a>Earth</a>." stays "Earth.".
const BLOCK_TAG = /<\/?(br|p|div|center|h[1-6]|li|ul|ol|tr|td|table|blockquote)\b[^>]*>/gi;

// Plain text from an HTML fragment: tags dropped, entities decoded,
// whitespace (including non-breaking spaces) collapsed. Older APOD pages
// often break lines inside links ("Mars\n</a>."), so whitespace before
// closing punctuation and after opening brackets is removed too.
export function htmlToText(html: string): string {
  const withoutTags = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(BLOCK_TAG, " ")
    .replace(/<[^>]*>/g, "");
  return decodeEntities(withoutTags)
    .replace(/[\s ]+/g, " ")
    .replace(/ ([,.;:!?)\]])/g, "$1")
    .replace(/([([]) /g, "$1")
    .trim();
}

// The explanation field starts with a bold "Explanation:" label and often
// ends with a footer after a double line break and another bold label
// ("Tomorrow's picture:", "Almost Hyperspace:", "APOD Public Talk:"...).
// Neither belongs in the app.
const FOOTER = /<br\s*\/?>\s*<br\s*\/?>\s*<(b|strong)\b[\s\S]*$/i;

export function cleanExplanation(html: string): string {
  return htmlToText(html.replace(FOOTER, ""))
    .replace(/^explanation:\s*/i, "")
    .replace(/\s*tomorrow['’]s picture:.*$/i, "")
    .trim();
}

// Credit lines arrive with a label in front, in many variants: "Credit:",
// "Image Credit & Copyright:", "Images Credit & Copyright:", "Video
// Illustration Credit:", "Digital Reproduction Credit:"... Keep only the names.
const CREDIT_LABEL =
  /^(?:[a-z]+\s+){0,3}(?:credits?(?:\s*(?:&|and)\s*copyright)?|copyright)\s*:\s*/i;

export function cleanCredit(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const text = htmlToText(html).replace(CREDIT_LABEL, "").trim();
  return text || undefined;
}

export type ExtractedMedia =
  | { kind: "image"; src: string; href?: string }
  | { kind: "embed"; src: string }
  | { kind: "videoFile"; src: string };

// Protocol-relative URLs ("//www.youtube.com/embed/...") are common in the
// APOD template; resolve them to https so URL parsing and allowlists work.
function absolutize(url: string): string {
  const decoded = decodeEntities(url.trim());
  return decoded.startsWith("//") ? `https:${decoded}` : decoded;
}

function attr(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  const value = match?.[2] ?? match?.[3] ?? match?.[4];
  return value ? absolutize(value) : undefined;
}

// The picture sits in the first <center> block of the page body, after the
// "Discover the cosmos!" intro and the date line. Only that block is
// searched, so images merely linked from the explanation are never picked.
export function extractMainMedia(basicHtml: string): ExtractedMedia | undefined {
  const bodyStart = basicHtml.search(/<body\b/i);
  const body = bodyStart >= 0 ? basicHtml.slice(bodyStart) : basicHtml;
  const centerEnd = body.search(/<\/center>/i);
  const block = centerEnd >= 0 ? body.slice(0, centerEnd) : body;

  const tagPattern = /<(iframe|video|source|img)\b[^>]*>/gi;
  for (const [tag, rawName] of block.matchAll(tagPattern)) {
    const name = rawName.toLowerCase();
    const src = attr(tag, "src");
    if (!src) continue;

    if (name === "iframe") return { kind: "embed", src };
    if (name === "video" || name === "source") return { kind: "videoFile", src };

    // The classic template wraps the image in a link to the full-size file.
    const before = block.slice(0, block.indexOf(tag));
    const openAnchor = before.match(/<a\b[^>]*>(?![\s\S]*<\/a>)[\s\S]*$/i);
    const href = openAnchor ? attr(openAnchor[0], "href") : undefined;
    return { kind: "image", src, href };
  }
  return undefined;
}
