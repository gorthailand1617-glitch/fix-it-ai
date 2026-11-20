"use client";

import React, { useState } from "react";
import {
  History,
  MessageSquarePlus,
  Pencil,
  Search,
  Trash2,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";
import { formatCaseDate } from "@/lib/case-helpers";
import { CASE_STATUS_META, CATEGORY_MAP } from "@/lib/categories";
import { RepairCase, RepairCategory } from "@/types/repair";

interface CaseSidebarProps {
  cases: RepairCase[];
  activeCaseId: string;
  assetCount: number;
  isOpen: boolean;
  onClose: () => void;
  onNewCase: (category?: RepairCategory) => void;
  onOpenGarage: () => void;
  onSelectCase: (id: string) => void;
  onDeleteCase: (id: string, e: React.MouseEvent) => void;
  onRenameCase: (id: string, newTitle: string) => void;
}

const FILTER_OPTIONS: { id: RepairCategory | "all"; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "automotive", label: "รถ" },
  { id: "appliance", label: "แอร์/ไฟฟ้า" },
  { id: "electronics", label: "คอม/ไอที" },
  { id: "home_office", label: "สำนักงาน" },
];

function CaseSidebar({
  cases,
  activeCaseId,
  assetCount,
  isOpen,
  onClose,
  onNewCase,
  onOpenGarage,
  onSelectCase,
  onDeleteCase,
  onRenameCase,
}: CaseSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<RepairCategory | "all">(
    "all"
  );
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCases = cases.filter((c) => {
    if (categoryFilter !== "all" && c.category !== categoryFilter) {
      return false;
    }
    if (!normalizedQuery) return true;
    return c.title.toLowerCase().includes(normalizedQuery);
  });

  const startRename = (c: RepairCase, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCaseId(c.id);
    setEditingTitle(c.title);
  };

  const commitRename = (c: RepairCase) => {
    const trimmed = editingTitle.trim();
    if (trimmed && trimmed !== c.title) {
      onRenameCase(c.id, trimmed);
    }
    setEditingCaseId(null);
  };

  const cancelRename = () => {
    setEditingCaseId(null);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
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
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 lg:hidden"
            aria-label="ปิดแถบข้าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 space-y-2.5 border-b border-slate-100">
          <button
            type="button"
            onClick={() => onNewCase()}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-xs transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>เปิดเคสซ่อมใหม่</span>
          </button>

          <button
            type="button"
            onClick={onOpenGarage}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-800 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-orange-600" />
              <span>อุปกรณ์ของฉัน (Garage)</span>
            </span>
            {assetCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                {assetCount}
              </span>
            )}
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาประวัติเคสซ่อม..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-0.5 text-slate-400 hover:text-slate-700 absolute right-2 top-1/2 -translate-y-1/2"
                aria-label="ล้างคำค้นหา"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {FILTER_OPTIONS.map((opt) => {
              const active = categoryFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCategoryFilter(opt.id)}
                  className={`px-2 py-1 rounded-full text-[11px] font-medium shrink-0 transition-colors ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between gap-1.5">
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>ประวัติเคสซ่อม</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {filteredCases.length}
            </span>
          </div>

          {filteredCases.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              ไม่พบเคสที่ตรงกับคำค้นหรือหมวดหมู่ที่เลือก
            </div>
          ) : (
            filteredCases.map((c) => {
              const isSelected = c.id === activeCaseId;
              const isEditing = editingCaseId === c.id;
              const catConfig =
                CATEGORY_MAP[c.category] ?? CATEGORY_MAP.automotive;
              const CatIcon = catConfig.icon;
              const statusMeta =
                CASE_STATUS_META[c.status ?? "diagnosing"];

              return (
                <div
                  key={c.id}
                  onClick={() => !isEditing && onSelectCase(c.id)}
                  className={`group rounded-xl px-3 py-2 text-xs cursor-pointer transition-colors space-y-1 ${
                    isSelected
                      ? "bg-orange-50 text-orange-900 border border-orange-200"
                      : "text-slate-700 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CatIcon
                        className={`w-3.5 h-3.5 shrink-0 ${catConfig.badgeColor}`}
                      />
                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitRename(c);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelRename();
                            }
                          }}
                          onBlur={() => commitRename(c)}
                          className="w-full rounded border border-orange-400 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      ) : (
                        <span
                          className={`truncate ${
                            isSelected ? "font-semibold" : "font-medium"
                          }`}
                        >
                          {c.title}
                        </span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => startRename(c, e)}
                          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-orange-600 rounded transition-opacity"
                          title="เปลี่ยนชื่อเคส"
                          aria-label={`เปลี่ยนชื่อเคส ${c.title}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onDeleteCase(c.id, e)}
                          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                          title="ลบเคสนี้"
                          aria-label={`ลบเคส ${c.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pl-5 text-[10px]">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border font-medium ${statusMeta.badgeClass}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`}
                      />
                      <span>{statusMeta.label}</span>
                    </span>
                    <span className="text-slate-400 truncate">
                      {formatCaseDate(c.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80">
          <div className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-center">
            <div className="text-[11px] text-slate-500">พัฒนาโดย</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              Dev. By Kru.Gorthailand
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default React.memo(CaseSidebar);
