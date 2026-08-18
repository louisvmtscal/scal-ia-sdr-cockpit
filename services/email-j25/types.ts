/**
 * Variables disponibles pour le template de l'email J-25.
 *
 * V1 : uniquement les champs déjà connus dans la fiche du rendez-vous.
 * V2 (préparés dès maintenant, non branchés) : lien LinkedIn, actualités
 * entreprise/secteur, contenu généré par IA ou recherche web. Ajouter ces
 * valeurs ici et les référencer dans le template ne demande aucun changement
 * d'interface ni de logique d'appel — `genererEmailJ25` reste le seul point
 * d'entrée.
 */
export type EmailJ25Variables = {
  prenom: string;
  nom: string;
  societe: string;
  dateRDV: string;
  commercial: string;
  posteClause: string;
  valeurAjoutee: string;

  // --- Réservé V2 : non utilisés par le template par défaut pour l'instant ---
  linkedin?: string;
  actualitesEntreprise?: string;
  actualitesSecteur?: string;
};
