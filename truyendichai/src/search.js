load('config.js');

// query is a keyword, or a "/"-prefixed listing path passed from home/genre tabs.
function execute(query, page) {
    query = query || "";
    page = page || "1";
    var url;
    if (query.indexOf("/") === 0 || query.indexOf("http") === 0) {
        var base = absUrl(query);
        url = base + (base.indexOf("?") === -1 ? "?" : "&") + "page=" + page;
    } else {
        url = BASE_URL + "/tim-truyen?q=" + encodeURIComponent(query) + "&page=" + page;
    }
    var response = fetch(url);
    if (!response.ok) return Response.error("HTTP " + response.status);
    var html = response.text();
    if (isCloudflare(html)) return Response.error(CF_MESSAGE);
    var doc = Html.parse(html);

    var items = [];
    var cards = doc.select("main article");
    for (var i = 0; i < cards.size(); i++) {
        var el = cards.get(i);
        var link = el.select("h2 a, h3 a").first();
        if (!link) continue;
        var spans = el.select("span");
        var meta = [];
        for (var s = 0; s < spans.size() && s < 2; s++) meta.push(spans.get(s).text().replace(/^·\s*/, ""));
        items.push({
            name: link.text(),
            link: absUrl(link.attr("href")),
            cover: absUrl(el.select("img").attr("src")),
            referrerpolicy: "no-referrer",
            description: meta.join(" · "),
            host: BASE_URL
        });
    }

    var next = "";
    var pages = doc.select("a[href*=\"page=\"]");
    for (var k = 0; k < pages.size(); k++) {
        if (pages.get(k).text().indexOf("Sau") >= 0) { next = String(parseInt(page) + 1); break; }
    }
    return Response.success(items, next);
}
