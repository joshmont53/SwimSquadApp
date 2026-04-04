/**
 * Detects whether the app is running inside a native iOS or Android WebView wrapper.
 *
 * In production: the native wrapper injects `window.isNativeApp = true` via evaluateJavaScript
 * immediately after the page loads.
 *
 * For browser-based testing: append `?native=true` to any URL to simulate the native app
 * experience without a physical device.
 *
 * This flag is used to hide features that are not permitted in the App Store / Google Play:
 * - Club registration (which triggers Stripe payment)
 * - Billing management (subscription status, Stripe portal, Cancel Club)
 *
 * Web users are completely unaffected — this defaults to false in any browser context.
 */
export function useNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as any).isNativeApp === true) return true;
  const params = new URLSearchParams(window.location.search);
  return params.get('native') === 'true';
}
