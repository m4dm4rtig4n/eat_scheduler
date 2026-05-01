import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MobileNav } from "@/components/mobile-nav";
import { SideNav } from "@/components/side-nav";
import { SWRegister } from "@/components/sw-register";
import { DinersProvider } from "@/components/diners-provider";
import { listDiners } from "@/lib/db/diners";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eat Scheduler",
  description: "Planificateur de repas hebdomadaires avec liste de courses",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Eat Scheduler",
  },
};

export const viewport: Viewport = {
  themeColor: "#d97706",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Charge la config diners au layout pour qu'elle soit dispo dans toute l'app
  let initialDiners: Awaited<ReturnType<typeof listDiners>> = [];
  try {
    initialDiners = await listDiners();
  } catch {
    // Si la DB est indisponible, on laisse le provider utiliser le fallback
  }

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col md:flex-row overflow-x-hidden">
        <DinersProvider initialDiners={initialDiners}>
          <SideNav />
          <MobileNav />
          <main className="flex-1 w-full pb-8 min-w-0 md:max-w-none">
            <div className="w-full max-w-2xl mx-auto md:max-w-none md:mx-0 md:px-2">
              {children}
            </div>
          </main>
        </DinersProvider>
        <SWRegister />
      </body>
    </html>
  );
}
