"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { parseStorePosNote, parseStorePosNotes, type StorePosNote } from "@/lib/store/store-pos-notes";

const NOTE_SELECT =
  "id, store_id, body, created_by, updated_by, operator_id, created_at, updated_at";

function actionError(message: string): { error: string } {
  return { error: message };
}

async function requireStorePosTerminal() {
  const profile = await requireRole(["cashier"]);
  if (!profile) return actionError("Non autorisé");
  if (!profile.is_store_pos || !profile.store_id) {
    return actionError("Réservé au compte caisse magasin");
  }
  return { profile } as const;
}

export async function listStorePosNotes(
  storeId: string
): Promise<{ notes: StorePosNote[] } | { error: string }> {
  try {
    const gate = await requireStorePosTerminal();
    if ("error" in gate) return gate;
    if (gate.profile.store_id !== storeId) return actionError("Magasin incorrect");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("store_pos_notes")
      .select(NOTE_SELECT)
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[store-pos-notes] list:", error.message);
      return actionError(error.message);
    }

    return { notes: parseStorePosNotes(data) };
  } catch (err) {
    console.error("[store-pos-notes] listStorePosNotes:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function createStorePosNote(
  storeId: string,
  body: string
): Promise<{ note: StorePosNote } | { error: string }> {
  try {
    const gate = await requireStorePosTerminal();
    if ("error" in gate) return gate;
    if (gate.profile.store_id !== storeId) return actionError("Magasin incorrect");

    const trimmed = body.trim();
    if (!trimmed) return actionError("La note ne peut pas être vide");

    const supabase = await createClient();
    const { data: operatorId, error: operatorError } = await supabase.rpc(
      "active_pos_operator_id"
    );
    if (operatorError) {
      console.error("[store-pos-notes] active_pos_operator_id:", operatorError.message);
    }

    const { data, error } = await supabase
      .from("store_pos_notes")
      .insert({
        store_id: storeId,
        body: trimmed,
        created_by: gate.profile.id,
        updated_by: gate.profile.id,
        operator_id: typeof operatorId === "string" ? operatorId : null,
      })
      .select(NOTE_SELECT)
      .single();

    if (error) {
      console.error("[store-pos-notes] create:", error.message);
      return actionError(error.message);
    }

    const note = parseStorePosNote(data);
    if (!note) return actionError("Note invalide");

    revalidatePath("/cashier/notes");
    return { note };
  } catch (err) {
    console.error("[store-pos-notes] createStorePosNote:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function updateStorePosNote(
  noteId: string,
  body: string
): Promise<{ note: StorePosNote } | { error: string }> {
  try {
    const gate = await requireStorePosTerminal();
    if ("error" in gate) return gate;

    const trimmed = body.trim();
    if (!trimmed) return actionError("La note ne peut pas être vide");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("store_pos_notes")
      .update({
        body: trimmed,
        updated_by: gate.profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .eq("store_id", gate.profile.store_id!)
      .select(NOTE_SELECT)
      .single();

    if (error) {
      console.error("[store-pos-notes] update:", error.message);
      return actionError(error.message);
    }

    const note = parseStorePosNote(data);
    if (!note) return actionError("Note introuvable");

    revalidatePath("/cashier/notes");
    return { note };
  } catch (err) {
    console.error("[store-pos-notes] updateStorePosNote:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function deleteStorePosNote(noteId: string): Promise<{ ok: true } | { error: string }> {
  try {
    const gate = await requireStorePosTerminal();
    if ("error" in gate) return gate;

    const supabase = await createClient();
    const { error } = await supabase
      .from("store_pos_notes")
      .delete()
      .eq("id", noteId)
      .eq("store_id", gate.profile.store_id!);

    if (error) {
      console.error("[store-pos-notes] delete:", error.message);
      return actionError(error.message);
    }

    revalidatePath("/cashier/notes");
    return { ok: true };
  } catch (err) {
    console.error("[store-pos-notes] deleteStorePosNote:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}
