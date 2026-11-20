import { Platform } from "react-native";

/**
 * Where Klay is running, as far as getting it onto the Home Screen goes. In
 * a browser tab the browser's own bars take room from every screen — Safari
 * only hides them when a page scrolls, and Klay's screens never do — so the
 * cards come out small. Opened from the Home Screen it's full screen.
 *
 *   app          the real app, or the Home Screen web app: nothing to say
 *   ios-safari   iPhone or iPad, in Safari: Share, Add to Home Screen
 *   ios-other    iPhone or iPad, in another browser or inside an app
 *                (Chrome, Instagram…): open it in Safari first
 *   android      Android, any browser: ⋮, Add to Home screen
 *   computer     a computer: open it on your phone
 */
export type Where = "app" | "ios-safari" | "ios-other" | "android" | "computer";

export function where(): Where {
  if (Platform.OS !== "web" || typeof window === "undefined" || typeof navigator === "undefined") return "app";
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "app";
  const ua = navigator.userAgent;
  // iPadOS says it's a Mac; a Mac has no touch screen.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) {
    // Every iOS browser says "Safari/"; the others add their own name, and
    // apps showing a page inside themselves (Instagram, Facebook…) leave it out.
    const safari = /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|DuckDuckGo|FBAN|FBAV|Instagram/.test(ua);
    return safari ? "ios-safari" : "ios-other";
  }
  if (/Android/.test(ua)) return "android";
  return "computer";
}

/** This page's address without the https://, to say and to copy. */
export function address(): string {
  return typeof window === "undefined" ? "" : window.location.host;
}
