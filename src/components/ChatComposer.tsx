"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Camera,
  FileAudio,
  FileText,
  FileVideo,
  Mic,
  MicOff,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { formatFileSize } from "@/lib/case-helpers";
import {
  isSpeechRecognitionSupported,
  startThaiSpeechRecognition,
} from "@/lib/speech";
import { FileAttachment } from "@/types/repair";

interface ChatComposerProps {
  input: string;
  onInputChange: (val: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  attachments: FileAttachment[];
  onFilesSelected: (files: FileList | File[]) => void;
  onRemoveAttachment: (index: number) => void;
  onPreviewImage?: (image: { src: string; name: string }) => void;
  onVoiceError?: (message: string) => void;
  onSend: (overrideText?: string) => void;
  isLoading: boolean;
  hasMessages: boolean;
}

const emptySubscribe = () => () => {};

const QUICK_CHIPS = [
  "ทำเสร็จแล้วครับ",
  "ไม่มีเครื่องมือวัด มีวิธีเช็กด้วยตาเปล่าไหม",
  "ขอรายละเอียดอะไหล่และราคาเพิ่ม",
];

export default function ChatComposer({
  input,
  onInputChange,
  textareaRef,
  attachments,
  onFilesSelected,
  onRemoveAttachment,
  onPreviewImage,
  onVoiceError,
  onSend,
  isLoading,
  hasMessages,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const latestInputRef = useRef(input);

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  const sttSupported = useSyncExternalStore(
    emptySubscribe,
    isSpeechRecognitionSupported,
    () => false
  );

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
      return;
    }

    setIsListening(true);
    setInterimTranscript("");
    const session = startThaiSpeechRecognition({
      onInterim: (text) => setInterimTranscript(text),
      onFinal: (finalChunk) => {
        const current = latestInputRef.current.trim();
        const combined = current ? `${current} ${finalChunk}` : finalChunk;
        latestInputRef.current = combined;
        onInputChange(combined);
      },
      onEnd: () => {
        recognitionRef.current = null;
        setIsListening(false);
        setInterimTranscript("");
      },
      onError: (msg) => {
        onVoiceError?.(msg);
      },
    });

    if (session) {
      recognitionRef.current = session;
    } else {
      setIsListening(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(e.target.files);
    }
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const f = items[i].getAsFile();
        if (f) pastedFiles.push(f);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      onFilesSelected(pastedFiles);
    }
  };

  const triggerSend = (overrideText?: string) => {
    if (isListening) {
      stopListening();
    }
    onSend(overrideText);
  };

  return (
    <footer className="bg-white border-t border-slate-200 px-4 py-2.5 shrink-0">
      <div className="max-w-4xl mx-auto space-y-2.5">
        {hasMessages && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isLoading}
                onClick={() => onInputChange(chip)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-600 border border-slate-200 shrink-0 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {isListening && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
              <span className="font-semibold shrink-0">
                กำลังฟังเสียงภาษาไทย...
              </span>
              {interimTranscript && (
                <span className="truncate text-rose-700 italic">
                  &quot;{interimTranscript}&quot;
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="text-[11px] font-semibold text-rose-700 hover:underline shrink-0"
            >
              หยุดฟัง
            </button>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            {attachments.map((att, idx) => (
              <div
                key={`${att.name}-${idx}`}
                className="relative inline-flex items-center"
              >
                {att.kind === "image" ? (
                  <button
                    type="button"
                    onClick={() =>
                      onPreviewImage?.({ src: att.dataUrl, name: att.name })
                    }
                    className="block rounded-xl border border-slate-200 overflow-hidden cursor-zoom-in hover:border-orange-400 transition-colors"
                    title="คลิกเพื่อขยายรูป"
                  >
                    {/* Inline base64 Data URL preview before sending — next/image cannot optimize local data URLs */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className="h-20 w-20 object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 pr-7">
                    {att.kind === "audio" ? (
                      <FileAudio className="w-5 h-5 text-orange-600 shrink-0" />
                    ) : att.kind === "video" ? (
                      <FileVideo className="w-5 h-5 text-orange-600 shrink-0" />
                    ) : (
                      <FileText className="w-5 h-5 text-orange-600 shrink-0" />
                    )}
                    <div className="max-w-[180px]">
                      <div className="font-semibold truncate">{att.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {formatFileSize(att.size)}
                      </div>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shadow"
                  title="ลบไฟล์นี้"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-2xl border border-slate-300 bg-slate-50 px-2.5 py-2 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
          <input
            ref={fileInputRef}
            id="fixit-file-upload"
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.csv,.json,.log,.md,.xml,.yaml,.yml,.ini,audio/*,video/*"
            onChange={handleFileUpload}
            className="sr-only"
          />
          <input
            ref={cameraInputRef}
            id="fixit-camera-upload"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="sr-only"
          />

          <label
            htmlFor="fixit-camera-upload"
            className={`p-2 rounded-xl text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors shrink-0 cursor-pointer ${
              isLoading ? "pointer-events-none opacity-40" : ""
            }`}
            title="ถ่ายรูปหน้างานทันที"
          >
            <Camera className="w-5 h-5" />
          </label>

          <label
            htmlFor="fixit-file-upload"
            className={`p-2 rounded-xl text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors shrink-0 cursor-pointer ${
              isLoading ? "pointer-events-none opacity-40" : ""
            }`}
            title="แนบไฟล์ได้หลายไฟล์พร้อมกัน: รูปภาพ, PDF คู่มือ, ไฟล์ Log (.txt/.csv/.json), เสียง หรือวิดีโอ"
          >
            <Paperclip className="w-5 h-5" />
          </label>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                triggerSend();
              }
            }}
            placeholder="พิมพ์อาการ, พูดด้วยเสียง, วางรูป (Ctrl+V) หรือถ่ายรูปส่งมาได้เลย..."
            className="flex-1 bg-transparent py-2 px-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-36"
          />

          {sttSupported && (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleToggleVoice}
              className={`p-2 rounded-xl transition-colors shrink-0 ${
                isListening
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "text-slate-500 hover:text-orange-600 hover:bg-orange-50"
              } disabled:opacity-40`}
              title={isListening ? "หยุดรับเสียง" : "พูดแทนการพิมพ์ (ภาษาไทย)"}
              aria-label={isListening ? "หยุดรับเสียง" : "พูดแทนการพิมพ์"}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            onClick={() => triggerSend()}
            className="p-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            title="ส่ง"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>
            * ตรวจสอบความปลอดภัยก่อนลงมือซ่อมทุกครั้ง
            หากเสี่ยงอันตรายควรเรียกช่างผู้เชี่ยวชาญ
          </span>
          <span className="font-medium text-slate-500 shrink-0 ml-2">
            Dev. By Kru.Gorthailand
          </span>
        </div>
      </div>
    </footer>
  );
}
