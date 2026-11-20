import { ModelProfileId } from "@/types/repair";

export interface ModelOption {
  id: ModelProfileId;
  label: string;
  shortLabel: string;
  description: string;
}

export const GEMINI_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "auto",
    label: "อัตโนมัติ (Gemini 4)",
    shortLabel: "Auto (G4)",
    description: "เริ่มด้วย Gemini 4 Hydrogen และสลับโมเดลสำรองอัตโนมัติ",
  },
  {
    id: "gemini-4-hydrogen",
    label: "Gemini 4 Hydrogen",
    shortLabel: "G4 Hydrogen",
    description: "เร็วและประหยัด เหมาะกับงานตรวจเช็กประจำวัน",
  },
  {
    id: "gemini-4-neon",
    label: "Gemini 4 Neon",
    shortLabel: "G4 Neon",
    description: "สมดุลความฉลาดและความเร็ว สำหรับงานซับซ้อน",
  },
  {
    id: "gemini-4-carbon",
    label: "Gemini 4 Carbon",
    shortLabel: "G4 Carbon",
    description: "วิเคราะห์เหตุผลเชิงลึกสูงสุด สำหรับปัญหาหลายระบบ",
  },
  {
    id: "gemini-4-argon",
    label: "Gemini 4 Argon",
    shortLabel: "G4 Argon",
    description: "รุ่นระดับองค์กรสำหรับงานวิศวกรรมซับซ้อน",
  },
];

export const DEFAULT_GEMINI_MODELS: readonly string[] = [
  "gemini-4-hydrogen",
  "gemini-4-neon",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

export const ALLOWED_MODEL_PROFILES = new Set<ModelProfileId>([
  "auto",
  "gemini-4-hydrogen",
  "gemini-4-neon",
  "gemini-4-carbon",
  "gemini-4-argon",
]);

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "gemini-4-hydrogen": "Gemini 4 Hydrogen",
  "gemini-4-neon": "Gemini 4 Neon",
  "gemini-4-carbon": "Gemini 4 Carbon",
  "gemini-4-argon": "Gemini 4 Argon",
  "gemini-3.8-flash": "Gemini 3.8 Flash",
  "gemini-3.7-flash": "Gemini 3.7 Flash",
  "gemini-3.6-flash": "Gemini 3.6 Flash",
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite",
  demo: "โหมดสาธิต",
};

export function isGemini4Model(modelId: string): boolean {
  return /^gemini-4(?:-|\b)/i.test(modelId.trim());
}

export function supportsThinkingLevel(modelId: string): boolean {
  return /^gemini-(?:3(?:\.\d+)?|4)(?:-|\b)/i.test(modelId.trim());
}

export function getModelDisplayName(modelId?: string): string {
  if (!modelId) return "";
  const trimmed = modelId.trim();
  return MODEL_DISPLAY_NAMES[trimmed] || trimmed;
}

export function resolveCandidateModels(params?: {
  requestedProfile?: ModelProfileId;
  envModels?: string;
}): string[] {
  const envList =
    params?.envModels
      ?.split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0) ?? [];

  const baseList =
    envList.length > 0 ? envList : Array.from(DEFAULT_GEMINI_MODELS);

  const requested = params?.requestedProfile;
  if (!requested || requested === "auto") {
    return Array.from(new Set(baseList));
  }

  return Array.from(new Set([requested, ...baseList]));
}
