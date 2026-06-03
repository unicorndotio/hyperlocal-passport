// Single shared Deno KV instance.
// Uses DENO_KV_PATH if set (Docker volume), otherwise Deno's default (local dev / tests).
export const kv = await Deno.openKv(Deno.env.get('DENO_KV_PATH'))
