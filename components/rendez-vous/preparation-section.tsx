"use client";

import { SparklesIcon } from "lucide-react";
import { useState } from "react";

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
  preparation: initialPreparation,
}: {
  rendezVousId: string;
  preparation: unknown;
}) {
  const parsed = preparationSchema.safeParse(initialPreparation);
  const [preparation] = useState<Preparation | null>(parsed.success ? parsed.data : null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        Générée automatiquement la veille du rendez-vous et envoyée à la CEO.
      </p>

      <Button disabled size="sm" className="self-start" title="Bientôt disponible">
        <SparklesIcon />
        Générer la fiche maintenant — bientôt disponible
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
