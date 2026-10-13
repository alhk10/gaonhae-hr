export const A2HS_INTERVAL_DAYS = 150;

/** True when the Home Screen prompt is due (never shown, or last shown ≥150 days ago). */
export const isHomeScreenPromptDue = (lastShown: number | null, now = Date.now()) =>
  lastShown === null || now - lastShown >= A2HS_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
