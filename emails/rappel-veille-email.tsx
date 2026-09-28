import { Body, Container, Head, Hr, Html, Preview, Text } from "react-email";

type RappelVeilleRdv = { prenom: string; nom: string; societe: string; heure: string };

export function RappelVeilleEmail({
  prenomCommercial,
  rendezVous,
}: {
  prenomCommercial: string;
  rendezVous: RappelVeilleRdv[];
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{`Rappel — ${rendezVous.length} rendez-vous demain`}</Preview>
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
          <Text style={{ fontSize: "14px", color: "#18181b", margin: 0 }}>
            Hello {prenomCommercial},
          </Text>
          <Text style={{ fontSize: "14px", color: "#18181b", margin: "12px 0 0" }}>
            Petit rappel de tes rendez-vous prévus demain :
          </Text>

          <Hr style={{ margin: "20px 0", borderColor: "#e4e4e7" }} />

          {rendezVous.map((rdv, index) => (
            <Text key={index} style={{ fontSize: "14px", color: "#18181b", margin: "0 0 8px" }}>
              🕒 {rdv.heure} — {rdv.prenom} {rdv.nom} ({rdv.societe})
            </Text>
          ))}

          <Hr style={{ margin: "20px 0", borderColor: "#e4e4e7" }} />

          <Text style={{ fontSize: "14px", color: "#18181b", margin: 0 }}>Bonne soirée !</Text>
        </Container>
      </Body>
    </Html>
  );
}
