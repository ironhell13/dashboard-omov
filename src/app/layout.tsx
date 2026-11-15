import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAPORAN OMOV - Berita Acara ATM BCA",
  description: "Aplikasi pembuat Berita Acara Instalasi / Trade In mesin ATM BCA",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1A73D9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-bg text-text antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
