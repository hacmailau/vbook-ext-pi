var LLM_NAME = "9Router";
var LLM_ENDPOINT = "https://phuocpham.tail2c7010.ts.net/v1/chat/completions";
var LLM_DEFAULT_MODEL = "cbai/deepseek-v4.1-flash";
var LLM_ANALYSIS_MODEL = "cbai/deepseek-v4.1-flash";
var LLM_SUPPORTS_TEMPERATURE = true;
var LLM_TEMPERATURE_NOTE = "";
var LLM_ROTATE_KEY_STATUSES = { 401: true, 402: true, 403: true, 429: true };
// Model ids are the router's "provider/model" ids; keep this table in sync with model.js.
var LLM_MODEL_INFO = {
    "cbai/deepseek-v4.1-flash": { apiModel: "cbai/deepseek-v4.1-flash" },
    "cx/gpt-6-luna[1m]": { apiModel: "cx/gpt-6-luna[1m]" }
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
    var body = {
        model: info.apiModel,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText }
        ],
        max_tokens: options.maxTokens || 4096,
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
