import techNotesData from "@/data/tech-notes.json";
import { RepairCategory } from "@/types/repair";

export interface VerifiedTechNote {
  id: string;
  category: RepairCategory;
  modelName: string;
  requireStrongMatch: boolean;
  strongKeywords: string[];
  contextKeywords: string[];
  excludeKeywords: string[];
  facts: string[];
}

export const VERIFIED_TECH_NOTES: VerifiedTechNote[] =
  techNotesData as VerifiedTechNote[];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(normalizedText: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;

  if (/^[a-z0-9-]+$/.test(kw) && kw.length <= 4) {
    const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(kw)}(?![a-z0-9])`);
    return pattern.test(normalizedText);
  }
  return normalizedText.includes(kw);
}

export function findRelevantTechNotes(
  queryText: string,
  options?: { category?: RepairCategory; maxResults?: number }
): VerifiedTechNote[] {
  const lower = queryText.toLowerCase();
  const maxResults = options?.maxResults ?? 3;
  const category = options?.category;

  const scored: { note: VerifiedTechNote; score: number }[] = [];

  for (const note of VERIFIED_TECH_NOTES) {
    if (note.excludeKeywords.some((kw) => matchesKeyword(lower, kw))) {
      continue;
    }

    const strongHits = note.strongKeywords.filter((kw) =>
      matchesKeyword(lower, kw)
    ).length;
    const contextHits = note.contextKeywords.filter((kw) =>
      matchesKeyword(lower, kw)
    ).length;

    if (note.requireStrongMatch && strongHits === 0) {
      continue;
    }

    if (strongHits + contextHits === 0) {
      continue;
    }

    let score = strongHits * 4 + contextHits;
    if (category) {
      score += category === note.category ? 2 : -1;
    }

    if (score >= 3) {
      scored.push({ note, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((entry) => entry.note);
}
