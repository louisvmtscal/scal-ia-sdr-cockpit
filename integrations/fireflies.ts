import { createHmac, timingSafeEqual } from "node:crypto";

const FIREFLIES_GRAPHQL_URL = "https://api.fireflies.ai/graphql";

const TRANSCRIPT_QUERY = `
  query Transcript($transcriptId: String!) {
    transcript(id: $transcriptId) {
      title
      dateString
      sentences {
        speaker_name
        text
      }
      meeting_attendees {
        displayName
        name
        email
      }
      organizer_email
    }
  }
`;

export interface FirefliesTranscript {
  title: string;
  dateString: string;
  sentences: Array<{ speaker_name: string; text: string }>;
  meetingAttendees: Array<{
    displayName: string | null;
    name: string | null;
    email: string | null;
  }>;
  organizerEmail: string | null;
}

/** Récupère une transcription Fireflies.ai via l'API GraphQL. */
export async function getFirefliesTranscript(transcriptId: string): Promise<FirefliesTranscript> {
  const apiKey = process.env.FIREFLIES_API_KEY;

  if (!apiKey) {
    throw new Error("FIREFLIES_API_KEY manquante.");
  }

  const response = await fetch(FIREFLIES_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: TRANSCRIPT_QUERY,
      variables: { transcriptId },
    }),
  });

  if (!response.ok) {
    throw new Error(`L'API Fireflies a répondu ${response.status}.`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new Error(`Erreur API Fireflies : ${json.errors[0]?.message ?? "erreur inconnue"}`);
  }

  const transcript = json.data?.transcript;

  if (!transcript) {
    throw new Error(`Transcription Fireflies introuvable pour l'identifiant ${transcriptId}.`);
  }

  return {
    title: transcript.title,
    dateString: transcript.dateString,
    sentences: transcript.sentences ?? [],
    meetingAttendees: transcript.meeting_attendees ?? [],
    organizerEmail: transcript.organizer_email ?? null,
  };
}

/** Reconstitue un texte de transcription lisible (locuteur: propos) à partir des phrases Fireflies. */
export function transcriptToText(transcript: FirefliesTranscript): string {
  return transcript.sentences
    .map((sentence) => `${sentence.speaker_name}: ${sentence.text}`)
    .join("\n");
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Vérifie la signature HMAC-SHA256 (header `x-hub-signature`) d'un webhook Fireflies. */
export function verifyFirefliesSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(expected, signature);
}
