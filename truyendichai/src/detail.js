load('config.js');

// The .md variant of a page has clean front matter (author, genre, status...) and the intro section.
function parseFrontMatter(md) {
    var out = {};
    var m = md.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return out;
    var lines = m[1].split("\n");
    for (var i = 0; i < lines.length; i++) {
        var kv = lines[i].match(/^([a-z_]+):\s*(.*)$/);
        if (!kv) continue;
        var v = kv[2];
        if (v.charAt(0) === '"') {
            try { v = JSON.parse(v); } catch (e) { v = v.replace(/^"|"$/g, ""); }
        }
        out[kv[1]] = String(v);
    }
    return out;
}

function section(md, heading) {
    var i = md.indexOf("## " + heading);
    if (i < 0) return "";
    var rest = md.substring(i + heading.length + 3);
    var j = rest.indexOf("\n## ");
    return (j >= 0 ? rest.substring(0, j) : rest).trim();
}

function execute(url) {
    url = normalizeUrl(url).replace(/\/$/, "");
    var response = fetch(url);
    if (!response.ok) return Response.error("HTTP " + response.status);
    var html = response.text();
    if (isCloudflare(html)) return Response.error(CF_MESSAGE);
    var doc = Html.parse(html);

    var mdResponse = fetch(url + ".md");
    var md = mdResponse.ok ? String(mdResponse.text()) : "";
    var fm = parseFrontMatter(md);

    var intro = section(md, "Giới thiệu");
    var description = intro
        ? escapeHtml(intro).split(/\n+/).join("<br>")
        : doc.select("meta[name=\"description\"]").attr("content");

    var genres = [];
    if (fm.genre) {
        var links = doc.select("a[href^=\"/the-loai/\"]");
        for (var i = 0; i < links.size(); i++) {
            if (links.get(i).text().trim() === fm.genre) {
                genres.push({ title: fm.genre, input: links.get(i).attr("href"), script: "search.js" });
                break;
            }
        }
    }

    var info = [];
    if (fm.author) info.push("Tác giả: " + escapeHtml(fm.author));
    if (fm.original_title) info.push("Tên gốc: " + escapeHtml(fm.original_title));
    if (fm.chapters) info.push("Số chương: " + escapeHtml(fm.chapters));
    if (fm.tags) info.push("Tags: " + escapeHtml(fm.tags));
    var box = doc.select("#ds-chuong").first();
    if (box && box.attr("data-default-source")) info.push("Nguồn: " + escapeHtml(box.attr("data-default-source")));

    return Response.success({
        name: fm.title || doc.select("meta[property=\"og:title\"]").attr("content"),
        author: fm.author || "",
        cover: doc.select("meta[property=\"og:image\"]").attr("content"),
        description: description,
        detail: info.join("<br>"),
        url: url,
        type: "novel",
        format: "novel",
        ongoing: fm.status !== "completed",
        genres: genres
    });
}
