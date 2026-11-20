import {
  STORAGE_KEY,
  createEmptyCase,
  isValidStoredCase,
} from "@/lib/case-helpers";
import { ALLOWED_MODEL_PROFILES } from "@/lib/models";
import {
  EquipmentAsset,
  ExplanationMode,
  ModelProfileId,
  RepairCase,
} from "@/types/repair";

const DB_NAME = "fix-it-ai-db";
const DB_VERSION = 1;
const CASES_STORE = "cases";
const META_STORE = "meta";
const ASSETS_META_KEY = "equipment-assets";
const ASSETS_FALLBACK_KEY = "fix-it-ai-assets-v1";
const MODE_META_KEY = "explanation-mode";
const MODE_FALLBACK_KEY = "fix-it-ai-mode-v1";
const MODEL_PROFILE_META_KEY = "model-profile";
const MODEL_PROFILE_FALLBACK_KEY = "fix-it-ai-model-profile-v1";

export type StorageBackend = "indexeddb" | "localstorage";

let dbPromise: Promise<IDBDatabase | null> | null = null;
let lastSavedCases: Map<string, RepairCase> | null = null;

function isQuotaExceededError(err: unknown): boolean {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return (
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22
    );
  }
  if (typeof err === "object" && err !== null && "name" in err) {
    const name = String((err as { name: unknown }).name);
    return (
      name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED"
    );
  }
  return false;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CASES_STORE)) {
          db.createObjectStore(CASES_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "key" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onclose = () => {
          dbPromise = null;
        };
        db.onversionchange = () => {
          dbPromise = null;
          db.close();
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
      request.onblocked = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

function readLegacyLocalStorageCases(): RepairCase[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidStoredCase);
  } catch {
    return [];
  }
}

function readAllCasesFromIdb(db: IDBDatabase): Promise<RepairCase[]> {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(CASES_STORE, "readonly");
      const store = tx.objectStore(CASES_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rawList = Array.isArray(req.result) ? req.result : [];
        const valid = rawList.filter(isValidStoredCase);
        valid.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(valid);
      };
      req.onerror = () => reject(req.error);
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });
}

function writeCasesIncrementalToIdb(
  db: IDBDatabase,
  cases: RepairCase[]
): Promise<{ ok: boolean; quotaExceeded?: boolean }> {
  const currentIds = new Set(cases.map((c) => c.id));

  if (lastSavedCases !== null) {
    const prevMap = lastSavedCases;
    const changed = cases.filter((c) => prevMap.get(c.id) !== c);
    const removedIds = Array.from(prevMap.keys()).filter(
      (id) => !currentIds.has(id)
    );

    if (changed.length === 0 && removedIds.length === 0) {
      return Promise.resolve({ ok: true });
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(CASES_STORE, "readwrite");
        const store = tx.objectStore(CASES_STORE);
        for (const id of removedIds) {
          store.delete(id);
        }
        for (const item of changed) {
          store.put(item);
        }

        tx.oncomplete = () => {
          lastSavedCases = new Map(cases.map((c) => [c.id, c]));
          resolve({ ok: true });
        };
        tx.onerror = () =>
          resolve({ ok: false, quotaExceeded: isQuotaExceededError(tx.error) });
        tx.onabort = () =>
          resolve({ ok: false, quotaExceeded: isQuotaExceededError(tx.error) });
      } catch (err) {
        dbPromise = null;
        resolve({ ok: false, quotaExceeded: isQuotaExceededError(err) });
      }
    });
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(CASES_STORE, "readwrite");
      const store = tx.objectStore(CASES_STORE);
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        const existingKeys = Array.isArray(keysReq.result) ? keysReq.result : [];
        for (const key of existingKeys) {
          if (typeof key === "string" && !currentIds.has(key)) {
            store.delete(key);
          }
        }
        for (const item of cases) {
          store.put(item);
        }
      };

      tx.oncomplete = () => {
        lastSavedCases = new Map(cases.map((c) => [c.id, c]));
        resolve({ ok: true });
      };
      tx.onerror = () =>
        resolve({ ok: false, quotaExceeded: isQuotaExceededError(tx.error) });
      tx.onabort = () =>
        resolve({ ok: false, quotaExceeded: isQuotaExceededError(tx.error) });
    } catch (err) {
      dbPromise = null;
      resolve({ ok: false, quotaExceeded: isQuotaExceededError(err) });
    }
  });
}

