export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/finance-auditor";
export const SESSION_COOKIE = "fa_session";
/** 10 лет. Браузер может урезать срок (Chrome — до 400 дней), поэтому proxy продлевает cookie. */
export const SESSION_COOKIE_MAX_AGE = 10 * 365 * 24 * 60 * 60;
export const APP_NAME = "Finance Auditor";
