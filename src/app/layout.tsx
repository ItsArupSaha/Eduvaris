import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ubuntu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eduvaris — Deep Diagnostic for IELTS",
  description:
    "Eduvaris is a Deep Diagnostic that pinpoints your exact IELTS strengths and root-cause weaknesses. Not a band score. Not a mock test. A Micro-Diagnostic scan for your English.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ubuntu.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-amber-50 text-slate-800">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
