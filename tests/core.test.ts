import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLazadaAffiliateLink,
  buildShopeeAffiliateLink,
} from "@/lib/affiliate";
import { extractAndNormalizeDiagnostic } from "@/lib/diagnostic-schema";
import {
  compactDiagnosticForHistory,
  compactUserHistoryText,
} from "@/lib/history-compact";
import {
  formatFriendlyApiError,
  isHighDemandError,
  isRetryableModelError,
} from "@/lib/gemini-errors";
import { findRelevantTechNotes } from "@/lib/knowledge-base";
import {
  getModelDisplayName,
  isGemini4Model,
  resolveCandidateModels,
  supportsThinkingLevel,
} from "@/lib/models";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildRepairSheetData,
  formatPartsListForCopy,
  formatRepairSheetForLine,
} from "@/lib/repair-sheet";
import { DiagnosticResponse, RepairCase } from "@/types/repair";

describe("affiliate", () => {
  it("builds default search links when templates are empty", () => {
    const prevShopee = process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE;
    const prevLazada = process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE;
    try {
      delete process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE;
      delete process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE;

      const shopee = buildShopeeAffiliateLink("แคปรันแอร์ 35uF");
      const lazada = buildLazadaAffiliateLink("แคปรันแอร์ 35uF");

      assert.ok(shopee.startsWith("https://shopee.co.th/search?keyword="));
      assert.ok(lazada.startsWith("https://www.lazada.co.th/catalog/?q="));
    } finally {
      if (prevShopee !== undefined) {
        process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE = prevShopee;
      } else {
        delete process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE;
      }
      if (prevLazada !== undefined) {
        process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE = prevLazada;
      } else {
        delete process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE;
      }
    }
  });

  it("applies {url} and prefix templates and ignores invalid non-HTTP templates", () => {
    const prevShopee = process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE;
    const prevLazada = process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE;
    try {
      process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE =
        "https://invl.io/abc?url={url}&kw={keyword}";
      process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE =
        "AQ.Ab8RN6invalidTokenNotUrl";

      const shopee = buildShopeeAffiliateLink("obd2");
      const lazada = buildLazadaAffiliateLink("หัวเทียน");

      assert.ok(shopee.startsWith("https://invl.io/abc?url="));
      assert.ok(shopee.includes("&kw=obd2"));
      assert.ok(lazada.startsWith("https://www.lazada.co.th/catalog/?q="));

      process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE =
        "https://invl.io/laz?url=";
      const lazadaPrefix = buildLazadaAffiliateLink("หัวเทียน");
      assert.ok(lazadaPrefix.startsWith("https://invl.io/laz?url=https%3A%2F%2F"));
    } finally {
      if (prevShopee !== undefined) {
        process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE = prevShopee;
      } else {
        delete process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE;
      }
      if (prevLazada !== undefined) {
        process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE = prevLazada;
      } else {
        delete process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE;
      }
    }
  });
});

describe("knowledge-base", () => {
  it("matches specific vehicle model and avoids false match across brands", () => {
    const captivaHits = findRelevantTechNotes(
      "Captiva C140 ขึ้นไฟเตือนเบรกมือไฟฟ้า EPB",
      { category: "automotive" }
    );
    assert.ok(captivaHits.some((n) => n.id === "chevy-captiva-c140-epb"));

    const civicHits = findRelevantTechNotes(
      "Honda Civic ไฟเบรกมือไฟฟ้า EPB ค้าง",
      { category: "automotive" }
    );
    assert.equal(
      civicHits.some((n) => n.id === "chevy-captiva-c140-epb"),
      false
    );
  });

  it("matches home aircon note and excludes car aircon queries", () => {
    const homeAcHits = findRelevantTechNotes(
      "แอร์บ้านเปิดแล้วมีแต่ลมไม่เย็น คอยล์ร้อนไม่หมุน",
      { category: "appliance" }
    );
    assert.ok(homeAcHits.some((n) => n.id === "aircon-inverter-vs-fixed"));

    const carAcHits = findRelevantTechNotes("แอร์รถยนต์ไม่เย็น มีแต่ลมร้อน", {
      category: "automotive",
    });
    assert.equal(
      carAcHits.some((n) => n.id === "aircon-inverter-vs-fixed"),
      false
    );
  });

  it("enforces word boundaries on short ASCII model codes", () => {
    const hits = findRelevantTechNotes("รหัสอะไหล่ abc119 มีปัญหา", {
      category: "automotive",
    });
    assert.equal(hits.some((n) => n.id === "nissan-tiida-c11"), false);
  });
});

