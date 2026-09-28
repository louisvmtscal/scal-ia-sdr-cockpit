import { Body, Container, Head, Html, Preview, Text } from "react-email";

export function NouveauRdvAgatheEmail({
  nom,
  prenom,
  societe,
}: {
  nom: string;
  prenom: string;
  societe: string;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Nouveau rendez-vous : {nom} {prenom} ({societe})
      </Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "Arial, sans-serif", padding: "24px 0" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "600px",
          }}
        >
          <Text style={{ fontSize: "14px", color: "#18181b", margin: 0 }}>Hello,</Text>
          <Text style={{ fontSize: "14px", color: "#18181b", margin: "12px 0 0" }}>
            Voici un nouveau rendez-vous : {nom} {prenom} ({societe}).
          </Text>
          <Text style={{ fontSize: "14px", color: "#18181b", margin: "12px 0 0" }}>
            Tu peux retirer celui-ci des futures listes.
          </Text>
          <Text style={{ fontSize: "14px", color: "#18181b", margin: "12px 0 0" }}>
            Bonne journée !
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
