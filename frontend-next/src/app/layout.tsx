import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import AppProviders from "@/providers/app-providers";
import CookieConsentBanner from "@/components/legal/CookieConsentBanner";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
});


export const metadata: Metadata = {
  title: "Aseel SaaS | Loan Management System",
  description: "Manage customer loans, installments, and portfolio analytics effortlessly with Aseel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${cairo.variable} antialiased`}
      >
        <AppProviders>
          {children}
          <CookieConsentBanner />
        </AppProviders>
      </body>
    </html>
  );
}
