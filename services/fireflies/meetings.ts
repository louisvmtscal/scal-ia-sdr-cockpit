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

type RawAttendee = { displayName: string | null; name: string | null; email: string | null };

type RawMeeting = {
  id: string;
  title: string;
  dateString: string | null;
  duration: number | null;
  transcript_url: string | null;
  meeting_link: string | null;
  organizer_email: string | null;
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

/** Reconstitue un texte lisible (locuteur: propos) à partir d'une transcription complète. */
export function transcriptToText(transcript: FirefliesFullTranscript): string {
  return transcript.sentences.map((s) => `${s.speakerName}: ${s.text}`).join("\n");
}
