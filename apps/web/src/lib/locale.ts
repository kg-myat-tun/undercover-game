export type AppLocale = "en" | "my";

const LOCALE_KEY = "undercover-locale";

export function getPreferredLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  const value = window.localStorage.getItem(LOCALE_KEY);
  return value === "my" ? "my" : "en";
}

export function storePreferredLocale(locale: AppLocale) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCALE_KEY, locale);
}
