"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createRendezVousAction, updateRendezVousAction } from "@/actions/rendez-vous";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COMMERCIAL_LABELS, ORIGINE_LABELS } from "@/lib/constants/rendez-vous";
import type { RendezVous } from "@/lib/generated/prisma/client";
import { rendezVousSchema, type RendezVousInput } from "@/lib/validations/rendez-vous";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateTimeLocalValue(date?: Date | null) {
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RendezVousForm({
  rendezVous,
  onSuccess,
}: {
  rendezVous?: RendezVous;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<RendezVousInput>({
    resolver: zodResolver(rendezVousSchema),
    defaultValues: {
      commercial: rendezVous?.commercial ?? "LOUIS",
      origine: rendezVous?.origine ?? "OUTBOUND",
      nom: rendezVous?.nom ?? "",
      prenom: rendezVous?.prenom ?? "",
      societe: rendezVous?.societe ?? "",
      poste: rendezVous?.poste ?? "",
      email: rendezVous?.email ?? "",
      telephone: rendezVous?.telephone ?? "",
      linkedin: rendezVous?.linkedin ?? "",
      dateRDV: toDateTimeLocalValue(rendezVous?.dateRDV),
      notes: rendezVous?.notes ?? "",
    },
  });

  function onSubmit(values: RendezVousInput) {
    startTransition(async () => {
      const result = rendezVous
        ? await updateRendezVousAction(rendezVous.id, values)
        : await createRendezVousAction(values);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(rendezVous ? "Rendez-vous mis à jour." : "Rendez-vous ajouté.");
      if (!rendezVous) {
        form.reset();
      }
      onSuccess?.();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="commercial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commercial</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string) =>
                          COMMERCIAL_LABELS[value as keyof typeof COMMERCIAL_LABELS]
                        }
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(COMMERCIAL_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="origine"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origine</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string) => ORIGINE_LABELS[value as keyof typeof ORIGINE_LABELS]}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(ORIGINE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="prenom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="societe"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entreprise</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="poste"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Poste</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="telephone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="linkedin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lien LinkedIn</FormLabel>
              <FormControl>
                <Input placeholder="https://www.linkedin.com/in/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateRDV"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date du rendez-vous</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="mt-2">
          {isPending
            ? "Enregistrement..."
            : rendezVous
              ? "Mettre à jour"
              : "Ajouter le rendez-vous"}
        </Button>
      </form>
    </Form>
  );
}
