import type { ShopifyOrder } from "@/lib/types";

export const RETURN_NOTE_EDIT_MS = 2 * 60 * 60 * 1000;

export function canLivreurEditReturnNote(
  order: Pick<
    ShopifyOrder,
    "workflow_status" | "return_note_at" | "return_note_by"
  >,
  profileId: string
): boolean {
  if (order.workflow_status !== "returned") return false;
  if (!order.return_note_at || order.return_note_by !== profileId) return false;
  return Date.now() - new Date(order.return_note_at).getTime() < RETURN_NOTE_EDIT_MS;
}

export function returnNoteEditDeadline(
  order: Pick<ShopifyOrder, "return_note_at">
): Date | null {
  if (!order.return_note_at) return null;
  return new Date(new Date(order.return_note_at).getTime() + RETURN_NOTE_EDIT_MS);
}

export function validateReturnNote(note: string): string | null {
  const trimmed = note.trim();
  if (trimmed.length < 5) {
    return "La note doit contenir au moins 5 caractères";
  }
  if (trimmed.length > 500) {
    return "La note ne peut pas dépasser 500 caractères";
  }
  return null;
}
