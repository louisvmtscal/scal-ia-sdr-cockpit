import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";

async function seedUsers() {
  const passwordHash = await hash("changeme123", 12);

  const users = [
    { email: "louis@scal-ia.fr", name: "Louis" },
    { email: "chloe@scal-ia.fr", name: "Chloé" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, role: "ADMIN", passwordHash },
    });
  }

  console.log(
    `Comptes prêts : ${users.map((u) => u.email).join(", ")} (mot de passe : changeme123)`,
  );
}

// Données réelles fournies (suivi des RDV de Louis). Tous les rendez-vous
// sans heure précisée dans la source sont enregistrés à 00:00.
const RENDEZ_VOUS_REELS: Array<{
  commercial: "LOUIS" | "CHLOE";
  prenom: string;
  nom: string;
  societe: string;
  dateRDV: string;
  honore: "EN_ATTENTE" | "OUI" | "NON" | "A_REPLACER";
  qualifie: boolean;
  origine: "INBOUND" | "OUTBOUND";
}> = [
  {
    commercial: "LOUIS",
    prenom: "Eric",
    nom: "Ingrid",
    societe: "Cloudi-fi",
    dateRDV: "2026-07-10",
    honore: "OUI",
    qualifie: true,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Ingrid",
    nom: "Tatel",
    societe: "EuropaTrad",
    dateRDV: "2026-07-16",
    honore: "OUI",
    qualifie: true,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Ramzi",
    nom: "Ramrani",
    societe: "Groupe Welmo : Boku / Sisters Republic / Ôdass Paris / Fempo",
    dateRDV: "2026-07-16",
    honore: "NON",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Xavier",
    nom: "Billoir",
    societe: "Xavier Biliward",
    dateRDV: "2026-07-16",
    honore: "OUI",
    qualifie: false,
    origine: "INBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "François",
    nom: "Stumpf",
    societe: "Norcan SAS",
    dateRDV: "2026-07-17",
    honore: "OUI",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Kamel",
    nom: "Bilel",
    societe: "Skaalab",
    dateRDV: "2026-07-17",
    honore: "NON",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Alexandre",
    nom: "De Sousa",
    societe: "Adisco",
    dateRDV: "2026-07-17",
    honore: "NON",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Moayad",
    nom: "Harb",
    societe: "Amnesia Bureau d'Étude",
    dateRDV: "2026-07-23",
    honore: "EN_ATTENTE",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Valentina",
    nom: "Nozzolillo",
    societe: "Abalsia Consulting",
    dateRDV: "2026-07-22",
    honore: "EN_ATTENTE",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Florent",
    nom: "Meric",
    societe: "Kytl Security",
    dateRDV: "2026-09-01",
    honore: "EN_ATTENTE",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Julien",
    nom: "Dargaisse",
    societe: "interview.app",
    dateRDV: "2026-09-02",
    honore: "EN_ATTENTE",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Joan",
    nom: "Rajaonarisoa",
    societe: "AB Plus",
    dateRDV: "2026-09-03",
    honore: "EN_ATTENTE",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Kimkhi",
    nom: "Nguyen",
    societe: "Ou Former",
    dateRDV: "2026-09-04",
    honore: "EN_ATTENTE",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Patrice",
    nom: "Juin",
    societe: "Lcom",
    dateRDV: "2026-09-09",
    honore: "EN_ATTENTE",
    qualifie: false,
    origine: "OUTBOUND",
  },
  {
    commercial: "LOUIS",
    prenom: "Antoine",
    nom: "Dupuis",
    societe: "Rapid Views",
    dateRDV: "2026-09-16",
    honore: "EN_ATTENTE",
    qualifie: false,
    origine: "OUTBOUND",
  },
];

async function seedRendezVous() {
  await prisma.rendezVous.deleteMany();

  await prisma.rendezVous.createMany({
    data: RENDEZ_VOUS_REELS.map((rdv) => ({
      ...rdv,
      dateRDV: new Date(rdv.dateRDV),
    })),
  });

  console.log(`${RENDEZ_VOUS_REELS.length} rendez-vous réels importés.`);
}

async function main() {
  await seedUsers();
  await seedRendezVous();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
