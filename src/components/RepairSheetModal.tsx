"use client";

import React, { useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Package,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import {
  buildLazadaAffiliateLink,
  buildShopeeAffiliateLink,
  hasActiveAffiliateConfig,
} from "@/lib/affiliate";
import {
  buildRepairSheetData,
  formatPartsListForCopy,
  formatRepairSheetForLine,
} from "@/lib/repair-sheet";
import { RepairCase, RiskLevel } from "@/types/repair";

interface RepairSheetModalProps {
  repairCase: RepairCase;
  onClose: () => void;
  onCopySuccess: (message: string) => void;
}

const RISK_STYLES: Record<
  RiskLevel,
  {
    label: string;
    box: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  safe: {
    label: "ทำเองได้ปลอดภัย",
    box: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: ShieldCheck,
  },
  caution: {
    label: "ทำได้ — ต้องระวังพิเศษ",
    box: "border-amber-200 bg-amber-50 text-amber-950",
    icon: AlertTriangle,
  },
  danger: {
    label: "อันตราย — ควรเรียกช่าง",
    box: "border-rose-200 bg-rose-50 text-rose-950",
    icon: ShieldAlert,
  },
};

export default function RepairSheetModal({
  repairCase,
  onClose,
  onCopySuccess,
}: RepairSheetModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const data = buildRepairSheetData(repairCase);
  const riskStyle = RISK_STYLES[data.riskLevel];
  const RiskIcon = riskStyle.icon;

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onCopySuccess(label);
    } catch {
      onCopySuccess("ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 print:static print:inset-auto print:bg-white print:p-0 print:block"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 print:shadow-none print:max-w-none print:max-h-none print:overflow-visible print:rounded-none print:border-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar (hidden when printing) */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
            <Wrench className="w-4 h-4 text-orange-600" />
            <span>ใบสรุปงานซ่อม &amp; รายการอะไหล่</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleCopyText(
                  formatRepairSheetForLine(repairCase),
                  "คัดลอกใบสรุปส่ง LINE / ช่างแล้วครับ"
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>คัดลอกส่ง LINE / ช่าง</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleCopyText(
                  formatPartsListForCopy(repairCase),
                  "คัดลอกรายการอะไหล่แล้วครับ"
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              <span>คัดลอกรายการอะไหล่</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 space-y-5 text-slate-800">
          <div className="border-b border-slate-200 pb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-orange-600">
                Fix it AI — ใบสรุปงานตรวจเช็กและอะไหล่
              </div>
              <h2 className="text-xl font-bold text-slate-900">{data.title}</h2>
              <p className="text-sm text-slate-600">{data.headline}</p>
            </div>
            <div className="text-right space-y-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 font-semibold text-slate-700">
                <span>{data.categoryTitle}</span>
                <span>•</span>
                <span>{data.statusLabel}</span>
              </div>
              {data.updatedDateText && (
                <div className="text-slate-500">
                  อัปเดตล่าสุด: {data.updatedDateText}
                </div>
              )}
            </div>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 flex items-start gap-2.5 text-xs sm:text-sm ${riskStyle.box}`}
          >
            <RiskIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ระดับความปลอดภัย: {riskStyle.label} — </span>
              <span>{data.riskSummary}</span>
            </div>
          </div>

          {data.summaryTable.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 border-b border-slate-200">
                สรุปข้อมูลเคสซ่อม
              </div>
              <div className="divide-y divide-slate-100">
                {data.summaryTable.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-2 text-xs sm:text-sm"
                  >
                    <div className="font-semibold text-slate-600">{row.label}</div>
                    <div className="sm:col-span-2 text-slate-900">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.steps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                ความคืบหน้าการตรวจเช็ก ({data.steps.filter((s) => s.done).length}/
                {data.steps.length} ขั้น)
              </h3>
              <div className="space-y-1.5">
                {data.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold text-slate-900">
                        ขั้นที่ {step.stepNumber}: {step.title}
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        จุดสังเกต/รายงานผล: {step.reportBack}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.toolsNeeded.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                เครื่องมือที่ต้องใช้
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {data.toolsNeeded.map((tool, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg border border-slate-200 px-3 py-2 flex flex-col justify-between gap-1.5"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {tool.name}
                        {tool.optional ? " (ถ้ามี)" : ""}
                      </div>
                      <div className="text-slate-600 mt-0.5">{tool.purpose}</div>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                      <a
                        href={buildShopeeAffiliateLink(tool.name, {
                          category: repairCase.category,
                          itemType: "tool",
                          source: "sheet",
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline"
                      >
                        <span>Shopee</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <span className="text-slate-300">•</span>
                      <a
                        href={buildLazadaAffiliateLink(tool.name, {
                          category: repairCase.category,
                          itemType: "tool",
                          source: "sheet",
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        <span>Lazada</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.recommendedParts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                ตารางสเปกอะไหล่ (เทียบของเดิมก่อนสั่งซื้อ)
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-semibold">อะไหล่</th>
                      <th className="px-3 py-2 font-semibold">สเปก / รหัส</th>
                      <th className="px-3 py-2 font-semibold">วิธีเช็กให้ตรงรุ่น</th>
                      <th className="px-3 py-2 font-semibold">ราคาประมาณ</th>
                      <th className="px-3 py-2 font-semibold print:hidden">สั่งซื้อ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recommendedParts.map((part, idx) => {
                      const searchKw = part.searchKeyword || part.name;
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            {part.name}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-800">
                            {part.specOrCode}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {part.howToVerify}
                          </td>
                          <td className="px-3 py-2 text-emerald-800 font-semibold whitespace-nowrap">
                            {part.estimatedPriceThb}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap print:hidden">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={buildShopeeAffiliateLink(searchKw, {
                                  category: repairCase.category,
                                  itemType: "part",
                                  source: "sheet",
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                              >
                                <span>Shopee</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <a
                                href={buildLazadaAffiliateLink(searchKw, {
                                  category: repairCase.category,
                                  itemType: "part",
                                  source: "sheet",
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                              >
                                <span>Lazada</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {hasActiveAffiliateConfig() && (
                <p className="text-[11px] text-slate-500 print:hidden">
                  * ลิงก์สั่งซื้อบางรายการเป็นลิงก์ Affiliate เพื่อช่วยสนับสนุนผู้พัฒนา Fix it AI โดยไม่บวกราคาสินค้าเพิ่ม
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
