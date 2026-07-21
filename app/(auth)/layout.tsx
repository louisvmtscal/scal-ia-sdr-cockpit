import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-semibold">
          S
        </div>
        <span className="text-sm font-medium">Scal-IA</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
