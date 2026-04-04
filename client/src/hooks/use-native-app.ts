/**
 * Detects whether the app is running inside a native iOS or Android WebView wrapper.
 *
 * In production: the native wrapper injects `window.isNativeApp = true` via evaluateJavaScript
 * immediately after the page loads (`webView(_:didFinish:)` in WebViewCoordinator).
 *
 * For browser-based testing: append `?native=true` to any URL to simulate the native app
 * experience. The flag is persisted to sessionStorage so it remains active even after
 * wouter-level navigations strip the query parameter.
 *
 * This flag is used to hide features not permitted in the App Store / Google Play:
 * - Club registration (which triggers Stripe payment)
 * - Billing management (subscription status, Stripe portal, Cancel Club)
 *
 * Web users are completely unaffected — this defaults to false in any browser context.
 */

// Extend the Window interface so we avoid unsafe `any` casts throughout the app.
declare global {
  interface Window {
    isNativeApp?: boolean;
  }
}

const SESSION_KEY = 'swim_native_app';

export function useNativeApp(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Flag injected directly by the Swift/Android native WebView wrapper.
  if (window.isNativeApp === true) return true;

  // 2. Query-param override for browser-based testing.
  //    Persist to sessionStorage so navigations that drop query params
  //    don't accidentally turn native mode off for the rest of the session.
  const params = new URLSearchParams(window.location.search);
  if (params.get('native') === 'true') {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
    return true;
  }

  // 3. Persisted test flag (same browser tab, native=true was seen earlier).
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return true;
  } catch { /* ignore */ }

  return false;
}
