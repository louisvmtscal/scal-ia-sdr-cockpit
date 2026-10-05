import { Body, Container, Head, Hr, Html, Preview, Text } from "react-email";

type DigestAgatheRdv = { nom: string; prenom: string; societe: string };

export function DigestAgatheEmail({ rendezVous }: { rendezVous: DigestAgatheRdv[] }) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{`${rendezVous.length} nouveau${rendezVous.length > 1 ? "x" : ""} rendez-vous aujourd'hui`}</Preview>
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
          <Text style={{ fontSize: "14px", color: "#18181b", margin: 0 }}>Hello,</Text>
          <Text style={{ fontSize: "14px", color: "#18181b", margin: "12px 0 0" }}>
            Voici les nouveaux rendez-vous du jour ({rendezVous.length}) :
          </Text>

          <Hr style={{ margin: "20px 0", borderColor: "#e4e4e7" }} />

          {rendezVous.map((rdv, index) => (
            <Text key={index} style={{ fontSize: "14px", color: "#18181b", margin: "0 0 8px" }}>
              {rdv.nom} {rdv.prenom} ({rdv.societe})
            </Text>
          ))}

          <Hr style={{ margin: "20px 0", borderColor: "#e4e4e7" }} />

          <Text style={{ fontSize: "14px", color: "#18181b", margin: 0 }}>
            Tu peux retirer ceux-ci des futures listes.
          </Text>
          <Text style={{ fontSize: "14px", color: "#18181b", margin: "12px 0 0" }}>
            Bonne soirée !
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
