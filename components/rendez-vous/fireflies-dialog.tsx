"use client";

import {
  ArrowLeftIcon,
  ClipboardIcon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  getTranscriptionFirefliesAction,
  rechercherReunionsFirefliesAction,
  selectionnerReunionFirefliesAction,
} from "@/actions/fireflies";
import { genererCompteRenduAction, modifierCompteRenduAction } from "@/actions/compte-rendu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPTE_RENDU_SECTIONS,
  compteRenduSchema,
  formatCompteRenduForClipboard,
  type CompteRendu,
} from "@/lib/validations/compte-rendu";
import type { FirefliesFullTranscript, FirefliesMeeting } from "@/services/fireflies";
import { formatDate } from "@/utils/format";

type Vue = "recherche" | "resultats" | "transcription";

const NIVEAU_INTERET_OPTIONS: CompteRendu["niveauInteret"][] = ["Faible", "Moyen", "Fort"];
const QUALIFICATION_OPTIONS: CompteRendu["qualification"][] = [
  "Qualifié",
  "Non qualifié",
  "À confirmer",
];

function formatDuree(minutes: number | null) {
  if (minutes == null) return null;
  return `${minutes} min`;
}

function formatParticipants(meeting: FirefliesMeeting) {
  const noms = meeting.attendees.map((a) => a.name || a.email).filter(Boolean);
  return noms.length > 0 ? noms.join(", ") : null;
}

/** Regroupe les phrases consécutives d'un même locuteur pour une lecture plus confortable. */
function regrouperParLocuteur(transcript: FirefliesFullTranscript) {
  const groupes: Array<{ speakerName: string; texte: string }> = [];

  for (const sentence of transcript.sentences) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.speakerName === sentence.speakerName) {
      dernier.texte += ` ${sentence.text}`;
    } else {
      groupes.push({ speakerName: sentence.speakerName, texte: sentence.text });
    }
  }

  return groupes;
}

function transcriptEnTexte(transcript: FirefliesFullTranscript) {
  return regrouperParLocuteur(transcript)
    .map((g) => `${g.speakerName}: ${g.texte}`)
    .join("\n");
}

