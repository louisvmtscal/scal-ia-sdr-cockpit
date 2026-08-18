export type SendSmsInput = {
  phone: string;
  message: string;
};

export type SendSmsResult = { success: true; messageId: string } | { success: false; error: string };

/** Forme (partielle) de la réponse de POST /transactionalSMS/sms chez Brevo. */
export type BrevoSmsResponse = {
  reference?: string;
  messageId?: string | number;
};

export type BrevoErrorResponse = {
  code?: string;
  message?: string;
};
