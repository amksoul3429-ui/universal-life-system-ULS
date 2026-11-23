/**
 * ARVENA Core Storage
 * Backward-compatible, validated local persistence and portable backups.
 * Keeps the historical uls-data-v1 key so existing installations migrate in place.
 */
export const STORAGE_KEY = "uls-data-v1";
export const BACKUP_FORMAT = "arvena-backup";
export const BACKUP_VERSION = 1;

export type CoreRecord = { id: string; title: string; created: string; [key: string]: unknown };
export type AppData = {
  missions: CoreRecord[];
  tasks: CoreRecord[];
  goals: CoreRecord[];
  knowledge: CoreRecord[];
  rewards: CoreRecord[];
  journal: CoreRecord[];
  videos: CoreRecord[];
  evolution: CoreRecord[];
  xp: number;
  credits: number;
};
export const EMPTY_APP_DATA: AppData = {
  missions: [], tasks: [], goals: [], knowledge: [], rewards: [], journal: [], videos: [], evolution: [], xp: 0, credits: 0,
};

export type StorageResult<T> = { ok: true; value: T; warning?: string } | { ok: false; error: string };
export type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  app: "ARVENA";
  exportedAt: string;
  data: AppData;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const safeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

function normalizeRecord(value: unknown): CoreRecord | null {
  if (!isObject(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  const title = typeof value.title === "string" ? value.title : "";
  const created = typeof value.created === "string" ? value.created : "";
  if (!id || !title) return null;
  return { ...value, id, title, created };
}

/** Drops malformed records and normalizes numeric economy fields. */
export function validateAppData(value: unknown): AppData {
  const source = isObject(value) ? value : {};
  const collection = (key: keyof Pick<AppData, "missions" | "tasks" | "goals" | "knowledge" | "rewards" | "journal" | "videos" | "evolution">) =>
    Array.isArray(source[key])
      ? (source[key] as unknown[]).map(normalizeRecord).filter((item): item is CoreRecord => item !== null)
      : [];
  return {
    missions: collection("missions"),
    tasks: collection("tasks"),
    goals: collection("goals"),
    knowledge: collection("knowledge"),
    rewards: collection("rewards"),
    journal: collection("journal"),
    videos: collection("videos"),
    evolution: collection("evolution"),
    xp: safeNumber(source.xp),
    credits: safeNumber(source.credits),
  };
}

function parseStoredValue(raw: string): AppData {
  const parsed: unknown = JSON.parse(raw);
  // Versioned envelope is the current format; flat objects are the original ULS format.
  if (isObject(parsed) && parsed.format === BACKUP_FORMAT) {
    if (parsed.version !== BACKUP_VERSION || !isObject(parsed.data)) {
      throw new Error("Unsupported stored data version");
    }
    return validateAppData(parsed.data);
  }
  return validateAppData(parsed);
}

export function loadAppData(): StorageResult<AppData> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ok: true, value: EMPTY_APP_DATA };
    const value = parseStoredValue(raw);
    // Rewrite legacy flat data as a normalized envelope without changing the storage key.
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || parsed.format !== BACKUP_FORMAT) {
      const saved = saveAppData(value);
      if (!saved.ok) return { ok: true, value, warning: "Data loaded, but its migration could not be saved. Export a backup." };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Saved data could not be read. Your original browser data was left untouched." };
  }
}

export function saveAppData(value: unknown): StorageResult<AppData> {
  try {
    const data = validateAppData(value);
    const existingRaw = window.localStorage.getItem(STORAGE_KEY);
    if (existingRaw) {
      try {
        const parsedExisting: unknown = JSON.parse(existingRaw);
        if (isObject(parsedExisting) && parsedExisting.format === BACKUP_FORMAT && parsedExisting.version === BACKUP_VERSION) {
          const existing = parseStoredValue(existingRaw);
          if (JSON.stringify(existing) === JSON.stringify(data)) return { ok: true, value: data };
        }
      } catch { /* Replace malformed storage only after an explicit valid save. */ }
    }
    const envelope: BackupEnvelope = {
      format: BACKUP_FORMAT, version: BACKUP_VERSION, app: "ARVENA",
      exportedAt: new Date().toISOString(), data,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return { ok: true, value: data };
  } catch (error) {
    const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return { ok: false, error: quota
      ? "Browser storage is full. Export a backup and free space before making more changes."
      : "Could not save data. Check browser storage permissions and try again." };
  }
}

export function createBackup(value: unknown): BackupEnvelope {
  return {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, app: "ARVENA",
    exportedAt: new Date().toISOString(), data: validateAppData(value),
  };
}

export function parseBackup(value: unknown): StorageResult<AppData> {
  if (!isObject(value)) return { ok: false, error: "This file is not a valid ARVENA backup." };
  if (value.format === BACKUP_FORMAT) {
    if (value.version !== BACKUP_VERSION || !isObject(value.data)) {
      return { ok: false, error: "This backup version is not supported by this ARVENA build." };
    }
    return { ok: true, value: validateAppData(value.data) };
  }
  // Accept legacy ULS flat backups, but reject unrelated JSON files.
  const looksLikeLegacy = ["missions", "tasks", "goals", "knowledge", "rewards", "journal", "videos", "evolution"].some(key => Array.isArray(value[key]));
  return looksLikeLegacy
    ? { ok: true, value: validateAppData(value), warning: "Legacy backup imported and upgraded to the ARVENA format." }
    : { ok: false, error: "The JSON file does not contain recognizable ARVENA/ULS data." };
}

export function subscribeToExternalChanges(onChange: (data: AppData) => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try { onChange(parseStoredValue(event.newValue)); } catch { /* Ignore malformed writes from another tab. */ }
  };
  const onLocal = (event: Event) => {
    const detail = (event as CustomEvent<AppData>).detail;
    if (detail) onChange(validateAppData(detail));
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("arvena:data-updated", onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("arvena:data-updated", onLocal);
  };
}
