load('config.js');
load('crypto.js');
load('reader.js');
function execute(url) {
    var target;
    try {
        target = route(url, true);
        var page = fetch(target.url, { headers: { Accept: "text/html" }, timeout: 20000 });
        if (!page.ok) return Response.error("Không tải được trang chương. HTTP " + page.status);
        var token = chapterTokenFromHtml(page.text());
        var bearer = cachedAccessToken(false);
        var result = readChapter(target.slug, target.number, bearer, token, target.url);
        if (result.status === 401) {
            bearer = cachedAccessToken(true);
            if (!bearer) return Response.error("Cần đăng nhập website trong trình duyệt VBook.\nMở website: " + target.url);
            result = readChapter(target.slug, target.number, bearer, token, target.url);
        }
        if (result.status < 200 || result.status > 299) return Response.error(readErrorMessage(result.status, result.text) + "\nMở website: " + target.url);
        var json = JSON.parse(result.text);
        var cipher = json && (json.content || (json.data && json.data.content));
        if (!cipher || typeof cipher !== "string") return Response.error("Phản hồi không có nội dung chương.");
        var html = paragraphHtml(decodeChapterContent(cipher));
        if (!html) return Response.error("Nội dung chương rỗng.");
        return Response.success(html);
    } catch (e) {
        return Response.error(String(e && e.message || "Không đọc được chương.") + (target ? "\nMở website: " + target.url : ""));
    }
}
