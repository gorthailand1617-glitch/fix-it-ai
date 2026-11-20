"use client";

import React, { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Warehouse, Wrench, X } from "lucide-react";
import { createAsset } from "@/lib/case-helpers";
import { CATEGORY_MAP, STARTER_CATEGORIES } from "@/lib/categories";
import { EquipmentAsset, RepairCategory } from "@/types/repair";

interface GarageModalProps {
  assets: EquipmentAsset[];
  onClose: () => void;
  onSaveAsset: (asset: EquipmentAsset) => void;
  onDeleteAsset: (id: string) => void;
  onStartCaseWithAsset: (asset: EquipmentAsset) => void;
}

export default function GarageModal({
  assets,
  onClose,
  onSaveAsset,
  onDeleteAsset,
  onStartCaseWithAsset,
}: GarageModalProps) {
  const [showForm, setShowForm] = useState(assets.length === 0);
  const [editingAsset, setEditingAsset] = useState<EquipmentAsset | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<RepairCategory>("automotive");
  const [brandModel, setBrandModel] = useState("");
  const [yearOrSpec, setYearOrSpec] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const resetForm = () => {
    setEditingAsset(null);
    setName("");
    setCategory("automotive");
    setBrandModel("");
    setYearOrSpec("");
    setNotes("");
    setShowForm(false);
  };

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setName("");
    setCategory("automotive");
    setBrandModel("");
    setYearOrSpec("");
    setNotes("");
    setShowForm(true);
  };

  const handleOpenEdit = (asset: EquipmentAsset) => {
    setEditingAsset(asset);
    setName(asset.name);
    setCategory(asset.category);
    setBrandModel(asset.brandModel);
    setYearOrSpec(asset.yearOrSpec || "");
    setNotes(asset.notes || "");
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brandModel.trim()) return;

    if (editingAsset) {
      onSaveAsset({
        ...editingAsset,
        name: name.trim(),
        category,
        brandModel: brandModel.trim(),
        yearOrSpec: yearOrSpec.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      onSaveAsset(
        createAsset({
          name,
          category,
          brandModel,
          yearOrSpec,
          notes,
        })
      );
    }

    resetForm();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                อุปกรณ์ของฉัน (My Garage)
              </h2>
              <p className="text-xs text-slate-500">
                บันทึกรถ แอร์ หรือเครื่องใช้ไฟฟ้าประจำไว้เปิดเคสได้ทันทีโดยไม่ต้องเล่ารุ่นซ้ำ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Add / Edit Form */}
          {showForm ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  {editingAsset ? "แก้ไขข้อมูลอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}
                </h3>
                {assets.length > 0 && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-xs">
                  <span className="font-semibold text-slate-700">
                    ชื่อเรียกอุปกรณ์ <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น รถ Captiva คันหลัก, แอร์ห้องนอน"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="font-semibold text-slate-700">หมวดหมู่</span>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as RepairCategory)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    {STARTER_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs">
                  <span className="font-semibold text-slate-700">
                    ยี่ห้อ / รุ่น <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    value={brandModel}
                    onChange={(e) => setBrandModel(e.target.value)}
                    placeholder="เช่น Chevrolet Captiva C140 2.0 ดีเซล"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="font-semibold text-slate-700">
                    ปี / สเปกเพิ่มเติม
                  </span>
                  <input
                    type="text"
                    value={yearOrSpec}
                    onChange={(e) => setYearOrSpec(e.target.value)}
                    placeholder="เช่น ปี 2014 / 12000 BTU Inverter"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </label>
              </div>

              <label className="block space-y-1 text-xs">
                <span className="font-semibold text-slate-700">
                  โน้ตประวัติซ่อม / จุดสังเกต
                </span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น เปลี่ยนแบตล่าสุด ม.ค. 69, เคยล้างคอยล์เย็นเมื่อปีที่แล้ว"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!name.trim() || !brandModel.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 transition-colors"
                >
                  <span>
                    {editingAsset ? "บันทึกการแก้ไข" : "บันทึกอุปกรณ์"}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มอุปกรณ์ใหม่</span>
              </button>
            </div>
          )}

          {/* Assets List */}
          {assets.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              ยังไม่มีอุปกรณ์ที่บันทึกไว้ ลองเพิ่มรถหรือเครื่องใช้ไฟฟ้าที่ใช้บ่อยด้านบนครับ
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {assets.map((asset) => {
                const catConfig =
                  CATEGORY_MAP[asset.category] ?? CATEGORY_MAP.automotive;
                const CatIcon = catConfig.icon;
                return (
                  <div
                    key={asset.id}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-wrap items-center justify-between gap-3 hover:border-orange-200 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`p-2 rounded-xl border shrink-0 ${catConfig.accent}`}
                      >
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {asset.name}
                        </div>
                        <div className="text-xs text-slate-600">
                          {asset.brandModel}
                          {asset.yearOrSpec ? ` • ${asset.yearOrSpec}` : ""}
                        </div>
                        {asset.notes && (
                          <p className="text-[11px] text-slate-500">
                            หมายเหตุ: {asset.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onStartCaseWithAsset(asset)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-orange-600 transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>เปิดเคสซ่อม</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(asset)}
                        className="p-2 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-slate-100 transition-colors"
                        title="แก้ไขอุปกรณ์"
                        aria-label={`แก้ไข ${asset.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAsset(asset.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="ลบอุปกรณ์"
                        aria-label={`ลบ ${asset.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
