"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Package,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Square,
  Volume2,
  Wrench,
} from "lucide-react";
import { DiagnosticResponse, RepairCategory, RiskLevel } from "@/types/repair";
import {
  buildShopeeAffiliateLink,
  hasActiveAffiliateConfig,
} from "@/lib/affiliate";
import { getModelDisplayName, isGemini4Model } from "@/lib/models";
import {
  isSpeechSynthesisSupported,
  speakThaiText,
  stopSpeaking,
} from "@/lib/speech";
import MermaidDiagram from "./MermaidDiagram";

interface DiagnosticCardProps {
  data: DiagnosticResponse;
  category?: RepairCategory;
  isDemo?: boolean;
  modelUsed?: string;
  messageId?: string;
  completedSteps?: Record<string, boolean>;
  onToggleStep?: (stepKey: string) => void;
  safetyAcknowledged?: boolean;
  onToggleSafetyAck?: (messageId: string) => void;
  onQuickReply?: (text: string) => void;
  onQuickSend?: (text: string) => void;
  isLoading?: boolean;
  wizardQuestionCount?: number;
  onFocusWizard?: () => void;
}

const emptySubscribe = () => () => {};

const RISK_CONFIG: Record<
  RiskLevel,
  {
    label: string;
    badge: string;
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  safe: {
    label: "ทำเองได้ปลอดภัย",
    badge: "bg-emerald-600 text-white",
    bg: "bg-emerald-50/90",
    border: "border-emerald-200",
    text: "text-emerald-900",
    icon: ShieldCheck,
  },
  caution: {
    label: "ทำได้ — ต้องระวังพิเศษ",
    badge: "bg-amber-500 text-white",
    bg: "bg-amber-50/90",
    border: "border-amber-200",
    text: "text-amber-950",
    icon: AlertTriangle,
  },
  danger: {
    label: "อันตราย — ควรเรียกช่าง",
    badge: "bg-rose-600 text-white",
    bg: "bg-rose-50/90",
    border: "border-rose-200",
    text: "text-rose-950",
    icon: ShieldAlert,
  },
};

