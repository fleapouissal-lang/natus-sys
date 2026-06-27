export type StorePosNote = {
  id: string;
  store_id: string;
  body: string;
  created_by: string;
  updated_by: string | null;
  operator_id: string | null;
  operator_name: string | null;
  created_at: string;
  updated_at: string;
};

export function parseStorePosNote(raw: unknown): StorePosNote | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!row.id || !row.store_id || !row.body) return null;

  return {
    id: String(row.id),
    store_id: String(row.store_id),
    body: String(row.body),
    created_by: String(row.created_by ?? ""),
    updated_by: row.updated_by ? String(row.updated_by) : null,
    operator_id: row.operator_id ? String(row.operator_id) : null,
    operator_name: null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function parseStorePosNotes(raw: unknown): StorePosNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseStorePosNote).filter((note): note is StorePosNote => note !== null);
}
