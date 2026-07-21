"use client";

import { CalendarClockIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { genererPreparationAction } from "@/actions/preparation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PREPARATION_SECTIONS,
  preparationSchema,
  type Preparation,
} from "@/lib/validations/preparation";

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="text-sm whitespace-pre-line">{value}</p>
    </div>
  );
}

export function PreparationDialog({
  rendezVousId,
  label,
  preparation: initialPreparation,
}: {
  rendezVousId: string;
  label: string;
  preparation: unknown;
}) {
  const parsed = preparationSchema.safeParse(initialPreparation);
  const [preparation, setPreparation] = useState<Preparation | null>(
    parsed.success ? parsed.data : null,
  );
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await genererPreparationAction(rendezVousId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setPreparation(result.preparation);
      toast.success("Fiche de préparation générée et envoyée à la CEO.");
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <CalendarClockIcon />
            <span className="sr-only">Préparation</span>
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Préparation RDV — {label}</DialogTitle>
          <DialogDescription>
            Générée automatiquement la veille du rendez-vous et envoyée à la CEO. Génère-la
            manuellement ici pour tester ou l&apos;anticiper.
          </DialogDescription>
        </DialogHeader>

        <Button onClick={handleGenerate} disabled={isPending} className="self-start">
          {isPending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          {preparation ? "Régénérer la fiche" : "Générer la fiche maintenant"}
        </Button>

        {preparation ? (
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            {PREPARATION_SECTIONS.map(({ key, label: sectionLabel }) => (
              <Section key={key} label={sectionLabel} value={preparation[key]} />
            ))}
            <Section
              label="Questions pertinentes"
              value={preparation.questionsPertinentes
                .map((question, index) => `${index + 1}. ${question}`)
                .join("\n")}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
