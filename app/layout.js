import { Montserrat } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";
import FloatingBonButton from "@/app/components/FloatingBonButton";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "BONMOMENT – Soyez là au bon moment",
  description: "Découvrez les bons plans et offres exclusives des commerçants de votre ville.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={`${montserrat.variable} antialiased`}>
        <AuthProvider>
          {children}
          <FloatingBonButton />
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
              </nav>
              <p className="text-[11px] text-[#3D3D3D]/60 text-center sm:text-right">
                Vous êtes commerçant ?{" "}
                <Link href="/commercant/inscription" className="font-semibold text-[#FF6B00] hover:text-[#CC5500] transition-colors">
                  Rejoignez BONMOMENT
                </Link>
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
