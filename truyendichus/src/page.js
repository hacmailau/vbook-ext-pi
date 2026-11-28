load('config.js');

function execute(url) {
    var book = parseStory(url, false);
    if (!book) return Response.error("URL truyện không hợp lệ.");
    var path = chapterPath(book.slug);
    var first = apiGet(path, tocParams(1, 1, book.edition));
    var total = first.data ? Number(first.data.total) : 0;
    if (!isFinite(total) || total < 1) return Response.error("Không tải được mục lục: " + (first.error || "chưa có chương"));
    var urls = [];
    for (var i = 1; i <= Math.ceil(total / TOC_SIZE); i++) {
        urls.push(apiUrl(path, tocParams(i, TOC_SIZE, book.edition)));
    }
    return Response.success(urls);
}
