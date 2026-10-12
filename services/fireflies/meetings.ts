import "server-only";

import { FirefliesApiError, firefliesRequest } from "./client";
import type { FirefliesFullTranscript, FirefliesMeeting, FirefliesSentence } from "./types";

const MEETING_FIELDS = `
  id
  title
  dateString
  duration
  transcript_url
  meeting_link
  organizer_email
  calendar_id
  meeting_attendees {
    displayName
    name
    email
  }
`;

const SEARCH_QUERY = `
  query SearchTranscripts($keyword: String!, $limit: Int) {
    transcripts(keyword: $keyword, scope: "title", limit: $limit) {
      ${MEETING_FIELDS}
    }
  }
`;

const MEETING_QUERY = `
  query GetMeeting($id: String!) {
    transcript(id: $id) {
      ${MEETING_FIELDS}
    }
  }
`;

const TRANSCRIPT_QUERY = `
  query GetTranscript($id: String!) {
    transcript(id: $id) {
      ${MEETING_FIELDS}
      sentences {
        speaker_name
        text
        start_time
      }
    }
  }
`;

// Fenêtre glissante par date (synchro quotidienne) — pas de mot-clé, pagination par `skip`.
// Confirmé disponible sur l'API Fireflies (testé manuellement le 2026-10-12).
const LIST_BY_DATE_QUERY = `
  query ListTranscripts($fromDate: DateTime, $toDate: DateTime, $limit: Int, $skip: Int) {
    transcripts(fromDate: $fromDate, toDate: $toDate, limit: $limit, skip: $skip) {
      ${MEETING_FIELDS}
    }
  }
`;

type RawAttendee = { displayName: string | null; name: string | null; email: string | null };

type RawMeeting = {
  id: string;
  title: string;
  dateString: string | null;
  duration: number | null;
  transcript_url: string | null;
  meeting_link: string | null;
  organizer_email: string | null;
  calendar_id: string | null;
  meeting_attendees: RawAttendee[] | null;
};

type RawSentence = { speaker_name: string; text: string; start_time: number | null };

function normalizeMeeting(raw: RawMeeting): FirefliesMeeting {
  return {
    id: raw.id,
    title: raw.title,
    date: raw.dateString ? new Date(raw.dateString) : null,
    durationMinutes: raw.duration != null ? Math.round(raw.duration) : null,
    transcriptUrl: raw.transcript_url ?? null,
    meetingLink: raw.meeting_link ?? null,
    organizerEmail: raw.organizer_email ?? null,
    calendarId: raw.calendar_id ?? null,
    attendees: (raw.meeting_attendees ?? []).map((attendee) => ({
      name: attendee.displayName ?? attendee.name ?? null,
      email: attendee.email ?? null,
    })),
  };
}

function normalizeSentence(raw: RawSentence): FirefliesSentence {
  return {
    speakerName: raw.speaker_name || "Inconnu",
    text: raw.text,
    startTimeSeconds: raw.start_time ?? null,
  };
}

/**
 * Recherche des réunions Fireflies par mot-clé (recherché dans le titre
 * uniquement — `scope: "title"` — le plus fiable pour retrouver une
 * réunion à partir du nom d'une entreprise, sans faux positifs venant de
 * mots prononcés pendant d'autres réunions).
 */
export async function searchMeetings(query: string, limit = 20): Promise<FirefliesMeeting[]> {
  const data = await firefliesRequest<{ transcripts: RawMeeting[] }>(SEARCH_QUERY, {
    keyword: query,
    limit,
  });
  return (data.transcripts ?? []).map(normalizeMeeting);
}

/** Récupère les métadonnées d'une réunion Fireflies (sans le contenu de la transcription). */
export async function getMeeting(meetingId: string): Promise<FirefliesMeeting> {
  const data = await firefliesRequest<{ transcript: RawMeeting | null }>(MEETING_QUERY, {
    id: meetingId,
  });
  if (!data.transcript) {
    throw new FirefliesApiError("NOT_FOUND", "Réunion Fireflies introuvable.");
  }
  return normalizeMeeting(data.transcript);
}

/** Récupère la transcription complète (métadonnées + phrases horodatées) d'une réunion. */
export async function getTranscript(meetingId: string): Promise<FirefliesFullTranscript> {
  const data = await firefliesRequest<{
    transcript: (RawMeeting & { sentences: RawSentence[] | null }) | null;
  }>(TRANSCRIPT_QUERY, { id: meetingId });

  if (!data.transcript) {
    throw new FirefliesApiError("NOT_FOUND", "Réunion Fireflies introuvable.");
  }

  const sentences = data.transcript.sentences ?? [];

  return {
    meeting: normalizeMeeting(data.transcript),
    sentences: sentences.map(normalizeSentence),
  };
}

const LIST_PAGE_SIZE = 50;

/**
 * Liste toutes les réunions Fireflies dont la date tombe dans [fromDate, toDate],
 * tous mots-clés confondus — utilisée par la synchro quotidienne (fenêtre
 * glissante) pour rattraper les transcriptions publiées en retard ou un
 * éventuel webhook manqué. Pagine automatiquement (l'API retourne au plus
 * `LIST_PAGE_SIZE` réunions par appel).
 */
export async function listTranscripts(fromDate: Date, toDate: Date): Promise<FirefliesMeeting[]> {
  const meetings: FirefliesMeeting[] = [];
  let skip = 0;

  for (;;) {
    const data = await firefliesRequest<{ transcripts: RawMeeting[] }>(LIST_BY_DATE_QUERY, {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      limit: LIST_PAGE_SIZE,
      skip,
    });

    const page = data.transcripts ?? [];
    meetings.push(...page.map(normalizeMeeting));

    if (page.length < LIST_PAGE_SIZE) break;
    skip += LIST_PAGE_SIZE;
  }

  return meetings;
}

/** Reconstitue un texte lisible (locuteur: propos) à partir d'une transcription complète. */
export function transcriptToText(transcript: FirefliesFullTranscript): string {
  return transcript.sentences.map((s) => `${s.speakerName}: ${s.text}`).join("\n");
}
