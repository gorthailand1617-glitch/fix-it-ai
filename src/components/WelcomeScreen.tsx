"use client";

import React from "react";
import { Warehouse, Wrench } from "lucide-react";
import { CATEGORY_MAP, STARTER_CATEGORIES } from "@/lib/categories";
import { EquipmentAsset, RepairCategory } from "@/types/repair";

interface WelcomeScreenProps {
  assets?: EquipmentAsset[];
  onSelectStarter: (samplePrompt: string, category: RepairCategory) => void;
  onSelectAsset?: (asset: EquipmentAsset) => void;
  onOpenGarage?: () => void;
}

export default function WelcomeScreen({
  assets,
  onSelectStarter,
  onSelectAsset,
  onOpenGarage,
}: WelcomeScreenProps) {
  return (
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

      {assets && assets.length > 0 && onSelectAsset && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Warehouse className="w-4 h-4 text-orange-600" />
              <span>เลือกจากอุปกรณ์ของฉัน (เริ่มตรวจเช็กได้ทันที)</span>
            </div>
            {onOpenGarage && (
              <button
                type="button"
                onClick={onOpenGarage}
                className="text-xs font-semibold text-orange-700 hover:underline"
              >
                + จัดการอุปกรณ์
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {assets.map((asset) => {
              const catConfig =
                CATEGORY_MAP[asset.category] ?? CATEGORY_MAP.automotive;
              const CatIcon = catConfig.icon;
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelectAsset(asset)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-orange-400 hover:shadow-xs transition-all"
                >
                  <CatIcon
                    className={`w-4 h-4 shrink-0 ${catConfig.badgeColor}`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">
                      {asset.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {asset.brandModel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STARTER_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectStarter(cat.samplePrompt, cat.id)}
              className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-orange-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl border shrink-0 ${cat.accent}`}>
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
  );
}
