import { DefaultExecutor } from "./default.js";
import { injectReasoningContent } from "../utils/reasoningContentInjector.js";

// Fields forwarded to GreenNode — all Claude-specific fields are stripped.
const ALLOWED_FIELDS = new Set([
  "model", "messages", "stream", "max_tokens",
  "temperature", "top_p", "stop", "n",
  "tools", "tool_choice"
]);

// These models reject max_tokens and require max_completion_tokens instead.
const MAX_COMPLETION_TOKENS_MODELS = new Set([
  "openai/gpt-5",
]);

export class GreenNodeExecutor extends DefaultExecutor {
  constructor() {
    super("greennode");
  }

  transformRequest(model, body, stream, credentials) {
    // 1. Apply reasoning-content injection (no-op for greennode models)
    let result = injectReasoningContent({ provider: this.provider, model, body });

    // 2. Cap output tokens
    if (this.config?.maxTokensCap && result.max_tokens > this.config.maxTokensCap) {
      result = { ...result, max_tokens: this.config.maxTokensCap };
    }

    // 3. Whitelist — strip all non-OpenAI fields (thinking, betas, extra_body, …)
    const clean = {};
    for (const key of ALLOWED_FIELDS) {
      if (result[key] !== undefined) clean[key] = result[key];
    }

    // 4. Rename max_tokens → max_completion_tokens for models that require it.
    if (MAX_COMPLETION_TOKENS_MODELS.has(model) && clean.max_tokens !== undefined) {
      clean.max_completion_tokens = clean.max_tokens;
      delete clean.max_tokens;
    }

    // 5. Fit the whole body (messages + tools + everything else) within the input limit.
    //    JSON.stringify length is used as a worst-case token estimate (1 char ≈ 1 token).
    const inputLimit = (this.config?.maxInputTokens || 129024) - 1024; // 1024-char safety margin
    const system = (clean.messages || []).filter(m => m.role === "system");
    let conv = (clean.messages || []).filter(m => m.role !== "system");

    if (conv.length === 0) return clean;

    // Fixed overhead = everything except the conv part of messages
    const fixedSize = JSON.stringify({ ...clean, messages: system }).length;
    let convBudget = inputLimit - fixedSize;

    if (convBudget <= 0) {
      // Even system + tools alone exceed the limit — strip tools and recalculate
      delete clean.tools;
      delete clean.tool_choice;
      const fixedNoTools = JSON.stringify({ ...clean, messages: system }).length;
      convBudget = inputLimit - fixedNoTools;
    }

    if (convBudget <= 0 || conv.length === 0) {
      // Absolute edge case: keep only the last message
      return { ...clean, messages: [...system, conv[conv.length - 1]] };
    }

    // Walk backwards, keeping conv messages that fit within convBudget
    const kept = [];
    let used = 0;
    for (let i = conv.length - 1; i >= 0; i--) {
      const sz = JSON.stringify(conv[i]).length;
      if (used + sz > convBudget && kept.length > 0) break;
      kept.unshift(conv[i]);
      used += sz;
    }

    // Hard-truncate the oldest kept message if it alone still blows the budget
    if (kept.length > 0) {
      const firstSz = JSON.stringify(kept[0]).length;
      const remainder = convBudget - (used - firstSz);
      if (firstSz > remainder && remainder > 0) {
        const raw = typeof kept[0].content === "string"
          ? kept[0].content
          : JSON.stringify(kept[0].content);
        kept[0] = { ...kept[0], content: raw.slice(0, Math.max(0, remainder - 50)) };
      }
    }

    return { ...clean, messages: [...system, ...kept] };
  }

  // Retry on 400: GreenNode occasionally rejects even after our size check
  // (tokenizer discrepancy). Halve the conv window up to 5 times.
  async execute(opts) {
    const { body, log } = opts;

    const system = (body.messages || []).filter(m => m.role === "system");
    const allConv = (body.messages || []).filter(m => m.role !== "system");
    let convCount = allConv.length;

    for (let attempt = 0; attempt < 5; attempt++) {
      const messages = [...system, ...allConv.slice(allConv.length - convCount)];
      const result = await super.execute({ ...opts, body: { ...body, messages } });

      if (result.response.status !== 400) return result;
      if (convCount <= 1) return result;

      // Drain the error body to release the connection before retrying
      try { await result.response.text(); } catch (_) {}

      convCount = Math.max(1, Math.floor(convCount / 2));
      log?.warn?.("GREENNODE", `input too long, retrying with last ${convCount} messages (attempt ${attempt + 1})`);
    }

    // Absolute fallback: system + last message only
    const messages = [...system, ...allConv.slice(-1)];
    return super.execute({ ...opts, body: { ...body, messages } });
  }
}
