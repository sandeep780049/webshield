import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: {
    default: "WebShield — Automated Web Application Security Testing",
    template: "%s | WebShield",
  },
  description:
    "WebShield is an academic prototype for automated SQL injection and cross-site scripting detection, with a self-contained Safe Demo Lab.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
