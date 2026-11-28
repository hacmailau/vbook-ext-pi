load('config.js');

function contentToHtml(content) {
    var text = String(content || "").trim();
    if (/<(?:p|div|section|blockquote|ul|ol|h[1-6])(?:\s|>)/i.test(text)) return text;
    var parts = text.split(/<br\s*\/?>\s*<br\s*\/?>/i);
    var html = "";
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i].trim();
        if (part && part.replace(/<br\s*\/?>/gi, "").trim()) html += "<p>" + part + "</p>";
    }
    return html;
}

function execute(url) {
    var book = parseStory(url, true);
    if (!book) return Response.error("URL chương không hợp lệ.");
    var path = chapterPath(book.slug) + "/" + book.number;
    var res = apiGet(path, { edition_type: book.edition });
    if (res.error) return Response.error("Không tải được chương: " + res.error);
    var chapter = res.data;
    var html = chapter && contentToHtml(chapter.content);
    if (!html && chapter && chapter.trust_challenge === "verify_now") {
        res = apiGet(path, { edition_type: book.edition });
        if (res.error) return Response.error("Không tải được chương: " + res.error);
        chapter = res.data;
        html = chapter && contentToHtml(chapter.content);
    }
    if (!html) return Response.error("Website chưa trả nội dung chương cho bản này.");
    var note = chapter.is_raw ? "<p><em>(Bản convert thô, chưa qua dịch AI.)</em></p>" : "";
    return Response.success(note + html, chapterTitle(book.number, chapter.title));
}
