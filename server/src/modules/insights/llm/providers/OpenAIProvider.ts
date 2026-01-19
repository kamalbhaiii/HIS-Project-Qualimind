import OpenAI from "openai";
import cfg from "@config/index";
import type { InsightsLLMProvider } from "../provider";
import type { InsightsContext, GenerateInsightsResponse } from "../types";

type JsonSchema = Record<string, any>;

function clamp01(n: unknown, fallback = 0.6) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(1, x));
}

function extractFunctionCallArguments(resp: any, toolName: string): string {
  const output: any[] = Array.isArray(resp?.output) ? resp.output : [];

  const direct = output.find(
    (item) => item?.type === "function_call" && item?.name === toolName
  );
  if (direct?.arguments && typeof direct.arguments === "string") return direct.arguments;

  for (const item of output) {
    const nested = item?.content;
    if (Array.isArray(nested)) {
      const fc = nested.find((c: any) => c?.type === "function_call" && c?.name === toolName);
      if (fc?.arguments && typeof fc.arguments === "string") return fc.arguments;
    }
  }

  const maybeText = (resp as any)?.output_text;
  if (typeof maybeText === "string" && maybeText.trim().startsWith("{")) return maybeText;

  throw new Error(`OpenAI response missing function_call arguments for tool "${toolName}"`);
}

const INSIGHTS_TOOL_SCHEMA: JsonSchema = {
  name: "dataset_insights",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      executiveSummary: { type: "string" },
      keyFindings: { type: "array", items: { type: "string" } },
      dataQualityObservations: { type: "array", items: { type: "string" } },
      correlationInsights: { type: "array", items: { type: "string" } },
      preprocessingNotes: { type: "array", items: { type: "string" } },
      recommendedNextSteps: { type: "array", items: { type: "string" } },
      confidence: { type: "number" },
      warnings: { type: "array", items: { type: "string" } },
    },
    required: [
      "executiveSummary",
      "keyFindings",
      "dataQualityObservations",
      "correlationInsights",
      "preprocessingNotes",
      "recommendedNextSteps",
      "confidence",
      "warnings",
    ],
  },
};

function buildPrompt(ctx: InsightsContext) {
  const instructions = [
    "You are a senior data analyst reviewing a dataset preprocessing run.",
    "Your task: generate concise, decision-ready insights and a conclusion based on the provided context.",
    "",
    "Focus areas:",
    "- Data quality and missingness handling outcomes",
    "- Label cleaning effects (normalization, casing, token normalization)",
    "- Scaling stats interpretation (mean/sd sanity checks, potential outliers)",
    "- Correlation results (top pairs, n_used caveats, interpretation risks)",
    "- Operational notes (warnings, executed steps, column actions)",
    "",
    "Rules:",
    "- Be specific to the given dataset context; do not invent columns or stats not present.",
    "- If a metric is missing (e.g., no correlation), state that explicitly.",
    "- If correlation n_used is small, warn about statistical reliability.",
    "- Keep findings actionable and phrased for an application UI.",
    "",
    "You MUST return the final result via the function tool call.",
  ].join("\n");

  const userPayload = {
    filename: ctx.filename ?? "",
    processedRows: ctx.processedRows ?? null,
    processedColumns: ctx.processedColumns ?? null,
    rawSample: ctx.rawSample ?? null,
    processedSample: ctx.processedSample ?? null,
    metadata: ctx.metadata ?? null,
  };

  return { instructions, userPayload };
}

export class OpenAIInsightsProvider implements InsightsLLMProvider {
  private client: OpenAI;
  private model: string;
  private timeoutMs: number;
  private maxOutputTokens: number;

  constructor() {
    const apiKey = cfg.openAI.apiKey;
    if (!apiKey) throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");

    this.client = new OpenAI({ apiKey });
    this.model = String(cfg.openAI.model);
    this.timeoutMs = Number(cfg.openAI.timeout);
    this.maxOutputTokens = Number(cfg.openAI.maxTokens);
  }

  async generateInsights(ctx: InsightsContext): Promise<GenerateInsightsResponse> {
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
            { role: "user", content: [{ type: "input_text", text: JSON.stringify(userPayload) }] },
          ],
          tools: [
            {
              type: "function",
              name: INSIGHTS_TOOL_SCHEMA.name,
              description: "Return structured dataset insights matching the schema.",
              parameters: INSIGHTS_TOOL_SCHEMA.schema,
              strict: false,
            },
          ],
          tool_choice: { type: "function", name: INSIGHTS_TOOL_SCHEMA.name },
        },
        { signal: ac.signal as any }
      );

      const argsText = extractFunctionCallArguments(resp as any, INSIGHTS_TOOL_SCHEMA.name);
      const parsed = JSON.parse(argsText);

      return {
        executiveSummary: String(parsed.executiveSummary ?? ""),
        keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
        dataQualityObservations: Array.isArray(parsed.dataQualityObservations)
          ? parsed.dataQualityObservations
          : [],
        correlationInsights: Array.isArray(parsed.correlationInsights) ? parsed.correlationInsights : [],
        preprocessingNotes: Array.isArray(parsed.preprocessingNotes) ? parsed.preprocessingNotes : [],
        recommendedNextSteps: Array.isArray(parsed.recommendedNextSteps) ? parsed.recommendedNextSteps : [],
        confidence: clamp01(parsed.confidence, 0.6),
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
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
