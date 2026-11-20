import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Content, Part, ThinkingLevel } from "@google/genai";
import { buildSystemPrompt } from "@/lib/prompts";
import { getDemoDiagnosticResponse } from "@/lib/demo-responses";
import { findRelevantTechNotes } from "@/lib/knowledge-base";
import {
  DIAGNOSTIC_RESPONSE_JSON_SCHEMA,
  extractAndNormalizeDiagnostic,
} from "@/lib/diagnostic-schema";
import {
  compactDiagnosticForHistory,
  compactUserHistoryText,
} from "@/lib/history-compact";
import {
  formatFriendlyApiError,
  isHighDemandError,
  isQuotaExhaustedError,
  isRetryableModelError,
  isSchemaWithSearchError,
} from "@/lib/gemini-errors";
import {
  ALLOWED_MODEL_PROFILES,
  getModelDisplayName,
  isGemini4Model,
  resolveCandidateModels,
  supportsThinkingLevel,
} from "@/lib/models";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  AttachmentKind,
  DiagnoseStreamEvent,
  DiagnosticResponse,
  ExplanationMode,
  FileAttachment,
  ModelProfileId,
  RepairCategory,
  RiskLevel,
} from "@/types/repair";

export const maxDuration = 60;

const MAX_MESSAGE_CHARS = 10_000;
const MAX_ATTACHMENTS = 6;
const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_FILES_BYTES = 15 * 1024 * 1024;
const DEFAULT_RATE_LIMIT_PER_MIN = 30;
const HIGH_DEMAND_RETRY_DELAY_MS = 1200;
const ALLOWED_KINDS = new Set<AttachmentKind>([
  "image",
  "pdf",
  "text",
  "audio",
  "video",
]);
const ALLOWED_CATEGORIES = new Set<RepairCategory>([
  "automotive",
  "appliance",
  "electronics",
  "home_office",
]);

interface IncomingHistoryItem {
  role: "user" | "assistant";
  text: string;
  diagnostic?: DiagnosticResponse;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function estimateBase64Bytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

function decodeBase64Utf8(base64: string, maxChars = 60000): string {
  const text = Buffer.from(base64, "base64").toString("utf-8");
  if (text.length <= maxChars) return text;
  return (
    text.slice(0, maxChars) +
    `\n\n...[ตัดทอนเนื้อหาบางส่วน เนื่องจากไฟล์ยาวเกิน ${maxChars.toLocaleString()} ตัวอักษร]...`
  );
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "local";
}

function getRateLimitPerMin(): number {
  const raw = process.env.DIAGNOSE_RATE_LIMIT_PER_MIN;
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_RATE_LIMIT_PER_MIN;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_RATE_LIMIT_PER_MIN;
  }
  return Math.floor(parsed);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveThinkingLevel(mode: ExplanationMode): ThinkingLevel {
  const envLevel = process.env.GEMINI_THINKING_LEVEL?.trim().toUpperCase();
  if (envLevel === "MINIMAL") return ThinkingLevel.MINIMAL;
  if (envLevel === "LOW") return ThinkingLevel.LOW;
  if (envLevel === "MEDIUM") return ThinkingLevel.MEDIUM;
  if (envLevel === "HIGH") return ThinkingLevel.HIGH;
  return mode === "technician" ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW;
}

async function executeModelWithTransientRetry<T>(params: {
  model: string;
  useGoogleSearch: boolean;
  signal: AbortSignal;
  onHighDemandRetry?: () => void;
  invoke: (options: {
    useSchema: boolean;
    useThinking: boolean;
  }) => Promise<T | null>;
}): Promise<{ value: T } | { retryableError: unknown }> {
  const { model, useGoogleSearch, signal, onHighDemandRetry, invoke } = params;
  let highDemandRetried = false;

  while (!signal.aborted) {
    try {
      let useSchema = true;
      let useThinking = true;
      let result: T | null = null;

      while (!signal.aborted) {
        try {
          result = await invoke({ useSchema, useThinking });
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const lower = msg.toLowerCase();
          if (useGoogleSearch && useSchema && isSchemaWithSearchError(msg)) {
            useSchema = false;
            continue;
          }
          if (
            useThinking &&
            isSchemaWithSearchError(msg) &&
            lower.includes("thinking")
          ) {
            useThinking = false;
            continue;
          }
          throw err;
        }
      }

      if (result !== null) {
        return { value: result };
      }
      return { retryableError: new Error(`Empty response from ${model}`) };
    } catch (err) {
      if (signal.aborted) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);

      if (isHighDemandError(msg) && !highDemandRetried) {
        highDemandRetried = true;
        onHighDemandRetry?.();
        await waitWithAbort(HIGH_DEMAND_RETRY_DELAY_MS, signal);
        continue;
      }

      if (isRetryableModelError(msg)) {
        return { retryableError: err };
      }
      throw err;
    }
  }

