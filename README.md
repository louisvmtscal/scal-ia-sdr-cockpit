# Scal-IA · Cockpit SDR

Cockpit personnel de suivi des rendez-vous commerciaux pour Louis et Chloé (Scal-IA), pensé comme un remplacement direct d'un Google Sheet — pas un CRM.

## Fonctionnalités

- **Tableau de bord** : statistiques clés (RDV, taux de présence, taux de qualification, ARR potentiel) et graphiques.
- **Suivi des rendez-vous** : table filtrable/triable, ajout/édition/suppression.
- **Compte rendu IA** : génération automatique (Claude) d'une synthèse structurée pour la CEO à partir de la transcription Fireflies.ai (ou collée manuellement en fallback), envoyée par email.
- **Fiche de préparation** : générée automatiquement la veille de chaque RDV (actualités, contexte entreprise, activité LinkedIn, questions pertinentes), envoyée par email.
- **Automatisations** : timeline des messages du cycle de vente et prompts IA, tous éditables sans toucher au code.
- **Intégration Fireflies.ai** : webhook de récupération automatique des transcriptions.

## Stack technique

Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui (base-nova) · Prisma 7 · PostgreSQL · Auth.js v5 · React Hook Form + Zod · Recharts · Resend + React Email · Anthropic Claude API.

## Démarrage local

```bash
pnpm install
pnpm exec prisma dev      # base PostgreSQL locale embarquée
pnpm db:push              # applique le schéma
pnpm db:seed              # données de démonstration
pnpm dev
```

Copier `.env.example` vers `.env` et renseigner les variables (voir ci-dessous).

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Connexion PostgreSQL |
| `AUTH_SECRET` / `AUTH_URL` | Auth.js |
| `ANTHROPIC_API_KEY` | Génération des comptes rendus et fiches de préparation |
| `RESEND_API_KEY` / `MAIL_FROM` | Envoi des emails |
| `FIREFLIES_API_KEY` / `FIREFLIES_WEBHOOK_SECRET` | Récupération automatique des transcriptions |
| `CRON_SECRET` | Sécurise le cron quotidien (fiche de préparation) |

## Déploiement

Déployé sur [Vercel](https://vercel.com). Le cron de préparation quotidienne est défini dans `vercel.json`.
