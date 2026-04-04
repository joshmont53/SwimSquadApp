import SwiftUI
import WebKit
import Combine

class WebViewCoordinator: NSObject, WKNavigationDelegate {
    var onPageLoaded: (() -> Void)?
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("WebView finished loading")
        
        // ─── Native app flag (Apple App Store / Google Play compliance) ───────────
        // Inject window.isNativeApp = true immediately so the React app can hide
        // Stripe payment flows before the user sees anything.
        // This satisfies Apple guideline 3.1.3(b) — no in-app purchases via
        // external payment systems visible inside the native app shell.
        webView.evaluateJavaScript("window.isNativeApp = true;") { _, error in
            if let error = error {
                print("Failed to set isNativeApp flag: \(error)")
            } else {
                print("isNativeApp flag set successfully")
            }
        }
        // ─────────────────────────────────────────────────────────────────────────
        
        // Check if there's a pending session to open from notification
        if let sessionId = AppDelegate.pendingSessionId {
            AppDelegate.pendingSessionId = nil
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                let js = "if(window.openSession){window.openSession('\(sessionId)');console.log('openSession called')}else{console.log('openSession not found')}"
                webView.evaluateJavaScript(js) { result, error in
                    if let error = error {
                        print("Error calling openSession: \(error)")
                    } else {
                        print("Session opened from notification: \(sessionId)")
                    }
                }
            }
        }
        
        // Register device token
        if let token = NotificationManager.shared.deviceToken {
            let js = "if(window.registerDeviceToken){window.registerDeviceToken('\(token)');'success'}else{'not_ready'}"
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                webView.evaluateJavaScript(js) { result, error in
                    if let status = result as? String, status == "success" {
                        print("Token registered after page load!")
                    } else {
                        print("Will retry via NotificationManager")
                    }
                }
            }
        }
        
        onPageLoaded?()
    }
}

struct WebView: UIViewRepresentable {
    let urlString: String
    @Binding var webViewRef: WKWebView?

    func makeCoordinator() -> WebViewCoordinator {
        WebViewCoordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        NotificationManager.shared.webView = webView
        DispatchQueue.main.async {
            self.webViewRef = webView
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard let url = URL(string: urlString) else { return }
        if webView.url == nil {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }
}

struct ContentView: View {
    // ⚠️  Update this URL to your production domain if needed
    private let appURL = "https://swimsquadapp.co.uk"
    @State private var webView: WKWebView?

    var body: some View {
        WebView(urlString: appURL, webViewRef: $webView)
            .ignoresSafeArea()
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("OpenSession"))) { notification in
                if let sessionId = notification.userInfo?["sessionId"] as? String {
                    print("Received OpenSession notification for: \(sessionId)")
                    
                    if let wv = webView {
                        // First try JavaScript injection
                        let js = "if(window.openSession){window.openSession('\(sessionId)');console.log('openSession called')}else{console.log('openSession not found')}"
                        wv.evaluateJavaScript(js) { result, error in
                            if let error = error {
                                print("JS injection failed, navigating with URL param: \(error)")
                                // Fallback: navigate with URL parameter
                                if let url = URL(string: "\(appURL)/app?sessionId=\(sessionId)") {
                                    wv.load(URLRequest(url: url))
                                }
                            } else {
                                print("Session opened via JS: \(sessionId)")
                            }
                        }
                    }
                }
            }
    }
}

#Preview {
    ContentView()
}
