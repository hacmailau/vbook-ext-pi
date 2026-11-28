load('config.js');

function execute(url) {
    var book = parseStory(url, false);
    var page = 1;
    if (!book) {
        var m = sitePath(url).match(/^\/api\/novels\/([^/?#]+)\/chapters\?page=([1-9]\d*)&size=200(?:&edition_type=(ai|cv|translate))?$/);
        if (!m || !validSlug(m[1])) return Response.error("URL mục lục không hợp lệ.");
        book = { slug: m[1], edition: m[3] || "" };
        page = Number(m[2]);
    }
    var res = apiGet(chapterPath(book.slug), tocParams(page, TOC_SIZE, book.edition));
    var items = res.data && res.data.items;
    if (!Array.isArray(items) || !items.length) {
        return Response.error("Không tải được mục lục: " + (res.error || "trang không có chương"));
    }
    var prefix = storyUrl(book.slug, book.edition) + "/chuong-";
    return Response.success(items.map(function (item) {
        return {
            name: chapterTitle(item.chapter_number, item.title), url: prefix + item.chapter_number,
            description: item.status && item.status !== "COMPLETED" ? item.status : "",
            lock: false, pay: false
        };
    }));
}
