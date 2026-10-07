const DEBATES_INDEX_KEY = 'the-panel-debates';
const SNAPSHOTS_KEY = 'the-panel-debate-snapshots';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSupabaseDebateId(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}

export function isLocalDebateId(id) {
  if (typeof id === 'number' && Number.isFinite(id)) return true;
  if (typeof id === 'string' && /^\d+$/.test(id)) return true;
  return false;
}

function snapshotKey(id) {
  return String(id);
}

function readSnapshots() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSnapshots(map) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(map));
}

/**
 * Persist full debate payload for sidebar entries without a Supabase UUID.
 */
export function saveLocalDebateSnapshot(id, payload) {
  if (id == null || isSupabaseDebateId(id)) return;

  const map = readSnapshots();
  map[snapshotKey(id)] = {
    id,
    topic: payload.topic ?? '',
    personas: Array.isArray(payload.personas) ? payload.personas : [],
    history: Array.isArray(payload.history) ? payload.history : [],
    summary: payload.summary ?? '',
    verdict: payload.verdict ?? '',
    persona_count: payload.persona_count ?? payload.personaCount ?? 5,
    savedPath: payload.savedPath ?? '',
    date: payload.date ?? new Date().toISOString(),
  };
  writeSnapshots(map);
}

/**
 * Load a locally persisted debate transcript by sidebar id.
 * @returns {object|null}
 */
export function loadLocalDebateSnapshot(id) {
  if (id == null) return null;
  const map = readSnapshots();
  const entry = map[snapshotKey(id)];
  if (!entry) return null;
  return entry;
}

/** Remove snapshot when debate is removed from sidebar (future use). */
export function deleteLocalDebateSnapshot(id) {
  if (id == null) return;
  const map = readSnapshots();
  delete map[snapshotKey(id)];
  writeSnapshots(map);
}

export { DEBATES_INDEX_KEY, SNAPSHOTS_KEY };
