import "server-only";

const DEFAULT_API_URL = "https://api.fireflies.ai/graphql";
const REQUEST_TIMEOUT_MS = 15_000;

export type FirefliesErrorCode =
  | "MISSING_API_KEY"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "GRAPHQL_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED";

export class FirefliesApiError extends Error {
  code: FirefliesErrorCode;

  constructor(code: FirefliesErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "FirefliesApiError";
  }
}

/**
 * Exécute une requête GraphQL contre l'API Fireflies.
 *
 * Seul point du projet qui lit `FIREFLIES_API_KEY` et l'envoie sur le
 * réseau — jamais journalisée, jamais renvoyée au client. Toute erreur
 * (réseau, auth, GraphQL) est reclassée en `FirefliesApiError` typée pour
 * que la couche supérieure (services/fireflies/meetings.ts) puisse produire
 * des messages clairs en français.
 */
export async function firefliesRequest<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.FIREFLIES_API_KEY;

  if (!apiKey) {
    throw new FirefliesApiError("MISSING_API_KEY", "FIREFLIES_API_KEY manquante.");
  }

  const apiUrl = process.env.FIREFLIES_API_URL || DEFAULT_API_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new FirefliesApiError("TIMEOUT", "L'API Fireflies n'a pas répondu à temps.");
    }
    throw new FirefliesApiError("NETWORK_ERROR", "Impossible de joindre l'API Fireflies.");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    throw new FirefliesApiError("UNAUTHORIZED", "Clé API Fireflies invalide ou refusée.");
  }

  if (response.status === 429) {
    throw new FirefliesApiError("RATE_LIMITED", "Limite de requêtes Fireflies atteinte.");
  }

  if (!response.ok) {
    throw new FirefliesApiError("NETWORK_ERROR", `L'API Fireflies a répondu ${response.status}.`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    const message = String(json.errors[0]?.message ?? "erreur inconnue");
    if (/object_not_found/i.test(json.errors[0]?.code ?? "") || /not exist/i.test(message)) {
      throw new FirefliesApiError("NOT_FOUND", "Réunion Fireflies introuvable.");
    }
    throw new FirefliesApiError("GRAPHQL_ERROR", `Erreur Fireflies : ${message}`);
  }

  return json.data as T;
}
