let BASE_URL = "https://truyendichai.com";
try {
    if (DOMAIN) {
        BASE_URL = DOMAIN;
    }
} catch (error) {
}

function normalizeUrl(url) {
    return url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);
}

function absUrl(path) {
    if (!path) return "";
    if (path.indexOf("http") === 0) return path;
    return BASE_URL + (path.charAt(0) === "/" ? "" : "/") + path;
}

function isCloudflare(text) {
    text = String(text);
    return text.indexOf("Just a moment") >= 0 || text.indexOf("/cdn-cgi/challenge-platform/") >= 0;
}

function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

var CF_MESSAGE = "Cloudflare chặn yêu cầu. Mở truyendichai.com trong trình duyệt vBook, chờ qua bước xác minh rồi thử lại.";
