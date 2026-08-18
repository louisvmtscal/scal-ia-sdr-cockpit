import type { Metadata } from "next";

import { RendezVousTable } from "@/components/rendez-vous/rendez-vous-table";
import { listRendezVous } from "@/services/rendez-vous";

export const metadata: Metadata = {
  title: "Rendez-vous",
};

export default async function RendezVousPage() {
  const rendezVous = await listRendezVous();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Suivi des rendez-vous</h1>
        <p className="text-muted-foreground text-sm">{rendezVous.length} rendez-vous au total</p>
      </div>
      <RendezVousTable data={rendezVous} isDev={process.env.NODE_ENV !== "production"} />
    </div>
  );
}