describe("diagnostic-schema", () => {
  it("parses plain, fenced, and embedded JSON and normalizes missing fields", () => {
    const fenced = [
      "```json",
      JSON.stringify({
        headline: "เช็กแบตเตอรี่รถยนต์",
        riskLevel: "invalid-level",
        riskSummary: "",
        summaryTable: [
          { label: "อุปกรณ์", value: "รถยนต์" },
          { label: "", value: "ignored" },
        ],
        inspectionSteps: [
          {
            title: "วัดไฟแบต",
            steps: ["เปิดฝากระโปรง", "วัดขั้วแบต"],
          },
        ],
        recommendedParts: [
          {
            name: "แบตเตอรี่ 12V",
            specOrCode: "LN2",
            howToVerify: "เทียบขั้ว",
            estimatedPriceThb: "2,200 บาท",
          },
        ],
        wizardQuestions: [
          {
            question: "มีเสียงไหม",
            options: [{ label: "มีเสียงแชะ ๆ" }],
          },
        ],
      }),
      "```",
    ].join("\n");

    const parsed = extractAndNormalizeDiagnostic(fenced);
    assert.equal(parsed.headline, "เช็กแบตเตอรี่รถยนต์");
    assert.equal(parsed.riskLevel, "caution");
    assert.equal(parsed.summaryTable.length, 1);
    assert.equal(parsed.inspectionSteps[0]?.stepNumber, 1);
    assert.equal(parsed.recommendedParts[0]?.searchKeyword, "แบตเตอรี่ 12V");
    assert.equal(parsed.wizardQuestions[0]?.id, "q1");

    const proseWrapped = `คำตอบคือ:\n{"headline":"ทดสอบ","riskLevel":"safe","riskSummary":"ปลอดภัย"}\nเรียบร้อย`;
    const parsedProse = extractAndNormalizeDiagnostic(proseWrapped);
    assert.equal(parsedProse.headline, "ทดสอบ");
    assert.equal(parsedProse.riskLevel, "safe");
  });

  it("throws on non-JSON input", () => {
    assert.throws(() => extractAndNormalizeDiagnostic("นี่ไม่ใช่ JSON"));
  });
});

describe("history-compact", () => {
  it("compacts verbose diagnostics and truncates oversized user history", () => {
    const sample: DiagnosticResponse = {
      headline: "ตรวจเช็กแอร์ไม่เย็น",
      riskLevel: "caution",
      riskSummary: "สับเบรกเกอร์ก่อนเปิดฝา",
      summaryTable: [
        { label: "อุปกรณ์", value: "แอร์บ้าน" },
        { label: "อาการ", value: "มีแต่ลม" },
      ],
      honestyNote: "ข้อมูลเบื้องต้น",
      mermaidChart: "flowchart TD\nA-->B\nB-->C\nC-->D",
      inspectionSteps: [
        {
          stepNumber: 1,
          title: "ล้างฟิลเตอร์",
          goal: "เพิ่มการไหลเวียนลม",
          steps: ["เปิดฝา", "ล้างน้ำ"],
          standard: "สะอาด",
          safety: "ปิดแอร์ก่อน",
          reportBack: "สะอาดหรือตัน",
        },
      ],
      toolsNeeded: [{ name: "ไขควงแฉก", purpose: "เปิดฝา", optional: false }],
      recommendedParts: [
        {
          name: "แคปรัน",
          specOrCode: "35uF 450V",
          howToVerify: "ดูฉลาก",
          estimatedPriceThb: "120 บาท",
          searchKeyword: "แคปรัน 35uF",
        },
      ],
      wizardQuestions: [],
      closingPrompt: "ลองทำตามขั้นที่ 1",
    };

    const compacted = compactDiagnosticForHistory(sample);
    assert.ok(compacted.includes("ตรวจเช็กแอร์ไม่เย็น"));
    assert.ok(compacted.includes("ล้างฟิลเตอร์"));
    assert.ok(compacted.includes("แคปรัน (35uF 450V)"));
    assert.ok(compacted.length < JSON.stringify(sample).length);

    const longText = "ก".repeat(2000);
    const truncated = compactUserHistoryText(longText, 100);
    assert.ok(truncated.length < 150);
    assert.ok(truncated.includes("ตัดทอนข้อความรอบก่อน"));
  });
});

