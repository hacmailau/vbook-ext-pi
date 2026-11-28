load('config.js');

function execute() {
    var response = fetch(BASE_URL + "/");
    if (!response.ok) return Response.error("HTTP " + response.status);
    var html = response.text();
    if (isCloudflare(html)) return Response.error(CF_MESSAGE);
    var links = Html.parse(html).select("a[href^=\"/the-loai/\"]");
    var seen = {};
    var genres = [];
    for (var i = 0; i < links.size(); i++) {
        var href = links.get(i).attr("href");
        var title = links.get(i).text().trim();
        if (!title || seen[href]) continue;
        seen[href] = true;
        genres.push({ title: title, input: href, script: "search.js" });
    }
    if (genres.length === 0) return Response.error("Không tìm thấy thể loại.");
    return Response.success(genres);
}
