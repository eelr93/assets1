/** Resolves a relative reference against a base file path inside a zip archive (no leading slash). */
export function resolveZipPath(basePath: string, relativePath: string): string {
  const clean = decodeURIComponent(relativePath.split("#")[0].split("?")[0]);
  if (/^https?:\/\//i.test(clean) || clean.startsWith("data:")) return clean;

  const baseDir = basePath.includes("/") ? basePath.slice(0, basePath.lastIndexOf("/")) : "";
  const combined = clean.startsWith("/") ? clean.slice(1) : `${baseDir}/${clean}`;

  const parts = combined.split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  bmp: "image/bmp",
};

export function guessImageMime(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}
