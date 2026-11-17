"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Car,
  Cpu,
  FileAudio,
  FileText,
  FileVideo,
  History,
  Loader2,
  Menu,
  MessageSquarePlus,
  MonitorSmartphone,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  Wind,
  Wrench,
  X,
} from "lucide-react";
import DiagnosticCard from "@/components/DiagnosticCard";
import WizardPanel from "@/components/WizardPanel";
import {
  AttachmentKind,
  ChatMessage,
  FileAttachment,
  RepairCase,
  RepairCategory,
} from "@/types/repair";

const STORAGE_KEY = "fix-it-ai-cases-v1";

const STARTER_CATEGORIES: {
  id: RepairCategory;
  title: string;
  subtitle: string;
  samplePrompt: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    id: "automotive",
    title: "รถยนต์ & มอเตอร์ไซค์",
    subtitle: "สตาร์ทไม่ติด, ไฟหน้าปัดโชว์, เร่งสะดุด, เสียงดังผิดปกติ",
    samplePrompt:
      "รถยนต์สตาร์ทไม่ติด บิดกุญแจมีเสียงแชะ ๆ ไฟหน้าปัดติดปกติ ควรเช็กจุดไหนก่อนและต้องเตรียมอะไหล่อะไรบ้าง",
    icon: Car,
    accent: "text-orange-600 bg-orange-50 border-orange-200",
  },
  {
    id: "appliance",
    title: "เครื่องใช้ไฟฟ้าในบ้าน",
    subtitle: "แอร์ไม่เย็น, ตู้เย็นไม่ฉ่ำ, เครื่องซักผ้าไม่ปั่น, ปั๊มน้ำตัด",
    samplePrompt:
      "แอร์บ้านเปิดแล้วมีแต่ลมออกมา ไม่เย็นเลย ล้างฟิลเตอร์แล้วก็ไม่หาย ต้องเช็กอะไรต่อและมีอะไหล่อะไรเสียได้บ้าง",
    icon: Wind,
    accent: "text-sky-600 bg-sky-50 border-sky-200",
  },
  {
    id: "electronics",
    title: "คอมพิวเตอร์ & อิเล็กทรอนิกส์",
    subtitle: "โน้ตบุ๊กเปิดไม่ติด, จอไม่ขึ้นภาพ, เราเตอร์หลุดบ่อย",
    samplePrompt:
      "คอมพิวเตอร์ตั้งโต๊ะกดเปิดแล้วพัดลมหมุนแต่หน้าจอไม่ขึ้นภาพ ไม่มีเสียงบี๊บ ต้องตรวจเช็กยังไงครับ",
    icon: Cpu,
    accent: "text-violet-600 bg-violet-50 border-violet-200",
  },
  {
    id: "home_office",
    title: "อุปกรณ์สำนักงาน & ไฟบ้าน",
    subtitle: "ปรินเตอร์กระดาษติด/ไม่ดูด, UPS ร้องเตือน, ปลั๊ก/สวิตช์เสีย",
    samplePrompt:
      "ปรินเตอร์อิงค์เจ็ทในออฟฟิศขึ้นไฟกระพริบส้มสลับเขียวและไม่ยอมพิมพ์ ต้องตรวจเช็กและแก้อย่างไร",
    icon: MonitorSmartphone,
    accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
];

function createEmptyCase(category: RepairCategory = "automotive"): RepairCase {
  return {
    id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "เคสซ่อมใหม่",
    category,
    messages: [],
    updatedAt: Date.now(),
  };
}

