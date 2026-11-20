"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ClipboardCheck,
  Menu,
  Sparkles,
  UploadCloud,
  Warehouse,
} from "lucide-react";
import CaseSidebar from "@/components/CaseSidebar";
import ChatComposer from "@/components/ChatComposer";
import ChatMessageList from "@/components/ChatMessageList";
import GarageModal from "@/components/GarageModal";
import ImageLightbox from "@/components/ImageLightbox";
import RepairSheetModal from "@/components/RepairSheetModal";
import ToastContainer from "@/components/ToastContainer";
import WelcomeScreen from "@/components/WelcomeScreen";
import {
  createAssistantMessage,
  createEmptyCase,
  createErrorMessage,
  createToast,
  createUserMessage,
  detectAttachmentKind,
  formatFileSize,
  nowTimestamp,
} from "@/lib/case-helpers";
import { CASE_STATUS_META } from "@/lib/categories";
import { compressImageFile, readFileAsDataUrl } from "@/lib/image-compress";
import { GEMINI_MODEL_OPTIONS } from "@/lib/models";
import {
  loadAssets,
  loadCases,
  loadExplanationMode,
  loadModelProfile,
  saveAssets,
  saveCases,
  saveExplanationMode,
  saveModelProfile,
} from "@/lib/storage";
import {
  CaseStatus,
  ChatMessage,
  DiagnoseStreamEvent,
  EquipmentAsset,
  ExplanationMode,
  FileAttachment,
  LoadingProgress,
  ModelProfileId,
  RepairCase,
  RepairCategory,
  ToastItem,
} from "@/types/repair";

const MAX_RAW_IMAGE_BYTES = 30 * 1024 * 1024;
const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_FILES_BYTES = 15 * 1024 * 1024;

