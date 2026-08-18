import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "react-email";

export function EmailJ25NotificationEmail({
  prenom,
  nom,
  societe,
  dateRDV,
  contenu,
}: {
  prenom: string;
  nom: string;
  societe: string;
  dateRDV: string;
  contenu: string;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Brouillon Email J-25 prêt — {prenom} {nom} ({societe})
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
            Brouillon Email J-25 prêt — {prenom} {nom}
          </Heading>
          <Text style={{ color: "#52525b", fontSize: "14px", margin: 0 }}>
            {societe} · Rendez-vous le {dateRDV}
          </Text>

          <Section
            style={{
              backgroundColor: "#fef3c7",
              borderRadius: "8px",
              padding: "12px 16px",
              margin: "20px 0",
            }}
          >
            <Text style={{ fontSize: "13px", color: "#92400e", margin: 0, fontWeight: 700 }}>
              Ce brouillon n&apos;a pas encore été envoyé au prospect. Il attend ta relecture et ta
              validation avant tout envoi.
            </Text>
          </Section>

          <Hr style={{ margin: "24px 0", borderColor: "#e4e4e7" }} />

          <Text
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#18181b",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              margin: "0 0 8px",
            }}
          >
            Contenu du brouillon
          </Text>
          <Text style={{ fontSize: "14px", color: "#3f3f46", margin: 0, whiteSpace: "pre-line" }}>
            {contenu}
          </Text>

          <Hr style={{ margin: "24px 0", borderColor: "#e4e4e7" }} />
          <Text style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
            Généré automatiquement par le Cockpit Scal-IA (automatisation Email J-25).
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
