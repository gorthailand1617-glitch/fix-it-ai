import { DiagnosticResponse } from "@/types/repair";

/**
 * Compacts a prior `DiagnosticResponse` into a concise Thai summary for conversation history
 * so Gemini retains full diagnostic context without paying for full JSON schemas every turn.
 */
export function compactDiagnosticForHistory(d: DiagnosticResponse): string {
  const lines: string[] = [
    `[สรุปผลวิเคราะห์รอบก่อน] หัวข้อ: ${d.headline} | ความเสี่ยง: ${d.riskLevel}`,
  ];

  if (d.summaryTable && d.summaryTable.length > 0) {
    const facts = d.summaryTable
      .slice(0, 6)
      .map((item) => `${item.label}: ${item.value}`)
      .join(" | ");
    lines.push(`ข้อมูลที่ทราบแล้ว: ${facts}`);
  }

  if (d.inspectionSteps && d.inspectionSteps.length > 0) {
    const steps = d.inspectionSteps
      .slice(0, 5)
      .map((s) => `${s.stepNumber}. ${s.title}`)
      .join("; ");
    lines.push(`ขั้นตอนที่แนะนำไปแล้ว: ${steps}`);
  }

  if (d.recommendedParts && d.recommendedParts.length > 0) {
    const parts = d.recommendedParts
      .slice(0, 5)
      .map((p) => `${p.name} (${p.specOrCode})`)
      .join("; ");
    lines.push(`อะไหล่ที่กล่าวถึงแล้ว: ${parts}`);
  }

  if (d.honestyNote && d.honestyNote.trim()) {
    const note = d.honestyNote.trim();
    lines.push(
      `หมายเหตุความโปร่งใส: ${note.length > 180 ? `${note.slice(0, 180)}...` : note}`
    );
  }

  return lines.join("\n");
}

export function compactUserHistoryText(
  text: string,
  maxChars = 1500
): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}\n...[ตัดทอนข้อความรอบก่อน]...`;
}
