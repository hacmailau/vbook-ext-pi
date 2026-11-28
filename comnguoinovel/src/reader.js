// Chapter reader helpers. Requires config.js (API_URL, BASE_URL) and crypto.js (CryptoJS) loaded by the caller.
var CHAPTER_PASSPHRASE = "z4x8vog2a13v" + "z4x8vog2a13v";
var TOKEN_CACHE_KEY = "cn_access_token";

function chapterTokenFromHtml(html) {
    // The token is embedded as a base64 SVG data URL inside a Next.js payload, not in the DOM.
    var match = String(html || "").match(/data:image\/svg\+xml;base64,([A-Za-z0-9+\/=]+)/);
    if (!match) throw new Error("Không tìm thấy mã chương trong trang.");
    var svg = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(match[1]));
    var wm = svg.match(/<svg\b[^>]*\bwidth="(\d+)"/), hm = svg.match(/<svg\b[^>]*\bheight="(\d+)"/);
    var width = wm ? Number(wm[1]) : 0, height = hm ? Number(hm[1]) : 0;
    if (!width || !height || width * height > 10000) throw new Error("Mã chương không hợp lệ.");
    // The site reads the SVG rendered on a canvas: a pixel with no <rect> keeps the background colour.
    var bgMatch = svg.match(/fill="#([0-9a-fA-F]{6})"/);
    var bg = bgMatch ? parseInt(bgMatch[1], 16) : 0xf0f0f0;
    var pixels = [], i;
    for (i = 0; i < width * height; i++) pixels.push([(bg >> 16) & 255, (bg >> 8) & 255, bg & 255]);
    var rects = svg.match(/<rect\b[^>]*>/g) || [], tag, fill, xs, ys, px;
    for (i = 0; i < rects.length; i++) {
        tag = rects[i];
        fill = tag.match(/fill="rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)"/);
        xs = tag.match(/\bx="(\d+)"/);
        ys = tag.match(/\by="(\d+)"/);
        if (!fill || !xs || !ys) continue;
        px = Number(ys[1]) * width + Number(xs[1]);
        if (Number(xs[1]) < width && Number(ys[1]) < height) pixels[px] = [Number(fill[1]), Number(fill[2]), Number(fill[3])];
    }
    var bits = [];
    for (i = 0; i < pixels.length; i++) bits.push(pixels[i][0] & 1, pixels[i][1] & 1, pixels[i][2] & 1);
    if (bits.length < 24) throw new Error("Mã chương không hợp lệ.");
    var length = 0;
    for (i = 0; i < 16; i++) length = length * 2 + bits[i];
    var text = "", pos = 16, code, k;
    while (pos + 8 <= bits.length && pos - 16 < length) {
        code = 0;
        for (k = 0; k < 8; k++) code = code * 2 + bits[pos + k];
        if (code === 0) break;
        text += String.fromCharCode(code);
        pos += 8;
    }
    if (!/^[a-f0-9]{32}$/.test(text)) throw new Error("Không giải mã được mã chương.");
    return text;
}

function accessTokenFromBrowser() {
    var browser = null;
    try {
        browser = Engine.newBrowser();
        browser.launch(BASE_URL + "/", 15000);
        browser.callJs("_callNativeFunction(JSON.stringify(['putVariable','at',String(localStorage.getItem('accessToken')||'')])); ''", 5000);
        var token = String(browser.getVariable("at") || "");
        return /^[A-Za-z0-9._~+\/=-]{20,}$/.test(token) ? token : "";
    } finally {
        if (browser) { try { browser.close(); } catch (ignored) {} }
    }
}

function cachedAccessToken(forceRefresh) {
    if (forceRefresh) localStorage.removeItem(TOKEN_CACHE_KEY);
    var cached = String(localStorage.getItem(TOKEN_CACHE_KEY) || "");
    if (cached) return cached;
    var token = accessTokenFromBrowser();
    if (token) localStorage.setItem(TOKEN_CACHE_KEY, token);
    return token;
}

function randomKey() {
    var hex = "0123456789abcdef", out = "";
    for (var i = 0; i < 32; i++) out += hex.charAt(Math.floor(Math.random() * 16));
    return out;
}

// Returns { status, text } so the caller can map errors.
function readChapter(slug, number, bearer, token, chapterUrl) {
    var headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": BASE_URL,
        "Referer": chapterUrl,
        "X-Chapter-Token": token,
        "Idempotency-Key": randomKey(),
        "X-Chapter-Read-Contract-Version": "1"
    };
    if (bearer) headers["Authorization"] = "Bearer " + bearer;
    var response = fetch(API_URL + "/novels/" + slug + "/chap/" + number + "/read", {
        method: "POST",
        headers: headers,
        body: "{}",
        timeout: 20000
    });
    return { status: Number(response.status), text: String(response.text() || "") };
}

function decodeChapterContent(cipher) {
    var plain = CryptoJS.AES.decrypt(String(cipher), CHAPTER_PASSPHRASE).toString(CryptoJS.enc.Utf8);
    if (!plain) throw new Error("Không giải mã được nội dung chương.");
    return plain.split("\n").reverse().join("\n");
}

function readErrorMessage(status, text) {
    var code = (String(text).match(/CHAPTER_CLIENT_FORBIDDEN|READ_SESSION_ORIGIN_INVALID|READ_SESSION_REQUIRED|CHALLENGE_REQUIRED|LEGACY_CHAPTER_READ_RETIRED|ADS_REQUIRED|READING_COOLDOWN|CHAPTER_TEMPORARILY_UNAVAILABLE/) || [""])[0];
    var suffix = " (HTTP " + status + (code ? ", " + code : "") + ")";
    if (code === "CHAPTER_CLIENT_FORBIDDEN") return "Website không cho phép ứng dụng đọc chương trực tiếp. Hãy mở chương trong trình duyệt để đọc." + suffix;
    if (code === "READ_SESSION_ORIGIN_INVALID") return "Website từ chối nguồn yêu cầu (Origin/Referer)." + suffix;
    if (code === "READ_SESSION_REQUIRED" || code === "CHALLENGE_REQUIRED") return "Website yêu cầu xác minh phiên đọc. Mở comnguoinovel.site trong trình duyệt đã đăng nhập, hoàn tất xác minh rồi thử lại." + suffix;
    if (code === "LEGACY_CHAPTER_READ_RETIRED") return "API đọc chương cũ đã bị website ngừng hỗ trợ." + suffix;
    if (code === "ADS_REQUIRED") return "Website yêu cầu xem quảng cáo trước khi đọc chương này." + suffix;
    if (code === "READING_COOLDOWN") return "Bạn đang bị giới hạn tần suất đọc; hãy thử lại sau." + suffix;
    if (code === "CHAPTER_TEMPORARILY_UNAVAILABLE") return "Chương tạm thời không khả dụng; hãy thử lại sau." + suffix;
    if (status === 401) return "Cần đăng nhập website trong trình duyệt VBook." + suffix;
    if (status === 403) return "Website từ chối yêu cầu đọc chương. Hãy mở chương trong trình duyệt để đọc." + suffix;
    if (status === 429) return "Website giới hạn truy cập; hãy thử lại sau." + suffix;
    return "Không đọc được chương." + suffix;
}
