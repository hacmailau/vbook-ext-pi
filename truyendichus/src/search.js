load('config.js');

function execute(query, page) {
    query = String(query || "").trim();
    var p = parseInt(page, 10);
    if (!isFinite(p) || p < 1) p = 1;
    var params = { page: p, size: 24 };
    var m = query.match(/^(list|cat):(.+)$/);
    var path = "/api/novels/search";
    if (m) {
        if (!validSlug(m[2])) return Response.error("Danh mục không hợp lệ.");
        path = "/api/" + (m[1] === "list" ? "lists/" : "categories/") + m[2];
    } else if (query) {
        params.q = query;
    } else {
        path = "/api/lists/truyen-moi";
    }
    var res = apiGet(path, params);
    var data = res.data;
    if (!data || !Array.isArray(data.items)) {
        return Response.error("Không tải được danh sách: " + (res.error || "sai định dạng"));
    }
    var items = data.items.map(function (n) {
        var info = [], tags = [];
        if (n.author) info.push(n.author);
        if (n.latest_chapter_number) info.push(n.latest_chapter_number + " chương");
        if (n.status === "completed") tags.push("Full");
        if (n.has_ai) tags.push("AI");
        return {
            name: n.title, link: storyUrl(n.slug, ""), cover: coverUrl(n.image_url),
            description: info.join(" · "), tag: tags.join(" · ")
        };
    });
    return Response.success(items, items.length && p * params.size < Number(data.total) ? String(p + 1) : "");
}
