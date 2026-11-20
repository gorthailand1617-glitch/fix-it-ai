import affiliateProductsData from "@/data/affiliate-products.json";
import { RepairCategory } from "@/types/repair";

export interface CuratedAffiliateItem {
  id?: string;
  name?: string;
  category?: RepairCategory;
  keywords: string[];
  shopeeUrl?: string;
  lazadaUrl?: string;
}

export interface AffiliateLinkOptions {
  category?: RepairCategory;
  itemType?: "part" | "tool";
  source?: "card" | "sheet";
}

const SHOPEE_AFFILIATE_ID_PATTERN = /^[a-zA-Z0-9_-]{3,40}$/;

/**
 * รายการสินค้าแนะนำแบบเจาะจง (Curated Affiliate Links)
 * แก้ไขหรือเพิ่มลิงก์สั้น Affiliate ของคุณ (เช่น https://s.shopee.co.th/xxxx หรือ https://s.lazada.co.th/s.xxxx)
 * ได้โดยตรงที่ src/data/affiliate-products.json
 */
export const CURATED_AFFILIATE_LINKS: CuratedAffiliateItem[] =
  affiliateProductsData as CuratedAffiliateItem[];

function isValidHttpUrl(value: string | undefined): value is string {
  return Boolean(value && /^https?:\/\//i.test(value.trim()));
}

function isValidShopeeAffiliateId(value: string | undefined): value is string {
  return Boolean(value && SHOPEE_AFFILIATE_ID_PATTERN.test(value.trim()));
}

function findCuratedLink(
  keyword: string,
  platform: "shopee" | "lazada"
): string | null {
  const lower = keyword.toLowerCase();
  for (const item of CURATED_AFFILIATE_LINKS) {
    if (item.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      const url = platform === "shopee" ? item.shopeeUrl : item.lazadaUrl;
      if (isValidHttpUrl(url)) return url.trim();
    }
  }
  return null;
}

export function buildAffiliateSubId(options?: AffiliateLinkOptions): string {
  const rawPrefix = process.env.NEXT_PUBLIC_AFFILIATE_SUB_ID?.trim() || "";
  const prefix = rawPrefix.replace(/[^a-zA-Z0-9_]/g, "") || "fixitai";
  const category = options?.category || "general";
  const itemType = options?.itemType || "item";
  const source = options?.source || "card";
  return `${prefix}-${category}-${itemType}-${source}`;
}

function applyTemplate(
  template: string | undefined,
  targetUrl: string,
  keyword: string,
  subId: string
): string {
  if (!isValidHttpUrl(template)) return targetUrl;
  const t = template.trim();
  if (
    t.includes("{url}") ||
    t.includes("{keyword}") ||
    t.includes("{subId}")
  ) {
    return t
      .replace(/\{url\}/g, encodeURIComponent(targetUrl))
      .replace(/\{keyword\}/g, encodeURIComponent(keyword))
      .replace(/\{subId\}/g, encodeURIComponent(subId));
  }
  // If user provides a prefix like "https://invl.io/clxxx?url="
  return `${t}${encodeURIComponent(targetUrl)}`;
}

export function buildShopeeAffiliateLink(
  keyword: string,
  options?: AffiliateLinkOptions
): string {
  const curated = findCuratedLink(keyword, "shopee");
  if (curated) return curated;

  const baseSearchUrl = `https://shopee.co.th/search?keyword=${encodeURIComponent(
    keyword
  )}`;
  const subId = buildAffiliateSubId(options);

  const template = process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE;
  if (isValidHttpUrl(template)) {
    return applyTemplate(template, baseSearchUrl, keyword, subId);
  }

  const affiliateId = process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_ID;
  if (isValidShopeeAffiliateId(affiliateId)) {
    return `https://s.shopee.co.th/an_redir?origin_link=${encodeURIComponent(
      baseSearchUrl
    )}&affiliate_id=${encodeURIComponent(
      affiliateId.trim()
    )}&sub_id=${encodeURIComponent(subId)}`;
  }

  return baseSearchUrl;
}

export function buildLazadaAffiliateLink(
  keyword: string,
  options?: AffiliateLinkOptions
): string {
  const curated = findCuratedLink(keyword, "lazada");
  if (curated) return curated;

  const baseSearchUrl = `https://www.lazada.co.th/catalog/?q=${encodeURIComponent(
    keyword
  )}`;
  const subId = buildAffiliateSubId(options);

  const template = process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE;
  if (isValidHttpUrl(template)) {
    return applyTemplate(template, baseSearchUrl, keyword, subId);
  }

  const rootlink = process.env.NEXT_PUBLIC_LAZADA_ROOTLINK;
  if (isValidHttpUrl(rootlink)) {
    const trimmed = rootlink.trim();
    if (
      trimmed.includes("{url}") ||
      trimmed.includes("{keyword}") ||
      trimmed.includes("{subId}")
    ) {
      return applyTemplate(trimmed, baseSearchUrl, keyword, subId);
    }
    if (trimmed.endsWith("url=")) {
      return `${trimmed}${encodeURIComponent(
        baseSearchUrl
      )}&sub_id=${encodeURIComponent(subId)}`;
    }
    const separator = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${separator}url=${encodeURIComponent(
      baseSearchUrl
    )}&sub_id=${encodeURIComponent(subId)}`;
  }

  return baseSearchUrl;
}

export function hasActiveAffiliateConfig(): boolean {
  if (
    isValidHttpUrl(process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_TEMPLATE) ||
    isValidShopeeAffiliateId(process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_ID) ||
    isValidHttpUrl(process.env.NEXT_PUBLIC_LAZADA_AFFILIATE_TEMPLATE) ||
    isValidHttpUrl(process.env.NEXT_PUBLIC_LAZADA_ROOTLINK)
  ) {
    return true;
  }

  return CURATED_AFFILIATE_LINKS.some(
    (item) => isValidHttpUrl(item.shopeeUrl) || isValidHttpUrl(item.lazadaUrl)
  );
}
