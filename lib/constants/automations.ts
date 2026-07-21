export type AutomationChannel = "Email" | "SMS";
export type AutomationStatus = "Modèle prêt" | "Non connecté";

export interface AutomationStep {
  id: string;
  trigger: string;
  title: string;
  description: string;
  channel: AutomationChannel;
  status: AutomationStatus;
  message: string;
}

// Modèles de messages pour le cycle de vie d'un rendez-vous.
// Aucun service externe n'est connecté : ces messages ne sont pas envoyés
// automatiquement. Architecture prête pour un futur branchement SMS / Email
// (voir services/automations.ts).
export const AUTOMATION_STEPS: AutomationStep[] = [
  {
    id: "j-25",
    trigger: "J-25",
    title: "Confirmation initiale",
    description: "Envoyé dès la prise du rendez-vous.",
    channel: "Email",
    status: "Modèle prêt",
    message:
      "Bonjour {prenom},\n\nMerci pour votre temps ! Je confirme notre rendez-vous du {dateRDV} avec {commercial}.\n\nN'hésitez pas à revenir vers moi si un point mérite d'être creusé en amont.\n\nÀ très vite,\n{commercial}",
  },
  {
    id: "j-1",
    trigger: "J-1",
    title: "Rappel la veille",
    description: "Rappel envoyé 24h avant le rendez-vous.",
    channel: "Email",
    status: "Modèle prêt",
    message:
      "Bonjour {prenom},\n\nPetit rappel : nous avons rendez-vous demain, {dateRDV}, avec {commercial}.\n\nÀ demain !",
  },
  {
    id: "2h-avant",
    trigger: "2 heures avant",
    title: "Rappel final",
    description: "Dernier rappel avant le rendez-vous.",
    channel: "SMS",
    status: "Non connecté",
    message:
      "Bonjour {prenom}, rappel : rendez-vous avec {commercial} dans 2h ({dateRDV}). À très vite !",
  },
  {
    id: "apres-rdv",
    trigger: "Après rendez-vous",
    title: "Suivi post rendez-vous",
    description: "Envoyé après la tenue du rendez-vous.",
    channel: "Email",
    status: "Modèle prêt",
    message:
      "Bonjour {prenom},\n\nMerci pour cet échange ! Comme convenu, je reviens vers vous avec les prochaines étapes.\n\nN'hésitez pas si vous avez des questions d'ici là.\n\nBien à vous,\n{commercial}",
  },
];
