"use client";

import { CalendarClockIcon, MailIcon, SearchIcon } from "lucide-react";

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { SmsStatus, WhatsappStatus } from "@/lib/generated/prisma/enums";

import { EmailJ25Section } from "./email-j25-section";
import { FirefliesSection } from "./fireflies-section";
import { PreparationSection } from "./preparation-section";

/**
 * Panneau détail unifié d'un RDV : préparation, Fireflies + compte rendu, et
 * automatisations (Email J-25 + rappels) regroupés en timeline plutôt
 * qu'éclatés en boutons séparés.
 */
export function RendezVousDetailSheet({
  rendezVousId,
  label,
  societe,
  dateRDV,
  preparation,
  firefliesMeetingId,
  firefliesMeetingTitle,
  firefliesMeetingDate,
  firefliesMeetingUrl,
  compteRendu,
  emailJ25,
  telephone,
  whatsappJ1Status,
  whatsappJ1SentAt,
  whatsappJ1CampaignId,
  whatsappH2Status,
  whatsappH2SentAt,
  whatsappH2CampaignId,
  whatsappLastError,
  smsJourJStatus,
  smsJourJSentAt,
  smsLastError,
  isDev,
}: {
  rendezVousId: string;
  label: string;
  societe: string;
  dateRDV: Date;
  preparation: unknown;
  firefliesMeetingId: string | null;
  firefliesMeetingTitle: string | null;
  firefliesMeetingDate: Date | null;
  firefliesMeetingUrl: string | null;
  compteRendu: unknown;
  emailJ25: unknown;
  telephone: string | null;
  whatsappJ1Status: WhatsappStatus;
  whatsappJ1SentAt: Date | null;
  whatsappJ1CampaignId: string | null;
  whatsappH2Status: WhatsappStatus;
  whatsappH2SentAt: Date | null;
  whatsappH2CampaignId: string | null;
  whatsappLastError: string | null;
  smsJourJStatus: SmsStatus;
  smsJourJSentAt: Date | null;
  smsLastError: string | null;
  isDev: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <SearchIcon />
            <span className="sr-only">Détails</span>
          </Button>
        }
      />
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>

        <Accordion defaultValue={["preparation"]} className="px-4 pb-4">
          <AccordionItem value="preparation">
            <AccordionHeader>
              <AccordionTrigger>
                <CalendarClockIcon className="size-4" />
                Préparation
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionPanel>
              <PreparationSection rendezVousId={rendezVousId} preparation={preparation} />
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem value="fireflies">
            <AccordionHeader>
              <AccordionTrigger>
                <SearchIcon className="size-4" />
                Fireflies &amp; compte rendu
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionPanel>
              <FirefliesSection
                rendezVousId={rendezVousId}
                societe={societe}
                dateRDV={dateRDV}
                firefliesMeetingId={firefliesMeetingId}
                firefliesMeetingTitle={firefliesMeetingTitle}
                firefliesMeetingDate={firefliesMeetingDate}
                firefliesMeetingUrl={firefliesMeetingUrl}
                compteRendu={compteRendu}
              />
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem value="email-j25">
            <AccordionHeader>
              <AccordionTrigger>
                <MailIcon className="size-4" />
                Automatisations &amp; rappels
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionPanel>
              <EmailJ25Section
                rendezVousId={rendezVousId}
                dateRDV={dateRDV}
                emailJ25={emailJ25}
                telephone={telephone}
                whatsappJ1Status={whatsappJ1Status}
                whatsappJ1SentAt={whatsappJ1SentAt}
                whatsappJ1CampaignId={whatsappJ1CampaignId}
                whatsappH2Status={whatsappH2Status}
                whatsappH2SentAt={whatsappH2SentAt}
                whatsappH2CampaignId={whatsappH2CampaignId}
                whatsappLastError={whatsappLastError}
                smsJourJStatus={smsJourJStatus}
                smsJourJSentAt={smsJourJSentAt}
                smsLastError={smsLastError}
                isDev={isDev}
              />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </SheetContent>
    </Sheet>
  );
}
