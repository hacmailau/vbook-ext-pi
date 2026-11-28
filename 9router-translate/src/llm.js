var LLM_NAME = "9Router";
var LLM_ENDPOINT = "https://phuocpham.tail2c7010.ts.net/v1/chat/completions";
var LLM_DEFAULT_MODEL = "cbai/deepseek-v4.1-flash";
var LLM_ANALYSIS_MODEL = "cbai/deepseek-v4.1-flash";
var LLM_SUPPORTS_TEMPERATURE = true;
var LLM_TEMPERATURE_NOTE = "";
var LLM_ROTATE_KEY_STATUSES = { 401: true, 402: true, 403: true, 429: true };
// Model ids are the router's "provider/model" ids; keep this table in sync with model.js.
var LLM_MODEL_INFO = {
    "cbai/deepseek-v4.1-flash": { apiModel: "cbai/deepseek-v4.1-flash", maxOutput: 384000 },
    "cmc/deepseek/deepseek-v4.1-flash-fast": { apiModel: "cmc/deepseek/deepseek-v4.1-flash-fast", maxOutput: 384000 },
    "mistral/deepseek-v4-1-flash-1017": { apiModel: "mistral/deepseek-v4-1-flash-1017", maxOutput: 384000 },
    "oc/deepseek-v4.1-flash-free": { apiModel: "oc/deepseek-v4.1-flash-free", maxOutput: 32000 },
    "cx/gpt-6-luna[1m]": { apiModel: "cx/gpt-6-luna[1m]", maxOutput: 128000 },
    "cx/gpt-6.2-sol": { apiModel: "cx/gpt-6.2-sol", maxOutput: 128000 },
    "cx/gpt-6.2-sol[1m]": { apiModel: "cx/gpt-6.2-sol[1m]", maxOutput: 128000 },
    "cx/gpt-6.2-astra": { apiModel: "cx/gpt-6.2-astra", maxOutput: 128000 },
    "cx/gpt-6.2-astra[1m]": { apiModel: "cx/gpt-6.2-astra[1m]", maxOutput: 128000 },
    "gemini/gemini-4-hydrogen": { apiModel: "gemini/gemini-4-hydrogen", maxOutput: 65536 },
    "gemini/gemini-4-argon": { apiModel: "gemini/gemini-4-argon", maxOutput: 32768 },
    "gemini/gemini-3.8-flash": { apiModel: "gemini/gemini-3.8-flash", maxOutput: 65536 },
    "gemini/gemini-3.5-flash-lite": { apiModel: "gemini/gemini-3.5-flash-lite", maxOutput: 65536 },
    "gemini/gemma-4-31b-it": { apiModel: "gemini/gemma-4-31b-it", maxOutput: 32768 },
    "mistral/mistral-large-latest": { apiModel: "mistral/mistral-large-latest", maxOutput: 64000 },
    "mistral/zai-glm-5-3-flash": { apiModel: "mistral/zai-glm-5-3-flash", maxOutput: 128000 },
    "mmf/mimo-auto": { apiModel: "mmf/mimo-auto", maxOutput: 131072 },
    "oc/mimo-v2.6-flash-free": { apiModel: "oc/mimo-v2.6-flash-free", maxOutput: 32000 },
    "oc/hy4-flash-free": { apiModel: "oc/hy4-flash-free", maxOutput: 65536 },
    "oc/beam-free": { apiModel: "oc/beam-free", maxOutput: 131072 },
    "oc/iceman-free": { apiModel: "oc/iceman-free", maxOutput: 131072 },
    "oc/flint-40b-free": { apiModel: "oc/flint-40b-free", maxOutput: 65536 },
    "oc/nemotron-3.5-super-vl-free": { apiModel: "oc/nemotron-3.5-super-vl-free", maxOutput: 131072 },
    "oc/nemotron-3.5-lightning-free": { apiModel: "oc/nemotron-3.5-lightning-free", maxOutput: 262144 },
    "oc/seaglass-alpha-free": { apiModel: "oc/seaglass-alpha-free", maxOutput: 131072 },
    "oc/big-pickle": { apiModel: "oc/big-pickle", maxOutput: 32000 },
    "oc/jev-1.13-free": { apiModel: "oc/jev-1.13-free", maxOutput: 32000 }
};

function llmAddProviderConfig(config) {}

function llmNormalizeModel(model) {
    var selected = String(model || "").trim();
    return LLM_MODEL_INFO[selected] ? selected : LLM_DEFAULT_MODEL;
}

// options: { temperature, maxTokens, json }
function llmBuildBody(model, systemPrompt, userText, options) {
    options = options || {};
    var info = LLM_MODEL_INFO[llmNormalizeModel(model)];
    var maxTokens = options.maxTokens || 4096;
    if (info.maxOutput && maxTokens > info.maxOutput) maxTokens = info.maxOutput;
    var body = {
        model: info.apiModel,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText }
        ],
        max_tokens: maxTokens,
        stream: false
    };
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.json) body.response_format = { type: "json_object" };
    return body;
}

// Tries each key in order; rotates on auth/quota errors. Returns { text, finishReason, error, keyIndex }.
function llmRequest(apiKeys, body, timeout) {
    var payload = JSON.stringify(body);
    var lastError = "";
    for (var keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
        var response;
        try {
            response = fetch(LLM_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKeys[keyIndex]
                },
                body: payload,
                timeout: timeout || 120000
            });
        } catch (e) {
            lastError = LLM_NAME + ": " + String(e);
            continue;
        }

        if (!response.ok) {
            lastError = llmApiError(response);
            if (LLM_ROTATE_KEY_STATUSES[response.status]) continue;
            return { text: "", finishReason: "", error: lastError, keyIndex: keyIndex };
        }

        var data;
        try {
            data = JSON.parse(response.text());
        } catch (e2) {
            return { text: "", finishReason: "", error: LLM_NAME + " trả về dữ liệu không hợp lệ", keyIndex: keyIndex };
        }

        var choice = data && data.choices && data.choices.length > 0 ? data.choices[0] : null;
        var message = choice && choice.message ? choice.message : null;
        return {
            text: message && message.content ? String(message.content) : "",
            finishReason: choice && choice.finish_reason ? String(choice.finish_reason) : "",
            error: "",
            keyIndex: keyIndex
        };
    }
    return { text: "", finishReason: "", error: lastError || "Không có " + LLM_NAME + " API key khả dụng", keyIndex: -1 };
}

function llmApiError(response) {
    var message = "";
    try {
        var data = JSON.parse(response.text());
        if (data && data.error && data.error.message) message = String(data.error.message);
    } catch (e) {}
    return LLM_NAME + " HTTP " + response.status + (message ? ": " + message : "");
}
