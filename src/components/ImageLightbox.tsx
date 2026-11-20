"use client";

import React, { useEffect } from "react";
import { Download, X } from "lucide-react";

interface ImageLightboxProps {
  image: { src: string; name: string } | null;
  onClose: () => void;
}

export default function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!image) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl flex items-center justify-between gap-3 mb-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs sm:text-sm font-medium truncate">
          {image.name}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={image.src}
            download={image.name || "fix-it-image.webp"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 hover:bg-white/25 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
            title="ปิด (Esc)"
            aria-label="ปิดภาพขยาย"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* User-uploaded inline base64 Data URL zoom preview — next/image cannot optimize local data URLs */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt={image.name || "ภาพขยาย"}
          className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain shadow-2xl bg-black/30"
        />
      </div>
    </div>
  );
}
