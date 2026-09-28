"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { genererPreparationAction } from "@/actions/preparation";
import { Button } from "@/components/ui/button";
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

/** Contenu du panneau Préparation — utilisé dans le panneau détail unifié du RDV. */
export function PreparationSection({
  rendezVousId,
  preparation: initialPreparation,
}: {
  rendezVousId: string;
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
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        Générée automatiquement la veille du rendez-vous et envoyée à la CEO. Génère-la manuellement
        ici pour tester ou l&apos;anticiper.
      </p>

      <Button onClick={handleGenerate} disabled={isPending} size="sm" className="self-start">
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
    </div>
  );
}
