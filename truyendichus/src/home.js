load('config.js');

function execute() {
    return Response.success(LISTS.slice(0, 4).map(function (list) {
        return tab(list[1], "list:" + list[0]);
    }).concat([
        tab("Tiên Hiệp", "cat:tien-hiep"),
        tab("Huyền Huyễn", "cat:huyen-huyen"),
        tab("Đô Thị", "cat:do-thi")
    ]));
}