  return { retryableError: new DOMException("Aborted", "AbortError") };
}

function buildGenerateConfig(params: {
  model: string;
  systemInstruction: string;
  mode: ExplanationMode;
  useGoogleSearch: boolean;
  useSchema: boolean;
  useThinking: boolean;
  abortSignal: AbortSignal;
}) {
  const {
    model,
    systemInstruction,
    mode,
    useGoogleSearch,
    useSchema,
    useThinking,
    abortSignal,
  } = params;
  return {
    systemInstruction,
    responseMimeType: "application/json",
    ...(useSchema ? { responseJsonSchema: DIAGNOSTIC_RESPONSE_JSON_SCHEMA } : {}),
    ...(!isGemini4Model(model) ? { temperature: 0.2 } : {}),
    ...(useThinking && supportsThinkingLevel(model)
      ? { thinkingConfig: { thinkingLevel: resolveThinkingLevel(mode) } }
      : {}),
    abortSignal,
    ...(useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {}),
  };
}

function buildFinalUserPrompt(params: {
  message: string;
  validAttachmentNames: string[];
  extraFileText: string;
  history: IncomingHistoryItem[];
  category?: RepairCategory;
  assetContext: string;
}): string {
  const {
    message,
    validAttachmentNames,
    extraFileText,
    history,
    category,
    assetContext,
  } = params;

  const combinedQuery = [
    assetContext,
    message,
    ...history.map((h) => h.text),
  ]
    .filter(Boolean)
    .join(" ");

  const techNotes = findRelevantTechNotes(combinedQuery, { category });
  const techNotesBlock =
    techNotes.length > 0
      ? `\n\n[ข้อมูลเทคนิคเฉพาะรุ่นที่ตรวจสอบแล้ว — ต้องยึดข้อมูลนี้เป็นหลัก ห้ามตอบขัดแย้ง]\n${techNotes
          .map(
            (n) =>
              `• ${n.modelName}:\n${n.facts.map((f) => `  - ${f}`).join("\n")}`
          )
          .join("\n")}`
      : "";

  const attachedNames = validAttachmentNames.join(", ");
  const basePrompt =
    message.trim() ||
    (validAttachmentNames.length > 0
      ? `ช่วยวิเคราะห์ไฟล์ที่แนบมาทั้งหมด (${attachedNames}) ว่ามีข้อมูลสำคัญหรือความผิดปกติอะไร และต้องตรวจเช็กอะไรต่อ`
      : "ช่วยวิเคราะห์รูปภาพนี้ให้หน่อยว่ามีความผิดปกติอะไร และต้องตรวจเช็กอะไรต่อ");

  const assetPrefix = assetContext
    ? `[ข้อมูลอุปกรณ์ที่ผู้ใช้บันทึกไว้]\n${assetContext}\n\n`
    : "";

  return `${assetPrefix}${basePrompt}${extraFileText}${techNotesBlock}`;
}

