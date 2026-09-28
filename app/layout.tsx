import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteBrand } from "@/components/branding/SiteBrand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RW 16 Nuansa Indah Ciomas",
  description: "Layanan administrasi digital RW 16 Nuansa Indah Ciomas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteBrand />
        {children}
        <footer className="mt-auto mb-16 px-4 py-4 text-center text-xs text-slate-500">
          © 2026 RW 16 Nuansa Indah Ciomas
        </footer>
      </body>
    </html>
  );
}
