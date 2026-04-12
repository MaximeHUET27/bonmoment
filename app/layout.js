import { Montserrat } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";
import { FavorisProvider } from "@/app/context/FavorisContext";
import { ToastProvider } from "@/app/components/Toast";
import AdminFooterLink from "@/app/components/AdminFooterLink";
import ChatbotWidget from "@/app/components/ChatbotWidget";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport = {
  themeColor: '#FF6B00',
}

export const metadata = {
  title: "BONMOMENT – Soyez là au bon moment",
  description: "Découvre les bons plans et offres exclusives des commerçants de ta ville.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "BONMOMENT",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={`${montserrat.variable} antialiased`}>
        <AuthProvider>
          <FavorisProvider>
          <ToastProvider>
          {children}
          <ChatbotWidget />
          <footer className="w-full bg-[#F5F5F5] border-t border-[#EBEBEB] px-6 py-5 mt-auto">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[#3D3D3D]/70">
                <Link href="/mentions-legales" className="hover:text-[#FF6B00] transition-colors">Mentions légales</Link>
                <span className="text-[#3D3D3D]/30 hidden sm:inline">|</span>
                <Link href="/cgu" className="hover:text-[#FF6B00] transition-colors">CGU</Link>
                <span className="text-[#3D3D3D]/30 hidden sm:inline">|</span>
                <Link href="/cgv" className="hover:text-[#FF6B00] transition-colors">CGV</Link>
                <span className="text-[#3D3D3D]/30 hidden sm:inline">|</span>
                <Link href="/confidentialite" className="hover:text-[#FF6B00] transition-colors">Confidentialité</Link>
                <span className="text-[#3D3D3D]/30 hidden sm:inline">|</span>
                <Link href="/aide" className="hover:text-[#FF6B00] transition-colors font-semibold">Besoin d&apos;aide ?</Link>
                <AdminFooterLink />
              </nav>
              <p className="text-[11px] text-[#3D3D3D]/60 text-center sm:text-right">
                Tu es commerçant ?{" "}
                <Link href="/commercant/inscription" className="font-semibold text-[#FF6B00] hover:text-[#CC5500] transition-colors">
                  Rejoins BONMOMENT
                </Link>
              </p>
            </div>
          </footer>
          </ToastProvider>
          </FavorisProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
