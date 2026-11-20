export type ModelFailureReason = "quota" | "high_demand" | "timeout" | "not_found";

const COOLDOWN_MS: Record<ModelFailureReason, number> = {
  quota: 300_000,
  high_demand: 90_000,
  timeout: 60_000,
  not_found: 600_000,
};

interface CooldownEntry {
  until: number;
  reason: ModelFailureReason;
}

const modelHealthMap = new Map<string, CooldownEntry>();

/**
 * Records a temporary cooldown for a model that failed with quota, high demand, timeout, or 404.
 */
export function markModelUnhealthy(
  model: string,
  reason: ModelFailureReason,
  now: number = Date.now()
): void {
  const normalized = model.trim();
  if (!normalized) return;
  const duration = COOLDOWN_MS[reason];
  const nextUntil = now + duration;
  const existing = modelHealthMap.get(normalized);
  if (!existing || nextUntil > existing.until) {
    modelHealthMap.set(normalized, { until: nextUntil, reason });
  }
}

/**
 * Clears any cooldown state when a model succeeds.
 */
export function markModelHealthy(model: string): void {
  const normalized = model.trim();
  if (!normalized) return;
  modelHealthMap.delete(normalized);
}

/**
 * Returns active cooldown info for a model, pruning expired entries automatically.
 */
export function getModelCooldown(
  model: string,
  now: number = Date.now()
): { until: number; reason: ModelFailureReason } | null {
  const normalized = model.trim();
  if (!normalized) return null;
  const entry = modelHealthMap.get(normalized);
  if (!entry) return null;
  if (entry.until <= now) {
    modelHealthMap.delete(normalized);
    return null;
  }
  return entry;
}

function sortByHealth(models: string[], now: number): string[] {
  const healthy: string[] = [];
  const degraded: { model: string; until: number; index: number }[] = [];

  models.forEach((model, index) => {
    const cooldown = getModelCooldown(model, now);
    if (!cooldown) {
      healthy.push(model);
    } else {
      degraded.push({ model, until: cooldown.until, index });
    }
  });

  degraded.sort((a, b) => a.until - b.until || a.index - b.index);
  return [...healthy, ...degraded.map((entry) => entry.model)];
}

/**
 * Reorders candidate models so healthy models are tried before recently degraded ones,
 * while never dropping models completely and optionally pinning an explicitly chosen first model.
 */
export function prioritizeHealthyModels(
  models: string[],
  options?: { pinFirst?: boolean; now?: number }
): string[] {
  if (models.length <= 1) return [...models];
  const now = options?.now ?? Date.now();
  if (options?.pinFirst) {
    return [models[0], ...sortByHealth(models.slice(1), now)];
  }
  return sortByHealth(models, now);
}

/**
 * Clears all tracked model health entries (for unit tests).
 */
export function resetModelHealth(): void {
  modelHealthMap.clear();
}
