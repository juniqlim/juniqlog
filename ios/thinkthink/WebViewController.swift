import UIKit
import WebKit
import CoreLocation

/**
 웹앱을 담는 껍데기.

 앱을 따로 짓지 않는다 — 화면과 저장은 그대로 웹이 하고, 여기서는
 웹이 못 하는 것 하나만 맡는다: 위치.

 iOS 는 홈 화면 웹앱에 위치 권한을 세션마다 다시 묻는다. 열 때마다 팝업이
 뜨고 답할 때까지 좌표가 없었다. 앱은 권한을 한 번 받아 계속 물고 있으므로,
 글을 쓰는 순간 좌표는 이미 손에 있다.
 */
final class WebViewController: UIViewController {
    private static let home = URL(string: "https://juniqlog.vercel.app")!

    private var webView: WKWebView!
    private let locations = CLLocationManager()

    /**
     마지막으로 받은 좌표.

     앱이 웹보다 먼저 뜬다. 그 사이에 받은 좌표는 건넬 곳이 없어 버려지는데,
     제자리에 있으면 다음 좌표가 오지 않는다 — 오십 미터를 움직여야 오기
     때문이다. 들고 있다가 웹이 뜨면 그때 건넨다.
     */
    private var lastKnown: CLLocation?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .themed
        setUpWebView()
        setUpLocations()
        watchLifecycle()
        webView.load(URLRequest(url: Self.home))
    }

    /// 시계는 웹이 그린다. 위아래 여백만 시스템 색으로 채워 이질감을 없앤다
    override var preferredStatusBarStyle: UIStatusBarStyle { .default }

    // MARK: - 웹

    private func setUpWebView() {
        let config = WKWebViewConfiguration()

        /*
         페이지의 첫 줄보다 먼저 표식을 심는다. 웹은 이것을 보고 위치를
         물으러 가지 않는다 — 늦게 심으면 그 전에 한 번 물어보고 만다.
         */
        config.userContentController.addUserScript(WKUserScript(
            source: "window.thinkthinkNative = true",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.backgroundColor = .themed
        webView.scrollView.backgroundColor = .themed
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        view.addSubview(webView)

        // 웹앱은 안전영역을 셈하지 않는다. 홈 화면 웹앱일 때와 같은 자리에 둔다
        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: safe.topAnchor),
            webView.bottomAnchor.constraint(equalTo: safe.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: safe.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: safe.trailingAnchor),
        ])
    }

    // MARK: - 위치

    private func setUpLocations() {
        locations.delegate = self
        /*
         정확도를 낮게 잡아 셀·와이파이 측위를 쓴다. GPS 를 켜면 실내에서
         한참 걸리고 배터리도 다르게 든다 — 글을 어디서 썼는지 남기는 데는
         백 미터로 넉넉하다.
         */
        locations.desiredAccuracy = kCLLocationAccuracyHundredMeters
        locations.distanceFilter = 50
        locations.requestWhenInUseAuthorization()
        locations.startUpdatingLocation()
    }

    /// 뒤로 물러나면 멈춘다 — 안 보는 동안 좌표를 받아둘 이유가 없다
    private func watchLifecycle() {
        let center = NotificationCenter.default
        center.addObserver(
            self, selector: #selector(resume),
            name: UIApplication.willEnterForegroundNotification, object: nil
        )
        center.addObserver(
            self, selector: #selector(pause),
            name: UIApplication.didEnterBackgroundNotification, object: nil
        )
    }

    @objc private func resume() { locations.startUpdatingLocation() }
    @objc private func pause() { locations.stopUpdatingLocation() }
}

extension WebViewController: WKNavigationDelegate {
    /// 웹이 떴다. 그 전에 받아둔 좌표를 이제 건넨다
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if let known = lastKnown { push(known) }
    }
}

extension WebViewController: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations found: [CLLocation]) {
        guard let last = found.last, last.horizontalAccuracy >= 0 else { return }
        lastKnown = last
        push(last)
    }

    /// 못 받아도 앱은 그대로 돈다. 위치 없이 쓴 글로 남는다
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways: manager.startUpdatingLocation()
        default: manager.stopUpdatingLocation()
        }
    }

    /**
     받은 좌표를 웹에 건넨다.

     잰 시각을 그대로 옮긴다 — 받은 시각을 적으면 묵은 좌표까지 방금 잰
     것으로 세어, 쓴 자리가 아닌 곳이 남는다.
     */
    private func push(_ location: CLLocation) {
        let at = Int(location.timestamp.timeIntervalSince1970 * 1000)
        let js = """
        window.thinkthinkFix && window.thinkthinkFix({\
        lat:\(location.coordinate.latitude),\
        lon:\(location.coordinate.longitude),\
        acc:\(location.horizontalAccuracy),\
        at:\(at)})
        """
        webView.evaluateJavaScript(js)
    }
}

private extension UIColor {
    /// 웹앱의 theme-color 와 같은 값 — 여백이 다른 색으로 비지 않게
    static let themed = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0x0f / 255, green: 0x11 / 255, blue: 0x15 / 255, alpha: 1)
            : UIColor(red: 0xf6 / 255, green: 0xf7 / 255, blue: 0xf9 / 255, alpha: 1)
    }
}
