// Verification workspaces on Windows can be slower than warmed production files.
// This only changes the isolated test resource budget, never proof acceptance.
const requested = Number(process.env.MCS_WEB_TEST_LEAN_TIMEOUT_MS);
export const TEST_LEAN_TIMEOUT_MS = Number.isSafeInteger(requested) && requested >= 120000 && requested <= 600000 ? requested : 120000;
