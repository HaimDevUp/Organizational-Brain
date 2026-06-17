/**
 * @qdrant/js-client-rest passes an undici Agent as `dispatcher` on fetch init.
 * Node 22+ uses a different built-in undici; mixing them throws
 * "invalid onError method" (UND_ERR_INVALID_ARG). Strip the dispatcher so
 * requests use the runtime's native fetch stack.
 */
let patched = false;

export function installQdrantFetchCompat(): void {
  if (patched || typeof globalThis.fetch !== "function") return;
  patched = true;

  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    if (init && "dispatcher" in init) {
      const { dispatcher: _dispatcher, ...rest } = init;
      return nativeFetch(input, rest);
    }
    return nativeFetch(input, init);
  };
}