describe("repair-sheet", () => {
  it("deduplicates tools and parts, tracks completed steps, and formats LINE text", () => {
    const sampleCase: RepairCase = {
      id: "case-1",
      title: "แอร์ห้องนอนไม่เย็น",
      category: "appliance",
      status: "waiting_parts",
      completedSteps: { "msg-2:1": true },
      updatedAt: 1700000000000,
      messages: [
        {
          id: "msg-1",
          role: "assistant",
          text: "รอบแรก",
          timestamp: 1700000000000,
          diagnostic: {
            headline: "รอบแรก",
            riskLevel: "caution",
            riskSummary: "สับเบรกเกอร์",
            summaryTable: [],
            inspectionSteps: [],
            toolsNeeded: [{ name: "ไขควงแฉก", purpose: "เปิดฝา" }],
            recommendedParts: [
              {
                name: "แคปรัน",
                specOrCode: "35uF 450V",
                howToVerify: "ดูฉลาก",
                estimatedPriceThb: "120 บาท",
                searchKeyword: "แคปรัน",
              },
            ],
            wizardQuestions: [],
            closingPrompt: "",
          },
        },
        {
          id: "msg-2",
          role: "assistant",
          text: "รอบสอง",
          timestamp: 1700000005000,
          diagnostic: {
            headline: "สรุปอาการแคปรันเสื่อม",
            riskLevel: "caution",
            riskSummary: "สับเบรกเกอร์ทุกครั้ง",
            summaryTable: [{ label: "รุ่น", value: "Inverter 12000 BTU" }],
            inspectionSteps: [
              {
                stepNumber: 1,
                title: "เช็กพัดลมตัวนอก",
                goal: "ดูการทำงาน",
                steps: ["เดินออกไปดู"],
                standard: "หมุนแรง",
                safety: "อย่าแหย่มือ",
                reportBack: "หมุนไหม",
              },
              {
                stepNumber: 2,
                title: "ดูสภาพบวมของแคปรัน",
                goal: "เช็กความเสียหาย",
                steps: ["เปิดฝาบน"],
                standard: "ก้นแบนไม่บวม",
                safety: "คายประจุก่อน",
                reportBack: "บวมไหม",
              },
            ],
            toolsNeeded: [
              { name: "ไขควงแฉก", purpose: "เปิดฝาบน" },
              { name: "ไขควงวัดไฟ", purpose: "เช็กไฟ" },
            ],
            recommendedParts: [
              {
                name: "แคปรัน",
                specOrCode: "35uF 450V",
                howToVerify: "ดูฉลากเดิม",
                estimatedPriceThb: "150 บาท",
                searchKeyword: "แคปรัน 35uF",
              },
            ],
            wizardQuestions: [],
            closingPrompt: "",
          },
        },
      ],
    };

    const sheet = buildRepairSheetData(sampleCase);
    assert.equal(sheet.statusLabel, "รออะไหล่");
    assert.equal(sheet.toolsNeeded.length, 2);
    assert.equal(sheet.recommendedParts.length, 1);
    assert.equal(sheet.steps[0]?.done, true);
    assert.equal(sheet.steps[1]?.done, false);

    const lineText = formatRepairSheetForLine(sampleCase);
    assert.ok(lineText.includes("✅ ขั้นที่ 1: เช็กพัดลมตัวนอก"));
    assert.ok(lineText.includes("⬜ ขั้นที่ 2: ดูสภาพบวมของแคปรัน"));

    const partsText = formatPartsListForCopy(sampleCase);
    assert.ok(partsText.includes("แคปรัน"));
    assert.ok(partsText.includes("35uF 450V"));
  });
});

