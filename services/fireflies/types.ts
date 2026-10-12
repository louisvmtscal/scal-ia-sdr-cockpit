export type FirefliesAttendee = {
  name: string | null;
  email: string | null;
};

/** Réunion Fireflies normalisée — forme utilisée partout dans l'application. */
export type FirefliesMeeting = {
  id: string;
  title: string;
  date: Date | null;
  durationMinutes: number | null;
  transcriptUrl: string | null;
  meetingLink: string | null;
  organizerEmail: string | null;
  attendees: FirefliesAttendee[];
  // Identifiant d'événement calendrier côté Fireflies, quand disponible (rarement
  // renseigné en pratique — voir services/fireflies/webhook.ts pour son usage).
  calendarId: string | null;
};

export type FirefliesSentence = {
  speakerName: string;
  text: string;
  startTimeSeconds: number | null;
};

export type FirefliesFullTranscript = {
  meeting: FirefliesMeeting;
  sentences: FirefliesSentence[];
};
