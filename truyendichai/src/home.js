function execute() {
    return Response.success([
        { title: "Mới cập nhật", input: "/tim-truyen", script: "search.js" },
        { title: "Xếp hạng", input: "/tim-truyen?sort=view_all", script: "search.js" },
        { title: "Tiên Hiệp", input: "/the-loai/tien-hiep", script: "search.js" },
        { title: "Huyền Huyễn", input: "/the-loai/huyen-huyen", script: "search.js" },
        { title: "Đô Thị", input: "/the-loai/do-thi", script: "search.js" }
    ]);
}
