"use client";

import { RefreshCwIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { syncSheetAction } from "@/actions/sheet-sync";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SyncSheetButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await syncSheetAction();

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      const { crees, misAJour, inchanges, ignores } = result.result;
      toast.success(
        `Sheet synchronisé : ${crees} créés, ${misAJour} mis à jour, ${inchanges} inchangés.`,
        {
          description:
            ignores.length > 0
              ? `${ignores.length} ligne(s) ignorée(s) (date invalide).`
              : undefined,
        },
      );
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <RefreshCwIcon className={cn(isPending && "animate-spin")} />
      {isPending ? "Actualisation..." : "Actualiser depuis le Sheet"}
    </Button>
  );
}