export default function HomePage() {
  const [cases, setCases] = useState<RepairCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wizardDismissedForMsgId, setWizardDismissedForMsgId] = useState<
    string | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved cases from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RepairCase[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCases(parsed);
          setActiveCaseId(parsed[0].id);
          return;
        }
      }
    } catch {
      // ignore storage errors
    }
    const initial = createEmptyCase();
    setCases([initial]);
    setActiveCaseId(initial.id);
  }, []);

  // Persist cases to localStorage
  useEffect(() => {
    if (cases.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
    } catch {
      // ignore quota errors
    }
  }, [cases]);

  const activeCase = cases.find((c) => c.id === activeCaseId) || cases[0];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeCase?.messages.length, isLoading]);

  const handleNewCase = (category: RepairCategory = "automotive") => {
    const newCase = createEmptyCase(category);
    setCases((prev) => [newCase, ...prev]);
    setActiveCaseId(newCase.id);
    setWizardDismissedForMsgId(null);
    setSidebarOpen(false);
  };

  const handleDeleteCase = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCases((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const fresh = createEmptyCase();
        setActiveCaseId(fresh.id);
        return [fresh];
      }
      if (activeCaseId === id) {
        setActiveCaseId(filtered[0].id);
      }
      return filtered;
    });
  };

  const detectAttachmentKind = (file: File): AttachmentKind | null => {
    const name = file.name.toLowerCase();
    if (file.type.startsWith("image/")) return "image";
    if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
    if (file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|aac)$/.test(name))
      return "audio";
    if (file.type.startsWith("video/") || /\.(mp4|webm|mov)$/.test(name))
      return "video";
    if (
      file.type.startsWith("text/") ||
      file.type === "application/json" ||
      /\.(txt|csv|json|log|md|xml|yaml|yml|ini)$/.test(name)
    ) {
      return "text";
    }
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const remainingSlots = 6 - attachments.length;
    if (remainingSlots <= 0) {
      alert("แนบได้สูงสุด 6 ไฟล์ต่อครั้งครับ");
      return;
    }

    const currentTotalSize = attachments.reduce((sum, a) => sum + a.size, 0);
    let runningSize = currentTotalSize;

    const toRead = fileArray.slice(0, remainingSlots);
    if (fileArray.length > remainingSlots) {
      alert(`แนบได้สูงสุด 6 ไฟล์ต่อครั้ง (เลือกเพิ่มได้อีก ${remainingSlots} ไฟล์)`);
    }

    for (const file of toRead) {
      const kind = detectAttachmentKind(file);
      if (!kind) {
        alert(
          `ไม่รองรับไฟล์ "${file.name}" ครับ รองรับ: รูปภาพ, PDF, ไฟล์ข้อความ/Log (.txt, .csv, .json, .log), เสียง และวิดีโอ`
        );
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`ไฟล์ "${file.name}" มีขนาดเกิน 10 MB ครับ`);
        continue;
      }
      if (runningSize + file.size > 15 * 1024 * 1024) {
        alert("ขนาดไฟล์รวมทั้งหมดต่อครั้งไม่ควรเกิน 15 MB ครับ");
        break;
      }
      runningSize += file.size;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAttachments((prev) => {
            if (prev.length >= 6) return prev;
            return [
              ...prev,
              {
                name: file.name || `pasted-image-${Date.now()}.png`,
                mimeType: file.type || "application/octet-stream",
                size: file.size,
                dataUrl: reader.result as string,
                kind,
              },
            ];
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
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
      processFiles(pastedFiles);
    }
  };

  const sendMessage = async (overrideText?: string) => {
    if (isLoading) return;
    const textToSend = (overrideText ?? input).trim();
    if (!textToSend && attachments.length === 0) return;

    let targetCase = activeCase;
    if (!targetCase) {
      targetCase = createEmptyCase();
      setCases([targetCase]);
      setActiveCaseId(targetCase.id);
    }

    const currentAttachments = attachments;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      text:
        textToSend ||
        (currentAttachments.length > 0
          ? `ช่วยวิเคราะห์ไฟล์แนบ (${currentAttachments.length} ไฟล์) ให้หน่อยครับ`
          : "ช่วยวิเคราะห์ให้หน่อยครับ"),
      attachments: currentAttachments,
      timestamp: Date.now(),
    };

    if (!overrideText) setInput("");
    setAttachments([]);
    setWizardDismissedForMsgId(null);

    const updatedTitle =
      targetCase.messages.length === 0
        ? (
            textToSend ||
            currentAttachments[0]?.name ||
            "วิเคราะห์จากไฟล์แนบ"
          ).slice(0, 36)
        : targetCase.title;

    setCases((prev) =>
      prev.map((c) =>
        c.id === targetCase.id
          ? {
              ...c,
              title: updatedTitle,
              messages: [...c.messages, userMsg],
              updatedAt: Date.now(),
            }
          : c
      )
    );

    setIsLoading(true);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          attachments: currentAttachments,
          history: targetCase.messages.map((m) => ({
            role: m.role,
            text: m.text,
            diagnostic: m.diagnostic,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถเชื่อมต่อ AI ได้");
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: "assistant",
        text: data.diagnostic.headline || "ผลการวิเคราะห์",
        diagnostic: data.diagnostic,
        isDemo: Boolean(data.isDemo),
        timestamp: Date.now(),
      };

      setCases((prev) =>
        prev.map((c) =>
          c.id === targetCase.id
            ? {
                ...c,
                messages: [...c.messages, assistantMsg],
                updatedAt: Date.now(),
              }
            : c
        )
      );
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: "assistant",
        text:
          err instanceof Error
            ? `เกิดข้อผิดพลาด: ${err.message}`
            : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
        timestamp: Date.now(),
      };
      setCases((prev) =>
        prev.map((c) =>
          c.id === targetCase.id
            ? { ...c, messages: [...c.messages, errorMsg] }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const lastAssistantMsg = activeCase?.messages
    .slice()
    .reverse()
    .find((m) => m.role === "assistant");

  const activeWizardQuestions =
    lastAssistantMsg &&
    lastAssistantMsg.id !== wizardDismissedForMsgId &&
    activeCase?.messages[activeCase.messages.length - 1]?.id ===
      lastAssistantMsg.id
      ? lastAssistantMsg.diagnostic?.wizardQuestions || []
      : [];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-900 leading-none">
                Fix it AI
              </h1>
              <p className="text-[11px] text-slate-500 mt-1">
                ผู้ช่วยซ่อมสำหรับทุกคน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => handleNewCase()}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-xs transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>เปิดเคสซ่อมใหม่</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span>ประวัติเคสซ่อม</span>
          </div>
          {cases.map((c) => {
            const isSelected = c.id === activeCase?.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  setActiveCaseId(c.id);
                  setSidebarOpen(false);
                }}
                className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-orange-50 text-orange-900 font-semibold border border-orange-200"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="truncate">{c.title}</span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteCase(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                  title="ลบเคสนี้"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Developer Credit Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80">
          <div className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-center">
            <div className="text-[11px] text-slate-500">พัฒนาโดย</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              Dev. By Kru.Gorthailand
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-slate-900 truncate max-w-[200px] sm:max-w-md">
                {activeCase?.title || "Fix it AI"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Dev. By Kru.Gorthailand</span>
            </span>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {(!activeCase || activeCase.messages.length === 0) && (
              <div className="py-6 sm:py-10 space-y-8">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>เปลี่ยนคนทั่วไปให้กลายเป็นช่าง</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    วันนี้มีอะไรเสีย ให้ช่วยตรวจเช็กครับ?
                  </h2>
                  <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                    พิมพ์อาการหรือถ่ายรูปจุดที่เสียส่งมาได้เลย AI จะช่วยคัดกรองความปลอดภัย
                    แนะนำวิธีตรวจทีละขั้น พร้อมบอกสเปกอะไหล่และเครื่องมือที่ต้องใช้
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STARTER_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => sendMessage(cat.samplePrompt)}
                        className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-orange-300 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2.5 rounded-xl border shrink-0 ${cat.accent}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold text-sm text-slate-900 group-hover:text-orange-700 transition-colors">
                              {cat.title}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {cat.subtitle}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeCase?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-slate-900 text-white px-4 py-3 shadow-xs space-y-2">
                    {(() => {
                      const msgAtts: FileAttachment[] =
                        msg.attachments && msg.attachments.length > 0
                          ? msg.attachments
                          : msg.attachment
                          ? [msg.attachment]
                          : msg.imageDataUrl
                          ? [
                              {
                                name: "image",
                                mimeType: "image/jpeg",
                                size: 0,
                                dataUrl: msg.imageDataUrl,
                                kind: "image",
                              },
                            ]
                          : [];
                      const images = msgAtts.filter((a) => a.kind === "image");
                      const others = msgAtts.filter((a) => a.kind !== "image");
                      return (
                        <>
                          {images.length > 0 && (
                            <div
                              className={`grid gap-2 ${
                                images.length === 1
                                  ? "grid-cols-1"
                                  : "grid-cols-2"
                              }`}
                            >
                              {images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img.dataUrl}
                                  alt={img.name || "รูปประกอบอาการ"}
                                  className="max-h-56 w-full rounded-xl object-cover bg-black/20"
                                />
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
                                <div className="font-semibold truncate">
                                  {att.name}
                                </div>
                                <div className="text-[11px] text-slate-300">
                                  {formatFileSize(att.size)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                ) : (
                  <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                    {msg.diagnostic ? (
                      <DiagnosticCard
                        data={msg.diagnostic}
                        isDemo={msg.isDemo}
                        onQuickReply={(prefix) => setInput(prefix)}
                      />
                    ) : (
                      <p className="text-sm text-rose-600">{msg.text}</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-600 shadow-xs">
                <Loader2 className="w-4 h-4 text-orange-600 animate-spin shrink-0" />
                <span>กำลังวิเคราะห์อาการ จัดทำแผนภาพและขั้นตอนตรวจเช็ก...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </main>

        {/* Bottom Composer + Wizard */}
        <footer className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto space-y-3">
            {activeWizardQuestions.length > 0 && (
              <WizardPanel
                questions={activeWizardQuestions}
                disabled={isLoading}
                onDismiss={() =>
                  lastAssistantMsg &&
                  setWizardDismissedForMsgId(lastAssistantMsg.id)
                }
                onSubmit={(formatted) => sendMessage(formatted)}
              />
            )}

            {/* Quick Chips */}
            {activeCase && activeCase.messages.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  "ทำเสร็จแล้วครับ",
                  "ไม่มีเครื่องมือวัด มีวิธีเช็กด้วยตาเปล่าไหม",
                  "ขอรายละเอียดอะไหล่และราคาเพิ่ม",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setInput(chip)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-600 border border-slate-200 shrink-0 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5">
                {attachments.map((att, idx) => (
                  <div
                    key={`${att.name}-${idx}`}
                    className="relative inline-flex items-center"
                  >
                    {att.kind === "image" ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="h-20 w-20 rounded-xl border border-slate-200 object-cover"
                      />
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
                          <div className="font-semibold truncate">
                            {att.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {formatFileSize(att.size)}
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shadow"
                      title="ลบไฟล์นี้"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Box */}
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
              <input
                ref={fileInputRef}
                id="fixit-file-upload"
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.csv,.json,.log,.md,.xml,.yaml,.yml,.ini,audio/*,video/*"
                onChange={handleFileUpload}
                className="sr-only"
              />
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
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="พิมพ์อาการ, วางรูป (Ctrl+V) หรือแนบได้หลายรูป/ไฟล์พร้อมกัน..."
                className="flex-1 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-36"
              />

              <button
                type="button"
                disabled={
                  isLoading || (!input.trim() && attachments.length === 0)
                }
                onClick={() => sendMessage()}
                className="p-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                title="ส่ง"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                * ตรวจสอบความปลอดภัยก่อนลงมือซ่อมทุกครั้ง หากเสี่ยงอันตรายควรเรียกช่างผู้เชี่ยวชาญ
              </span>
              <span className="font-medium text-slate-500 shrink-0 ml-2">
                Dev. By Kru.Gorthailand
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
