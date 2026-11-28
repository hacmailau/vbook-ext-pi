var BASE_URL = "https://truyendich.space";
try {
    if (/^https:\/\/truyendich\.(?:us|fit|space)$/.test(DOMAIN)) BASE_URL = DOMAIN;
} catch (e) {}

var TOC_SIZE = 200;
var LISTS = [
    ["truyen-moi", "Truyện Mới"], ["truyen-hot", "Truyện Hot"],
    ["truyen-dich-ai", "Truyện Dịch AI"], ["truyen-full", "Truyện Full"],
    ["truyen-dich", "Truyện Dịch"], ["truyen-convert", "Truyện Convert"]
];

function normalizeUrl(url) {
    return String(url || "").trim().replace(/^(?:(?:https?:)?\/\/)?(?:www\.)?truyendich\.(?:us|fit|space)(?=\/)/i, BASE_URL);
}

function sitePath(url) {
    var normalized = normalizeUrl(url);
    if (normalized.indexOf(BASE_URL + "/") === 0) return normalized.slice(BASE_URL.length);
    return /^\/(?!\/)/.test(normalized) ? normalized : "";
}

function parseStory(url, chapter) {
    var path = sitePath(url).split(/[?#]/)[0].replace(/\/$/, "");
    var re = chapter ? /^\/doc-truyen\/(?:(cv|ai|translate)\/)?([^/]+)\/chuong-(\d+)$/ :
        /^\/doc-truyen\/(?:(cv|ai|translate)\/)?([^/]+)$/;
    var m = path.match(re);
    if (!m) return null;
    var slug;
    try { slug = decodeURIComponent(m[2]); } catch (e) { return null; }
    if (!validSlug(slug)) return null;
    return { slug: slug, edition: m[1] || "", number: m[3] };
}

function validSlug(slug) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(String(slug || ""));
}

function storyUrl(slug, edition) {
    return BASE_URL + "/doc-truyen/" + (edition ? edition + "/" : "") + encodeURIComponent(slug);
}

function coverUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return normalizeUrl(path);
    if (path.indexOf("//") === 0) return normalizeUrl("https:" + path);
    return BASE_URL + (path.charAt(0) === "/" ? "" : "/") + path;
}

function apiUrl(path, queries) {
    var parts = [];
    for (var key in (queries || {})) {
        if (queries[key] !== "") parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(queries[key]));
    }
    return BASE_URL + path + (parts.length ? "?" + parts.join("&") : "");
}

function apiGet(path, queries) {
    var res = fetch(apiUrl(path, queries), { timeout: 15000 });
    if (!res || !res.ok) {
        var status = res ? Number(res.status) : 0;
        var hint = status === 429 ? " — vui lòng chờ rồi thử lại" : "";
        return { error: (status ? "HTTP " + status : "Không kết nối được") + hint };
    }
    try { return { data: res.json() }; }
    catch (e) { return { error: "Phản hồi không phải JSON" }; }
}

function chapterPath(slug) {
    return "/api/novels/" + encodeURIComponent(slug) + "/chapters";
}

function tocParams(page, size, edition) {
    return { page: page, size: size, edition_type: edition };
}

function tab(title, input) {
    return { title: title, script: "search.js", input: input };
}

function genreTabs(categories) {
    var tabs = [];
    for (var i = 0; i < categories.length; i++) {
        var c = categories[i];
        if (c && c.name && validSlug(c.slug)) tabs.push(tab(c.name, "cat:" + c.slug));
    }
    return tabs;
}

function chapterTitle(number, title) {
    return "Chương " + number + (title ? ": " + title : "");
}

function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