function extractPartialPreview(rawText: string): {
  headline?: string;
  riskLevel?: RiskLevel;
} {
  let headline: string | undefined;
  const headlineMatch = rawText.match(/"headline"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (headlineMatch?.[1]) {
    try {
      const decoded = JSON.parse(`"${headlineMatch[1]}"`);
      if (typeof decoded === "string" && decoded.trim()) {
        headline = decoded.trim();
      }
    } catch {
      // ignore incomplete escape sequences
    }
  }

  let riskLevel: RiskLevel | undefined;
  const riskMatch = rawText.match(/"riskLevel"\s*:\s*"(safe|caution|danger)"/);
  if (riskMatch?.[1]) {
    riskLevel = riskMatch[1] as RiskLevel;
  }

  return { headline, riskLevel };
}

function detectStreamStage(
  rawText: string
): { stage: string; message: string } | null {
  if (rawText.includes('"recommendedParts"')) {
    return {
      stage: "parts",
      message: "กำลังคัดเลือกเครื่องมือและสเปกอะไหล่...",
    };
  }
  if (rawText.includes('"inspectionSteps"')) {
    return {
      stage: "steps",
      message: "กำลังเรียบเรียงขั้นตอนตรวจเช็กทีละจุด...",
    };
  }
  if (rawText.includes('"mermaidChart"')) {
    return {
      stage: "diagram",
      message: "กำลังจัดทำแผนภาพลำดับการตรวจเช็ก...",
    };
  }
  if (rawText.includes('"summaryTable"')) {
    return {
      stage: "summary",
      message: "กำลังสรุปข้อมูลเคสและประเมินความปลอดภัย...",
    };
  }
  return null;
}

function waitWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitMax = getRateLimitPerMin();
    if (rateLimitMax > 0) {
      const rateLimit = checkRateLimit(getClientIp(req), rateLimitMax);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่ครับ",
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateLimit.retryAfterSeconds),
            },
          }
        );
      }
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "รูปแบบข้อมูลคำขอไม่ถูกต้อง (Invalid JSON)" },
        { status: 400 }
      );
    }

    if (!isPlainObject(rawBody)) {
      return NextResponse.json(
        { error: "รูปแบบข้อมูลคำขอไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (
      rawBody.message !== undefined &&
      rawBody.message !== null &&
      typeof rawBody.message !== "string"
    ) {
      return NextResponse.json(
        { error: "ข้อความต้องเป็นตัวอักษรเท่านั้น" },
        { status: 400 }
      );
    }

    const message: string = typeof rawBody.message === "string" ? rawBody.message : "";
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        {
          error: `ข้อความยาวเกินไป (สูงสุด ${MAX_MESSAGE_CHARS.toLocaleString()} ตัวอักษร)`,
        },
        { status: 400 }
      );
    }

    const category: RepairCategory | undefined =
      typeof rawBody.category === "string" &&
      ALLOWED_CATEGORIES.has(rawBody.category as RepairCategory)
        ? (rawBody.category as RepairCategory)
        : undefined;
    const mode: ExplanationMode =
      rawBody.mode === "technician" ? "technician" : "beginner";
    const modelProfile: ModelProfileId =
      typeof rawBody.modelProfile === "string" &&
      ALLOWED_MODEL_PROFILES.has(rawBody.modelProfile as ModelProfileId)
        ? (rawBody.modelProfile as ModelProfileId)
        : "auto";
    const assetContext =
      typeof rawBody.assetContext === "string"
        ? rawBody.assetContext.trim().slice(0, 600)
        : "";
    const systemInstruction = buildSystemPrompt(mode);
    const wantsStream = rawBody.stream === true;
    const candidateModels = resolveCandidateModels({
      requestedProfile: modelProfile,
      envModels: process.env.GEMINI_MODELS,
    });

    const imageDataUrl: string | undefined =
      typeof rawBody.imageDataUrl === "string" ? rawBody.imageDataUrl : undefined;
    const singleAttachment = rawBody.attachment as FileAttachment | undefined;
    const attachments: FileAttachment[] = Array.isArray(rawBody.attachments)
      ? (rawBody.attachments as FileAttachment[])
      : singleAttachment
      ? [singleAttachment]
      : [];

    if (attachments.length > MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: `แนบไฟล์ได้สูงสุด ${MAX_ATTACHMENTS} ไฟล์ต่อครั้ง` },
        { status: 400 }
      );
    }

    const rawHistory = Array.isArray(rawBody.history) ? rawBody.history : [];
    const history: IncomingHistoryItem[] = rawHistory
      .filter((item): item is IncomingHistoryItem => {
        if (!isPlainObject(item)) return false;
        return (
          (item.role === "user" || item.role === "assistant") &&
          typeof item.text === "string"
        );
      })
      .slice(-8);

    const currentParts: Part[] = [];
    let extraFileText = "";
    let totalAttachedBytes = 0;
    const validAttachmentNames: string[] = [];

    if (attachments.length > 0) {
      for (const att of attachments) {
        if (!att || typeof att !== "object" || typeof att.dataUrl !== "string") {
          continue;
        }
        if (!ALLOWED_KINDS.has(att.kind)) {
          return NextResponse.json(
            { error: `ไม่รองรับประเภทไฟล์ "${String(att.kind)}"` },
            { status: 400 }
          );
        }

        const parsed = parseDataUrl(att.dataUrl);
        if (!parsed) {
          return NextResponse.json(
            { error: `ข้อมูลไฟล์ "${att.name || "attachment"}" ไม่ถูกต้อง` },
            { status: 400 }
          );
        }

        const decodedBytes = estimateBase64Bytes(parsed.data);
        if (decodedBytes > MAX_SINGLE_FILE_BYTES) {
          return NextResponse.json(
            {
              error: `ไฟล์ "${att.name || "attachment"}" มีขนาดเกิน 10 MB`,
            },
            { status: 413 }
          );
        }
        totalAttachedBytes += decodedBytes;
        if (totalAttachedBytes > MAX_TOTAL_FILES_BYTES) {
          return NextResponse.json(
            { error: "ขนาดไฟล์รวมทั้งหมดต่อครั้งเกิน 15 MB" },
            { status: 413 }
          );
        }

        validAttachmentNames.push(att.name || "attachment");
        if (att.kind === "text") {
          const decoded = decodeBase64Utf8(parsed.data);
          extraFileText += `\n\n[เนื้อหาจากไฟล์แนบ: ${att.name}]\n\`\`\`\n${decoded}\n\`\`\``;
        } else {
          const mimeType =
            att.mimeType ||
            parsed.mimeType ||
            (att.kind === "pdf" ? "application/pdf" : "application/octet-stream");
          currentParts.push({
            inlineData: {
              mimeType,
              data: parsed.data,
            },
          });
        }
      }
    } else if (imageDataUrl) {
      const parsed = parseDataUrl(imageDataUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: "ข้อมูลรูปภาพที่ส่งมาไม่ถูกต้อง" },
          { status: 400 }
        );
      }
      const decodedBytes = estimateBase64Bytes(parsed.data);
      if (decodedBytes > MAX_SINGLE_FILE_BYTES) {
        return NextResponse.json(
          { error: "รูปภาพมีขนาดเกิน 10 MB" },
          { status: 413 }
        );
      }
      validAttachmentNames.push("image");
      currentParts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data,
        },
      });
    }

    if (!message.trim() && validAttachmentNames.length === 0) {
      return NextResponse.json(
        { error: "กรุณาพิมพ์อาการที่พบ หรือแนบไฟล์อย่างน้อย 1 รายการ" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (wantsStream) {
      const encoder = new TextEncoder();
      let streamClosed = false;

      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          const emit = (event: DiagnoseStreamEvent) => {
            if (streamClosed || req.signal.aborted) return;
            try {
              controller.enqueue(
                encoder.encode(`${JSON.stringify(event)}\n`)
              );
            } catch {
              streamClosed = true;
            }
          };

          const closeStream = () => {
            if (streamClosed) return;
            streamClosed = true;
            try {
              controller.close();
            } catch {
              // stream already closed
            }
          };

          try {
            if (!apiKey) {
              emit({
                type: "status",
                stage: "demo",
                message: "กำลังวิเคราะห์อาการเบื้องต้น (โหมดสาธิต)...",
                model: "demo",
              });
              await waitWithAbort(500, req.signal);
              if (req.signal.aborted) {
                closeStream();
                return;
              }
              emit({
                type: "result",
                diagnostic: getDemoDiagnosticResponse(message),
                isDemo: true,
                modelUsed: "demo",
              });
              closeStream();
              return;
            }

            const ai = new GoogleGenAI({ apiKey });
            const contents: Content[] = history.map((item) => ({
              role: item.role === "assistant" ? "model" : "user",
              parts: [
                {
                  text:
                    item.role === "assistant" && item.diagnostic
                      ? compactDiagnosticForHistory(item.diagnostic)
                      : compactUserHistoryText(item.text),
                },
              ],
            }));

            currentParts.push({
              text: buildFinalUserPrompt({
                message,
                validAttachmentNames,
                extraFileText,
                history,
                category,
                assetContext,
              }),
            });
            contents.push({
              role: "user",
              parts: currentParts,
            });

            const useGoogleSearch = process.env.ENABLE_GOOGLE_SEARCH === "true";

            let rawText = "";
            let modelUsed: string | undefined;
            let lastError: unknown;

            const runModelStream = async (
              model: string,
              options: { useSchema: boolean; useThinking: boolean }
            ) => {
              rawText = "";
              let lastHeadline: string | undefined;
              let lastRiskLevel: RiskLevel | undefined;
              let lastStage = "";

              const responseStream = await ai.models.generateContentStream({
                model,
                contents,
                config: buildGenerateConfig({
                  model,
                  systemInstruction,
                  mode,
                  useGoogleSearch,
                  useSchema: options.useSchema,
                  useThinking: options.useThinking,
                  abortSignal: req.signal,
                }),
              });

              for await (const chunk of responseStream) {
                if (req.signal.aborted) break;
                const chunkText = chunk.text || "";
                if (!chunkText) continue;

                rawText += chunkText;

                const preview = extractPartialPreview(rawText);
                if (
                  (preview.headline && preview.headline !== lastHeadline) ||
                  (preview.riskLevel && preview.riskLevel !== lastRiskLevel)
                ) {
                  lastHeadline = preview.headline ?? lastHeadline;
                  lastRiskLevel = preview.riskLevel ?? lastRiskLevel;
                  emit({
                    type: "preview",
                    headline: lastHeadline,
                    riskLevel: lastRiskLevel,
                  });
                }

                const stageInfo = detectStreamStage(rawText);
                if (stageInfo && stageInfo.stage !== lastStage) {
                  lastStage = stageInfo.stage;
                  emit({
                    type: "status",
                    stage: stageInfo.stage,
                    message: stageInfo.message,
                    model,
                  });
                }
              }
            };

            for (let i = 0; i < candidateModels.length; i++) {
              if (req.signal.aborted) {
                closeStream();
                return;
              }
              const model = candidateModels[i];
              const displayName = getModelDisplayName(model);
              emit({
                type: "status",
                stage: i === 0 ? "analyzing" : "fallback",
                message:
                  i === 0
                    ? "กำลังวิเคราะห์อาการและประเมินความปลอดภัย..."
                    : `โมเดลหลักไม่ว่างชั่วคราว กำลังสลับไปใช้ ${displayName}...`,
                model,
              });

              const attempt = await executeModelWithTransientRetry({
                model,
                useGoogleSearch,
                signal: req.signal,
                onHighDemandRetry: () => {
                  emit({
                    type: "status",
                    stage: "retrying",
                    message: `${displayName} มีผู้ใช้งานหนาแน่น กำลังลองใหม่อีกครั้ง...`,
                    model,
                  });
                },
                invoke: async (options) => {
                  await runModelStream(model, options);
                  return rawText.trim() ? rawText : null;
                },
              });

              if (req.signal.aborted) {
                closeStream();
                return;
              }

              if ("value" in attempt) {
                modelUsed = model;
                break;
              }

              lastError = attempt.retryableError;
              rawText = "";
              console.warn(
                `Model ${model} unavailable/quota exceeded, trying next fallback...`
              );
            }

            if (req.signal.aborted) {
              closeStream();
              return;
            }

            if (!rawText.trim()) {
              const msg =
                lastError instanceof Error
                  ? lastError.message
                  : String(lastError);
              if (isQuotaExhaustedError(msg)) {
                const fallback = getDemoDiagnosticResponse(message);
                fallback.honestyNote =
                  "โควต้าฟรีของ Gemini API วันนี้เต็มชั่วคราว ระบบจึงสลับมาแสดงคำแนะนำเบื้องต้นให้ก่อนโดยอัตโนมัติครับ";
                emit({
                  type: "result",
                  diagnostic: fallback,
                  isDemo: true,
                  modelUsed: "demo",
                });
                closeStream();
                return;
              }
              throw lastError ?? new Error("Empty response from Gemini");
            }

            const diagnostic = extractAndNormalizeDiagnostic(rawText);
            emit({
              type: "result",
              diagnostic,
              isDemo: false,
              modelUsed,
            });
            closeStream();
          } catch (err) {
            if (!req.signal.aborted) {
              console.error("Diagnose stream error:", err);
              emit({
                type: "error",
                error: formatFriendlyApiError(err),
              });
            }
            closeStream();
          }
        },
        cancel() {
          streamClosed = true;
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    if (!apiKey) {
      await waitWithAbort(600, req.signal);
      return NextResponse.json({
        diagnostic: getDemoDiagnosticResponse(message),
        isDemo: true,
        modelUsed: "demo",
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const contents: Content[] = history.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [
        {
          text:
            item.role === "assistant" && item.diagnostic
              ? compactDiagnosticForHistory(item.diagnostic)
              : compactUserHistoryText(item.text),
        },
      ],
    }));

    currentParts.push({
      text: buildFinalUserPrompt({
        message,
        validAttachmentNames,
        extraFileText,
        history,
        category,
        assetContext,
      }),
    });

    contents.push({
      role: "user",
      parts: currentParts,
    });

    const useGoogleSearch = process.env.ENABLE_GOOGLE_SEARCH === "true";

    let rawText: string | undefined;
    let modelUsed: string | undefined;
    let lastError: unknown;

    for (const model of candidateModels) {
      const attempt = await executeModelWithTransientRetry({
        model,
        useGoogleSearch,
        signal: req.signal,
        invoke: async (options) => {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: buildGenerateConfig({
              model,
              systemInstruction,
              mode,
              useGoogleSearch,
              useSchema: options.useSchema,
              useThinking: options.useThinking,
              abortSignal: req.signal,
            }),
          });
          return response.text || null;
        },
      });

      if ("value" in attempt) {
        rawText = attempt.value;
        modelUsed = model;
        break;
      }

      lastError = attempt.retryableError;
      console.warn(
        `Model ${model} unavailable/quota exceeded, trying next fallback...`
      );
    }

    if (!rawText) {
      const msg = lastError instanceof Error ? lastError.message : String(lastError);
      if (isQuotaExhaustedError(msg)) {
        const fallback = getDemoDiagnosticResponse(message);
        fallback.honestyNote =
          "โควต้าฟรีของ Gemini API วันนี้เต็มชั่วคราว ระบบจึงสลับมาแสดงคำแนะนำเบื้องต้นให้ก่อนโดยอัตโนมัติครับ";
        return NextResponse.json({
          diagnostic: fallback,
          isDemo: true,
          modelUsed: "demo",
        });
      }
      throw lastError ?? new Error("Empty response from Gemini");
    }

    const diagnostic = extractAndNormalizeDiagnostic(rawText);
    return NextResponse.json({
      diagnostic,
      isDemo: false,
      modelUsed,
    });
  } catch (error) {
    console.error("Diagnose API error:", error);
    const rawMsg = error instanceof Error ? error.message : String(error);
    const status = isHighDemandError(rawMsg)
      ? 503
      : isQuotaExhaustedError(rawMsg)
      ? 429
      : 500;
    return NextResponse.json(
      {
        error: formatFriendlyApiError(error),
      },
      { status }
    );
  }
}
