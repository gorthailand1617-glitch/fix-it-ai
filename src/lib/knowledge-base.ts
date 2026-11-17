export interface VerifiedTechNote {
  id: string;
  keywords: string[];
  modelName: string;
  facts: string[];
}

export const VERIFIED_TECH_NOTES: VerifiedTechNote[] = [
  {
    id: "chevy-captiva-c140-epb",
    keywords: ["captiva", "แคปติวา", "แคปติว่า", "c140", "เบรกมือไฟฟ้า", "epb"],
    modelName: "Chevrolet Captiva C140 (2011–2018)",
    facts: [
      "ระบบเบรกมือไฟฟ้า (EPB) ของ Captiva C140 ใช้กล่องสมองกล/ชุดมอเตอร์ควบคุม (EPB Module / Actuator) แยกต่างหาก ติดตั้งอยู่ใต้ท้องรถบริเวณใกล้คานหลัง และใช้สายสลิงดึงกลไกเบรกที่ล้อหลัง ไม่ได้ใช้มอเตอร์ฝังอยู่ที่ตัวคาลิปเปอร์โดยตรงเหมือนรถเก๋งรุ่นใหม่บางรุ่น",
      "หากขึ้นไฟเตือนเบรกมือไฟฟ้ากะพริบหรือค้าง มักต้องตรวจปลั๊ก/สายไฟที่กล่อง EPB ใต้ท้องรถ (โดนน้ำ/โคลน/ความชื้น), สภาพสายสลิงฝืดหรือค้าง, สวิตช์เบรกมือในห้องโดยสาร, และฟิวส์/รีเลย์ที่เกี่ยวข้อง รวมถึงระดับไฟแบตเตอรี่ (ไฟอ่อนทำให้ EPB ฟ้อง Error ได้ง่าย)",
    ],
  },
  {
    id: "ford-focus-mk2-18",
    keywords: ["focus", "โฟกัส", "mk2", "duratec"],
    modelName: "Ford Focus Mk2 1.8 / 2.0 (Duratec HE)",
    facts: [
      "เครื่องยนต์ Duratec HE 1.8/2.0 ใช้ระบบจุดระเบิดแบบ Coil-on-Plug (คอยล์แยกแต่ละสูบ) หรือคอยล์แพ็คตามปีรุ่นย่อย ควรให้ผู้ใช้ถ่ายรูปห้องเครื่องยืนยันก่อนระบุตำแหน่ง",
      "อาการเร่งวูบหรือสะดุดหลังล้างลิ้นปีกผีเสื้อ มักต้องเช็กท่อสุญญากาศใต้ท่อร่วมไอดี, วาล์ว PCV, แรงดันปั๊มติ๊ก, และทำการรีเซ็ตค่าเดินเบาลิ้นปีกผีเสื้อไฟฟ้า",
    ],
  },
  {
    id: "nissan-tiida-c11",
    keywords: ["tiida", "ทีด้า", "c11", "hr16", "mr18"],
    modelName: "Nissan Tiida C11 (2006–2012)",
    facts: [
      "เครื่อง HR16DE / MR18DE ใช้โซ่ราวลิ้น (Timing Chain) และคอยล์จุดระเบิดอยู่ใต้ท่อร่วมไอดี การถอดหัวเทียนหรือคอยล์ต้องถอดท่อร่วมไอดีออกก่อน (ต้องระวังปะเก็นท่อร่วมไอดีรั่วหลังประกอบ)",
    ],
  },
  {
    id: "aircon-inverter-vs-fixed",
    keywords: ["แอร์", "inverter", "อินเวอร์เตอร์", "คอยล์ร้อน", "คอมเพรสเซอร์"],
    modelName: "เครื่องปรับอากาศ (แอร์บ้าน Fixed-speed vs Inverter)",
    facts: [
      "แอร์แบบธรรมดา (Fixed-speed) ใช้ตัวเก็บประจุ (Run Capacitor / Cap) ทรงกระบอกที่คอยล์ร้อน ส่วนแอร์ Inverter จะไม่มี Cap Start แบบกระบอก แต่ใช้แผงวงจรหลัก (Main PCB + IPM) ขับคอมเพรสเซอร์ 3 เฟสแทน — ต้องถามหรือดูป้ายรุ่นก่อนแนะนำเปลี่ยน Cap เสมอ",
    ],
  },
];

export function findRelevantTechNotes(queryText: string): VerifiedTechNote[] {
  const lower = queryText.toLowerCase();
  return VERIFIED_TECH_NOTES.filter((note) =>
    note.keywords.some((kw) => lower.includes(kw.toLowerCase()))
  );
}

