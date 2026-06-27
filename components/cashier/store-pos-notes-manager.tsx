"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  createStorePosNote,
  deleteStorePosNote,
  updateStorePosNote,
} from "@/lib/store/store-pos-notes-actions";
import type { StorePosNote } from "@/lib/store/store-pos-notes";
import { formatDate } from "@/lib/utils";

export function StorePosNotesManager({
  initialNotes,
  storeId,
  storeName,
}: {
  initialNotes: StorePosNote[];
  storeId: string;
  storeName?: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [editingNote, setEditingNote] = useState<StorePosNote | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deletingNote, setDeletingNote] = useState<StorePosNote | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    const body = draft.trim();
    if (!body) {
      setError("Saisissez une note.");
      return;
    }

    startTransition(async () => {
      setError("");
      const result = await createStorePosNote(storeId, body);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNotes((prev) => [result.note, ...prev]);
      setDraft("");
    });
  }

  function openEdit(note: StorePosNote) {
    setEditingNote(note);
    setEditBody(note.body);
    setError("");
  }

  function handleUpdate() {
    if (!editingNote) return;
    const body = editBody.trim();
    if (!body) {
      setError("La note ne peut pas être vide.");
      return;
    }

    startTransition(async () => {
      setError("");
      const result = await updateStorePosNote(editingNote.id, body);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNotes((prev) => prev.map((n) => (n.id === result.note.id ? result.note : n)));
      setEditingNote(null);
      setEditBody("");
    });
  }

  function handleDelete() {
    if (!deletingNote) return;

    startTransition(async () => {
      setError("");
      const result = await deleteStorePosNote(deletingNote.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== deletingNote.id));
      setDeletingNote(null);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Nouvelle note"
          description={
            storeName
              ? `Visible uniquement sur le compte caisse de ${storeName}`
              : "Visible uniquement sur le compte caisse magasin"
          }
        />
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Consignes du jour, rappels stock, infos pour l'équipe…"
          className="natus-field w-full resize-y bg-surface px-3 py-2 text-sm"
        />
        {error && !editingNote && !deletingNote && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={handleCreate} loading={pending} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter la note
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-primary-dark">
          Notes enregistrées ({notes.length})
        </h2>

        {notes.length === 0 ? (
          <Card className="px-6 py-12 text-center text-muted">
            <MessageSquare className="mx-auto mb-3 h-9 w-9 text-muted/50" />
            Aucune note pour ce magasin.
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-foreground">
                  {note.body}
                </p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(note)}
                    title="Modifier"
                    aria-label="Modifier la note"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeletingNote(note);
                      setError("");
                    }}
                    title="Supprimer"
                    aria-label="Supprimer la note"
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
                Modifiée le {formatDate(note.updated_at)}
                {note.created_at !== note.updated_at && ` · créée le ${formatDate(note.created_at)}`}
              </p>
            </Card>
          ))
        )}
      </div>

      {editingNote && (
        <Modal onClose={() => setEditingNote(null)} size="md">
          <Card className="border-0 shadow-none">
            <CardHeader title="Modifier la note" />
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={6}
              className="natus-field w-full resize-y bg-surface px-3 py-2 text-sm"
            />
            {error && (
              <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingNote(null)}>
                Annuler
              </Button>
              <Button type="button" onClick={handleUpdate} loading={pending}>
                Enregistrer
              </Button>
            </div>
          </Card>
        </Modal>
      )}

      {deletingNote && (
        <Modal onClose={() => setDeletingNote(null)} size="sm">
          <Card className="border-0 shadow-none">
            <CardHeader
              title="Supprimer cette note ?"
              description="Cette action est définitive."
            />
            {error && (
              <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeletingNote(null)}>
                Annuler
              </Button>
              <Button type="button" variant="danger" onClick={handleDelete} loading={pending}>
                Supprimer
              </Button>
            </div>
          </Card>
        </Modal>
      )}
    </div>
  );
}
