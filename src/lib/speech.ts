interface BrowserSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
  length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface WindowWithSpeech {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
}

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore synthesis cancellation errors
  }
}

export function speakThaiText(text: string, onEnd?: () => void): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = "th-TH";

    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith("th")
    );
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }

    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    onEnd?.();
    return false;
  }
}

function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as WindowWithSpeech;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

function mapSpeechErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "ไม่ได้รับอนุญาตให้ใช้งานไมโครโฟน กรุณาอนุญาตสิทธิ์ไมโครโฟนในเบราว์เซอร์ครับ";
    case "no-speech":
      return "ไม่ได้ยินเสียงพูด ลองกดไมโครโฟนแล้วพูดใกล้ไมค์อีกครั้งครับ";
    case "audio-capture":
      return "ไม่พบอุปกรณ์ไมโครโฟนบนเครื่องนี้ครับ";
    case "network":
      return "ไม่สามารถเชื่อมต่อบริการแปลงเสียงเป็นข้อความได้";
    default:
      return "ไม่สามารถรับเสียงพูดได้ในขณะนี้ ลองใหม่อีกครั้งครับ";
  }
}

export function startThaiSpeechRecognition(callbacks: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}): { stop: () => void } | null {
  const Recognition = getSpeechRecognitionConstructor();
  if (!Recognition) return null;

  try {
    const recognition = new Recognition();
    recognition.lang = "th-TH";
    recognition.interimResults = true;
    recognition.continuous = false;

    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      callbacks.onEnd();
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";
        if (result.isFinal) {
          finalChunk += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        callbacks.onInterim(interim.trim());
      }
      if (finalChunk.trim()) {
        callbacks.onInterim("");
        callbacks.onFinal(finalChunk.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        callbacks.onError(mapSpeechErrorMessage(event.error));
      }
      finish();
    };

    recognition.onend = () => {
      finish();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          finish();
        }
      },
    };
  } catch {
    callbacks.onError("ไม่สามารถเริ่มการรับเสียงได้");
    callbacks.onEnd();
    return null;
  }
}
