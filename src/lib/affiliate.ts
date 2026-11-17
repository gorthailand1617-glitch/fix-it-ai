export interface CuratedAffiliateItem {
  keywords: string[];
  shopeeUrl?: string;
  lazadaUrl?: string;
}

/**
 * รายการสินค้าแนะนำแบบเจาะจง (Curated Affiliate Links)
 * ใส่ลิงก์สั้น Affiliate ของคุณ (เช่น https://s.shopee.co.th/xxxx)
 * ระบบจะจับคู่คำสำคัญจากชื่อเครื่องมือ/อะไหล่ที่ AI แนะนำให้อัตโนมัติ
 */
export const CURATED_AFFILIATE_LINKS: CuratedAffiliateItem[] = [
  {
    keywords: ["obd", "obd2", "obd-ii", "ตัวอ่านโค้ด"],
    shopeeUrl: "", // ตัวอย่าง: "https://s.shopee.co.th/xxxxxx"
    lazadaUrl: "",
  },
  {
    keywords: ["มัลติมิเตอร์", "multimeter"],
    shopeeUrl: "",
    lazadaUrl: "",
  },
  {
    keywords: ["ไขควงวัดไฟ"],
    shopeeUrl: "",
    lazadaUrl: "",
  },
];

function findCuratedLink(
  keyword: string,
  platform: "shopee" | "lazada"
): string | null {
  const lower = keyword.toLowerCase();
  for (const item of CURATED_AFFILIATE_LINKS) {
    if (item.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      const url = platform === "shopee" ? item.shopeeUrl : item.lazadaUrl;
      if (url && url.trim()) return url.trim();
    }
  }
  return null;
}

function applyTemplate(
  template: string | undefined,
  targetUrl: string,
  keyword: string
): string {
  if (!template || !template.trim()) return targetUrl;
  const t = template.trim();
  if (t.includes("{url}") || t.includes("{keyword}")) {
    return t
      .replace(/\{url\}/g, encodeURIComponent(targetUrl))
      .replace(/\{keyword\}/g, encodeURIComponent(keyword));
  }
  // If user provides a prefix like "https://invl.io/clxxx?url="
  return `${t}${encodeURIComponent(targetUrl)}`;
}

export function buildShopeeAffiliateLink(keyword: string): string {
  const curated = findCuratedLink(keyword, "shopee");
  if (curated) return curated;

  const baseSearchUrl = `https://shopee.co.th/search?keyword=${encodeURIComponent(
    keyword
  )}`;
  return applyTemplate(
    process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE,
    baseSearchUrl,
    keyword
  );
}

export function buildLazadaAffiliateLink(keyword: string): string {
  const curated = findCuratedLink(keyword, "lazada");
  if (curated) return curated;

  const baseSearchUrl = `https://www.lazada.co.th/catalog/?q=${encodeURIComponent(
    keyword
  )}`;
  return applyTemplate(
    process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE,
    baseSearchUrl,
    keyword
  );
}
