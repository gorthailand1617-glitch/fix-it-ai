import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Content, Part } from "@google/genai";
import { FIX_IT_SYSTEM_PROMPT } from "@/lib/prompts";
import { getDemoDiagnosticResponse } from "@/lib/demo-responses";
import { findRelevantTechNotes } from "@/lib/knowledge-base";
import { DiagnosticResponse, FileAttachment } from "@/types/repair";

export const maxDuration = 60;

interface IncomingHistoryItem {
  role: "user" | "assistant";
  text: string;
  diagnostic?: DiagnosticResponse;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function decodeBase64Utf8(base64: string, maxChars = 60000): string {
  const text = Buffer.from(base64, "base64").toString("utf-8");
  if (text.length <= maxChars) return text;
  return (
    text.slice(0, maxChars) +
    `\n\n...[ตัดทอนเนื้อหาบางส่วน เนื่องจากไฟล์ยาวเกิน ${maxChars.toLocaleString()} ตัวอักษร]...`
  );
}

function extractJson(raw: string): DiagnosticResponse {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as DiagnosticResponse;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body.message || "";
    const imageDataUrl: string | undefined = body.imageDataUrl;
    const attachment: FileAttachment | undefined = body.attachment;
    const attachments: FileAttachment[] = Array.isArray(body.attachments)
      ? body.attachments
      : attachment
      ? [attachment]
      : [];
    const history: IncomingHistoryItem[] = Array.isArray(body.history)
      ? body.history
      : [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Simulate brief thinking delay for realistic Demo Mode UX
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json({
        diagnostic: getDemoDiagnosticResponse(message),
        isDemo: true,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const contents: Content[] = history.slice(-8).map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [
        {
          text:
            item.role === "assistant" && item.diagnostic
              ? JSON.stringify(item.diagnostic)
              : item.text,
        },
      ],
    }));

    const currentParts: Part[] = [];
    let extraFileText = "";

    if (attachments.length > 0) {
      for (const att of attachments) {
        if (!att?.dataUrl) continue;
        const parsed = parseDataUrl(att.dataUrl);
        if (!parsed) continue;

        if (att.kind === "text") {
          const decoded = decodeBase64Utf8(parsed.data);
          extraFileText += `\n\n[เนื้อหาจากไฟล์แนบ: ${att.name}]\n\`\`\`\n${decoded}\n\`\`\``;
        } else {
          const mimeType =
            att.mimeType ||
            parsed.mimeType ||
            (att.kind === "pdf" ? "application/pdf" : "application/octet-stream");
          currentParts.push({
            inlineData: {
              mimeType,
              data: parsed.data,
            },
          });
        }
      }
    } else if (imageDataUrl) {
      const parsed = parseDataUrl(imageDataUrl);
      if (parsed) {
        currentParts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        });
      }
    }

    const combinedQuery = [
      message,
      ...history.map((h) => h.text),
    ].join(" ");
    const techNotes = findRelevantTechNotes(combinedQuery);
    const techNotesBlock =
      techNotes.length > 0
        ? `\n\n[ข้อมูลเทคนิคเฉพาะรุ่นที่ตรวจสอบแล้ว — ต้องยึดข้อมูลนี้เป็นหลัก ห้ามตอบขัดแย้ง]\n${techNotes
            .map(
              (n) =>
                `• ${n.modelName}:\n${n.facts.map((f) => `  - ${f}`).join("\n")}`
            )
            .join("\n")}`
        : "";

    const attachedNames = attachments.map((a) => a.name).join(", ");
    const basePrompt =
      message.trim() ||
      (attachments.length > 0
        ? `ช่วยวิเคราะห์ไฟล์ที่แนบมาทั้งหมด (${attachedNames}) ว่ามีข้อมูลสำคัญหรือความผิดปกติอะไร และต้องตรวจเช็กอะไรต่อ`
        : "ช่วยวิเคราะห์รูปภาพนี้ให้หน่อยว่ามีความผิดปกติอะไร และต้องตรวจเช็กอะไรต่อ");

    currentParts.push({
      text: `${basePrompt}${extraFileText}${techNotesBlock}`,
    });

    contents.push({
      role: "user",
      parts: currentParts,
    });

    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ];
    const useGoogleSearch = process.env.ENABLE_GOOGLE_SEARCH === "true";

    let rawText: string | undefined;
    let lastError: unknown;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: FIX_IT_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            temperature: 0.2,
            ...(useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {}),
          },
        });
        if (response.text) {
          rawText = response.text;
          break;
        }
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        // Only fall back on quota/rate-limit/availability errors
        if (
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("404") ||
          msg.includes("503")
        ) {
          console.warn(`Model ${model} unavailable/quota exceeded, trying next fallback...`);
          continue;
        }
        throw err;
      }
    }

    if (!rawText) {
      const msg = lastError instanceof Error ? lastError.message : String(lastError);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        const fallback = getDemoDiagnosticResponse(message);
        fallback.honestyNote =
          "โควต้าฟรีของ Gemini API วันนี้เต็มชั่วคราว ระบบจึงสลับมาแสดงคำแนะนำเบื้องต้นให้ก่อนโดยอัตโนมัติครับ";
        return NextResponse.json({ diagnostic: fallback, isDemo: true });
      }
      throw lastError instanceof Error ? lastError : new Error("Empty response from Gemini");
    }

    const diagnostic = extractJson(rawText);
    return NextResponse.json({ diagnostic, isDemo: false });
  } catch (error) {
    console.error("Diagnose API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการวิเคราะห์อาการ",
      },
      { status: 500 }
    );
  }
}

