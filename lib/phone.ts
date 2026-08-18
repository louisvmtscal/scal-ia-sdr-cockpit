/**
 * Normalise un numéro de téléphone français vers le format E.164 (+33...).
 *
 * Accepte les formats courants : "06 12 34 56 78", "06.12.34.56.78",
 * "06-12-34-56-78", "0612345678", "+33612345678", "0033612345678".
 *
 * Retourne `null` si le numéro n'est pas un numéro français valide — dans ce
 * cas, l'appelant ne doit jamais contacter Brevo avec cette valeur.
 */
export function normalizeFrenchPhone(input: string | null | undefined): string | null {
  if (!input) return null;

  const cleaned = input.trim().replace(/[\s.\-()]/g, "");

  let nationalDigits: string;
  if (cleaned.startsWith("+33")) {
    nationalDigits = cleaned.slice(3);
  } else if (cleaned.startsWith("0033")) {
    nationalDigits = cleaned.slice(4);
  } else if (cleaned.startsWith("0")) {
    nationalDigits = cleaned.slice(1);
  } else {
    return null;
  }

  // Un numéro français valide compte 9 chiffres après le préfixe (0 ou +33),
  // le premier ne pouvant pas être 0.
  if (!/^[1-9]\d{8}$/.test(nationalDigits)) {
    return null;
  }

  return `+33${nationalDigits}`;
}
