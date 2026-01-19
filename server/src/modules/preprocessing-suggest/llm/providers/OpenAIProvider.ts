// server/modules/preprocessing-suggest/llm/providers/OpenAIProvider.ts

import OpenAI from "openai";
import type { LLMProvider } from "../provider";
import type { DatasetContext, SuggestResponse } from "../types";
import cfg from "@config/index";

type JsonSchema = Record<string, any>;

function clamp01(n: unknown, fallback = 0.6) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(1, x));
}

/**
 * IMPORTANT (GPT-4 compatibility):
 * - GPT-4 does NOT support Responses API Structured Outputs (text.format: json_schema).
 * - Use function calling (tools) and parse function_call.arguments instead.
 *
 * Schema constraints you already follow (good practice for reliability):
 * - For object schemas: additionalProperties: false
 * - Avoid oneOf/anyOf/allOf
 * - If properties is present, required must include all keys
 */
const SUGGEST_RESPONSE_SCHEMA: JsonSchema = {
  // Function/tool name
  name: "preprocessing_suggestion",
  // Tool "parameters" schema (JSON Schema)
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      preprocessingConfig: {
        type: "object",
        additionalProperties: false,
        properties: {
          version: { type: "string", enum: ["1.0"] },
          steps: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                task: { type: "string" },
                method: {
  type: "string",
  enum: [
    "categorical_unknown",
    "categorical_mode",
    "numeric_median",
    "numeric_mean",
    "numeric_constant",
    "standard",
    "rare_to_other",
    "auto",
    "zscore",
    "minmax",
    "none"
  ],
},

                appliesTo: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    types: {
                      type: "array",
                      items: { type: "string", enum: ["categorical", "numeric"] },
                    },
                    columns: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["types", "columns"],
                },
                params: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    // Use "" when not applicable; downstream normalizer can drop empties.
                    one_hot_max_levels: { type: "string" },
                    rare_prop_threshold: { type: "string" },
                    high_cardinality_threshold: { type: "string" },
                    strategy: { type: "string" },
                    fill_value: { type: "string" },
                    clip_min: { type: "string" },
                    clip_max: { type: "string" },
                    zscore_center: { type: "string" }, // "true"/"false"/""
                    zscore_scale: { type: "string" }, // "true"/"false"/""
                    minmax_min: { type: "string" },
                    minmax_max: { type: "string" },
                  },
                  required: [
                    "one_hot_max_levels",
                    "rare_prop_threshold",
                    "high_cardinality_threshold",
                    "strategy",
                    "fill_value",
                    "clip_min",
                    "clip_max",
                    "zscore_center",
                    "zscore_scale",
                    "minmax_min",
                    "minmax_max",
                  ],
                },
              },
              required: ["task", "method", "appliesTo", "params"],
            },
          },
        },
        required: ["version", "steps"],
      },
      rationale: { type: "array", items: { type: "string" } },
      confidence: { type: "number" },
      warnings: { type: "array", items: { type: "string" } },
    },
    required: ["preprocessingConfig", "rationale", "confidence", "warnings"],
  },
};

function buildPrompt(ctx: DatasetContext) {
  const colSummary = ctx.columns.map((c) => ({
    name: c.name,
    inferredType: c.inferredType,
    sampleValues: (c.sampleValues || []).slice(0, 8),
    missingRate: (c as any).missingRate,
    uniqueCount: (c as any).uniqueCount,
  }));

  const instructions = [
    "You are an expert data preprocessing assistant.",
    "Your job is to propose a preprocessingConfig compatible with an R-engine pipeline.",
    "",
    "IMPORTANT: You MUST use ONLY the following tasks and methods (exact strings).",
    "",
    "Allowed tasks and methods:",
    "- missing_values: categorical_unknown | categorical_mode | numeric_median | numeric_mean | numeric_constant",
    "- label_cleaning: standard",
    "- reduce_cardinality: rare_to_other",
    "- encoding: auto",
    "- scaling: zscore | minmax | none",
    "",
    "Hard constraints:",
    "- Do NOT invent new task names or method names.",
    "- Do NOT use ML library names like 'mean', 'median', 'most_frequent', 'one_hot'.",
    "- Encoding must ALWAYS use method 'auto'. Never output 'one_hot'.",
    "",
    "You MUST call the function tool to return the final answer.",
    "When producing the tool arguments:",
    "- Each step MUST include appliesTo.types and appliesTo.columns (arrays). Use [] if not applicable.",
    "- At least one of appliesTo.types or appliesTo.columns must be non-empty per step.",
    "- Each step MUST include params with ALL param keys present.",
    "- If a param is not applicable, set its value to the empty string \"\".",
    "- For boolean-like params in this schema, use \"true\" or \"false\" (or \"\").",
    "",
    "Prefer simple, robust defaults and minimal params.",
  ].join("\n");

  const userPayload = {
    dataset: { filename: ctx.filename || "" },
    columns: colSummary,
    sampleRows: (ctx.sampleRows || []).slice(0, 12),
  };

  return { instructions, userPayload };
}


