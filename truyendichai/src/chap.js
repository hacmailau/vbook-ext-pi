load('config.js');

// Chapter text is not in the HTML: the page's own JS translates it through a streaming API.
// Free accounts need a Cloudflare Turnstile token for uncached chapters, which the hidden WebView
// cannot complete; cached chapters and accounts with their own API key load without it.
function pageStats() {
    var a = document.querySelector("#chapter-article-body");
    var body = document.body ? document.body.innerText : "";
    var status = "";
    if (body.indexOf("GIÁN ĐOẠN LUỒNG DỊCH AI") >= 0) {
        var m = body.match(/GIÁN ĐOẠN LUỒNG DỊCH AI\s+([^\n]+)/);
        status = "error:" + (m ? m[1] : "");
    } else if (body.indexOf("Đang xác minh bảo mật") >= 0) {
        status = "verifying";
    }
    _callNativeFunction(JSON.stringify(["putVariable", "stats", JSON.stringify({
        title: document.title,
        n: a ? a.querySelectorAll("p").length : 0,
        len: a ? a.innerText.length : 0,
        status: status
    })]));
    return "";
}

function pageContent() {
    var ps = document.querySelectorAll("#chapter-article-body p");
    var out = [];
    for (var i = 0; i < ps.length; i++) {
        var t = ps[i].innerText.trim();
        if (t) out.push(t);
    }
    _callNativeFunction(JSON.stringify(["putVariable", "content", JSON.stringify(out)]));
    return "";
}

var UNTRANSLATED_MESSAGE = "Chương này chưa có bản dịch và site cần xác minh Turnstile, vBook không tự làm được. " +
    "Mở chương trong trình duyệt vBook một lần để site dịch và lưu lại, hoặc gắn API key Gemini riêng trong tài khoản truyendichai.";

function execute(url) {
    url = normalizeUrl(url);
    var browser = null;
    try {
        browser = Engine.newBrowser();
        browser.launch(url, 20000);
        var statsJs = "(" + pageStats.toString() + ")()";
        var prevLen = -1, stable = 0, verifying = 0, stats = {};
        // Poll until the text stops growing for two checks in a row (streamed translations pause briefly).
        for (var i = 0; i < 20; i++) {
            browser.html(3000);
            browser.callJs(statsJs, 5000);
            var raw = String(browser.getVariable("stats") || "");
            stats = raw ? JSON.parse(raw) : {};
            var status = String(stats.status || "");
            if (status.indexOf("error:") === 0) {
                if (stats.n > 0) break;
                return Response.error("Site báo lỗi dịch: " + status.substring(6) + ". " + UNTRANSLATED_MESSAGE);
            }
            if (status === "verifying" && !stats.n) {
                verifying++;
                if (verifying >= 2) return Response.error(UNTRANSLATED_MESSAGE);
            }
            if (stats.n > 0 && stats.len === prevLen) {
                stable++;
                if (stable >= 2) break;
            } else {
                stable = 0;
            }
            prevLen = stats.len;
        }
        if (!stats.n) {
            var title = String(stats.title || "");
            if (title.indexOf("Chờ một chút") >= 0 || title.indexOf("Just a moment") >= 0) return Response.error(CF_MESSAGE);
            return Response.error("Chương chưa có nội dung. Mở chương trong trình duyệt vBook rồi thử lại.");
        }
        browser.callJs("(" + pageContent.toString() + ")()", 5000);
        var paras = JSON.parse(String(browser.getVariable("content") || "[]"));
        var html = "";
        for (var k = 0; k < paras.length; k++) html += "<p>" + escapeHtml(paras[k]) + "</p>";
        return Response.success(html);
    } catch (e) {
        return Response.error("Lỗi đọc chương: " + e);
    } finally {
        if (browser) { try { browser.close(); } catch (ignored) {} }
    }
}
