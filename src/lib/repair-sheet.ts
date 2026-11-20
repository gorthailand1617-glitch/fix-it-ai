import { formatCaseDate } from "@/lib/case-helpers";
import { CASE_STATUS_META, CATEGORY_MAP } from "@/lib/categories";
import {
  PartItem,
  RepairCase,
  RiskLevel,
  SummaryItem,
  ToolItem,
} from "@/types/repair";

export interface RepairSheetStepItem {
  stepNumber: number;
  title: string;
  done: boolean;
  reportBack: string;
}

export interface RepairSheetSummary {
  title: string;
  categoryTitle: string;
  statusLabel: string;
  updatedDateText: string;
  headline: string;
  riskLevel: RiskLevel;
  riskSummary: string;
  summaryTable: SummaryItem[];
  steps: RepairSheetStepItem[];
  toolsNeeded: ToolItem[];
  recommendedParts: PartItem[];
}

const RISK_LABEL: Record<RiskLevel, string> = {
  safe: "ทำเองได้ปลอดภัย",
  caution: "ทำได้ — ต้องระวังพิเศษ",
  danger: "อันตราย — ควรเรียกช่าง",
};

export function buildRepairSheetData(
  repairCase: RepairCase
): RepairSheetSummary {
  const categoryTitle =
    CATEGORY_MAP[repairCase.category]?.title || "งานซ่อมทั่วไป";
  const statusLabel =
    CASE_STATUS_META[repairCase.status ?? "diagnosing"].label;
  const updatedDateText = formatCaseDate(repairCase.updatedAt);

  const diagMessages = repairCase.messages.filter(
    (m) => m.role === "assistant" && m.diagnostic
  );
  const latestMsg = diagMessages[diagMessages.length - 1];
  const latestDiag = latestMsg?.diagnostic;

  const steps: RepairSheetStepItem[] = latestDiag
    ? latestDiag.inspectionSteps.map((s) => ({
        stepNumber: s.stepNumber,
        title: s.title,
        done: Boolean(
          repairCase.completedSteps?.[`${latestMsg.id}:${s.stepNumber}`]
        ),
        reportBack: s.reportBack,
      }))
    : [];

  const toolsNeeded: ToolItem[] = [];
  const seenTools = new Set<string>();
  const recommendedParts: PartItem[] = [];
  const seenParts = new Set<string>();

  for (let i = diagMessages.length - 1; i >= 0; i--) {
    const diag = diagMessages[i].diagnostic;
    if (!diag) continue;

    for (const tool of diag.toolsNeeded || []) {
      const key = tool.name.trim().toLowerCase();
      if (!key || seenTools.has(key)) continue;
      seenTools.add(key);
      toolsNeeded.push(tool);
    }

    for (const part of diag.recommendedParts || []) {
      const key = `${part.name.trim().toLowerCase()}|${part.specOrCode
        .trim()
        .toLowerCase()}`;
      if (!part.name.trim() || seenParts.has(key)) continue;
      seenParts.add(key);
      recommendedParts.push(part);
    }
  }

  return {
    title: repairCase.title,
    categoryTitle,
    statusLabel,
    updatedDateText,
    headline: latestDiag?.headline || repairCase.title,
    riskLevel: latestDiag?.riskLevel || "caution",
    riskSummary:
      latestDiag?.riskSummary || "โปรดตรวจสอบความปลอดภัยก่อนลงมือซ่อมทุกครั้ง",
    summaryTable: latestDiag?.summaryTable || [],
    steps,
    toolsNeeded,
    recommendedParts,
  };
}

export function formatRepairSheetForLine(repairCase: RepairCase): string {
  const data = buildRepairSheetData(repairCase);
  const lines: string[] = [
    `🔧 ใบสรุปงานซ่อม — ${data.title}`,
    `หมวดหมู่: ${data.categoryTitle} | สถานะ: ${data.statusLabel}`,
    `อัปเดตล่าสุด: ${data.updatedDateText}`,
    `ระดับความเสี่ยง: ${RISK_LABEL[data.riskLevel]}`,
    `สรุปอาการ: ${data.headline}`,
  ];

  if (data.summaryTable.length > 0) {
    lines.push("", "📋 ข้อมูลเคส:");
    for (const row of data.summaryTable) {
      lines.push(`• ${row.label}: ${row.value}`);
    }
  }

  if (data.steps.length > 0) {
    lines.push("", "🛠️ ความคืบหน้าการตรวจเช็ก:");
    for (const step of data.steps) {
      lines.push(
        `${step.done ? "✅" : "⬜"} ขั้นที่ ${step.stepNumber}: ${step.title}`
      );
    }
  }

  if (data.toolsNeeded.length > 0) {
    lines.push("", "🧰 เครื่องมือที่ใช้:");
    for (const tool of data.toolsNeeded) {
      lines.push(
        `• ${tool.name}${tool.optional ? " (ถ้ามี)" : ""} — ${tool.purpose}`
      );
    }
  }

  if (data.recommendedParts.length > 0) {
    lines.push("", "📦 อะไหล่ที่เกี่ยวข้อง (เทียบของเดิมก่อนสั่ง):");
    for (const part of data.recommendedParts) {
      lines.push(
        `• ${part.name} | สเปก: ${part.specOrCode} | งบประมาณ: ~${part.estimatedPriceThb}`
      );
    }
  }

  return lines.join("\n");
}

export function formatPartsListForCopy(repairCase: RepairCase): string {
  const data = buildRepairSheetData(repairCase);
  if (data.recommendedParts.length === 0) {
    return `รายการอะไหล่ — ${data.title}\nยังไม่มีรายการอะไหล่ที่แนะนำในเคสนี้`;
  }

  const lines: string[] = [`📦 รายการอะไหล่สำหรับเคส: ${data.title}`];
  data.recommendedParts.forEach((part, idx) => {
    lines.push(
      `${idx + 1}. ${part.name}`,
      `   - สเปก/รหัส: ${part.specOrCode}`,
      `   - วิธีเทียบของเดิม: ${part.howToVerify}`,
      `   - ราคาประมาณ: ${part.estimatedPriceThb}`
    );
  });
  return lines.join("\n");
}
