import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "react-email";

import { COMPTE_RENDU_SECTIONS, type CompteRendu } from "@/lib/validations/compte-rendu";

export function CompteRenduEmail({
  prenom,
  nom,
  societe,
  commercial,
  dateRDV,
  compteRendu,
}: {
  prenom: string;
  nom: string;
  societe: string;
  commercial: string;
  dateRDV: string;
  compteRendu: CompteRendu;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Compte rendu — {prenom} {nom} ({societe})
      </Preview>
      <Body
        style={{ backgroundColor: "#f4f4f5", fontFamily: "Arial, sans-serif", padding: "24px 0" }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "600px",
          }}
        >
          <Text
            style={{
              fontSize: "12px",
              color: "#71717a",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Scal-IA · Cockpit SDR
          </Text>
          <Heading style={{ fontSize: "20px", margin: "8px 0 4px" }}>
            Compte rendu — {prenom} {nom}
          </Heading>
          <Text style={{ color: "#52525b", fontSize: "14px", margin: 0 }}>
            {societe} · Rendez-vous mené par {commercial} le {dateRDV}
          </Text>
          <Hr style={{ margin: "24px 0", borderColor: "#e4e4e7" }} />
          {COMPTE_RENDU_SECTIONS.map(({ key, label }) => (
            <Section key={key} style={{ marginBottom: "16px" }}>
              <Text
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#18181b",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  margin: "0 0 4px",
                }}
              >
                {label}
              </Text>
              <Text
                style={{
                  fontSize: "14px",
                  color: "#3f3f46",
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {String(compteRendu[key])}
              </Text>
            </Section>
          ))}
          <Hr style={{ margin: "24px 0", borderColor: "#e4e4e7" }} />
          <Text style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
            Généré automatiquement par le Cockpit Scal-IA à partir de la transcription Fireflies.ai.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
