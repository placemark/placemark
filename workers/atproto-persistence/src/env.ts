export interface Env {
  SESSION_KV: KVNamespace;
  OAUTH_STATE_KV: KVNamespace;
  OAUTH_SIGNING_KEY: string;
  COOKIE_SECRET: string;
}