describe("rate-limit", () => {
  it("allows requests within limit and blocks once exceeded", () => {
    const key = "test-client-ip-phase4";
    const r1 = checkRateLimit(key, 2, 60_000);
    const r2 = checkRateLimit(key, 2, 60_000);
    const r3 = checkRateLimit(key, 2, 60_000);

    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 1);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 0);
    assert.equal(r3.allowed, false);
    assert.ok(r3.retryAfterSeconds >= 1);
  });
});

describe("gemini-errors", () => {
  it("detects 503 UNAVAILABLE high demand errors as retryable and formats friendly Thai text", () => {
    const raw503 =
      '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}';

    assert.equal(isHighDemandError(raw503), true);
    assert.equal(isRetryableModelError(raw503), true);

    const friendly = formatFriendlyApiError(new Error(raw503));
    assert.ok(friendly.includes("503"));
    assert.ok(!friendly.includes("{"));
  });

  it("formats 429 quota and invalid API key errors cleanly", () => {
    const friendly429 = formatFriendlyApiError(
      new Error("429 RESOURCE_EXHAUSTED: Quota exceeded")
    );
    assert.ok(friendly429.includes("429"));

    const friendlyAuth = formatFriendlyApiError(
      new Error("400 API_KEY_INVALID: API key not valid")
    );
    assert.ok(friendlyAuth.includes("GEMINI_API_KEY"));
  });
});

describe("models", () => {
  it("prioritizes Gemini 4 models by default and respects requested profile", () => {
    const autoModels = resolveCandidateModels({ requestedProfile: "auto" });
    assert.equal(autoModels[0], "gemini-4-hydrogen");
    assert.ok(autoModels.includes("gemini-4-neon"));
    assert.ok(autoModels.includes("gemini-3.5-flash-lite"));

    const carbonModels = resolveCandidateModels({
      requestedProfile: "gemini-4-carbon",
    });
    assert.equal(carbonModels[0], "gemini-4-carbon");
    assert.equal(
      carbonModels.filter((m) => m === "gemini-4-carbon").length,
      1
    );

    const customEnv = resolveCandidateModels({
      requestedProfile: "gemini-4-neon",
      envModels: "gemini-4-hydrogen, gemini-4-neon, gemini-3.8-flash",
    });
    assert.deepEqual(customEnv, [
      "gemini-4-neon",
      "gemini-4-hydrogen",
      "gemini-3.8-flash",
    ]);
  });

  it("identifies Gemini 4 capabilities and maps display names", () => {
    assert.equal(isGemini4Model("gemini-4-hydrogen"), true);
    assert.equal(isGemini4Model("gemini-4-carbon"), true);
    assert.equal(isGemini4Model("gemini-3.8-flash"), false);

    assert.equal(supportsThinkingLevel("gemini-4-neon"), true);
    assert.equal(supportsThinkingLevel("gemini-3.8-flash"), true);
    assert.equal(supportsThinkingLevel("gemini-2.5-flash"), false);

    assert.equal(getModelDisplayName("gemini-4-hydrogen"), "Gemini 4 Hydrogen");
    assert.equal(getModelDisplayName("gemini-4-argon"), "Gemini 4 Argon");
  });
});
