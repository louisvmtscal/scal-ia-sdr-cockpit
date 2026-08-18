import "server-only";

const DEFAULT_API_URL = "https://api.lemlist.com/api";
const REQUEST_TIMEOUT_MS = 15_000;

export type LemlistErrorCode =
  | "MISSING_API_KEY"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED";

export class LemlistApiError extends Error {
  code: LemlistErrorCode;

  constructor(code: LemlistErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "LemlistApiError";
  }
}

/**
 * Exécute une requête contre l'API Lemlist.
 *
 * Authentification vérifiée dans la documentation officielle : Basic Auth
 * avec identifiant vide et la clé API en mot de passe (`Authorization: Basic
 * base64(":LEMLIST_API_KEY")`) — PAS un header Bearer. Seul point du projet
 * qui lit `LEMLIST_API_KEY` ; jamais journalisée, jamais renvoyée au client.
 */
export async function lemlistRequest<T>(
  path: string,
  init: { method: "GET" | "POST" | "PATCH"; body?: unknown; query?: Record<string, string> },
): Promise<T> {
  const apiKey = process.env.LEMLIST_API_KEY;

  if (!apiKey) {
    throw new LemlistApiError("MISSING_API_KEY", "LEMLIST_API_KEY manquante.");
  }

  const baseUrl = process.env.LEMLIST_API_URL || DEFAULT_API_URL;
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    url.searchParams.set(key, value);
  }

  const basicAuth = Buffer.from(`:${apiKey}`).toString("base64");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new LemlistApiError("TIMEOUT", "L'API Lemlist n'a pas répondu à temps.");
    }
    throw new LemlistApiError("NETWORK_ERROR", "Impossible de joindre l'API Lemlist.");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    throw new LemlistApiError("UNAUTHORIZED", "Clé API Lemlist invalide ou refusée.");
  }

  if (response.status === 404) {
    throw new LemlistApiError("NOT_FOUND", "Ressource Lemlist introuvable (campagne ou lead).");
  }

  if (response.status === 429) {
    throw new LemlistApiError("RATE_LIMITED", "Limite de requêtes Lemlist atteinte (20 req/2s).");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : `Lemlist a répondu ${response.status}.`;
    throw new LemlistApiError("BAD_REQUEST", message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}
