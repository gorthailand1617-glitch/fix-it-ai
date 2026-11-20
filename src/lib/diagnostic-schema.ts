import {
  DiagnosticResponse,
  InspectionStep,
  PartItem,
  RiskLevel,
  SummaryItem,
  ToolItem,
  VisualReference,
  WizardOption,
  WizardQuestion,
} from "@/types/repair";

/**
 * JSON Schema compatible with `@google/genai` `GenerateContentConfig.responseJsonSchema`.
 * Uses only the supported subset of JSON Schema keywords documented in the SDK.
 */
export const DIAGNOSTIC_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    headline: {
      type: "string",
      description: "หัวข้อสรุปสั้น ๆ เป็นภาษาไทย",
    },
    riskLevel: {
      type: "string",
      enum: ["safe", "caution", "danger"],
      description: "ระดับความปลอดภัยของงานซ่อม",
    },
    riskSummary: {
      type: "string",
      description: "คำเตือนความปลอดภัย 1-2 ประโยคที่คนทั่วไปต้องรู้ก่อนลงมือ",
    },
    summaryTable: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
        required: ["label", "value"],
      },
    },
    honestyNote: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "หมายเหตุความโปร่งใสหากไม่มีคู่มือเฉพาะรุ่น หรือไม่มีรูปประกอบ",
    },
    mermaidChart: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "แผนภาพ flowchart TD สำหรับการตรวจเช็ก",
    },
    inspectionSteps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stepNumber: { type: "integer" },
          title: { type: "string" },
          goal: { type: "string" },
          steps: {
            type: "array",
            items: { type: "string" },
          },
          standard: { type: "string" },
          safety: { type: "string" },
          reportBack: { type: "string" },
        },
        required: [
          "stepNumber",
          "title",
          "goal",
          "steps",
          "standard",
          "safety",
          "reportBack",
        ],
      },
    },
    visualReferences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          mediaType: { type: "string", enum: ["video", "image"] },
          searchQuery: { type: "string" },
          whatToLookFor: { type: "string" },
        },
        required: ["title", "mediaType", "searchQuery", "whatToLookFor"],
      },
    },
    toolsNeeded: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          purpose: { type: "string" },
          optional: { type: "boolean" },
        },
        required: ["name", "purpose", "optional"],
      },
    },
    recommendedParts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          specOrCode: { type: "string" },
          howToVerify: { type: "string" },
          estimatedPriceThb: { type: "string" },
          searchKeyword: { type: "string" },
        },
        required: [
          "name",
          "specOrCode",
          "howToVerify",
          "estimatedPriceThb",
          "searchKeyword",
        ],
      },
    },
    wizardQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          tabLabel: { type: "string" },
          question: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                description: { type: "string" },
              },
              required: ["label"],
            },
          },
          allowCustom: { type: "boolean" },
        },
        required: ["id", "tabLabel", "question", "options", "allowCustom"],
      },
    },
    closingPrompt: {
      type: "string",
      description: "ประโยคปิดท้ายชวนให้ทำขั้นตอนตรวจเช็กหรือเลือกคำตอบในตัวช่วย",
    },
  },
  required: [
    "headline",
    "riskLevel",
    "riskSummary",
    "summaryTable",
    "inspectionSteps",
    "toolsNeeded",
    "recommendedParts",
    "wizardQuestions",
    "closingPrompt",
  ],
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseJsonObject(rawText: string): Record<string, unknown> {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("รูปแบบคำตอบจาก AI ไม่ใช่ JSON ที่ถูกต้อง");
    }
    parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  if (!isPlainObject(parsed)) {
    throw new Error("โครงสร้างคำตอบจาก AI ไม่ใช่ JSON Object");
  }
  return parsed;
}

function normalizeRiskLevel(value: unknown): RiskLevel {
  if (value === "safe" || value === "caution" || value === "danger") {
    return value;
  }
  return "caution";
}

function normalizeSummaryTable(value: unknown): SummaryItem[] {
  if (!Array.isArray(value)) return [];
  const items: SummaryItem[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    const label = asTrimmedString(entry.label);
    const val = asTrimmedString(entry.value);
    if (label && val) {
      items.push({ label, value: val });
    }
  }
  return items;
}

function normalizeInspectionSteps(value: unknown): InspectionStep[] {
  if (!Array.isArray(value)) return [];
  const result: InspectionStep[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    const title = asTrimmedString(entry.title);
    if (!title) continue;

    const rawSteps = Array.isArray(entry.steps)
      ? entry.steps
          .map((s) => asTrimmedString(s))
          .filter((s) => s.length > 0)
      : [];

    const stepNumber =
      typeof entry.stepNumber === "number" && Number.isFinite(entry.stepNumber)
        ? Math.max(1, Math.round(entry.stepNumber))
        : result.length + 1;

    result.push({
      stepNumber,
      title,
      goal: asTrimmedString(entry.goal) || "ตรวจสอบสาเหตุเบื้องต้นในจุดนี้",
      steps: rawSteps.length > 0 ? rawSteps : [title],
      standard:
        asTrimmedString(entry.standard) || "สภาพปกติ ไม่พบความเสียหายหรือสิ่งผิดปกติ",
      safety:
        asTrimmedString(entry.safety) ||
        "ระมัดระวังไฟฟ้า ความร้อน และชิ้นส่วนที่เคลื่อนไหวก่อนลงมือ",
      reportBack:
        asTrimmedString(entry.reportBack) || "แจ้งผลที่สังเกตได้หลังตรวจเช็กขั้นนี้",
    });
  }
  return result;
}

