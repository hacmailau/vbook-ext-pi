function execute() {
    return Response.success([
        {
            id: "cbai/deepseek-v4.1-flash",
            name: "DeepSeek V4.1 Flash (CBAI)",
            description: "Mặc định; DeepSeek V4.1 Flash qua CBAI (ctx 1M, out 384K), nhanh và rẻ cho khối lượng dịch lớn",
            isNetworkRequired: true
        },
        {
            id: "cmc/deepseek/deepseek-v4.1-flash-fast",
            name: "DeepSeek V4.1 Flash Fast (CMC)",
            description: "DeepSeek V4.1 Flash Fast qua CMC (ctx 1M, out 384K), tốc độ cao",
            isNetworkRequired: true
        },
        {
            id: "mistral/deepseek-v4-1-flash-1017",
            name: "DeepSeek V4.1 Flash 1017 (Mistral)",
            description: "DeepSeek V4.1 Flash qua Mistral (ctx 1M, out 384K)",
            isNetworkRequired: true
        },
        {
            id: "oc/deepseek-v4.1-flash-free",
            name: "DeepSeek V4.1 Flash Free (OC)",
            description: "DeepSeek V4.1 Flash miễn phí qua OC (ctx 200K, out 32K)",
            isNetworkRequired: true
        },
        {
            id: "cx/gpt-6-luna[1m]",
            name: "GPT-6 Luna [1M] (CX)",
            description: "GPT-6 Luna qua CX (ctx 872K, out 128K), ổn định ngữ cảnh dài",
            isNetworkRequired: true
        },
        {
            id: "cx/gpt-6.2-sol",
            name: "GPT-6.2 Sol (CX)",
            description: "GPT-6.2 Sol qua CX (ctx 1.05M, out 128K)",
            isNetworkRequired: true
        },
        {
            id: "cx/gpt-6.2-sol[1m]",
            name: "GPT-6.2 Sol [1M] (CX)",
            description: "GPT-6.2 Sol bản 1M qua CX (ctx 1.05M, out 128K)",
            isNetworkRequired: true
        },
        {
            id: "cx/gpt-6.2-astra",
            name: "GPT-6.2 Astra (CX)",
            description: "GPT-6.2 Astra qua CX (ctx 1.05M, out 128K)",
            isNetworkRequired: true
        },
        {
            id: "cx/gpt-6.2-astra[1m]",
            name: "GPT-6.2 Astra [1M] (CX)",
            description: "GPT-6.2 Astra bản 1M qua CX (ctx 1.05M, out 128K)",
            isNetworkRequired: true
        },
        {
            id: "gemini/gemini-4-hydrogen",
            name: "Gemini 4 Hydrogen (Gemini)",
            description: "Gemini 4 Hydrogen (ctx 1M, out 65K), suy luận sâu",
            isNetworkRequired: true
        },
        {
            id: "gemini/gemini-4-argon",
            name: "Gemini 4 Argon (Gemini)",
            description: "Gemini 4 Argon (ctx 1M, out 32K), suy luận tốt",
            isNetworkRequired: true
        },
        {
            id: "gemini/gemini-3.8-flash",
            name: "Gemini 3.8 Flash (Gemini)",
            description: "Gemini 3.8 Flash (ctx 1M, out 65K), cân bằng tốc độ và chất lượng",
            isNetworkRequired: true
        },
        {
            id: "gemini/gemini-3.5-flash-lite",
            name: "Gemini 3.5 Flash Lite (Gemini)",
            description: "Gemini 3.5 Flash Lite (ctx 1M, out 65K), nhẹ và nhanh",
            isNetworkRequired: true
        },
        {
            id: "gemini/gemma-4-31b-it",
            name: "Gemma 4 31B IT (Gemini)",
            description: "Gemma 4 31B IT (ctx 262K, out 32K), không reasoning, phản hồi nhanh",
            isNetworkRequired: true
        },
        {
            id: "mistral/mistral-large-latest",
            name: "Mistral Large Latest (Mistral)",
            description: "Mistral Large (ctx 1M, out 64K), không reasoning, dịch thẳng mạch lạc",
            isNetworkRequired: true
        },
        {
            id: "mistral/zai-glm-5-3-flash",
            name: "ZAI GLM-5.3 Flash (Mistral)",
            description: "ZAI GLM-5.3 Flash qua Mistral (ctx 200K, out 128K), mạnh tiếng Trung",
            isNetworkRequired: true
        },
        {
            id: "mmf/mimo-auto",
            name: "MiMo Auto (MMF)",
            description: "MiMo Auto qua MMF (ctx 262K, out 131K)",
            isNetworkRequired: true
        },
        {
            id: "oc/mimo-v2.6-flash-free",
            name: "MiMo V2.6 Flash Free (OC)",
            description: "MiMo V2.6 Flash miễn phí qua OC (ctx 200K, out 32K)",
            isNetworkRequired: true
        },
        {
            id: "oc/hy4-flash-free",
            name: "HY4 Flash Free (OC)",
            description: "HY4 Flash miễn phí qua OC (ctx 1M, out 65K)",
            isNetworkRequired: true
        },
        {
            id: "oc/beam-free",
            name: "Beam Free (OC)",
            description: "Beam miễn phí qua OC (ctx 1M, out 131K)",
            isNetworkRequired: true
        },
        {
            id: "oc/iceman-free",
            name: "Iceman Free (OC)",
            description: "Iceman miễn phí qua OC (ctx 262K, out 131K)",
            isNetworkRequired: true
        },
        {
            id: "oc/flint-40b-free",
            name: "Flint 40B Free (OC)",
            description: "Flint 40B miễn phí qua OC (ctx 262K, out 65K)",
            isNetworkRequired: true
        },
        {
            id: "oc/nemotron-3.5-super-vl-free",
            name: "Nemotron 3.5 Super VL Free (OC)",
            description: "Nemotron 3.5 Super VL miễn phí qua OC (ctx 1M, out 131K)",
            isNetworkRequired: true
        },
        {
            id: "oc/nemotron-3.5-lightning-free",
            name: "Nemotron 3.5 Lightning Free (OC)",
            description: "Nemotron 3.5 Lightning miễn phí qua OC (ctx 262K, out 262K)",
            isNetworkRequired: true
        },
        {
            id: "oc/seaglass-alpha-free",
            name: "Seaglass Alpha Free (OC)",
            description: "Seaglass Alpha miễn phí qua OC (ctx 1M, out 131K)",
            isNetworkRequired: true
        },
        {
            id: "oc/big-pickle",
            name: "Big Pickle (OC)",
            description: "Big Pickle miễn phí qua OC (ctx 200K, out 32K)",
            isNetworkRequired: true
        },
        {
            id: "oc/jev-1.13-free",
            name: "Jev 1.13 Free (OC)",
            description: "Jev 1.13 miễn phí qua OC (ctx 64K, out 32K), không reasoning",
            isNetworkRequired: true
        }
    ]);
}
