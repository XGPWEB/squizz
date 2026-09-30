/** Where to go after signing in or up: only pages of the organisation space (never another site). */
export function safeNext(value: string | string[] | undefined | null) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && /^\/app(\/|$|\?)/.test(v) && !v.startsWith("//") ? v : "/app";
}
