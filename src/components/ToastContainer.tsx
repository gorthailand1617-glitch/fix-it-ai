"use client";

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { ToastItem } from "@/types/repair";

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const TONE_STYLES: Record<
  ToastItem["tone"],
  {
    wrapper: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
  }
> = {
  info: {
    wrapper: "border-sky-200 bg-sky-50 text-sky-950",
    icon: Info,
    iconColor: "text-sky-600",
  },
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-950",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-950",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
  },
  error: {
    wrapper: "border-rose-200 bg-rose-50 text-rose-950",
    icon: AlertCircle,
    iconColor: "text-rose-600",
  },
};

export default function ToastContainer({
  toasts,
  onDismiss,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => {
        const style = TONE_STYLES[toast.tone];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs sm:text-sm shadow-lg ${style.wrapper}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${style.iconColor}`} />
            <p className="flex-1 leading-relaxed">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-0.5 rounded-md opacity-60 hover:opacity-100 transition-opacity shrink-0"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
