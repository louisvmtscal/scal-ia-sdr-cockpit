import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "react-email";

import { PREPARATION_SECTIONS, type Preparation } from "@/lib/validations/preparation";

export function PreparationEmail({
  prenom,
  nom,
  societe,
  commercial,
  dateRDV,
  preparation,
}: {
  prenom: string;
  nom: string;
  societe: string;
  commercial: string;
  dateRDV: string;
  preparation: Preparation;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Préparation RDV — {prenom} {nom} ({societe})
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
            Préparation RDV demain — {prenom} {nom}
          </Heading>
          <Text style={{ color: "#52525b", fontSize: "14px", margin: 0 }}>
            {societe} · Rendez-vous mené par {commercial} le {dateRDV}
          </Text>
          <Hr style={{ margin: "24px 0", borderColor: "#e4e4e7" }} />
          {PREPARATION_SECTIONS.map(({ key, label }) => (
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
                {preparation[key]}
              </Text>
            </Section>
          ))}
          <Section style={{ marginBottom: "16px" }}>
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
              Questions pertinentes
            </Text>
            {preparation.questionsPertinentes.map((question, index) => (
              <Text key={index} style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 4px" }}>
                {index + 1}. {question}
              </Text>
            ))}
          </Section>
          <Hr style={{ margin: "24px 0", borderColor: "#e4e4e7" }} />
          <Text style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
            Généré automatiquement par le Cockpit Scal-IA, la veille du rendez-vous.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
