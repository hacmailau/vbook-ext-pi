load('config.js');

function execute(url) {
    url = normalizeUrl(url).replace(/\/$/, "");
    var response = fetch(url);
    if (!response.ok) return Response.error("HTTP " + response.status);
    var html = response.text();
    if (isCloudflare(html)) return Response.error(CF_MESSAGE);
    var box = Html.parse(html).select("#ds-chuong").first();
    if (!box) return Response.error("Không tìm thấy danh sách chương.");

    var novelId = box.attr("data-novel-id");
    var source = box.attr("data-default-source") || box.attr("data-active-source");
    var basePath = box.attr("data-base-path");
    if (!novelId || !source || !basePath) return Response.error("Thiếu mã truyện hoặc nguồn chương.");

    var api = BASE_URL + "/data/chapters.json?novelId=" + novelId + "&source=" + encodeURIComponent(source) + "&limit=10000";
    var res = fetch(api, { headers: { "Accept": "application/json" } });
    if (!res.ok) return Response.error("HTTP " + res.status + " khi tải mục lục.");
    var text = res.text();
    if (isCloudflare(text)) return Response.error(CF_MESSAGE);
    var items = JSON.parse(text).items || [];

    var chapters = [];
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        chapters.push({
            name: it.title,
            url: absUrl(basePath + "/" + it.sourceName + "/" + it.slug),
            description: "",
            lock: !!it.isLocked,
            pay: !!it.isVip
        });
    }
    if (chapters.length === 0) return Response.error("Mục lục trống.");
    return Response.success(chapters);
}
