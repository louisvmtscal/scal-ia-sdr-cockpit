import "server-only";

const BREVO_API_BASE_URL = "https://api.brevo.com/v3";

/**
 * Client HTTP minimal pour l'API Brevo. Serveur uniquement — `BREVO_API_KEY`
 * ne doit jamais atteindre le navigateur (voir `services/brevo/sms.ts`, seul
 * point d'entrée qui lit cette variable).
 *
 * Ne journalise jamais la clé API, y compris en cas d'erreur.
 */
export async function brevoFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return { ok: false, error: "BREVO_API_KEY manquante." };
  }

  try {
    const response = await fetch(`${BREVO_API_BASE_URL}${path}`, {
      method: init.method,
      headers: {
        "api-key": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message)
          : `Brevo a répondu ${response.status}.`;
      return { ok: false, error: message };
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    // On ne journalise jamais `init` (qui pourrait contenir des données
    // sensibles côté message) ni la clé API — uniquement un message générique.
    console.error("Erreur réseau lors de l'appel à Brevo.");
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau lors de l'appel à Brevo.",
    };
  }
}
