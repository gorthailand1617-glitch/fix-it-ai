"use client";

import React, { useEffect, useId, useState } from "react";
import { AlertCircle, Code2, GitBranch, Maximize2, X } from "lucide-react";

interface MermaidDiagramProps {
  chart: string;
}

type MermaidModule = typeof import("mermaid")["default"];

let mermaidSingletonPromise: Promise<MermaidModule> | null = null;
let diagramCounter = 0;

function getMermaid(): Promise<MermaidModule> {
  if (!mermaidSingletonPromise) {
    mermaidSingletonPromise = import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        securityLevel: "strict",
        theme: "base",
        themeVariables: {
          primaryColor: "#FFF7ED",
          primaryTextColor: "#1E293B",
          primaryBorderColor: "#F97316",
          lineColor: "#64748B",
          secondaryColor: "#F8FAFC",
          tertiaryColor: "#FFFFFF",
          fontFamily: "var(--font-sans), sans-serif",
          fontSize: "13px",
        },
        flowchart: {
          curve: "basis",
          padding: 14,
        },
      });
      return mermaid;
    });
  }
  return mermaidSingletonPromise;
}

function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const uniqueId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [showCode, setShowCode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      try {
        const mermaid = await getMermaid();

        const cleanChart = chart
          .replace(/\\n/g, "\n")
          .replace(/([^\{])"\}\}/g, '$1"}')
          .trim();

        diagramCounter += 1;
        const renderId = `mermaid-${uniqueId}-${diagramCounter}`;
        await mermaid.parse(cleanChart);
        const { svg: renderedSvg } = await mermaid.render(renderId, cleanChart);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError(false);
        }
      } catch {
        // Clean up any stray Mermaid error elements if created
        if (typeof document !== "undefined") {
          document
            .querySelectorAll('[id^="dmermaid-"]')
            .forEach((el) => el.remove());
        }
        if (!cancelled) {
          setSvg("");
          setError(true);
        }
      }
    }

    if (chart) {
      renderChart();
    }

    return () => {
      cancelled = true;
    };
  }, [chart, uniqueId]);

  useEffect(() => {
    if (!expanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  if (!chart) return null;

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <GitBranch className="w-3.5 h-3.5 text-orange-600" />
            <span>แผนภาพลำดับการตรวจเช็ก (Decision Flow)</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showCode ? "ดูแผนภาพ" : "โค้ด"}
            </button>
            {!showCode && !error && svg && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors"
                title="ขยายเต็มจอ"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          {showCode ? (
            <pre className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {chart}
            </pre>
          ) : error ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                ไม่สามารถแสดงแผนภาพอัตโนมัติสำหรับเคสนี้ได้ กรุณาดูขั้นตอนตรวจเช็กด้านล่าง หรือกดปุ่ม &quot;โค้ด&quot; เพื่อดูข้อความแผนภาพ
              </p>
            </div>
          ) : svg ? (
            <div
              className="flex justify-center min-w-[280px] [&>svg]:max-w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              กำลังสร้างแผนภาพ...
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <GitBranch className="w-4 h-4 text-orange-600" />
                <span>แผนภาพลำดับการตรวจเช็ก</span>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                title="ปิด (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className="flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(MermaidDiagram);