/** Bloc compte rendu affiché après la transcription : générer, modifier, copier, régénérer. */
function CompteRenduBlock({
  rendezVousId,
  societe,
  dateRDV,
  transcript,
  compteRendu,
  onUpdate,
}: {
  rendezVousId: string;
  societe: string;
  dateRDV: Date;
  transcript: FirefliesFullTranscript;
  compteRendu: CompteRendu | null;
  onUpdate: (compteRendu: CompteRendu) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [champs, setChamps] = useState<CompteRendu | null>(null);

  function handleGenerer() {
    startTransition(async () => {
      const texteSource = transcriptEnTexte(transcript);
      const result = await genererCompteRenduAction(rendezVousId, texteSource);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      onUpdate(result.compteRendu);
      setIsEditing(false);
      toast.success("✅ Compte rendu enregistré");
    });
  }

  function handleStartEdit() {
    if (!compteRendu) return;
    setChamps(compteRendu);
    setIsEditing(true);
  }

  function handleSaveEdit() {
    if (!champs) return;
    const parsed = compteRenduSchema.safeParse(champs);
    if (!parsed.success) {
      toast.error("Formulaire invalide, merci de vérifier les champs.");
      return;
    }
    startTransition(async () => {
      const result = await modifierCompteRenduAction(rendezVousId, parsed.data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      onUpdate(result.compteRendu);
      setIsEditing(false);
      toast.success("✅ Compte rendu enregistré");
    });
  }

  function handleCopyHubspot() {
    if (!compteRendu) return;
    navigator.clipboard.writeText(formatCompteRenduForClipboard(compteRendu, { societe, dateRDV }));
    toast.success("✅ Compte rendu copié — prêt à être collé dans HubSpot");
  }

  function setChamp<K extends keyof CompteRendu>(key: K, value: CompteRendu[K]) {
    setChamps((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (transcript.sentences.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        Impossible de générer le compte rendu. Vérifie que la transcription Fireflies est
        disponible.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm font-medium">Compte rendu</p>

      {!compteRendu ? (
        <Button onClick={handleGenerer} disabled={isPending} size="sm" className="self-start">
          {isPending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          {isPending ? "Génération du compte rendu..." : "✨ Générer le compte rendu"}
        </Button>
      ) : isEditing && champs ? (
        <div className="flex flex-col gap-3">
          {COMPTE_RENDU_SECTIONS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {label}
              </label>
              {key === "niveauInteret" ? (
                <Select
                  value={champs.niveauInteret}
                  onValueChange={(value) =>
                    setChamp("niveauInteret", value as CompteRendu["niveauInteret"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue>{(value: string) => value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEAU_INTERET_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : key === "qualification" ? (
                <Select
                  value={champs.qualification}
                  onValueChange={(value) =>
                    setChamp("qualification", value as CompteRendu["qualification"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue>{(value: string) => value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {QUALIFICATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Textarea
                  value={champs[key]}
                  onChange={(event) => setChamp(key, event.target.value)}
                  rows={key === "resume" || key === "prochaineAction" ? 2 : 3}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              Enregistrer les modifications
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyHubspot}>
              <ClipboardIcon />
              📋 Copier dans HubSpot
            </Button>
            <Button size="sm" variant="outline" onClick={handleStartEdit}>
              <PencilIcon />
              Modifier
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button size="sm" variant="outline" disabled={isPending}>
                    {isPending ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
                    ↻ Régénérer
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Un compte rendu existe déjà</AlertDialogTitle>
                  <AlertDialogDescription>Voulez-vous le remplacer ?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleGenerer} disabled={isPending}>
                    Régénérer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="flex flex-col gap-3 rounded-md border p-3">
            {COMPTE_RENDU_SECTIONS.map(({ key, label }) => (
              <div key={key}>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {label}
                </p>
                <p className="text-sm whitespace-pre-line">{compteRendu[key]}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FirefliesDialog({
  rendezVousId,
  label,
  societe,
  dateRDV,
  firefliesMeetingId,
  firefliesMeetingTitle,
  firefliesMeetingDate,
  firefliesMeetingUrl,
  compteRendu: initialCompteRendu,
}: {
  rendezVousId: string;
  label: string;
  societe: string;
  dateRDV: Date;
  firefliesMeetingId: string | null;
  firefliesMeetingTitle: string | null;
  firefliesMeetingDate: Date | null;
  firefliesMeetingUrl: string | null;
  compteRendu: unknown;
}) {
  const parsedCompteRendu = compteRenduSchema.safeParse(initialCompteRendu);
  const [vue, setVue] = useState<Vue>("recherche");
  const [recherche, setRecherche] = useState(societe);
  const [resultats, setResultats] = useState<FirefliesMeeting[] | null>(null);
  const [transcript, setTranscript] = useState<FirefliesFullTranscript | null>(null);
  const [compteRendu, setCompteRendu] = useState<CompteRendu | null>(
    parsedCompteRendu.success ? parsedCompteRendu.data : null,
  );
  const [isPending, startTransition] = useTransition();

  function reinitialiser() {
    setVue("recherche");
    setRecherche(societe);
    setResultats(null);
    setTranscript(null);
  }

  function handleRechercher() {
    startTransition(async () => {
      const result = await rechercherReunionsFirefliesAction(recherche);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setResultats(result.meetings);
      setVue("resultats");
    });
  }

  function handleSelectionner(meetingId: string) {
    startTransition(async () => {
      const result = await selectionnerReunionFirefliesAction(rendezVousId, meetingId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setTranscript(result.transcript);
      setVue("transcription");
      toast.success("Réunion liée à ce rendez-vous.");
    });
  }

  function handleVoirTranscriptionLiee() {
    if (!firefliesMeetingId) return;
    startTransition(async () => {
      const result = await getTranscriptionFirefliesAction(firefliesMeetingId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setTranscript(result.transcript);
      setVue("transcription");
    });
  }

  function handleCopy() {
    if (!transcript) return;
    const texte = regrouperParLocuteur(transcript)
      .map((g) => `${g.speakerName} : ${g.texte}`)
      .join("\n\n");
    navigator.clipboard.writeText(texte);
    toast.success("Transcription copiée dans le presse-papiers.");
  }

  return (
    <Dialog onOpenChange={(open) => !open && reinitialiser()}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <SearchIcon />
            <span className="sr-only">Fireflies</span>
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fireflies — {label}</DialogTitle>
          <DialogDescription>
            Recherche une réunion Fireflies.ai correspondante et consulte sa transcription.
          </DialogDescription>
        </DialogHeader>

        {firefliesMeetingId && vue === "recherche" ? (
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Réunion déjà liée</p>
            <div>
              <p className="text-sm">{firefliesMeetingTitle ?? "Réunion Fireflies"}</p>
              {firefliesMeetingDate ? (
                <p className="text-muted-foreground text-xs">{formatDate(firefliesMeetingDate)}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleVoirTranscriptionLiee} disabled={isPending}>
                {isPending ? <Loader2Icon className="animate-spin" /> : null}
                Voir la transcription
              </Button>
              {firefliesMeetingUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  render={<a href={firefliesMeetingUrl} target="_blank" rel="noopener noreferrer" />}
                >
                  <ExternalLinkIcon />
                  Ouvrir dans Fireflies
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => setVue("resultats")}>
                Rechercher une autre réunion
              </Button>
            </div>
          </div>
        ) : null}

        {vue === "recherche" && !firefliesMeetingId ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Rechercher la réunion</p>
            <div className="flex gap-2">
              <Input
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Nom de l'entreprise..."
              />
              <Button onClick={handleRechercher} disabled={isPending}>
                {isPending ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
                Rechercher
              </Button>
            </div>
          </div>
        ) : null}

        {vue === "resultats" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 gap-2">
                <Input
                  value={recherche}
                  onChange={(event) => setRecherche(event.target.value)}
                  placeholder="Nom de l'entreprise..."
                />
                <Button onClick={handleRechercher} disabled={isPending} size="sm">
                  {isPending ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
                  Rechercher
                </Button>
              </div>
            </div>

            {resultats && resultats.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Aucune réunion Fireflies trouvée pour « {recherche} ».
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {resultats?.map((meeting) => (
                  <li key={meeting.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{meeting.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {meeting.date ? formatDate(meeting.date) : "Date inconnue"}
                          {formatDuree(meeting.durationMinutes)
                            ? ` · ${formatDuree(meeting.durationMinutes)}`
                            : ""}
                        </p>
                        {formatParticipants(meeting) ? (
                          <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                            <UsersIcon className="size-3" />
                            {formatParticipants(meeting)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {meeting.transcriptUrl ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={
                              <a
                                href={meeting.transcriptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            }
                          >
                            <ExternalLinkIcon />
                            <span className="sr-only">Ouvrir dans Fireflies</span>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => handleSelectionner(meeting.id)}
                      disabled={isPending}
                    >
                      {isPending ? <Loader2Icon className="animate-spin" /> : null}
                      Voir la transcription
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {vue === "transcription" && transcript ? (
          <div className="flex flex-col gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setVue(firefliesMeetingId ? "recherche" : "resultats")}
            >
              <ArrowLeftIcon />
              Retour
            </Button>

            <div>
              <p className="text-sm font-medium">{transcript.meeting.title}</p>
              <p className="text-muted-foreground text-xs">
                {transcript.meeting.date ? formatDate(transcript.meeting.date) : "Date inconnue"}
                {formatParticipants(transcript.meeting)
                  ? ` · ${formatParticipants(transcript.meeting)}`
                  : ""}
              </p>
            </div>

            <Button size="sm" variant="outline" onClick={handleCopy} className="self-start">
              <CopyIcon />
              Copier la transcription
            </Button>

            {transcript.sentences.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Cette réunion n&apos;a pas (encore) de transcription disponible.
              </p>
            ) : (
              <div className="bg-muted flex max-h-96 flex-col gap-3 overflow-y-auto rounded-md p-4">
                {regrouperParLocuteur(transcript).map((groupe, index) => (
                  <div key={index}>
                    <p className="text-xs font-semibold">{groupe.speakerName}</p>
                    <p className="text-sm whitespace-pre-line">{groupe.texte}</p>
                  </div>
                ))}
              </div>
            )}

            <CompteRenduBlock
              rendezVousId={rendezVousId}
              societe={societe}
              dateRDV={dateRDV}
              transcript={transcript}
              compteRendu={compteRendu}
              onUpdate={setCompteRendu}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
