import test from "node:test";
import assert from "node:assert/strict";
import { BACKUP_FORMAT, BACKUP_VERSION, STORAGE_KEY, createBackup, loadAppData, parseBackup, saveAppData, validateAppData } from "../.test-build/storage.js";

const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  },
};

const sample = {
  missions: [{ id: "m1", title: "Study", created: "2026-11-23", xp: 40 }],
  tasks: [{ id: "t1", title: "Revise", created: "2026-11-23", done: false }],
  goals: [], knowledge: [{ id: "k1", title: "Chemistry", created: "2026-11-23" }],
  rewards: [], journal: [], xp: 120, credits: 12,
};

test("validation preserves valid records and sanitizes invalid counters/records", () => {
  const data = validateAppData({ ...sample, xp: -2, credits: Number.NaN, tasks: [...sample.tasks, null, { title: "Missing ID" }] });
  assert.equal(data.missions.length, 1);
  assert.equal(data.tasks.length, 1);
  assert.equal(data.xp, 0);
  assert.equal(data.credits, 0);
});

test("versioned backup round-trips all supported collections", () => {
  const backup = createBackup(sample);
  assert.equal(backup.format, BACKUP_FORMAT);
  assert.equal(backup.version, BACKUP_VERSION);
  const parsed = parseBackup(backup);
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.value, validateAppData(sample));
});

test("legacy flat ULS data migrates in place without changing the storage key", () => {
  store.set(STORAGE_KEY, JSON.stringify(sample));
  const loaded = loadAppData();
  assert.equal(loaded.ok, true);
  const saved = JSON.parse(store.get(STORAGE_KEY));
  assert.equal(saved.format, BACKUP_FORMAT);
  assert.equal(saved.version, BACKUP_VERSION);
  assert.deepEqual(saved.data, validateAppData(sample));
});

test("corrupt saved data is not silently overwritten", () => {
  const raw = "{not-json";
  store.set(STORAGE_KEY, raw);
  const loaded = loadAppData();
  assert.equal(loaded.ok, false);
  assert.equal(store.get(STORAGE_KEY), raw);
});

test("unsupported future storage versions are protected from overwrite", () => {
  const raw = JSON.stringify({ format: BACKUP_FORMAT, version: 99, data: sample });
  store.set(STORAGE_KEY, raw);
  const loaded = loadAppData();
  assert.equal(loaded.ok, false);
  assert.equal(store.get(STORAGE_KEY), raw);
});

test("saving and reloading uses a versioned envelope", () => {
  store.delete(STORAGE_KEY);
  const saved = saveAppData(sample);
  assert.equal(saved.ok, true);
  const loaded = loadAppData();
  assert.equal(loaded.ok, true);
  if (loaded.ok) assert.deepEqual(loaded.value, validateAppData(sample));
});


test("video learning records persist through local storage and versioned backups", () => {
  const withVideo = {
    ...sample,
    videos: [{ id: "v1", title: "Physics lecture", created: "2026-11-23", url: "https://youtu.be/dQw4w9WgXcQ", status: "Watched", notes: "Review vectors" }],
  };
  const saved = saveAppData(withVideo);
  assert.equal(saved.ok, true);
  const loaded = loadAppData();
  assert.equal(loaded.ok, true);
  if (loaded.ok) {
    assert.equal(loaded.value.videos.length, 1);
    assert.equal(loaded.value.videos[0].notes, "Review vectors");
    const backup = createBackup(loaded.value);
    const restored = parseBackup(backup);
    assert.equal(restored.ok, true);
    if (restored.ok) assert.deepEqual(restored.value.videos, loaded.value.videos);
  }
});
