"use client";

import { CopyIcon, FileTextIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { genererCompteRenduAction } from "@/actions/compte-rendu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPTE_RENDU_SECTIONS,
  compteRenduSchema,
  formatCompteRenduForClipboard,
  type CompteRendu,
} from "@/lib/validations/compte-rendu";

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="text-sm whitespace-pre-line">{value}</p>
    </div>
  );
}

export function CompteRenduDialog({
  rendezVousId,
  label,
  compteRendu: initialCompteRendu,
}: {
  rendezVousId: string;
  label: string;
  compteRendu: unknown;
}) {
  const parsed = compteRenduSchema.safeParse(initialCompteRendu);
  const [compteRendu, setCompteRendu] = useState<CompteRendu | null>(
    parsed.success ? parsed.data : null,
  );
  const [texte, setTexte] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await genererCompteRenduAction(rendezVousId, texte);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setCompteRendu(result.compteRendu);
      toast.success("Synthèse générée, enregistrée et envoyée à la CEO.");
    });
  }

  function handleCopy() {
    if (!compteRendu) return;
    navigator.clipboard.writeText(formatCompteRenduForClipboard(compteRendu));
    toast.success("Synthèse copiée dans le presse-papiers.");
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <FileTextIcon />
            <span className="sr-only">Synthèse</span>
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Compte rendu — {label}</DialogTitle>
          <DialogDescription>
            Généré automatiquement à partir de la transcription Fireflies.ai après le rendez-vous.
            Le collage manuel ci-dessous reste disponible en solution de secours.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Textarea
            placeholder="Coller ici une transcription ou des notes (solution de secours)..."
            rows={6}
            value={texte}
            onChange={(event) => setTexte(event.target.value)}
          />
          <Button onClick={handleGenerate} disabled={isPending} className="self-start">
            {isPending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
            {compteRendu ? "Régénérer la synthèse" : "Générer la synthèse"}
          </Button>

          {compteRendu ? (
            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Intérêt : {compteRendu.niveauInteret}</Badge>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <CopyIcon />
                  Copier dans HubSpot
                </Button>
              </div>
              {COMPTE_RENDU_SECTIONS.map(({ key, label: sectionLabel }) => (
                <Section key={key} label={sectionLabel} value={String(compteRendu[key])} />
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
