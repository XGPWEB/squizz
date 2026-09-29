declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    /** "true" only when deployed behind the Sites proxy, which sets oai-authenticated-user-id. */
    TRUST_SITES_IDENTITY?: string;
  }
}
