import type { Metadata } from "next";
import { Inter, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import StoreProvider from "@/components/StoreProvider";
import AuthProvider from "@/components/AuthProvider";
import { SocketInitializer } from "@/components/SocketInitializer";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const hankenGrotesk = Hanken_Grotesk({ subsets: ["latin"], display: "swap", variable: '--font-hanken' });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: "Field Force Management | Admin Dashboard",
  description: "Real-time workforce monitoring and management system for field employees.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} ${hankenGrotesk.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <StoreProvider>
            <SocketInitializer />
            <Toaster position="top-right" />
            {children}
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