export async function loadCases(): Promise<{
  cases: RepairCase[];
  migratedFromLocalStorage: boolean;
  backend: StorageBackend;
}> {
  const db = await openDb();
  if (db) {
    try {
      const stored = await readAllCasesFromIdb(db);
      if (stored.length > 0) {
        lastSavedCases = new Map(stored.map((c) => [c.id, c]));
        return {
          cases: stored,
          migratedFromLocalStorage: false,
          backend: "indexeddb",
        };
      }

      const legacyCases = readLegacyLocalStorageCases();
      if (legacyCases.length > 0) {
        const writeResult = await writeCasesIncrementalToIdb(db, legacyCases);
        if (writeResult.ok) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore cleanup failure
          }
          return {
            cases: legacyCases,
            migratedFromLocalStorage: true,
            backend: "indexeddb",
          };
        }
        return {
          cases: legacyCases,
          migratedFromLocalStorage: false,
          backend: "localstorage",
        };
      }

      lastSavedCases = new Map();
      return {
        cases: [createEmptyCase()],
        migratedFromLocalStorage: false,
        backend: "indexeddb",
      };
    } catch {
      // fall through to localStorage fallback below
    }
  }

  const fallbackCases = readLegacyLocalStorageCases();
  return {
    cases: fallbackCases.length > 0 ? fallbackCases : [createEmptyCase()],
    migratedFromLocalStorage: false,
    backend: "localstorage",
  };
}

export async function saveCases(cases: RepairCase[]): Promise<{
  ok: boolean;
  backend: StorageBackend;
  quotaExceeded?: boolean;
}> {
  const db = await openDb();
  if (db) {
    const result = await writeCasesIncrementalToIdb(db, cases);
    return {
      ...result,
      backend: "indexeddb",
    };
  }

  try {
    if (typeof localStorage === "undefined") {
      return { ok: false, backend: "localstorage" };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
    return { ok: true, backend: "localstorage" };
  } catch (err) {
    return {
      ok: false,
      backend: "localstorage",
      quotaExceeded: isQuotaExceededError(err),
    };
  }
}

async function readMetaValue<T>(key: string, fallbackKey: string): Promise<T | null> {
  const db = await openDb();
  if (db) {
    const value = await new Promise<T | null>((resolve) => {
      try {
        const tx = db.transaction(META_STORE, "readonly");
        const store = tx.objectStore(META_STORE);
        const req = store.get(key);
        req.onsuccess = () => {
          const record = req.result as { key?: string; value?: T } | undefined;
          resolve(record && "value" in record ? (record.value ?? null) : null);
        };
        req.onerror = () => resolve(null);
      } catch {
        dbPromise = null;
        resolve(null);
      }
    });
    if (value !== null) {
      return value;
    }
  }

  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(fallbackKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeMetaValue<T>(
  key: string,
  fallbackKey: string,
  value: T
): Promise<boolean> {
  const db = await openDb();
  if (db) {
    const ok = await new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(META_STORE, "readwrite");
        const store = tx.objectStore(META_STORE);
        store.put({ key, value });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch {
        dbPromise = null;
        resolve(false);
      }
    });
    if (ok) return true;
  }

  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(fallbackKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isValidAsset(item: unknown): item is EquipmentAsset {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.brandModel === "string"
  );
}

export async function loadAssets(): Promise<EquipmentAsset[]> {
  const stored = await readMetaValue<unknown>(ASSETS_META_KEY, ASSETS_FALLBACK_KEY);
  if (!Array.isArray(stored)) return [];
  return stored.filter(isValidAsset);
}

export async function saveAssets(assets: EquipmentAsset[]): Promise<boolean> {
  return writeMetaValue(ASSETS_META_KEY, ASSETS_FALLBACK_KEY, assets);
}

export async function loadExplanationMode(): Promise<ExplanationMode> {
  const stored = await readMetaValue<unknown>(MODE_META_KEY, MODE_FALLBACK_KEY);
  return stored === "technician" ? "technician" : "beginner";
}

export async function saveExplanationMode(
  mode: ExplanationMode
): Promise<boolean> {
  return writeMetaValue(MODE_META_KEY, MODE_FALLBACK_KEY, mode);
}

export async function loadModelProfile(): Promise<ModelProfileId> {
  const stored = await readMetaValue<unknown>(
    MODEL_PROFILE_META_KEY,
    MODEL_PROFILE_FALLBACK_KEY
  );
  if (
    typeof stored === "string" &&
    ALLOWED_MODEL_PROFILES.has(stored as ModelProfileId)
  ) {
    return stored as ModelProfileId;
  }
  return "auto";
}

export async function saveModelProfile(
  profile: ModelProfileId
): Promise<boolean> {
  return writeMetaValue(
    MODEL_PROFILE_META_KEY,
    MODEL_PROFILE_FALLBACK_KEY,
    profile
  );
}
