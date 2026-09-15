"use client";

import { Loader2Icon, SendIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { envoyerRappelJourJTestAction } from "@/actions/rappel-jour-j";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SmsStatus } from "@/lib/generated/prisma/enums";
import { formatDateTime } from "@/utils/format";

const STATUT_LABELS: Record<SmsStatus, string> = {
  PENDING: "En attente",
  SENT: "Envoyé",
  FAILED: "Échec",
};

const STATUT_VARIANTS: Record<SmsStatus, "secondary" | "default" | "destructive"> = {
  PENDING: "secondary",
  SENT: "default",
  FAILED: "destructive",
};

export function RappelJourJSection({
  rendezVousId,
  telephone,
  smsJourJStatus,
  smsJourJSentAt,
  smsLastError,
  isDev,
}: {
  rendezVousId: string;
  telephone: string | null;
  smsJourJStatus: SmsStatus;
  smsJourJSentAt: Date | null;
  smsLastError: string | null;
  isDev: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleTest() {
    startTransition(async () => {
      const result = await envoyerRappelJourJTestAction(rendezVousId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`SMS test envoyé (id ${result.messageId}).`);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm font-medium">📆 Rappel jour J (9h10)</p>

      <div className="flex items-center justify-between gap-2 text-sm">
        <div>
          {smsJourJStatus === "SENT" && smsJourJSentAt ? (
            <p className="text-muted-foreground text-xs">
              Envoyé le {formatDateTime(smsJourJSentAt)}
            </p>
          ) : null}
          {smsJourJStatus === "FAILED" && smsLastError ? (
            <p className="text-destructive text-xs">{smsLastError}</p>
          ) : null}
        </div>
        <Badge variant={STATUT_VARIANTS[smsJourJStatus]}>{STATUT_LABELS[smsJourJStatus]}</Badge>
      </div>

      {!telephone ? (
        <p className="text-muted-foreground text-xs">
          Aucun numéro de téléphone renseigné pour ce rendez-vous.
        </p>
      ) : null}

      {isDev ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={isPending || !telephone}
          className="self-start"
        >
          {isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          Envoyer un SMS test
        </Button>
      ) : null}
    </div>
  );
}