function DiagnosticCard({
  data,
  category,
  isDemo,
  modelUsed,
  messageId,
  completedSteps,
  onToggleStep,
  safetyAcknowledged,
  onToggleSafetyAck,
  onQuickReply,
  onQuickSend,
  isLoading,
  wizardQuestionCount,
  onFocusWizard,
}: DiagnosticCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const ttsSupported = useSyncExternalStore(
    emptySubscribe,
    isSpeechSynthesisSupported,
    () => false
  );

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const risk = RISK_CONFIG[data.riskLevel] || RISK_CONFIG.caution;
  const RiskIcon = risk.icon;
  const showWizardCta = Boolean(
    wizardQuestionCount && wizardQuestionCount > 0 && onFocusWizard
  );

  const handleCopyKeyword = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleToggleSpeak = (id: string, textToRead: string) => {
    if (speakingId === id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    const started = speakThaiText(textToRead, () => {
      setSpeakingId((curr) => (curr === id ? null : curr));
    });
    if (!started) {
      setSpeakingId(null);
    }
  };

  const totalSteps = data.inspectionSteps?.length || 0;
  const completedCount =
    messageId && data.inspectionSteps
      ? data.inspectionSteps.filter((step) =>
          Boolean(completedSteps?.[`${messageId}:${step.stepNumber}`])
        ).length
      : 0;

  return (
    <div className="space-y-3 sm:space-y-4 text-slate-800">
      {/* Headline, TTS & Demo tag */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug flex-1 min-w-0">
          {data.headline}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {ttsSupported && (
            <button
              type="button"
              onClick={() =>
                handleToggleSpeak(
                  "card",
                  `${data.headline} ระดับความปลอดภัย ${risk.label} ${data.riskSummary}`
                )
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                speakingId === "card"
                  ? "bg-orange-600 text-white border-orange-600"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200"
              }`}
              title="อ่านหัวข้อและคำเตือนความปลอดภัยออกเสียง"
            >
              {speakingId === "card" ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>หยุดฟัง</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>ฟังสรุป</span>
                </>
              )}
            </button>
          )}
          {isDemo && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              โหมดสาธิต (Demo)
            </span>
          )}
          {!isDemo && modelUsed && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                isGemini4Model(modelUsed)
                  ? "bg-violet-50 text-violet-800 border-violet-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
              title={`วิเคราะห์โดย ${modelUsed}`}
            >
              {isGemini4Model(modelUsed) && (
                <Sparkles className="w-3 h-3 text-violet-600" />
              )}
              <span>{getModelDisplayName(modelUsed)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Safety Gatekeeper Banner */}
      <div
        className={`rounded-xl border ${risk.border} ${risk.bg} p-3 sm:p-3.5 space-y-2.5`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-lg shrink-0 ${risk.badge}`}>
            <RiskIcon className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold uppercase tracking-wide ${risk.text}`}
              >
                ระดับความปลอดภัย: {risk.label}
              </span>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${risk.text}`}>
              {data.riskSummary}
            </p>
          </div>
        </div>

        {(data.riskLevel === "caution" || data.riskLevel === "danger") &&
          messageId &&
          onToggleSafetyAck && (
            <button
              type="button"
              onClick={() => onToggleSafetyAck(messageId)}
              className={`w-full flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                safetyAcknowledged
                  ? "border-emerald-300 bg-white/90 text-emerald-900"
                  : "border-black/10 bg-white/70 hover:bg-white text-slate-800"
              }`}
            >
              <span
                className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                  safetyAcknowledged
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-slate-400 bg-white"
                }`}
              >
                {safetyAcknowledged && <Check className="w-3 h-3" />}
              </span>
              <span className="font-medium leading-relaxed">
                {data.riskLevel === "danger"
                  ? "ยืนยัน: รับทราบความเสี่ยงสูง — จะตรวจเฉพาะจุดปลอดภัยหรือติดต่อช่างผู้เชี่ยวชาญ"
                  : "ยืนยัน: รับทราบข้อควรระวังและเตรียมความปลอดภัยแล้ว (เช่น สับเบรกเกอร์ / ดึงเบรกมือ / รอเครื่องเย็น)"}
              </span>
            </button>
          )}
      </div>

      {/* Top Guided Call-to-Action for Helper Wizard */}
      {showWizardCta && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2.5 sm:px-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-lg bg-orange-600 text-white shrink-0 mt-0.5">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs sm:text-sm font-bold text-slate-900">
                ขั้นตอนถัดไป: ตอบคำถามช่วยวิเคราะห์ {wizardQuestionCount} ข้อ
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-snug">
                กดเลือกคำตอบสั้น ๆ เพื่อให้ AI เจาะลึกสาเหตุและระบุอะไหล่ได้แม่นยำขึ้น
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFocusWizard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors shrink-0"
          >
            <span className="hidden md:inline">ไปตอบช่องขวา</span>
            <span className="md:hidden">ตอบคำถามเลย</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary Table */}
      {data.summaryTable && data.summaryTable.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <ClipboardList className="w-3.5 h-3.5 text-orange-600" />
            <span>สรุปข้อมูลเคสซ่อม</span>
          </div>
          <div className="divide-y divide-slate-100">
            {data.summaryTable.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-3.5 py-2 text-xs sm:text-sm"
              >
                <div className="font-semibold text-slate-600">{row.label}</div>
                <div className="sm:col-span-2 text-slate-900">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Honesty Note */}
      {data.honestyNote && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-sky-900">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{data.honestyNote}</p>
        </div>
      )}

      {/* Mermaid Decision Flow */}
      {data.mermaidChart && <MermaidDiagram chart={data.mermaidChart} />}

      {/* Inspection Steps */}
      {data.inspectionSteps && data.inspectionSteps.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-orange-600" />
              <span>ขั้นตอนตรวจเช็กทีละจุด</span>
            </div>
            {messageId && totalSteps > 0 && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  completedCount === totalSteps
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>
                  เสร็จแล้ว {completedCount}/{totalSteps}
                </span>
              </span>
            )}
          </div>

          {data.inspectionSteps.map((step) => {
            const stepKey = messageId ? `${messageId}:${step.stepNumber}` : "";
            const isDone = Boolean(stepKey && completedSteps?.[stepKey]);
            const stepSpeakId = `step-${step.stepNumber}`;
            const stepSpeakText = `ขั้นตอนที่ ${step.stepNumber} ${step.title} เป้าหมาย ${step.goal} วิธีทำ ${step.steps.join(" ")} ค่าปกติที่ควรเห็น ${step.standard} ข้อควรระวัง ${step.safety}`;

            return (
              <div
                key={step.stepNumber}
                className={`rounded-xl border p-3 sm:p-4 shadow-xs space-y-2.5 transition-colors ${
                  isDone
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {messageId && onToggleStep ? (
                      <button
                        type="button"
                        onClick={() => onToggleStep(stepKey)}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 transition-colors ${
                          isDone
                            ? "bg-emerald-600 text-white"
                            : "bg-orange-600 hover:bg-orange-700 text-white"
                        }`}
                        title={
                          isDone
                            ? "ทำเครื่องหมายว่ายังไม่เสร็จ"
                            : "ติ๊กทำขั้นนี้เสร็จแล้ว"
                        }
                        aria-label={`สลับสถานะขั้นตอนที่ ${step.stepNumber}`}
                      >
                        {isDone ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          step.stepNumber
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold shrink-0">
                        {step.stepNumber}
                      </span>
                    )}
                    <h4
                      className={`font-bold text-sm sm:text-base ${
                        isDone
                          ? "text-emerald-950 line-through decoration-emerald-500/60"
                          : "text-slate-900"
                      }`}
                    >
                      {step.title}
                    </h4>
                  </div>

                  {ttsSupported && (
                    <button
                      type="button"
                      onClick={() => handleToggleSpeak(stepSpeakId, stepSpeakText)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border shrink-0 transition-colors ${
                        speakingId === stepSpeakId
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-orange-50 hover:text-orange-700"
                      }`}
                      title="อ่านขั้นตอนนี้เป็นเสียง"
                    >
                      {speakingId === stepSpeakId ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>หยุด</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>ฟังขั้นนี้</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">เป้าหมาย:</span>{" "}
                  {step.goal}
                </p>

                <ol className="space-y-1.5 pl-1">
                  {step.steps.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs sm:text-sm text-slate-800 leading-relaxed"
                    >
                      <span className="text-orange-600 font-semibold mt-0.5">
                        {i + 1}.
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/80 p-2.5 text-xs">
                    <div className="font-semibold text-emerald-800 flex items-center gap-1 mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ค่าปกติที่ควรเห็น</span>
                    </div>
                    <p className="text-emerald-950 leading-relaxed">
                      {step.standard}
                    </p>
                  </div>

                  <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 text-xs">
                    <div className="font-semibold text-amber-800 flex items-center gap-1 mb-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>ข้อควรระวัง</span>
                    </div>
                    <p className="text-amber-950 leading-relaxed">
                      {step.safety}
                    </p>
                  </div>
                </div>

                <div className="pt-2 space-y-2 border-t border-slate-100">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">
                      รายงานกลับ:{" "}
                    </span>
                    {step.reportBack}
                  </div>

                  {(onQuickSend || onQuickReply) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          if (stepKey && onToggleStep && !isDone) {
                            onToggleStep(stepKey);
                          }
                          const msg = `ทำขั้นตอนที่ ${step.stepNumber} (${step.title}) เสร็จแล้วครับ: ผลตรวจปกติตามค่ามาตรฐาน`;
                          if (onQuickSend) {
                            onQuickSend(msg);
                          } else {
                            onQuickReply?.(msg);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ปกติ</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() =>
                          onQuickReply?.(
                            `ทำขั้นตอนที่ ${step.stepNumber} (${step.title}) แล้วพบความผิดปกติ: `
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 transition-colors"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>พบผิดปกติ</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          const msg = `ขั้นตอนที่ ${step.stepNumber} (${step.title}): ไม่มีเครื่องมือตามที่ระบุครับ มีวิธีตรวจเช็กด้วยตาเปล่าหรือเครื่องมือพื้นฐานแทนไหม`;
                          if (onQuickSend) {
                            onQuickSend(msg);
                          } else {
                            onQuickReply?.(msg);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>ไม่มีเครื่องมือ</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visual References: Videos & Example Images */}
      {data.visualReferences && data.visualReferences.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <PlayCircle className="w-4 h-4 text-rose-600" />
            <span>ตัวอย่างวิดีโอและภาพประกอบวิธีทำ (กดเปิดดูเทียบหน้างาน)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.visualReferences.map((ref, idx) => {
              const isVideo = ref.mediaType === "video";
              const href = isVideo
                ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
                    ref.searchQuery
                  )}`
                : `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
                    ref.searchQuery
                  )}`;
              return (
                <a
                  key={idx}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-slate-200 bg-white p-3 hover:border-orange-300 hover:shadow-xs transition-all flex items-start gap-3"
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isVideo
                        ? "bg-rose-50 text-rose-600"
                        : "bg-sky-50 text-sky-600"
                    }`}
                  >
                    {isVideo ? (
                      <PlayCircle className="w-5 h-5" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {isVideo ? "วิดีโอ YouTube" : "ภาพตัวอย่าง Google"}
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-orange-600 shrink-0" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-orange-700 line-clamp-2">
                      {ref.title}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      <span className="font-semibold text-slate-700">
                        จุดสังเกต:{" "}
                      </span>
                      {ref.whatToLookFor}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Tools & Recommended Spare Parts */}
      {((data.toolsNeeded && data.toolsNeeded.length > 0) ||
        (data.recommendedParts && data.recommendedParts.length > 0)) && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShoppingBag className="w-4 h-4 text-orange-600" />
            <span>เครื่องมือและอะไหล่ที่แนะนำ</span>
          </div>

          {data.toolsNeeded && data.toolsNeeded.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-600">
                เครื่องมือที่ควรเตรียม:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.toolsNeeded.map((tool, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs flex flex-col justify-between gap-1.5"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center justify-between gap-2">
                        <span>{tool.name}</span>
                        {tool.optional && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            ถ้ามี
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 mt-0.5">{tool.purpose}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <a
                        href={buildShopeeAffiliateLink(tool.name, {
                          category,
                          itemType: "tool",
                          source: "card",
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
                      >
                        <span>เช็กราคา Shopee</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.recommendedParts && data.recommendedParts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600">
                อะไหล่ที่อาจต้องเปลี่ยน (ตรวจสอบตามสเปกเดิมก่อนสั่งซื้อ):
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {data.recommendedParts.map((part, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-white border border-slate-200 p-3 sm:p-3.5 space-y-2 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-600 shrink-0" />
                        <span className="font-bold text-sm text-slate-900">
                          {part.name}
                        </span>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        ~ {part.estimatedPriceThb}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-800">
                          สเปก / รหัสที่ต้องดู:{" "}
                        </span>
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-900 break-words">
                          {part.specOrCode}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">
                          วิธีเช็กให้ตรงรุ่น:{" "}
                        </span>
                        {part.howToVerify}
                      </div>
                    </div>

                    <div className="pt-1 flex flex-wrap gap-2">
                      <a
                        href={buildShopeeAffiliateLink(part.searchKeyword, {
                          category,
                          itemType: "part",
                          source: "card",
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                      >
                        <span>ซื้อบน Shopee</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(
                          part.searchKeyword + " ราคา"
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <span>ร้านอะไหล่ (Google)</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyKeyword(part.searchKeyword, i)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        {copiedIndex === i ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>คัดลอกคำค้น</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasActiveAffiliateConfig() && (
            <p className="text-[11px] text-slate-500 pt-1">
              * ลิงก์สั่งซื้อบางรายการเป็นลิงก์ Affiliate เพื่อช่วยสนับสนุนผู้พัฒนา Fix it AI โดยไม่บวกราคาสินค้าเพิ่ม
            </p>
          )}
        </div>
      )}

      {/* Closing Prompt */}
      {(data.closingPrompt || showWizardCta) && (
        <div className="bg-slate-100/80 rounded-xl px-3 py-2.5 sm:px-3.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-xs sm:text-sm text-slate-700 font-medium flex-1 min-w-0">
            💡{" "}
            {data.closingPrompt ||
              "กดเลือกคำตอบในช่อง 'ตอบคำถามช่วยวิเคราะห์' ด้านขวาเพื่อให้ AI วิเคราะห์ขั้นตอนถัดไปได้แม่นยำขึ้น"}
          </p>
          {showWizardCta && (
            <button
              type="button"
              onClick={onFocusWizard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors shrink-0"
            >
              <span>ตอบคำถามช่วยวิเคราะห์ ({wizardQuestionCount} ข้อ)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(DiagnosticCard);
