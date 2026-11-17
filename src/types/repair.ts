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
  timestamp: number;
}

export interface RepairCase {
  id: string;
  title: string;
  category: RepairCategory;
  messages: ChatMessage[];
  updatedAt: number;
}

