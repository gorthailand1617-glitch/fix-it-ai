"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Info,
  Package,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { DiagnosticResponse, RiskLevel } from "@/types/repair";
import {
  buildLazadaAffiliateLink,
  buildShopeeAffiliateLink,
} from "@/lib/affiliate";
import MermaidDiagram from "./MermaidDiagram";

interface DiagnosticCardProps {
  data: DiagnosticResponse;
  isDemo?: boolean;
  onQuickReply?: (text: string) => void;
}

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

export default function DiagnosticCard({
  data,
  isDemo,
  onQuickReply,
}: DiagnosticCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const risk = RISK_CONFIG[data.riskLevel] || RISK_CONFIG.caution;
  const RiskIcon = risk.icon;

  const handleCopyKeyword = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Headline & Demo tag */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
          {data.headline}
        </h3>
        {isDemo && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            โหมดสาธิต (Demo)
          </span>
        )}
      </div>

      {/* Safety Gatekeeper Banner */}
      <div
        className={`rounded-xl border ${risk.border} ${risk.bg} p-3.5 flex items-start gap-3`}
      >
        <div className={`p-1.5 rounded-lg shrink-0 ${risk.badge}`}>
          <RiskIcon className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wide ${risk.text}`}>
              ระดับความปลอดภัย: {risk.label}
            </span>
          </div>
          <p className={`text-xs sm:text-sm leading-relaxed ${risk.text}`}>
            {data.riskSummary}
          </p>
        </div>
      </div>

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
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-orange-600" />
            <span>ขั้นตอนตรวจเช็กทีละจุด</span>
          </div>
          {data.inspectionSteps.map((step) => (
            <div
              key={step.stepNumber}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold shrink-0">
                    {step.stepNumber}
                  </span>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900">
                    {step.title}
                  </h4>
                </div>
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
                  <p className="text-emerald-950 leading-relaxed">{step.standard}</p>
                </div>

                <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 text-xs">
                  <div className="font-semibold text-amber-800 flex items-center gap-1 mb-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>ข้อควรระวัง</span>
                  </div>
                  <p className="text-amber-950 leading-relaxed">{step.safety}</p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-t border-slate-100">
                <div>
                  <span className="font-semibold text-slate-800">รายงานกลับ: </span>
                  {step.reportBack}
                </div>
                {onQuickReply && (
                  <button
                    type="button"
                    onClick={() =>
                      onQuickReply(`ทำขั้นตอนที่ ${step.stepNumber} เสร็จแล้วครับ: `)
                    }
                    className="text-orange-600 hover:text-orange-700 font-semibold hover:underline shrink-0"
                  >
                    ตอบผลขั้นนี้ →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual References: Videos & Example Images */}
      {data.visualReferences && data.visualReferences.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
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
                      <span className="font-semibold text-slate-700">จุดสังเกต: </span>
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
        <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-4">
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
                    <div className="flex items-center gap-2 pt-0.5">
                      <a
                        href={buildShopeeAffiliateLink(tool.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-orange-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Shopee</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <span className="text-slate-300">•</span>
                      <a
                        href={buildLazadaAffiliateLink(tool.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Lazada</span>
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
                    className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-2 shadow-2xs"
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
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-900">
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
                        href={buildShopeeAffiliateLink(part.searchKeyword)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                      >
                        <span>Shopee</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={buildLazadaAffiliateLink(part.searchKeyword)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        <span>Lazada</span>
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
        </div>
      )}

      {/* Closing Prompt */}
      {data.closingPrompt && (
        <p className="text-xs sm:text-sm text-slate-700 font-medium bg-slate-100/80 rounded-xl px-3.5 py-2.5 border border-slate-200">
          💡 {data.closingPrompt}
        </p>
      )}
    </div>
  );
}

