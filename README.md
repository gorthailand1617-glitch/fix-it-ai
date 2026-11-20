# Fix it AI — ผู้ช่วยช่างอัจฉริยะสำหรับทุกคน

เปลี่ยนคนทั่วไปให้สามารถตรวจเช็กและซ่อมแซมสิ่งของรอบตัวได้อย่างปลอดภัยและเป็นระบบ ครอบคลุม **รถยนต์ & มอเตอร์ไซค์, เครื่องใช้ไฟฟ้าในบ้าน, คอมพิวเตอร์/อิเล็กทรอนิกส์ และอุปกรณ์สำนักงาน**

พัฒนาโดย **Dev. By Kru.Gorthailand**

---

## ความสามารถหลัก

- **Safety Gatekeeper & Interactive Checklist:** ประเมินระดับความเสี่ยง (`safe` / `caution` / `danger`) พร้อมช่องยืนยันความปลอดภัย ติ๊กความคืบหน้าทีละขั้นตอน และปุ่มรายงานผลด่วน (`ปกติ` / `พบผิดปกติ` / `ไม่มีเครื่องมือ`)
- **Decision Flow & Visual References:** สร้างแผนภาพลำดับการตรวจเช็กด้วย Mermaid (โหมด `strict`) พร้อมลิงก์ค้นหาวิดีโอและภาพตัวอย่างเทียบหน้างาน
- **Streaming Progress & Cancel / Retry:** แสดงสถานะการวิเคราะห์และหัวข้อเบื้องต้นแบบเรียลไทม์ พร้อมปุ่มยกเลิกและปุ่มลองวิเคราะห์ใหม่
- **Hands-Free & Mobile Ready:** รองรับถ่ายรูปหน้างานทันที (`capture="environment"`), บีบอัดรูปภาพฝั่ง Client อัตโนมัติ, Drag & Drop, ซูมดูภาพ (Lightbox), พูดแทนพิมพ์ (STT ภาษาไทย) และอ่านขั้นตอนออกเสียง (TTS)
- **รองรับ Gemini 4 เต็มรูปแบบ:** เลือกใช้งานได้ทั้ง `Gemini 4 Hydrogen` (เร็ว ประหยัด), `Gemini 4 Neon` (สมดุล), `Gemini 4 Carbon` (เหตุผลเชิงลึก) และ `Gemini 4 Argon` พร้อมปรับ `ThinkingLevel` อัตโนมัติตามโหมดมือใหม่/ช่าง และมี fallback ไปยังตระกูล 3.x
- **คลัง "อุปกรณ์ของฉัน" (My Garage) & โหมดมือใหม่/โหมดช่าง:** บันทึกรถยนต์และเครื่องใช้ไฟฟ้าที่ใช้ประจำไว้เปิดเคสได้ทันที พร้อมสลับระดับคำอธิบายระหว่าง **มือใหม่** กับ **โหมดช่าง**
- **ใบสรุปงานซ่อม & รายการอะไหล่ (1-Click Repair Sheet):** คัดลอกสรุปส่ง LINE ให้ช่าง/ร้านอะไหล่ หรือพิมพ์/บันทึกเป็น PDF
- **เก็บข้อมูลบน IndexedDB + รองรับ PWA:** จัดเก็บประวัติเคสและรูปภาพขนาดใหญ่ใน IndexedDB (ย้ายข้อมูลจาก `localStorage` อัตโนมัติ) และติดตั้งเป็นแอปหน้าจอหลักบนมือถือ/เดสก์ท็อปได้

---

## การเริ่มต้นใช้งาน (Development)

ต้องใช้ **Node.js `>= 22.0.0`** (ตามข้อกำหนดของ `@google/genai`)

1. ติดตั้งแพ็กเกจ:
   ```bash
   npm install
   ```
2. คัดลอกไฟล์ตั้งค่าตัวอย่างและใส่ Gemini API Key (หากยังไม่ใส่ ระบบจะทำงานใน **Demo Mode** อัตโนมัติ):
   ```bash
   cp .env.local.example .env.local
   ```
3. รันเซิร์ฟเวอร์พัฒนา:
   ```bash
   npm run dev
   ```
4. เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

---

## ตัวแปรสภาพแวดล้อม (Environment Variables)

ดูรายละเอียดทั้งหมดได้ใน [.env.local.example](.env.local.example):

| ตัวแปร | คำอธิบาย |
| --- | --- |
| `GEMINI_API_KEY` | API Key จาก Google AI Studio (เว้นว่างเพื่อใช้ Demo Mode) |
| `GEMINI_MODELS` | ลำดับโมเดล fallback คั่นด้วย `,` (ค่าเริ่มต้น: `gemini-4-hydrogen,gemini-4-neon,gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite`) |
| `GEMINI_THINKING_LEVEL` | ระดับการคิดสำหรับ Gemini 4 / 3 (`MINIMAL`, `LOW`, `MEDIUM`, `HIGH` — ค่าเริ่มต้นปรับตามโหมดมือใหม่/โหมดช่างอัตโนมัติ) |
| `ENABLE_GOOGLE_SEARCH` | เปิดใช้งาน Google Search Grounding (`true` / `false`) |
| `DIAGNOSE_RATE_LIMIT_PER_MIN` | จำกัดคำขอต่อ IP ต่อนาทีสำหรับ `/api/diagnose` (ค่าเริ่มต้น `30`, ตั้ง `0` เพื่อปิด) |
| `NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE` | เทมเพลตลิงก์ Affiliate Shopee (ต้องขึ้นต้นด้วย `http://` หรือ `https://`) |
| `NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE` | เทมเพลตลิงก์ Affiliate Lazada (ต้องขึ้นต้นด้วย `http://` หรือ `https://`) |

---

## การเพิ่มข้อมูลเทคนิคเฉพาะรุ่น (Verified Tech Notes)

สามารถเพิ่มข้อมูลข้อเท็จจริงเฉพาะรุ่นที่ตรวจสอบแล้วได้ใน `src/data/tech-notes.json` เพื่อป้องกัน AI สันนิษฐานข้ามรุ่น:
- `category`: `"automotive" | "appliance" | "electronics" | "home_office"`
- `requireStrongMatch`: ตั้งเป็น `true` สำหรับข้อมูลเฉพาะรุ่นรถ/อุปกรณ์ (ต้องเจอคำใน `strongKeywords` ก่อนจึงจะนำมาใช้)
- `excludeKeywords`: คำต้องห้ามสำหรับตัดบริบทที่ไม่เกี่ยวข้อง (เช่น ตัดเคสแอร์รถยนต์ออกจากหมายเหตุแอร์บ้าน)

---

## คำสั่งตรวจสอบและทดสอบ

```bash
npm test            # รัน Unit Tests ด้วย node:test
npm run lint        # ตรวจสอบ ESLint
npx tsc --noEmit    # ตรวจสอบ TypeScript
npm run build       # Build สำหรับ Production (Standalone)
```

---

## การ Deploy ด้วย Docker

โปรเจคใช้ `output: "standalone"` บน `node:22-alpine`:

```bash
docker build -t fix-it-ai .
docker run -p 8080:8080 --env-file .env.local fix-it-ai
```