function normalizeMessageAttachments(msg: ChatMessage): FileAttachment[] {
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

export default function FixItWorkspace() {
  const [cases, setCases] = useState<RepairCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] =
    useState<LoadingProgress | null>(null);
  const [wizardDismissedForMsgId, setWizardDismissedForMsgId] = useState<
    string | null
  >(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    name: string;
  } | null>(null);
  const [showRepairSheet, setShowRepairSheet] = useState(false);
  const [showGarageModal, setShowGarageModal] = useState(false);
  const [assets, setAssets] = useState<EquipmentAsset[]>([]);
  const [explanationMode, setExplanationMode] =
    useState<ExplanationMode>("beginner");
  const [modelProfile, setModelProfile] = useState<ModelProfileId>("auto");
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const hasLoadedRef = useRef(false);
  const quotaWarnedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dragCounterRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (tone: ToastItem["tone"], message: string) => {
      const toast = createToast(tone, message);
      setToasts((prev) => [...prev.slice(-3), toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4500);
    },
    []
  );

  // Abort any in-flight diagnostic request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Hydrate saved cases, equipment assets, mode, and model profile from IndexedDB
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadCases(),
      loadAssets(),
      loadExplanationMode(),
      loadModelProfile(),
    ]).then(([caseResult, loadedAssets, loadedMode, loadedModelProfile]) => {
      if (cancelled) return;
      hasLoadedRef.current = true;
      setCases(caseResult.cases);
      setAssets(loadedAssets);
      setExplanationMode(loadedMode);
      setModelProfile(loadedModelProfile);
      if (caseResult.cases[0]) {
        setActiveCaseId(caseResult.cases[0].id);
      }
      if (caseResult.migratedFromLocalStorage) {
        addToast(
          "info",
          "ย้ายประวัติเคสซ่อมไปยังระบบจัดเก็บใหม่ (IndexedDB) เรียบร้อยแล้ว"
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  // Persist cases only after initial hydration completes
  useEffect(() => {
    if (!hasLoadedRef.current || cases.length === 0) return;
    let cancelled = false;
    saveCases(cases).then((result) => {
      if (cancelled) return;
      if (result.quotaExceeded && !quotaWarnedRef.current) {
        quotaWarnedRef.current = true;
        addToast(
          "warning",
          "พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม เคสใหม่ที่มีไฟล์ขนาดใหญ่อาจไม่ถูกบันทึก แนะนำให้ลบเคสเก่าที่ไม่ใช้แล้วครับ"
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cases, addToast]);

  // Persist assets after initial hydration completes
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    saveAssets(assets);
  }, [assets]);

  const activeCase = cases.find((c) => c.id === activeCaseId) || cases[0];

  const handleNewCase = (category: RepairCategory = "automotive") => {
    const newCase = createEmptyCase(category);
    setCases((prev) => [newCase, ...prev]);
    setActiveCaseId(newCase.id);
    setWizardDismissedForMsgId(null);
    setSidebarOpen(false);
  };

  const handleSaveAsset = (asset: EquipmentAsset) => {
    setAssets((prev) => {
      const exists = prev.some((item) => item.id === asset.id);
      if (exists) {
        return prev.map((item) => (item.id === asset.id ? asset : item));
      }
      return [asset, ...prev];
    });
    addToast("success", `บันทึกอุปกรณ์ "${asset.name}" เรียบร้อยแล้ว`);
  };

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((item) => item.id !== id));
    addToast("info", "ลบอุปกรณ์ออกจากคลังแล้ว");
  };

  const handleStartCaseWithAsset = (asset: EquipmentAsset) => {
    const newCase = createEmptyCase(asset.category, asset);
    setCases((prev) => [newCase, ...prev]);
    setActiveCaseId(newCase.id);
    setWizardDismissedForMsgId(null);
    setShowGarageModal(false);
    setSidebarOpen(false);
    addToast(
      "info",
      `เปิดเคสสำหรับ ${asset.name} แล้ว พิมพ์หรือถ่ายรูปอาการได้เลย`
    );
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleChangeExplanationMode = (mode: ExplanationMode) => {
    setExplanationMode(mode);
    saveExplanationMode(mode);
  };

  const handleChangeModelProfile = (nextProfile: ModelProfileId) => {
    setModelProfile(nextProfile);
    saveModelProfile(nextProfile);
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

  const handleRenameCase = (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const ts = nowTimestamp();
    setCases((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title: trimmed, updatedAt: ts } : c
      )
    );
  };

  const handleChangeCaseStatus = (status: CaseStatus) => {
    if (!activeCase) return;
    const ts = nowTimestamp();
    setCases((prev) =>
      prev.map((c) =>
        c.id === activeCase.id ? { ...c, status, updatedAt: ts } : c
      )
    );
  };

  const handleToggleStep = (stepKey: string) => {
    if (!activeCase) return;
    const ts = nowTimestamp();
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== activeCase.id) return c;
        const nextSteps = { ...(c.completedSteps || {}) };
        nextSteps[stepKey] = !nextSteps[stepKey];
        return { ...c, completedSteps: nextSteps, updatedAt: ts };
      })
    );
  };

  const handleToggleSafetyAck = (messageId: string) => {
    if (!activeCase) return;
    const ts = nowTimestamp();
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== activeCase.id) return c;
        const nextAck = { ...(c.acknowledgedSafety || {}) };
        nextAck[messageId] = !nextAck[messageId];
        return { ...c, acknowledgedSafety: nextAck, updatedAt: ts };
      })
    );
  };

  const handleQuickReply = (prefix: string) => {
    setInput(prefix);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(prefix.length, prefix.length);
      }
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const remainingSlots = 6 - attachments.length;
    if (remainingSlots <= 0) {
      addToast("warning", "แนบได้สูงสุด 6 ไฟล์ต่อครั้งครับ");
      return;
    }

    let runningSize = attachments.reduce((sum, a) => sum + a.size, 0);
    const toRead = fileArray.slice(0, remainingSlots);
    if (fileArray.length > remainingSlots) {
      addToast(
        "warning",
        `แนบได้สูงสุด 6 ไฟล์ต่อครั้ง (เลือกเพิ่มได้อีก ${remainingSlots} ไฟล์)`
      );
    }

    const newAttachments: FileAttachment[] = [];
    let totalBytesSaved = 0;

    for (const file of toRead) {
      const kind = detectAttachmentKind(file);
      if (!kind) {
        addToast(
          "error",
          `ไม่รองรับไฟล์ "${file.name}" ครับ รองรับ: รูปภาพ, PDF, ไฟล์ข้อความ/Log (.txt, .csv, .json, .log), เสียง และวิดีโอ`
        );
        continue;
      }

      if (kind === "image") {
        if (file.size > MAX_RAW_IMAGE_BYTES) {
          addToast("warning", `รูปภาพ "${file.name}" มีขนาดเกิน 30 MB ครับ`);
          continue;
        }
        try {
          const compressed = await compressImageFile(file);
          if (compressed.size > MAX_SINGLE_FILE_BYTES) {
            addToast("warning", `ไฟล์ "${file.name}" มีขนาดเกิน 10 MB ครับ`);
            continue;
          }
          if (runningSize + compressed.size > MAX_TOTAL_FILES_BYTES) {
            addToast(
              "warning",
              "ขนาดไฟล์รวมทั้งหมดต่อครั้งไม่ควรเกิน 15 MB ครับ"
            );
            break;
          }
          runningSize += compressed.size;
          if (compressed.wasCompressed) {
            totalBytesSaved += Math.max(
              0,
              compressed.originalSize - compressed.size
            );
          }
          newAttachments.push({
            name:
              file.name ||
              `pasted-image-${attachments.length + newAttachments.length + 1}.png`,
            mimeType: compressed.mimeType,
            size: compressed.size,
            dataUrl: compressed.dataUrl,
            kind: "image",
          });
        } catch {
          addToast("error", `ไม่สามารถอ่านรูปภาพ "${file.name}" ได้`);
        }
        continue;
      }

      if (file.size > MAX_SINGLE_FILE_BYTES) {
        addToast("warning", `ไฟล์ "${file.name}" มีขนาดเกิน 10 MB ครับ`);
        continue;
      }
      if (runningSize + file.size > MAX_TOTAL_FILES_BYTES) {
        addToast("warning", "ขนาดไฟล์รวมทั้งหมดต่อครั้งไม่ควรเกิน 15 MB ครับ");
        break;
      }
      runningSize += file.size;

      try {
        const dataUrl = await readFileAsDataUrl(file);
        newAttachments.push({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
          kind,
        });
      } catch {
        addToast("error", `ไม่สามารถอ่านไฟล์ "${file.name}" ได้`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, 6));
    }

    if (totalBytesSaved >= 500 * 1024) {
      addToast(
        "info",
        `บีบอัดรูปภาพอัตโนมัติ ช่วยประหยัดขนาดไฟล์ ${formatFileSize(
          totalBytesSaved
        )}`
      );
    }
  };

  const handleCancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const executeDiagnosis = async ({
    targetCaseId,
    userMsg,
    priorMessages,
    category,
    assetContext,
  }: {
    targetCaseId: string;
    userMsg: ChatMessage;
    priorMessages: ChatMessage[];
    category: RepairCategory;
    assetContext?: string;
  }) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setLoadingProgress({
      stage: "connecting",
      message: "กำลังส่งข้อมูลให้ AI วิเคราะห์...",
    });

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMsg.text,
          attachments: normalizeMessageAttachments(userMsg),
          category,
          mode: explanationMode,
          modelProfile,
          ...(assetContext ? { assetContext } : {}),
          stream: true,
          history: priorMessages.slice(-8).map((m) => ({
            role: m.role,
            text: m.text,
            diagnostic: m.diagnostic,
          })),
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          typeof errData.error === "string"
            ? errData.error
            : "ไม่สามารถเชื่อมต่อ AI ได้"
        );
      }

      if (contentType.includes("application/x-ndjson") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let receivedResult = false;

        const handleEvent = (event: DiagnoseStreamEvent) => {
          if (event.type === "status") {
            setLoadingProgress((prev) => ({
              ...prev,
              stage: event.stage,
              message: event.message,
              model: event.model ?? prev?.model,
            }));
          } else if (event.type === "preview") {
            setLoadingProgress((prev) => ({
              stage: prev?.stage || "analyzing",
              message: prev?.message || "กำลังวิเคราะห์อาการ...",
              model: prev?.model,
              previewHeadline: event.headline ?? prev?.previewHeadline,
              previewRiskLevel: event.riskLevel ?? prev?.previewRiskLevel,
            }));
          } else if (event.type === "result") {
            receivedResult = true;
            const assistantMsg = createAssistantMessage(
              event.diagnostic,
              Boolean(event.isDemo),
              typeof event.modelUsed === "string" ? event.modelUsed : undefined
            );
            setCases((prev) =>
              prev.map((c) =>
                c.id === targetCaseId
                  ? {
                      ...c,
                      messages: [...c.messages, assistantMsg],
                      updatedAt: assistantMsg.timestamp,
                    }
                  : c
              )
            );
          } else if (event.type === "error") {
            throw new Error(event.error || "เกิดข้อผิดพลาดในการวิเคราะห์อาการ");
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const event = JSON.parse(trimmed) as DiagnoseStreamEvent;
            handleEvent(event);
          }
        }

        const trailing = buffer.trim();
        if (trailing) {
          const event = JSON.parse(trailing) as DiagnoseStreamEvent;
          handleEvent(event);
        }

        if (!receivedResult && !controller.signal.aborted) {
          throw new Error("ไม่ได้รับผลลัพธ์การวิเคราะห์จากเซิร์ฟเวอร์");
        }
      } else {
        const data = await res.json();
        const assistantMsg = createAssistantMessage(
          data.diagnostic,
          Boolean(data.isDemo),
          typeof data.modelUsed === "string" ? data.modelUsed : undefined
        );
        setCases((prev) =>
          prev.map((c) =>
            c.id === targetCaseId
              ? {
                  ...c,
                  messages: [...c.messages, assistantMsg],
                  updatedAt: assistantMsg.timestamp,
                }
              : c
          )
        );
      }
    } catch (err) {
      const isAborted =
        (err instanceof DOMException && err.name === "AbortError") ||
        controller.signal.aborted;

      if (isAborted) {
        const cancelMsg = createErrorMessage(
          "ยกเลิกการวิเคราะห์แล้ว — คุณสามารถกดลองวิเคราะห์ใหม่ได้ทุกเมื่อ"
        );
        setCases((prev) =>
          prev.map((c) =>
            c.id === targetCaseId
              ? { ...c, messages: [...c.messages, cancelMsg] }
              : c
          )
        );
        addToast("info", "ยกเลิกการวิเคราะห์แล้ว");
        return;
      }

      const errorMsg = createErrorMessage(
        err instanceof Error
          ? `เกิดข้อผิดพลาด: ${err.message}`
          : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"
      );
      setCases((prev) =>
        prev.map((c) =>
          c.id === targetCaseId
            ? { ...c, messages: [...c.messages, errorMsg] }
            : c
        )
      );
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      setLoadingProgress(null);
    }
  };

  const sendMessage = async (
    overrideText?: string,
    overrideCategory?: RepairCategory
  ) => {
    if (isLoading) return;
    const textToSend = (overrideText ?? input).trim();
    if (!textToSend && attachments.length === 0) return;

    let targetCase = activeCase;
    let isBrandNewCase = false;
    if (!targetCase) {
      targetCase = createEmptyCase(overrideCategory ?? "automotive");
      isBrandNewCase = true;
      setCases([targetCase]);
      setActiveCaseId(targetCase.id);
    }

    const currentAttachments = attachments;
    const userMsg = createUserMessage(textToSend, currentAttachments);

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

    const updatedCategory =
      targetCase.messages.length === 0 && overrideCategory
        ? overrideCategory
        : targetCase.category;

    const priorMessages = targetCase.messages;

    if (!isBrandNewCase) {
      setCases((prev) =>
        prev.map((c) =>
          c.id === targetCase.id
            ? {
                ...c,
                title: updatedTitle,
                category: updatedCategory,
                messages: [...c.messages, userMsg],
                updatedAt: userMsg.timestamp,
              }
            : c
        )
      );
    } else {
      setCases([
        {
          ...targetCase,
          title: updatedTitle,
          category: updatedCategory,
          messages: [userMsg],
          updatedAt: userMsg.timestamp,
        },
      ]);
    }

    await executeDiagnosis({
      targetCaseId: targetCase.id,
      userMsg,
      priorMessages,
      category: updatedCategory,
      assetContext: targetCase.assetSummary,
    });
  };

  const handleRetryMessage = async (errorMessageId: string) => {
    if (isLoading || !activeCase) return;

    const errIdx = activeCase.messages.findIndex(
      (m) => m.id === errorMessageId
    );
    if (errIdx === -1) return;

    let userIdx = -1;
    for (let i = errIdx - 1; i >= 0; i--) {
      if (activeCase.messages[i].role === "user") {
        userIdx = i;
        break;
      }
    }
    if (userIdx === -1) return;

    const rawUserMsg = activeCase.messages[userIdx];
    const normalizedUserMsg: ChatMessage = {
      ...rawUserMsg,
      attachments: normalizeMessageAttachments(rawUserMsg),
    };
    const priorMessages = activeCase.messages.slice(0, userIdx);

    setCases((prev) =>
      prev.map((c) =>
        c.id === activeCase.id
          ? {
              ...c,
              messages: c.messages.filter((m) => m.id !== errorMessageId),
            }
          : c
      )
    );

    await executeDiagnosis({
      targetCaseId: activeCase.id,
      userMsg: normalizedUserMsg,
      priorMessages,
      category: activeCase.category,
      assetContext: activeCase.assetSummary,
    });
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingFiles(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDraggingFiles(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingFiles(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
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

  const hasAnyDiagnostic = Boolean(
    activeCase?.messages.some((m) => m.role === "assistant" && m.diagnostic)
  );
  const currentStatus: CaseStatus = activeCase?.status ?? "diagnosing";
  const statusMeta = CASE_STATUS_META[currentStatus];

  return (
    <>
      <div
        className={`flex h-screen overflow-hidden bg-slate-50 ${
          showRepairSheet || showGarageModal ? "print:hidden" : ""
        }`}
      >
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        <CaseSidebar
          cases={cases}
          activeCaseId={activeCase?.id || ""}
          assetCount={assets.length}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNewCase={handleNewCase}
          onOpenGarage={() => {
            setSidebarOpen(false);
            setShowGarageModal(true);
          }}
          onSelectCase={(id) => {
            setActiveCaseId(id);
            setSidebarOpen(false);
          }}
          onDeleteCase={handleDeleteCase}
          onRenameCase={handleRenameCase}
        />

        <div
          className="flex-1 flex flex-col min-w-0 relative"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDraggingFiles && (
            <div className="absolute inset-0 z-30 bg-orange-50/90 backdrop-blur-xs border-2 border-dashed border-orange-500 m-3 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none">
              <UploadCloud className="w-10 h-10 text-orange-600" />
              <p className="text-sm font-bold text-orange-900">
                วางรูปภาพหรือไฟล์แนบที่นี่
              </p>
              <p className="text-xs text-orange-700">
                รองรับรูปภาพ, PDF, Log, เสียง และวิดีโอ (สูงสุด 6 ไฟล์)
              </p>
            </div>
          )}

          <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden shrink-0"
                aria-label="เปิดแถบเมนูเคสซ่อม"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm sm:text-base text-slate-900 truncate max-w-[140px] sm:max-w-xs">
                {activeCase?.title || "Fix it AI"}
              </span>

              {activeCase && (
                <select
                  aria-label="สถานะเคสซ่อม"
                  value={currentStatus}
                  onChange={(e) =>
                    handleChangeCaseStatus(e.target.value as CaseStatus)
                  }
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${statusMeta.badgeClass}`}
                >
                  <option value="diagnosing">กำลังตรวจเช็ก</option>
                  <option value="waiting_parts">รออะไหล่</option>
                  <option value="resolved">ซ่อมเสร็จแล้ว</option>
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                aria-label="เลือกรุ่นโมเดล Gemini"
                value={modelProfile}
                onChange={(e) =>
                  handleChangeModelProfile(e.target.value as ModelProfileId)
                }
                title="เลือกรุ่นโมเดล AI (ค่าเริ่มต้นใช้ Gemini 4)"
                className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
              >
                {GEMINI_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.shortLabel}
                  </option>
                ))}
              </select>

              <div
                className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold"
                role="group"
                aria-label="ระดับคำอธิบายของ AI"
              >
                <button
                  type="button"
                  onClick={() => handleChangeExplanationMode("beginner")}
                  title="โหมดมือใหม่: อธิบายเข้าใจง่าย ไม่เน้นศัพท์เทคนิค"
                  className={`px-2 py-1 rounded-md transition-colors ${
                    explanationMode === "beginner"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  มือใหม่
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeExplanationMode("technician")}
                  title="โหมดช่าง: เจาะลึกจุดวัดไฟ ค่าความต้านทาน โค้ด OBD และลำดับวงจร"
                  className={`px-2 py-1 rounded-md transition-colors ${
                    explanationMode === "technician"
                      ? "bg-orange-600 text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  โหมดช่าง
                </button>
              </div>

              {hasAnyDiagnostic && (
                <button
                  type="button"
                  onClick={() => setShowRepairSheet(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-orange-400" />
                  <span className="hidden sm:inline">ใบสรุปส่งช่าง</span>
                  <span className="sm:hidden">สรุป</span>
                </button>
              )}

              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                <span>Dev. By Kru.Gorthailand</span>
              </span>
            </div>
          </header>

          {activeCase?.assetSummary && (
            <div className="bg-orange-50/70 border-b border-orange-100 px-4 py-1.5 text-xs text-orange-900 flex items-center gap-2 shrink-0">
              <Warehouse className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="truncate">
                <span className="font-semibold">อุปกรณ์ที่ผูกกับเคสนี้: </span>
                {activeCase.assetSummary}
              </span>
            </div>
          )}

          <main className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {(!activeCase || activeCase.messages.length === 0) && (
                <WelcomeScreen
                  assets={assets}
                  onSelectStarter={(prompt, category) =>
                    sendMessage(prompt, category)
                  }
                  onSelectAsset={handleStartCaseWithAsset}
                  onOpenGarage={() => setShowGarageModal(true)}
                />
              )}

              {activeCase && activeCase.messages.length > 0 && (
                <ChatMessageList
                  messages={activeCase.messages}
                  isLoading={isLoading}
                  loadingProgress={loadingProgress}
                  completedSteps={activeCase.completedSteps}
                  acknowledgedSafety={activeCase.acknowledgedSafety}
                  onCancelLoading={handleCancelRequest}
                  onRetryMessage={handleRetryMessage}
                  onToggleStep={handleToggleStep}
                  onToggleSafetyAck={handleToggleSafetyAck}
                  onQuickReply={handleQuickReply}
                  onQuickSend={(msg) => sendMessage(msg)}
                  onPreviewImage={setLightboxImage}
                />
              )}
            </div>
          </main>

          <ChatComposer
            input={input}
            onInputChange={setInput}
            textareaRef={textareaRef}
            attachments={attachments}
            onFilesSelected={processFiles}
            onRemoveAttachment={(idx) =>
              setAttachments((prev) => prev.filter((_, i) => i !== idx))
            }
            onPreviewImage={setLightboxImage}
            onVoiceError={(msg) => addToast("warning", msg)}
            onSend={(override) => sendMessage(override)}
            isLoading={isLoading}
            hasMessages={Boolean(activeCase && activeCase.messages.length > 0)}
            wizardKey={lastAssistantMsg?.id}
            wizardQuestions={activeWizardQuestions}
            onDismissWizard={() =>
              lastAssistantMsg &&
              setWizardDismissedForMsgId(lastAssistantMsg.id)
            }
          />
        </div>
      </div>

      <ImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {showRepairSheet && activeCase && (
        <RepairSheetModal
          repairCase={activeCase}
          onClose={() => setShowRepairSheet(false)}
          onCopySuccess={(msg) => addToast("success", msg)}
        />
      )}

      {showGarageModal && (
        <GarageModal
          assets={assets}
          onClose={() => setShowGarageModal(false)}
          onSaveAsset={handleSaveAsset}
          onDeleteAsset={handleDeleteAsset}
          onStartCaseWithAsset={handleStartCaseWithAsset}
        />
      )}
    </>
  );
}
