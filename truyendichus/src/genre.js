load('config.js');

function execute() {
    var res = apiGet("/api/categories");
    var tabs = Array.isArray(res.data) ? genreTabs(res.data) : [];
    if (!tabs.length) return Response.error("Không tải được thể loại: " + (res.error || "danh mục trống"));
    return Response.success(tabs);
}
