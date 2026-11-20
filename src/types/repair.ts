export type RepairCategory =
  | "automotive"
  | "appliance"
  | "electronics"
  | "home_office";

export type RiskLevel = "safe" | "caution" | "danger";

export interface SummaryItem {
  label: string;
  value: string;
}

export interface InspectionStep {
  stepNumber: number;
  title: string;
  goal: string;
  steps: string[];
  standard: string;
  safety: string;
  reportBack: string;
}

export interface ToolItem {
  name: string;
  purpose: string;
  optional?: boolean;
}

export interface PartItem {
  name: string;
  specOrCode: string;
  howToVerify: string;
  estimatedPriceThb: string;
  searchKeyword: string;
}

export interface WizardOption {
  label: string;
  description?: string;
}

export interface WizardQuestion {
  id: string;
  tabLabel: string;
  question: string;
  options: WizardOption[];
  allowCustom?: boolean;
}

export interface VisualReference {
  title: string;
  mediaType: "video" | "image";
  searchQuery: string;
  whatToLookFor: string;
}

export interface DiagnosticResponse {
  headline: string;
  riskLevel: RiskLevel;
  riskSummary: string;
  summaryTable: SummaryItem[];
  honestyNote?: string;
  mermaidChart?: string;
  inspectionSteps: InspectionStep[];
  visualReferences?: VisualReference[];
  toolsNeeded: ToolItem[];
  recommendedParts: PartItem[];
  wizardQuestions: WizardQuestion[];
  closingPrompt: string;
}

export type AttachmentKind = "image" | "pdf" | "text" | "audio" | "video";

export interface FileAttachment {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  kind: AttachmentKind;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  imageDataUrl?: string;
  attachment?: FileAttachment;
  attachments?: FileAttachment[];
  diagnostic?: DiagnosticResponse;
  isDemo?: boolean;
  isError?: boolean;
  modelUsed?: string;
  timestamp: number;
}

export interface LoadingProgress {
  stage: string;
  message: string;
  model?: string;
  previewHeadline?: string;
  previewRiskLevel?: RiskLevel;
}

export type DiagnoseStreamEvent =
  | { type: "status"; stage: string; message: string; model?: string }
  | { type: "preview"; headline?: string; riskLevel?: RiskLevel }
  | {
      type: "result";
      diagnostic: DiagnosticResponse;
      isDemo: boolean;
      modelUsed?: string;
    }
  | { type: "error"; error: string; retryAfterSeconds?: number };

export interface ToastItem {
  id: string;
  tone: "info" | "success" | "warning" | "error";
  message: string;
}

export type CaseStatus = "diagnosing" | "waiting_parts" | "resolved";

export type ExplanationMode = "beginner" | "technician";

export type ModelProfileId =
  | "auto"
  | "gemini-4-hydrogen"
  | "gemini-4-neon"
  | "gemini-4-carbon"
  | "gemini-4-argon";

export interface EquipmentAsset {
  id: string;
  name: string;
  category: RepairCategory;
  brandModel: string;
  yearOrSpec?: string;
  notes?: string;
  createdAt: number;
}

export interface RepairCase {
  id: string;
  title: string;
  category: RepairCategory;
  status?: CaseStatus;
  assetId?: string;
  assetSummary?: string;
  completedSteps?: Record<string, boolean>;
  acknowledgedSafety?: Record<string, boolean>;
  messages: ChatMessage[];
  updatedAt: number;
}

