import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listDiners } from "@/lib/db/diners";
import { isAuthEnabled } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsView } from "@/components/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const diners = await listDiners(true); // inclure archivés
  const authEnabled = isAuthEnabled();

  return (
    <>
      <PageHeader
        title="Réglages"
        subtitle="Personnes et coefficients de part"
        back={
          <Link
            href="/"
            className="size-9 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Retour"
          >
            <ChevronLeft className="size-5" />
          </Link>
        }
      />
      <SettingsView initialDiners={diners} authEnabled={authEnabled} />
    </>
  );
}
