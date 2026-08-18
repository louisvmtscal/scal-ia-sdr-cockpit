import type { EmailJ25Variables } from "./types";

/**
 * Moteur de templates minimal à variables `{{cle}}`.
 *
 * V1 : remplacement de texte simple. Remplaçable plus tard par une
 * génération IA (ex. Claude) sans changer la signature de `genererEmailJ25` :
 * il suffira d'échanger l'appel à `renderTemplate` par un appel au modèle.
 */
export function renderTemplate(template: string, variables: Record<string, string | undefined>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? "");
}

export const DEFAULT_EMAIL_J25_TEMPLATE = `Bonjour {{prenom}},

Notre rendez-vous du {{dateRDV}} approche. Je voulais prendre un instant avant notre échange.

Je me réjouis d'échanger avec vous{{posteClause}}.

{{valeurAjoutee}}

N'hésitez pas si une question vous vient d'ici là.

À très vite,
{{commercial}}`;

/**
 * Sans actualité disponible (V1), on apporte de la valeur avec l'un de ces
 * quatre registres : bonne pratique, tendance du secteur, conseil concret,
 * cas client générique. Jamais de vente, de démonstration ou de demande de
 * confirmation — seul objectif : maintenir l'intérêt jusqu'au rendez-vous.
 */
export const VALEUR_AJOUTEE_GENERIQUE = [
  "Une bonne pratique que l'on recommande souvent : garder une trace simple de chaque échange commercial, même informelle. Cela évite de perdre le fil entre deux rendez-vous et donne un vrai fil conducteur à la conversation.",
  "On observe une tendance forte en ce moment : les équipes commerciales qui combinent IA et suivi humain gagnent un temps précieux sur le tri des opportunités, sans perdre en qualité de relation.",
  "Un conseil simple avant notre échange : notez dès maintenant vos 2-3 priorités du moment. Cela nous permettra d'aller droit à l'essentiel et de rendre ce temps vraiment utile pour vous.",
  "Nous accompagnons régulièrement des équipes commerciales qui cherchaient surtout à gagner du temps sur la prospection, sans perdre la dimension humaine de leurs échanges — un équilibre qui fait souvent la différence.",
] as const;

/**
 * Choix déterministe (stable pour un même rendez-vous) tant qu'aucune vraie
 * actualité (V2) n'est disponible.
 */
export function choisirValeurAjoutee(seed: string) {
  const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  return VALEUR_AJOUTEE_GENERIQUE[hash % VALEUR_AJOUTEE_GENERIQUE.length];
}

export function buildPosteClause({ poste, societe }: { poste?: string | null; societe: string }) {
  return poste ? `, ${poste} chez ${societe}` : ` chez ${societe}`;
}

export function renderEmailJ25(variables: EmailJ25Variables) {
  return renderTemplate(DEFAULT_EMAIL_J25_TEMPLATE, variables).trim();
}
