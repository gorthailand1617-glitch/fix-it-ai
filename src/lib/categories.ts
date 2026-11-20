import type React from "react";
import { Car, Cpu, MonitorSmartphone, Wind } from "lucide-react";
import { CaseStatus, RepairCategory } from "@/types/repair";

export const CASE_STATUS_META: Record<
  CaseStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  diagnosing: {
    label: "กำลังตรวจเช็ก",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  waiting_parts: {
    label: "รออะไหล่",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    dotClass: "bg-sky-500",
  },
  resolved: {
    label: "ซ่อมเสร็จแล้ว",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
};

export interface CategoryConfig {
  id: RepairCategory;
  title: string;
  subtitle: string;
  samplePrompt: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  badgeColor: string;
}

export const STARTER_CATEGORIES: CategoryConfig[] = [
  {
    id: "automotive",
    title: "รถยนต์ & มอเตอร์ไซค์",
    subtitle: "สตาร์ทไม่ติด, ไฟหน้าปัดโชว์, เร่งสะดุด, เสียงดังผิดปกติ",
    samplePrompt:
      "รถยนต์สตาร์ทไม่ติด บิดกุญแจมีเสียงแชะ ๆ ไฟหน้าปัดติดปกติ ควรเช็กจุดไหนก่อนและต้องเตรียมอะไหล่อะไรบ้าง",
    icon: Car,
    accent: "text-orange-600 bg-orange-50 border-orange-200",
    badgeColor: "text-orange-600",
  },
  {
    id: "appliance",
    title: "เครื่องใช้ไฟฟ้าในบ้าน",
    subtitle: "แอร์ไม่เย็น, ตู้เย็นไม่ฉ่ำ, เครื่องซักผ้าไม่ปั่น, ปั๊มน้ำตัด",
    samplePrompt:
      "แอร์บ้านเปิดแล้วมีแต่ลมออกมา ไม่เย็นเลย ล้างฟิลเตอร์แล้วก็ไม่หาย ต้องเช็กอะไรต่อและมีอะไหล่อะไรเสียได้บ้าง",
    icon: Wind,
    accent: "text-sky-600 bg-sky-50 border-sky-200",
    badgeColor: "text-sky-600",
  },
  {
    id: "electronics",
    title: "คอมพิวเตอร์ & อิเล็กทรอนิกส์",
    subtitle: "โน้ตบุ๊กเปิดไม่ติด, จอไม่ขึ้นภาพ, เราเตอร์หลุดบ่อย",
    samplePrompt:
      "คอมพิวเตอร์ตั้งโต๊ะกดเปิดแล้วพัดลมหมุนแต่หน้าจอไม่ขึ้นภาพ ไม่มีเสียงบี๊บ ต้องตรวจเช็กยังไงครับ",
    icon: Cpu,
    accent: "text-violet-600 bg-violet-50 border-violet-200",
    badgeColor: "text-violet-600",
  },
  {
    id: "home_office",
    title: "อุปกรณ์สำนักงาน & ไฟบ้าน",
    subtitle: "ปรินเตอร์กระดาษติด/ไม่ดูด, UPS ร้องเตือน, ปลั๊ก/สวิตช์เสีย",
    samplePrompt:
      "ปรินเตอร์อิงค์เจ็ทในออฟฟิศขึ้นไฟกระพริบส้มสลับเขียวและไม่ยอมพิมพ์ ต้องตรวจเช็กและแก้อย่างไร",
    icon: MonitorSmartphone,
    accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
    badgeColor: "text-emerald-600",
  },
];

export const CATEGORY_MAP: Record<RepairCategory, CategoryConfig> = {
  automotive: STARTER_CATEGORIES[0],
  appliance: STARTER_CATEGORIES[1],
  electronics: STARTER_CATEGORIES[2],
  home_office: STARTER_CATEGORIES[3],
};
