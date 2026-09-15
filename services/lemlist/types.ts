export type LemlistCampaign = {
  id: string;
  name: string;
  status: string;
};

export type NewLemlistLead = {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
  linkedinUrl?: string;
  /** Variables personnalisées additionnelles ({{cle}} dans les templates Lemlist). */
  [customVariable: string]: string | undefined;
};

export type CreatedLemlistLead = {
  leadId: string;
  contactId: string | null;
  campaignId: string;
  email: string;
};

export type SendWhatsappInput = {
  contactId?: string;
  leadId?: string;
  message: string;
};

export type SendWhatsappResult =
  | { success: true; externalId: string }
  | { success: false; error: string };

export type SendSmsInput = {
  contactId?: string;
  leadId?: string;
  message: string;
};

export type SendSmsResult =
  | { success: true; externalId: string }
  | { success: false; error: string };