function normalizeVisualReferences(value: unknown): VisualReference[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const refs: VisualReference[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    const title = asTrimmedString(entry.title);
    const searchQuery = asTrimmedString(entry.searchQuery);
    if (!title || !searchQuery) continue;

    refs.push({
      title,
      mediaType: entry.mediaType === "video" ? "video" : "image",
      searchQuery,
      whatToLookFor:
        asTrimmedString(entry.whatToLookFor) ||
        "สังเกตตำแหน่งและลักษณะชิ้นส่วนเทียบกับของจริง",
    });
  }
  return refs.length > 0 ? refs : undefined;
}

function normalizeToolsNeeded(value: unknown): ToolItem[] {
  if (!Array.isArray(value)) return [];
  const tools: ToolItem[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    const name = asTrimmedString(entry.name);
    if (!name) continue;
    tools.push({
      name,
      purpose: asTrimmedString(entry.purpose) || "ใช้ช่วยตรวจเช็กหรือถอดประกอบ",
      optional: typeof entry.optional === "boolean" ? entry.optional : false,
    });
  }
  return tools;
}

function normalizeRecommendedParts(value: unknown): PartItem[] {
  if (!Array.isArray(value)) return [];
  const parts: PartItem[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    const name = asTrimmedString(entry.name);
    if (!name) continue;
    const searchKeyword = asTrimmedString(entry.searchKeyword) || name;
    parts.push({
      name,
      specOrCode:
        asTrimmedString(entry.specOrCode) || "ตรวจสอบรหัส/สเปกบนอะไหล่เดิม",
      howToVerify:
        asTrimmedString(entry.howToVerify) || "เทียบหน้าตาและขนาดกับชิ้นเดิมก่อนสั่งซื้อ",
      estimatedPriceThb:
        asTrimmedString(entry.estimatedPriceThb) || "ขึ้นอยู่กับรุ่นและยี่ห้อ",
      searchKeyword,
    });
  }
  return parts;
}

function normalizeWizardQuestions(value: unknown): WizardQuestion[] {
  if (!Array.isArray(value)) return [];
  const questions: WizardQuestion[] = [];
  const usedIds = new Set<string>();

  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    const question = asTrimmedString(entry.question);
    if (!question || !Array.isArray(entry.options)) continue;

    const options: WizardOption[] = [];
    for (const opt of entry.options) {
      if (!isPlainObject(opt)) continue;
      const label = asTrimmedString(opt.label);
      if (!label) continue;
      const description = asTrimmedString(opt.description);
      options.push(description ? { label, description } : { label });
    }
    if (options.length === 0) continue;

    let id = asTrimmedString(entry.id) || `q${questions.length + 1}`;
    if (usedIds.has(id)) {
      id = `${id}_${questions.length + 1}`;
    }
    usedIds.add(id);

    const tabLabel =
      asTrimmedString(entry.tabLabel) || `คำถามที่ ${questions.length + 1}`;

    questions.push({
      id,
      tabLabel,
      question,
      options,
      allowCustom:
        typeof entry.allowCustom === "boolean" ? entry.allowCustom : true,
    });
  }
  return questions;
}

/**
 * Extracts JSON from raw Gemini output (stripping markdown fences or surrounding text)
 * and normalizes every field of `DiagnosticResponse` defensively so the UI never crashes.
 */
export function extractAndNormalizeDiagnostic(rawText: string): DiagnosticResponse {
  const obj = parseJsonObject(rawText);

  const honestyNote = asTrimmedString(obj.honestyNote) || undefined;
  const mermaidChart = asTrimmedString(obj.mermaidChart) || undefined;
  const visualReferences = normalizeVisualReferences(obj.visualReferences);

  return {
    headline: asTrimmedString(obj.headline) || "ผลการวิเคราะห์อาการเบื้องต้น",
    riskLevel: normalizeRiskLevel(obj.riskLevel),
    riskSummary:
      asTrimmedString(obj.riskSummary) ||
      "โปรดตรวจสอบความปลอดภัยก่อนลงมือซ่อมทุกครั้ง",
    summaryTable: normalizeSummaryTable(obj.summaryTable),
    ...(honestyNote ? { honestyNote } : {}),
    ...(mermaidChart ? { mermaidChart } : {}),
    inspectionSteps: normalizeInspectionSteps(obj.inspectionSteps),
    ...(visualReferences ? { visualReferences } : {}),
    toolsNeeded: normalizeToolsNeeded(obj.toolsNeeded),
    recommendedParts: normalizeRecommendedParts(obj.recommendedParts),
    wizardQuestions: normalizeWizardQuestions(obj.wizardQuestions),
    closingPrompt: asTrimmedString(obj.closingPrompt),
  };
}
