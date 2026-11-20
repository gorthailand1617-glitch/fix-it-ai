"use client";

import React, { useEffect, useRef } from "react";
import {
  FileAudio,
  FileText,
  FileVideo,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import DiagnosticCard from "@/components/DiagnosticCard";
import { formatFileSize } from "@/lib/case-helpers";
import { getModelDisplayName } from "@/lib/models";
import {
  ChatMessage,
  FileAttachment,
  LoadingProgress,
  RiskLevel,
} from "@/types/repair";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingProgress?: LoadingProgress | null;
  completedSteps?: Record<string, boolean>;
  acknowledgedSafety?: Record<string, boolean>;
  onCancelLoading?: () => void;
  onRetryMessage?: (errorMessageId: string) => void;
  onToggleStep?: (stepKey: string) => void;
  onToggleSafetyAck?: (messageId: string) => void;
  onQuickReply: (prefix: string) => void;
  onQuickSend?: (text: string) => void;
  onPreviewImage?: (image: { src: string; name: string }) => void;
  activeWizardMsgId?: string;
  activeWizardCount?: number;
  onFocusWizard?: () => void;
}

const PREVIEW_RISK_BADGE: Record<
  RiskLevel,
  { label: string; className: string }
> = {
  safe: {
    label: "ทำเองได้ปลอดภัย",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  caution: {
    label: "ต้องระวังพิเศษ",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  danger: {
    label: "อันตราย — ควรเรียกช่าง",
    className: "bg-rose-100 text-rose-800 border-rose-200",
  },
};

function getMessageAttachments(msg: ChatMessage): FileAttachment[] {
  if (msg.attachments && msg.attachments.length > 0) {
    return msg.attachments;
  }
  if (msg.attachment) {
    return [msg.attachment];
  }
  if (msg.imageDataUrl) {
    return [
      {
        name: "image",
        mimeType: "image/jpeg",
        size: 0,
        dataUrl: msg.imageDataUrl,
        kind: "image",
      },
    ];
  }
  return [];
}

function ChatMessageList({
  messages,
  isLoading,
  loadingProgress,
  completedSteps,
  acknowledgedSafety,
  onCancelLoading,
  onRetryMessage,
  onToggleStep,
  onToggleSafetyAck,
  onQuickReply,
  onQuickSend,
  onPreviewImage,
  activeWizardMsgId,
  activeWizardCount,
  onFocusWizard,
}: ChatMessageListProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading, loadingProgress?.previewHeadline]);

  return (
    <>
      {messages.map((msg) => {
        if (msg.role === "user") {
          const msgAtts = getMessageAttachments(msg);
          const images = msgAtts.filter((a) => a.kind === "image");
          const others = msgAtts.filter((a) => a.kind !== "image");

          return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-slate-900 text-white px-4 py-3 shadow-xs space-y-2">
                {images.length > 0 && (
                  <div
                    className={`grid gap-2 ${
                      images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                    }`}
                  >
                    {images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          onPreviewImage?.({
                            src: img.dataUrl,
                            name: img.name || "image.png",
                          })
                        }
                        className="group relative block rounded-xl overflow-hidden bg-black/20 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-orange-400"
                        title="คลิกเพื่อขยายรูป"
                      >
                        {/* Inline base64 Data URL uploaded by the user — next/image does not optimize inline data URLs */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.dataUrl}
                          alt={img.name || "รูปประกอบอาการ"}
                          className="max-h-56 w-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {others.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-xs"
                  >
                    {att.kind === "audio" ? (
                      <FileAudio className="w-4 h-4 text-orange-400 shrink-0" />
                    ) : att.kind === "video" ? (
                      <FileVideo className="w-4 h-4 text-orange-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-orange-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{att.name}</div>
                      <div className="text-[11px] text-slate-300">
                        {formatFileSize(att.size)}
                      </div>
                    </div>
                  </div>
                ))}

                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                </p>
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id} className="flex justify-start">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
              {msg.diagnostic ? (
                <DiagnosticCard
                  data={msg.diagnostic}
                  isDemo={msg.isDemo}
                  modelUsed={msg.modelUsed}
                  messageId={msg.id}
                  completedSteps={completedSteps}
                  onToggleStep={onToggleStep}
                  safetyAcknowledged={Boolean(acknowledgedSafety?.[msg.id])}
                  onToggleSafetyAck={onToggleSafetyAck}
                  onQuickReply={onQuickReply}
                  onQuickSend={onQuickSend}
                  isLoading={isLoading}
                  wizardQuestionCount={
                    msg.id === activeWizardMsgId ? activeWizardCount : 0
                  }
                  onFocusWizard={
                    msg.id === activeWizardMsgId ? onFocusWizard : undefined
                  }
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-rose-600 leading-relaxed">
                    {msg.text}
                  </p>
                  {!isLoading && onRetryMessage && (
                    <button
                      type="button"
                      onClick={() => onRetryMessage(msg.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ลองวิเคราะห์ใหม่</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Loader2 className="w-4 h-4 text-orange-600 animate-spin shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-slate-700 font-medium truncate">
                  {loadingProgress?.message ||
                    "กำลังวิเคราะห์อาการ จัดทำแผนภาพและขั้นตอนตรวจเช็ก..."}
                </p>
                {loadingProgress?.model && (
                  <p className="text-[11px] text-slate-400">
                    โมเดล: {getModelDisplayName(loadingProgress.model)}
                  </p>
                )}
              </div>
            </div>

            {onCancelLoading && (
              <button
                type="button"
                onClick={onCancelLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition-colors shrink-0"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>ยกเลิก</span>
              </button>
            )}
          </div>

          {loadingProgress?.previewHeadline && (
            <div className="rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-2 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {loadingProgress.previewHeadline}
                </span>
                {loadingProgress.previewRiskLevel && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      PREVIEW_RISK_BADGE[loadingProgress.previewRiskLevel]
                        .className
                    }`}
                  >
                    {
                      PREVIEW_RISK_BADGE[loadingProgress.previewRiskLevel]
                        .label
                    }
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div ref={chatEndRef} />
    </>
  );
}

export default React.memo(ChatMessageList);
