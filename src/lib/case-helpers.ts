import {
  AttachmentKind,
  ChatMessage,
  DiagnosticResponse,
  EquipmentAsset,
  FileAttachment,
  RepairCase,
  RepairCategory,
  ToastItem,
} from "@/types/repair";

export const STORAGE_KEY = "fix-it-ai-cases-v1";

export function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nowTimestamp(): number {
  return Date.now();
}

export function formatCaseDate(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

export function formatAssetSummary(asset: EquipmentAsset): string {
  const specs = asset.yearOrSpec?.trim() ? `, ${asset.yearOrSpec.trim()}` : "";
  const notes = asset.notes?.trim() ? ` — หมายเหตุ: ${asset.notes.trim()}` : "";
  return `${asset.name.trim()} (${asset.brandModel.trim()}${specs})${notes}`;
}

export function createAsset(
  input: Omit<EquipmentAsset, "id" | "createdAt">
): EquipmentAsset {
  return {
    id: generateId("asset"),
    name: input.name.trim(),
    category: input.category,
    brandModel: input.brandModel.trim(),
    ...(input.yearOrSpec?.trim() ? { yearOrSpec: input.yearOrSpec.trim() } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    createdAt: Date.now(),
  };
}

export function createEmptyCase(
  category: RepairCategory = "automotive",
  asset?: EquipmentAsset
): RepairCase {
  return {
    id: generateId("case"),
    title: asset ? `ตรวจเช็ก ${asset.name}` : "เคสซ่อมใหม่",
    category: asset ? asset.category : category,
    status: "diagnosing",
    ...(asset
      ? {
          assetId: asset.id,
          assetSummary: formatAssetSummary(asset),
        }
      : {}),
    messages: [],
    updatedAt: Date.now(),
  };
}

export function createUserMessage(
  text: string,
  attachments: FileAttachment[]
): ChatMessage {
  return {
    id: generateId("msg-u"),
    role: "user",
    text:
      text ||
      (attachments.length > 0
        ? `ช่วยวิเคราะห์ไฟล์แนบ (${attachments.length} ไฟล์) ให้หน่อยครับ`
        : "ช่วยวิเคราะห์ให้หน่อยครับ"),
    attachments,
    timestamp: Date.now(),
  };
}

export function createAssistantMessage(
  diagnostic: DiagnosticResponse,
  isDemo: boolean,
  modelUsed?: string
): ChatMessage {
  return {
    id: generateId("msg-a"),
    role: "assistant",
    text: diagnostic.headline || "ผลการวิเคราะห์",
    diagnostic,
    isDemo,
    ...(modelUsed ? { modelUsed } : {}),
    timestamp: Date.now(),
  };
}

export function createErrorMessage(text: string): ChatMessage {
  return {
    id: generateId("msg-err"),
    role: "assistant",
    text,
    isError: true,
    timestamp: Date.now(),
  };
}

export function createToast(
  tone: ToastItem["tone"],
  message: string
): ToastItem {
  return {
    id: generateId("toast"),
    tone,
    message,
  };
}

export function detectAttachmentKind(file: File): AttachmentKind | null {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|aac)$/.test(name))
    return "audio";
  if (file.type.startsWith("video/") || /\.(mp4|webm|mov)$/.test(name))
    return "video";
  if (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    /\.(txt|csv|json|log|md|xml|yaml|yml|ini)$/.test(name)
  ) {
    return "text";
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isValidStoredCase(item: unknown): item is RepairCase {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.messages)
  );
}
