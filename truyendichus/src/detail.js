load('config.js');

function execute(url) {
    var book = parseStory(url, false);
    if (!book) return Response.error("URL truyện không hợp lệ.");
    var res = apiGet("/api/novels/" + encodeURIComponent(book.slug));
    var n = res.data;
    if (!n || !n.title) return Response.error("Không tải được truyện: " + (res.error || "thiếu tên truyện"));
    var info = [];
    var author = n.author || (n.author_rel && n.author_rel.name) || "";
    if (author) info.push("Tác giả: " + escapeHtml(author));
    if (n.title_cn) info.push("Tên gốc: " + escapeHtml(n.title_cn));
    if (n.latest_chapter_number) info.push("Số chương: " + Number(n.latest_chapter_number));
    if (n.view) info.push("Lượt xem: " + Number(n.view));
    if (n.updated_at) info.push("Cập nhật: " + escapeHtml(String(n.updated_at).replace("T", " ").slice(0, 16)));
    if (Array.isArray(n.editions) && n.editions.length) {
        var editions = n.editions.map(function (item) { return escapeHtml(item.edition_name); });
        info.push("Bản nội dung: " + editions.join(", "));
    }
    return Response.success({
        name: n.title, author: author, cover: coverUrl(n.image_url),
        description: n.description || "", detail: info.join("<br>"),
        url: storyUrl(book.slug, book.edition),
        type: "novel", format: "novel", locale: "vi", ongoing: n.status !== "completed",
        genres: genreTabs(Array.isArray(n.categories) ? n.categories : [])
    });
}