function extractFunctionCallArguments(resp: any, toolName: string): string {
  // Responses API generally returns items in resp.output
  const output: any[] = Array.isArray(resp?.output) ? resp.output : [];

  // The function call item can appear directly in output
  const direct = output.find(
    (item) => item?.type === "function_call" && item?.name === toolName
  );
  if (direct?.arguments && typeof direct.arguments === "string") return direct.arguments;

  // Or inside "response.output" shapes depending on SDK versions; be defensive
  for (const item of output) {
    const nested = item?.content;
    if (Array.isArray(nested)) {
      const fc = nested.find((c: any) => c?.type === "function_call" && c?.name === toolName);
      if (fc?.arguments && typeof fc.arguments === "string") return fc.arguments;
    }
  }

  // As a last resort, some SDK builds also provide output_text; but for tool_choice we expect a tool call
  const maybeText = (resp as any)?.output_text;
  if (typeof maybeText === "string" && maybeText.trim().startsWith("{")) {
    return maybeText;
  }

  throw new Error(`OpenAI response missing function_call arguments for tool "${toolName}"`);
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private timeoutMs: number;
  private maxOutputTokens: number;

  constructor() {
    const apiKey = cfg.openAI.apiKey;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
    }

    this.client = new OpenAI({ apiKey });
    this.model = String(cfg.openAI.model); // keep your gpt-4 model value
    this.timeoutMs = Number(cfg.openAI.timeout);
    this.maxOutputTokens = Number(cfg.openAI.maxTokens);
  }

  async suggestPreprocessing(ctx: DatasetContext): Promise<SuggestResponse> {
    const { instructions, userPayload } = buildPrompt(ctx);

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), this.timeoutMs);

    try {
      const resp = await this.client.responses.create(
        {
          model: this.model,
          store: false,
          max_output_tokens: this.maxOutputTokens,
          input: [
            { role: "system", content: instructions },
            {
              role: "user",
              content: [{ type: "input_text", text: JSON.stringify(userPayload) }],
            },
          ],
          tools: [
            {
              type: "function",
              name: SUGGEST_RESPONSE_SCHEMA.name,
              description: "Return a preprocessing suggestion object exactly matching the provided schema.",
              parameters: SUGGEST_RESPONSE_SCHEMA.schema,
              strict: false,
            },
          ],
          // Force the model to call your tool (Option A)
          tool_choice: { type: "function", name: SUGGEST_RESPONSE_SCHEMA.name },
        },
        { signal: ac.signal as any }
      );

      const argsText = extractFunctionCallArguments(resp as any, SUGGEST_RESPONSE_SCHEMA.name);
      const parsed = JSON.parse(argsText);

      return {
        preprocessingConfig: parsed.preprocessingConfig,
        rationale: Array.isArray(parsed.rationale) ? parsed.rationale : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        confidence: clamp01(parsed.confidence, 0.6),
      };
    } catch (err: any) {
      const message =
        err?.name === "AbortError"
          ? `OpenAI request timed out after ${this.timeoutMs}ms`
          : err?.message || "OpenAI request failed";
      throw new Error(message);
    } finally {
      clearTimeout(t);
    }
  }
}
