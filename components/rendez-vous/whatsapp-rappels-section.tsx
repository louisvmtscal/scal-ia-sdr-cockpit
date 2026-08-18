"use client";

import { Loader2Icon, SendIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { envoyerWhatsappTestAction } from "@/actions/whatsapp-rappels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WhatsappStatus } from "@/lib/generated/prisma/enums";
import { formatDateTime } from "@/utils/format";

const STATUT_LABELS: Record<WhatsappStatus, string> = {
  PENDING: "En attente",
  QUEUED: "Programmé",
  SENT: "Envoyé",
  FAILED: "Échec",
};

const STATUT_VARIANTS: Record<WhatsappStatus, "secondary" | "outline" | "default" | "destructive"> = {
  PENDING: "secondary",
  QUEUED: "outline",
  SENT: "default",
  FAILED: "destructive",
};

function RappelRow({
  label,
  statut,
  sentAt,
  campaignId,
  erreur,
}: {
  label: string;
  statut: WhatsappStatus;
  sentAt: Date | null;
  campaignId: string | null;
  erreur: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div>
        <p className="font-medium">{label}</p>
        {statut === "SENT" && sentAt ? (
          <p className="text-muted-foreground text-xs">Envoyé le {formatDateTime(sentAt)}</p>
        ) : null}
        {(statut === "QUEUED" || statut === "SENT") && campaignId ? (
          <p className="text-muted-foreground text-xs">Campagne Lemlist : {campaignId}</p>
        ) : null}
        {statut === "FAILED" && erreur ? <p className="text-destructive text-xs">{erreur}</p> : null}
      </div>
      <Badge variant={STATUT_VARIANTS[statut]}>{STATUT_LABELS[statut]}</Badge>
    </div>
  );
}

export function WhatsappRappelsSection({
  rendezVousId,
  telephone,
  whatsappJ1Status,
  whatsappJ1SentAt,
  whatsappJ1CampaignId,
  whatsappH2Status,
  whatsappH2SentAt,
  whatsappH2CampaignId,
  whatsappLastError,
  isDev,
}: {
  rendezVousId: string;
  telephone: string | null;
  whatsappJ1Status: WhatsappStatus;
  whatsappJ1SentAt: Date | null;
  whatsappJ1CampaignId: string | null;
  whatsappH2Status: WhatsappStatus;
  whatsappH2SentAt: Date | null;
  whatsappH2CampaignId: string | null;
  whatsappLastError: string | null;
  isDev: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleTestWhatsapp() {
    startTransition(async () => {
      const result = await envoyerWhatsappTestAction(rendezVousId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Message WhatsApp test envoyé (id ${result.externalId}).`);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm font-medium">📱 Rappels WhatsApp</p>

      <div className="flex flex-col gap-2">
        <RappelRow
          label="J-1"
          statut={whatsappJ1Status}
          sentAt={whatsappJ1SentAt}
          campaignId={whatsappJ1CampaignId}
          erreur={whatsappJ1Status === "FAILED" ? whatsappLastError : null}
        />
        <RappelRow
          label="H-2"
          statut={whatsappH2Status}
          sentAt={whatsappH2SentAt}
          campaignId={whatsappH2CampaignId}
          erreur={whatsappH2Status === "FAILED" ? whatsappLastError : null}
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
          onClick={handleTestWhatsapp}
          disabled={isPending || !telephone}
          className="self-start"
        >
          {isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          Envoyer un WhatsApp test
        </Button>
      ) : null}
    </div>
  );
}
