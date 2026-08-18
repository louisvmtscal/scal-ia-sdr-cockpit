"use client";

import { CopyIcon, Loader2Icon, MailIcon, PencilIcon, SparklesIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { genererEmailJ25Action, modifierEmailJ25Action } from "@/actions/email-j25";
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
import type { WhatsappStatus } from "@/lib/generated/prisma/enums";
import { emailJ25Schema, type EmailJ25 } from "@/lib/validations/email-j25";
import { formatDate } from "@/utils/format";

import { WhatsappRappelsSection } from "./whatsapp-rappels-section";

export function EmailJ25Dialog({
  rendezVousId,
  label,
  dateRDV,
  emailJ25: initialEmailJ25,
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
  label: string;
  dateRDV: Date;
  emailJ25: unknown;
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
  const parsed = emailJ25Schema.safeParse(initialEmailJ25);
  const [emailJ25, setEmailJ25] = useState<EmailJ25 | null>(parsed.success ? parsed.data : null);
  const [isEditing, setIsEditing] = useState(false);
  const [brouillon, setBrouillon] = useState("");
  const [isPending, startTransition] = useTransition();

  const dateEnvoi = new Date(dateRDV);
  dateEnvoi.setDate(dateEnvoi.getDate() - 25);

  function handleGenerate() {
    startTransition(async () => {
      const result = await genererEmailJ25Action(rendezVousId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setEmailJ25(result.emailJ25);
      setIsEditing(false);
      toast.success("Brouillon généré et envoyé à Louis pour relecture.");
    });
  }

  function handleStartEdit() {
    if (!emailJ25) return;
    setBrouillon(emailJ25.contenu);
    setIsEditing(true);
  }

  function handleSaveEdit() {
    startTransition(async () => {
      const result = await modifierEmailJ25Action(rendezVousId, brouillon);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setEmailJ25(result.emailJ25);
      setIsEditing(false);
      toast.success("Brouillon mis à jour.");
    });
  }

  function handleCopy() {
    if (!emailJ25) return;
    navigator.clipboard.writeText(emailJ25.contenu);
    toast.success("Brouillon copié dans le presse-papiers.");
  }

  return (
    <Dialog onOpenChange={(open) => !open && setIsEditing(false)}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <MailIcon />
            <span className="sr-only">Automatisations</span>
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Automatisations — {label}</DialogTitle>
          <DialogDescription>
            Brouillons générés automatiquement. Rien n&apos;est jamais envoyé au prospect : c&apos;est
            toujours toi qui décides.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">📧 Email J-25</p>
            <p className="text-muted-foreground text-xs">
              {emailJ25 ? "🟢 Généré" : "⚪ Non généré"}
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            Date prévue d&apos;envoi : {formatDate(dateEnvoi)}
          </p>

          <Button
            onClick={handleGenerate}
            disabled={isPending}
            variant={emailJ25 ? "outline" : "default"}
            size="sm"
            className="self-start"
          >
            {isPending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
            {emailJ25 ? "Régénérer" : "Générer"}
          </Button>

          {emailJ25 ? (
            isEditing ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  rows={8}
                  value={brouillon}
                  onChange={(event) => setBrouillon(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>
                    {isPending ? <Loader2Icon className="animate-spin" /> : null}
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="bg-muted rounded-md p-3 text-sm whitespace-pre-line">
                  {emailJ25.contenu}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    <CopyIcon />
                    Copier
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleStartEdit}>
                    <PencilIcon />
                    Modifier
                  </Button>
                </div>
              </div>
            )
          ) : null}
        </div>

        <WhatsappRappelsSection
          rendezVousId={rendezVousId}
          telephone={telephone}
          whatsappJ1Status={whatsappJ1Status}
          whatsappJ1SentAt={whatsappJ1SentAt}
          whatsappJ1CampaignId={whatsappJ1CampaignId}
          whatsappH2Status={whatsappH2Status}
          whatsappH2SentAt={whatsappH2SentAt}
          whatsappH2CampaignId={whatsappH2CampaignId}
          whatsappLastError={whatsappLastError}
          isDev={isDev}
        />
      </DialogContent>
    </Dialog>
  );
}
