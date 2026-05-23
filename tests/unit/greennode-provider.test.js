// tests/unit/greennode-provider.test.js
import { describe, it, expect } from "vitest";

// Aliases resolved by vitest.config.js: "@" → src/, "open-sse" → open-sse/
// These imports will fail until Task 2 adds the entries.
// Run: cd tests && npm test -- greennode-provider
// Expected: FAIL — greennode not found in imported modules

describe("GreenNode provider config", () => {
  it("exists in APIKEY_PROVIDERS with correct fields", async () => {
    const { APIKEY_PROVIDERS } = await import("@/shared/constants/providers.js");
    const p = APIKEY_PROVIDERS["greennode"];
    expect(p).toBeDefined();
    expect(p.id).toBe("greennode");
    expect(p.alias).toBe("gn");
    expect(p.name).toBe("GreenNode");
    expect(p.notice.apiKeyUrl).toBe("https://aiplatform.console.vngcloud.vn/keys");
    expect(p.serviceKinds).toContain("llm");
  });

  it("has a static model list in PROVIDER_MODELS", async () => {
    const { PROVIDER_MODELS } = await import("open-sse/config/providerModels.js");
    const models = PROVIDER_MODELS["greennode"];
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].id).toBe("qwen/qwen3-vl-235b-a22b-instruct");
    expect(models[0].name).toBe("Qwen3-VL-235B-A22B-Instruct");
  });

  it("has correct backend proxy config in PROVIDERS", async () => {
    const { PROVIDERS } = await import("open-sse/config/providers.js");
    const p = PROVIDERS["greennode"];
    expect(p).toBeDefined();
    expect(p.baseUrl).toBe("https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1/chat/completions");
    expect(p.format).toBe("openai");
  });

  it("has an endpoint entry in PROVIDER_ENDPOINTS", async () => {
    const { PROVIDER_ENDPOINTS } = await import("@/shared/constants/config.js");
    expect(PROVIDER_ENDPOINTS["greennode"]).toBe(
      "https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1/chat/completions"
    );
  });
});
