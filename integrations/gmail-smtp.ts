import nodemailer from "nodemailer";

/**
 * Envoi via SMTP Gmail (mot de passe d'application), pas l'API Gmail OAuth —
 * contourne le besoin de vérifier un domaine d'expédition (Resend) : le
 * compte Gmail expéditeur est déjà son propre domaine vérifié.
 */
export const GMAIL_SMTP_USER = process.env.GMAIL_SMTP_USER ?? "";

export const gmailTransport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_SMTP_USER,
    pass: process.env.GMAIL_SMTP_APP_PASSWORD ?? "",
  },
});
