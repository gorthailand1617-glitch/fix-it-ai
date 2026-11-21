"use client";

import React, { useState } from "react";
import { Check, ChevronRight, HelpCircle, Send, X } from "lucide-react";
import { WizardQuestion } from "@/types/repair";

interface WizardPanelProps {
  questions: WizardQuestion[];
  onSubmit: (formattedAnswer: string) => void;
  onDismiss: () => void;
  disabled?: boolean;
  isHighlighted?: boolean;
}

function WizardPanel({
  questions,
  onSubmit,
  onDismiss,
  disabled,
  isHighlighted,
}: WizardPanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});

  if (!questions || questions.length === 0) return null;

  const currentQ = questions[activeTab] || questions[0];
  const currentAnswer = answers[currentQ.id] || "";
  const isCustomSelected = currentAnswer === "__CUSTOM__";

  const handleSelectOption = (qId: string, label: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: label }));
    if (activeTab < questions.length - 1 && label !== "__CUSTOM__") {
      setTimeout(() => setActiveTab((prev) => Math.min(prev + 1, questions.length - 1)), 150);
    }
  };

  const answeredCount = questions.filter((q) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (ans === "__CUSTOM__") return Boolean(customTexts[q.id]?.trim());
    return true;
  }).length;

  const handleSendAll = () => {
    const lines = questions
      .map((q) => {
        const ans = answers[q.id];
        if (!ans) return null;
        const finalVal =
          ans === "__CUSTOM__" ? customTexts[q.id]?.trim() : ans;
        if (!finalVal) return null;
        return `- ${q.tabLabel}: ${finalVal}`;
      })
      .filter(Boolean);

    if (lines.length === 0) return;
    onSubmit(`ข้อมูลเพิ่มเติมจากตัวช่วยตรวจเช็ก:\n${lines.join("\n")}`);
  };

  return (
    <div
      className={`h-full flex flex-col bg-white transition-shadow duration-300 ${
        isHighlighted ? "ring-2 ring-inset ring-orange-500" : ""
      }`}
    >
      {/* Header & Tabs */}
      <div className="shrink-0 bg-orange-50/90 border-b border-orange-200/80 px-3.5 py-2.5 sm:px-4 sm:py-3 space-y-2 sm:space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-600/10 border border-orange-200 px-2.5 py-0.5 text-[11px] font-bold text-orange-800">
            {answeredCount === 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
            )}
            <span>ขั้นตอนที่ 2 • ช่วยวิเคราะห์ให้แม่นขึ้น</span>
          </span>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-orange-100/70 rounded-md shrink-0 transition-colors"
            title="ซ่อนแผงคำถาม"
            aria-label="ซ่อนแผงคำถามช่วยวิเคราะห์"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 min-w-0">
            <HelpCircle className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="text-sm font-bold text-slate-900 truncate">
              ตอบคำถามช่วยวิเคราะห์
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            กดเลือกคำตอบที่ตรงกับอาการด้านล่าง แล้วกดส่งเพื่อให้ AI ระบุสาเหตุแม่นยำขึ้น
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {questions.map((q, idx) => {
            const hasAns = Boolean(
              answers[q.id] &&
                (answers[q.id] !== "__CUSTOM__" || customTexts[q.id]?.trim())
            );
            const isActive = idx === activeTab;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-orange-600 text-white"
                    : hasAns
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {hasAns && !isActive && <Check className="w-3 h-3" />}
                <span>{q.tabLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Question Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
        <p className="text-sm font-semibold text-slate-900 leading-relaxed">
          {currentQ.question}
        </p>

        <div className="grid grid-cols-1 gap-2">
          {currentQ.options.map((opt, idx) => {
            const selected = currentAnswer === opt.label;
            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectOption(currentQ.id, opt.label)}
                className={`text-left rounded-xl border p-2.5 transition-all ${
                  selected
                    ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                    : "border-slate-200 hover:border-orange-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    {opt.label}
                  </span>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      selected
                        ? "border-orange-600 bg-orange-600 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {selected && <Check className="w-2.5 h-2.5" />}
                  </span>
                </div>
                {opt.description && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {opt.description}
                  </p>
                )}
              </button>
            );
          })}

          {currentQ.allowCustom !== false && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleSelectOption(currentQ.id, "__CUSTOM__")}
              className={`text-left rounded-xl border p-2.5 transition-all ${
                isCustomSelected
                  ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                  : "border-slate-200 hover:border-orange-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">
                  อื่น ๆ (พิมพ์ระบุเอง)
                </span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isCustomSelected
                      ? "border-orange-600 bg-orange-600 text-white"
                      : "border-slate-300"
                  }`}
                >
                  {isCustomSelected && <Check className="w-2.5 h-2.5" />}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                พิมพ์อาการเพิ่มเติมในช่องด้านล่าง
              </p>
            </button>
          )}
        </div>

        {isCustomSelected && (
          <input
            type="text"
            value={customTexts[currentQ.id] || ""}
            onChange={(e) =>
              setCustomTexts((prev) => ({
                ...prev,
                [currentQ.id]: e.target.value,
              }))
            }
            placeholder="พิมพ์รายละเอียดเพิ่มเติม..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-3.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-3 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500">
          ตอบแล้ว {answeredCount} / {questions.length} ข้อ
        </div>
        <div className="flex items-center gap-2">
          {activeTab < questions.length - 1 && (
            <button
              type="button"
              onClick={() => setActiveTab((prev) => prev + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
            >
              <span>ข้อถัดไป</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled || answeredCount === 0}
            onClick={handleSendAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ส่งคำตอบ ({answeredCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(WizardPanel);

