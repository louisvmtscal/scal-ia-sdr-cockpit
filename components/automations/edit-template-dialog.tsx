"use client";

import { Loader2Icon, PencilIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateTemplateAction } from "@/actions/templates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function EditTemplateDialog({
  templateKey,
  label,
  category,
  content,
}: {
  templateKey: string;
  label: string;
  category: string;
  content: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(content);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateTemplateAction(templateKey, label, category, value);
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Modèle mis à jour.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <PencilIcon className="size-3.5" />
            <span className="sr-only">Modifier {label}</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier — {label}</DialogTitle>
        </DialogHeader>
        <Textarea
          rows={10}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="font-mono text-sm"
        />
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
