export default {
  id: "greennode",
  alias: "greennode",
  aliases: ["gn"],
  uiAlias: "gn",
  category: "apikey",
  authType: "apikey",
  serviceKinds: ["llm"],
  display: {
    name: "GreenNode",
    icon: "cloud",
    color: "#00B04F",
    textIcon: "GN",
    website: "https://aiplatform.console.vngcloud.vn",
    notice: { apiKeyUrl: "https://aiplatform.console.vngcloud.vn/keys" },
  },
  transport: {
    baseUrl: "https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1/chat/completions",
    format: "openai",
    headers: {},
    // GreenNode caps: API rejects max_tokens > 32768 and inputs beyond the context window.
    maxTokensCap: 32768,
    maxInputTokens: 129024,
  },
  models: [
    { id: "qwen/qwen3-vl-235b-a22b-instruct", name: "Qwen3-VL-235B-A22B-Instruct", contextLength: 129024 },
    { id: "qwen/qwen3-235b-a22b-instruct-2507", name: "Qwen3-235B-A22B-Instruct-2507", contextLength: 129024 },
    { id: "qwen/qwen3-235b-a22b-thinking-2507", name: "Qwen3-235B-A22B-Thinking-2507", contextLength: 129024 },
    { id: "deepseek/deepseek-reasoner", name: "DeepSeek Reasoner", contextLength: 129024 },
    { id: "google/gemma-4-31b-it", name: "gemma-4-31b-it", contextLength: 129024 },
    { id: "openai/gpt-oss-120b", name: "gpt-oss-120b", contextLength: 129024 },
    { id: "openai/gpt-5", name: "gpt-5", contextLength: 129024 },
  ],
};
