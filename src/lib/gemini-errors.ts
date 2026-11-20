function extractErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "";
}

export function isHighDemandError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("overloaded")
  );
}

export function isQuotaExhaustedError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("429") || lower.includes("resource_exhausted");
}

export function isRetryableModelError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    isQuotaExhaustedError(lower) ||
    isHighDemandError(lower) ||
    lower.includes("404") ||
    lower.includes("not_found") ||
    lower.includes("500") ||
    lower.includes("internal") ||
    lower.includes("504") ||
    lower.includes("deadline_exceeded")
  );
}

export function isSchemaWithSearchError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("400") || lower.includes("invalid_argument");
}

function tryExtractNestedApiMessage(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      error?: { message?: unknown };
      message?: unknown;
    };
    if (typeof parsed?.error?.message === "string" && parsed.error.message.trim()) {
      return parsed.error.message.trim();
    }
    if (typeof parsed?.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    // ignore invalid JSON fragments
  }
  return null;
}

export function formatFriendlyApiError(err: unknown): string {
  const raw = extractErrorMessage(err).trim();
  if (!raw) {
    return "เกิดข้อผิดพลาดในการวิเคราะห์อาการ กรุณาลองใหม่อีกครั้งครับ";
  }

  const lower = raw.toLowerCase();

  if (isHighDemandError(lower)) {
    return "เซิร์ฟเวอร์ AI (Gemini) มีผู้ใช้งานหนาแน่นชั่วคราว (503) ระบบลองสลับโมเดลสำรองแล้วยังไม่ว่าง กรุณารอสักครู่แล้วกด 'ลองวิเคราะห์ใหม่' ครับ";
  }

  if (isQuotaExhaustedError(lower)) {
    return "โควต้าการใช้งาน Gemini API เต็มชั่วคราว (429) กรุณารอสักครู่แล้วกด 'ลองวิเคราะห์ใหม่' ครับ";
  }

  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("permission_denied")
  ) {
    return "ไม่สามารถยืนยันตัวตน Gemini API Key ได้ กรุณาตรวจสอบค่า GEMINI_API_KEY ในไฟล์ .env.local";
  }

  if (
    lower.includes("504") ||
    lower.includes("deadline_exceeded") ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  ) {
    return "การวิเคราะห์ใช้เวลานานเกินกำหนด กรุณากด 'ลองวิเคราะห์ใหม่' อีกครั้งครับ";
  }

  if (lower.includes("400") || lower.includes("invalid_argument")) {
    return "คำขอหรือไฟล์แนบไม่รองรับโดยโมเดล AI กรุณาลองปรับข้อความหรือไฟล์แนบแล้วส่งใหม่อีกครั้งครับ";
  }

  const nestedMessage = tryExtractNestedApiMessage(raw);
  if (nestedMessage) {
    return `ไม่สามารถวิเคราะห์อาการได้ในขณะนี้: ${nestedMessage}`;
  }

  return raw;
}
