"use client";

import { Loader2Icon, SendIcon, Trash2Icon } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { addNoteAction, deleteNoteAction } from "@/actions/rendez-vous-notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "@/lib/generated/prisma/enums";
import { formatRelativeDate } from "@/utils/format";

import type { NoteInterne } from "./rendez-vous-table";

/** Thread de coordination interne par RDV — jamais visible du prospect. */
export function NotesInternesSection({
  rendezVousId,
  notes,
  currentUser,
}: {
  rendezVousId: string;
  notes: NoteInterne[];
  currentUser: { id: string; role: Role };
}) {
  const [optimisticNotes, setOptimisticNotes] = useOptimistic(
    notes,
    (
      state,
      update: { type: "add"; note: NoteInterne } | { type: "remove"; id: string },
    ) => {
      if (update.type === "remove") {
        return state.filter((note) => note.id !== update.id);
      }
      return [...state, update.note];
    },
  );
  const [brouillon, setBrouillon] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleEnvoyer() {
    const texte = brouillon.trim();
    if (!texte) return;

    const noteOptimiste: NoteInterne = {
      id: `optimiste-${Date.now()}`,
      contenu: texte,
      createdAt: new Date(),
      authorId: currentUser.id,
      author: { name: "Toi", email: "" },
    };

    startTransition(async () => {
      setOptimisticNotes({ type: "add", note: noteOptimiste });
      setBrouillon("");
      const result = await addNoteAction(rendezVousId, texte);
      if ("error" in result) {
        toast.error(result.error);
      }
    });
  }

  function handleSupprimer(note: NoteInterne) {
    startTransition(async () => {
      setOptimisticNotes({ type: "remove", id: note.id });
      const result = await deleteNoteAction(note.id);
      if ("error" in result) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        Coordination interne — jamais visible du prospect.
      </p>

      {optimisticNotes.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">Aucune note pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {optimisticNotes.map((note) => {
            const peutSupprimer = note.authorId === currentUser.id || currentUser.role === "ADMIN";
            return (
              <li key={note.id} className="bg-muted flex flex-col gap-1 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">
                    {note.author.name ?? note.author.email}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {formatRelativeDate(note.createdAt)}
                    </span>
                  </p>
                  {peutSupprimer ? (
                    <button
                      type="button"
                      onClick={() => handleSupprimer(note)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Trash2Icon className="size-3.5" />
                      <span className="sr-only">Supprimer</span>
                    </button>
                  ) : null}
                </div>
                <p className="text-sm whitespace-pre-line">{note.contenu}</p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Textarea
          rows={2}
          placeholder="Écrire une note pour l'équipe..."
          value={brouillon}
          onChange={(event) => setBrouillon(event.target.value)}
        />
        <Button size="sm" onClick={handleEnvoyer} disabled={isPending || !brouillon.trim()} className="self-start">
          {isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          Envoyer
        </Button>
      </div>
    </div>
  );
}
