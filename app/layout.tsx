import type { Metadata } from "next";
import { Rajdhani, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/contexts/PlayerContext";

const rajdhani = Rajdhani({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Torneo MHR",
  description: "Liga de Videojuegos entre Amigos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${rajdhani.variable} ${jetbrainsMono.variable} bg-zinc-950 text-zinc-100 antialiased`}
      >
        <PlayerProvider>
          {children}
        </PlayerProvider>
      </body>
    </html>
  );
}
