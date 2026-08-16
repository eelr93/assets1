import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "span",
  "a",
  "img",
  "sub",
  "sup",
  "blockquote",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title"];

/** Strips any HTML content down to a small inline-formatting allowlist. Untrusted books must never run script. */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
