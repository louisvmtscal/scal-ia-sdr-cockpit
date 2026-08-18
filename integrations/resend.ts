import { Resend } from "resend";

// Le SDK Resend lève une erreur si la clé est absente dès la construction du
// client. On retombe sur un placeholder pour ne pas casser le build/le
// démarrage : l'envoi réel est de toute façon court-circuité en amont
// (services/mail.tsx) tant que RESEND_API_KEY n'est pas configurée.
export const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

export const MAIL_FROM = process.env.MAIL_FROM ?? "Scal-IA Cockpit <cockpit@scal-ia.fr>";
export const MAIL_TO_CEO = "chloe@scal-ia.fr";
/** Notifications internes (ex. brouillons Email J-25) : toujours Louis, jamais le prospect. */
export const MAIL_TO_LOUIS = "louis@scal-ia.fr";
