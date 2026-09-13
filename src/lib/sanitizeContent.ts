import sanitizeHtml from "sanitize-html";

// Article content is authored by any admin/editor/author account (including
// via a raw-HTML editor mode), then rendered unsanitized-looking to every
// site visitor. This allowlist keeps normal article formatting working while
// blocking script injection — a stored-XSS vector that would otherwise let a
// compromised or malicious editorial account run JS in every reader's
// browser (and, since the auth token lives in localStorage, potentially
// steal admin sessions).
export function sanitizeArticleContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "code",
      "pre",
      "blockquote",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "hr",
      "a",
      "img",
      "figure",
      "figcaption",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}
