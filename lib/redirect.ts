/**
 * Only a path on this site is allowed as a post-sign-in destination; anything else becomes "/".
 * Dependency-free so it can run in the browser, the middleware and the server alike.
 * Rejects "//host", backslashes ("/\host" is read by browsers as "//host") and control characters.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/";
  return value;
}
