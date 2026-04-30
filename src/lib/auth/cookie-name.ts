// Shared cookie name constant — used by both Edge middleware (where firebase-admin
// can't run) and Node server code. Keep in sync with SESSION_COOKIE_NAME env var.
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "__wealthwise_session";
