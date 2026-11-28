load('config.js');

function execute() {
    var sections = LISTS.map(function (list) {
        var input = "list:" + list[0];
        return {
            id: list[0], title: list[1], type: "horizontal_list", script: "search.js", input: input,
            more: { type: "list", name: list[1], script: "search.js", input: input }
        };
    });
    var res = apiGet("/api/categories");
    var tabs = Array.isArray(res.data) ? genreTabs(res.data) : [];
    if (tabs.length) {
        sections.push({ id: "genres", title: "Thể Loại", type: "chip", items: tabs.map(function (genre) {
            return { name: genre.title, action: {
                type: "list", name: genre.title, script: genre.script, input: genre.input
            } };
        }) });
    }
    return Response.success(sections);
}
