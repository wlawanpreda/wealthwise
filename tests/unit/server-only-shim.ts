// Empty shim: in production builds Next.js's `server-only` package throws
// when imported from client code. In vitest we replace it with this no-op
// so server-side utilities (rate-limit, env, auth) can be exercised in tests.
export {};
