// Mirrors the site's homepage sections. Each section loads on its own through search.js with the
// section's "Xem tất cả" path, so the page appears at once and rows fill in parallel.
function section(id, title, type, input) {
    return {
        id: id,
        title: title,
        type: type,
        script: "search.js",
        input: input,
        more: { type: "list", name: title, script: "search.js", input: input }
    };
}

function execute() {
    var years = [];
    var now = new Date().getFullYear();
    for (var y = now; y >= now - 5; y--) {
        years.push({
            name: "Top " + y,
            action: { type: "list", name: "Truyện hay nhất " + y, script: "search.js", input: "/xep-hang/top-truyen-" + y }
        });
    }
    return Response.success([
        section("latest", "Mới cập nhật", "horizontal_list", "/tim-truyen"),
        section("view_week", "Đọc nhiều tuần", "ranking", "/tim-truyen?sort=view_week"),
        section("view_month", "Xem nhiều tháng", "ranking", "/tim-truyen?sort=view_month"),
        section("push_week", "Đề cử tuần", "horizontal_list", "/tim-truyen?sort=push_week"),
        section("push_month", "Đề cử tháng", "horizontal_list", "/tim-truyen?sort=push_month"),
        section("qd_ticket", "Top Vé Tháng Qidian", "ranking", "/xep-hang/ve-thang"),
        section("qd_sale", "Top Mua Ngày Qidian", "ranking", "/xep-hang/ban-chay"),
        section("qd_view", "Top View Tuần Qidian", "ranking", "/xep-hang/chi-so-doc"),
        { id: "years", title: "Top Truyện Hay Nhất Theo Năm", type: "chip", items: years }
    ]);
}
