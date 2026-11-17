"use client";

import React, { useState } from "react";
import { Check, ChevronRight, HelpCircle, Send, X } from "lucide-react";
import { WizardQuestion } from "@/types/repair";

interface WizardPanelProps {
  questions: WizardQuestion[];
  onSubmit: (formattedAnswer: string) => void;
  onDismiss: () => void;
  disabled?: boolean;
}

export default function WizardPanel({
  questions,
  onSubmit,
  onDismiss,
  disabled,
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
    <div className="rounded-2xl border border-orange-200 bg-white shadow-md overflow-hidden">
      {/* Header & Tabs */}
      <div className="bg-orange-50/70 border-b border-orange-100 px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <HelpCircle className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 shrink-0">
            ตอบคำถามช่วยวิเคราะห์:
          </span>
          <div className="flex items-center gap-1">
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
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
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

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-md shrink-0"
          title="ปิดตัวช่วย"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Question Body */}
      <div className="p-3.5 space-y-2.5">
        <p className="text-xs sm:text-sm font-semibold text-slate-900">
          {currentQ.question}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-500">
            ตอบแล้ว {answeredCount} / {questions.length} ข้อ
          </div>
          <div className="flex items-center gap-2">
            {activeTab < questions.length - 1 && (
              <button
                type="button"
                onClick={() => setActiveTab((prev) => prev + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
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
    </div>
  );
}

