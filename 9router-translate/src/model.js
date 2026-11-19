function execute() {
    return Response.success([
        {
            id: "cbai/deepseek-v4.1-flash",
            name: "DeepSeek V4.1 Flash",
            description: "Mặc định; DeepSeek V4.1 Flash qua 9Router, nhanh và rẻ cho khối lượng dịch lớn",
            isNetworkRequired: true
        },
        {
            id: "cx/gpt-6-luna[1m]",
            name: "GPT-6 Luna",
            description: "Model thứ hai trên 9Router",
            isNetworkRequired: true
        }
    ]);
}
