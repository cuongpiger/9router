// tests/unit/toolcall-arguments.test.js
import { describe, it, expect } from "vitest";
import { ensureToolCallIds } from "open-sse/translator/concerns/toolCall.js";

// Regression: GreenNode (and other Jinja-templated backends) 500 with
// "Object of type Undefined is not JSON serializable" when an assistant
// tool_call is serialized WITHOUT an `arguments` key. JSON.stringify drops
// keys whose value is `undefined`, so any tool_call left with missing/undefined
// arguments reaches the backend without the field, and its chat template's
// `arguments | tojson` blows up on Jinja's Undefined.
//
// ensureToolCallIds must guarantee every tool_call.function.arguments is a
// JSON string after normalization.
describe("ensureToolCallIds — arguments normalization", () => {
  it("backfills missing arguments to '{}' (no-parameter tool call)", () => {
    const body = {
      messages: [
        {
          role: "assistant",
          tool_calls: [
            { id: "call_1", type: "function", function: { name: "get_time" } },
          ],
        },
      ],
    };

    ensureToolCallIds(body);

    const tc = body.messages[0].tool_calls[0];
    expect(typeof tc.function.arguments).toBe("string");
    expect(tc.function.arguments).toBe("{}");
    // The key must survive JSON.stringify (the actual failure mode)
    expect(JSON.stringify(tc)).toContain('"arguments"');
  });

  it("backfills null/undefined arguments to '{}'", () => {
    const body = {
      messages: [
        {
          role: "assistant",
          tool_calls: [
            { id: "call_a", type: "function", function: { name: "f", arguments: null } },
            { id: "call_b", type: "function", function: { name: "g", arguments: undefined } },
            { id: "call_c", type: "function", function: { name: "h", arguments: "" } },
          ],
        },
      ],
    };

    ensureToolCallIds(body);

    for (const tc of body.messages[0].tool_calls) {
      expect(typeof tc.function.arguments).toBe("string");
      expect(tc.function.arguments).toBe("{}");
      expect(JSON.stringify(tc)).toContain('"arguments"');
    }
  });

  it("stringifies object arguments (unchanged behavior)", () => {
    const body = {
      messages: [
        {
          role: "assistant",
          tool_calls: [
            { id: "call_1", type: "function", function: { name: "f", arguments: { a: 1 } } },
          ],
        },
      ],
    };

    ensureToolCallIds(body);

    expect(body.messages[0].tool_calls[0].function.arguments).toBe('{"a":1}');
  });

  it("preserves valid string arguments untouched", () => {
    const body = {
      messages: [
        {
          role: "assistant",
          tool_calls: [
            { id: "call_1", type: "function", function: { name: "f", arguments: '{"x":2}' } },
          ],
        },
      ],
    };

    ensureToolCallIds(body);

    expect(body.messages[0].tool_calls[0].function.arguments).toBe('{"x":2}');
  });
});
