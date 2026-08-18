"use client";

import { Loader2Icon, SendIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { envoyerSmsTestAction } from "@/actions/sms-rappels";
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

function RappelRow({
  label,
  statut,
  sentAt,
  erreur,
}: {
  label: string;
  statut: SmsStatus;
  sentAt: Date | null;
  erreur: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div>
        <p className="font-medium">{label}</p>
        {statut === "SENT" && sentAt ? (
          <p className="text-muted-foreground text-xs">Envoyé le {formatDateTime(sentAt)}</p>
        ) : null}
        {statut === "FAILED" && erreur ? (
          <p className="text-destructive text-xs">{erreur}</p>
        ) : null}
      </div>
      <Badge variant={STATUT_VARIANTS[statut]}>{STATUT_LABELS[statut]}</Badge>
    </div>
  );
}

export function SmsRappelsSection({
  rendezVousId,
  telephone,
  smsJ1Status,
  smsJ1SentAt,
  smsH2Status,
  smsH2SentAt,
  smsLastError,
  isDev,
}: {
  rendezVousId: string;
  telephone: string | null;
  smsJ1Status: SmsStatus;
  smsJ1SentAt: Date | null;
  smsH2Status: SmsStatus;
  smsH2SentAt: Date | null;
  smsLastError: string | null;
  isDev: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleTestSms() {
    startTransition(async () => {
      const result = await envoyerSmsTestAction(rendezVousId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`SMS test envoyé (id ${result.messageId}).`);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm font-medium">📱 Rappels SMS</p>

      <div className="flex flex-col gap-2">
        <RappelRow
          label="J-1"
          statut={smsJ1Status}
          sentAt={smsJ1SentAt}
          erreur={smsJ1Status === "FAILED" ? smsLastError : null}
        />
        <RappelRow
          label="H-2"
          statut={smsH2Status}
          sentAt={smsH2SentAt}
          erreur={smsH2Status === "FAILED" ? smsLastError : null}
        />
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
          onClick={handleTestSms}
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
