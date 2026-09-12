import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAPIENS AGENT | Autonomous Self-Learning & Guardrail AI Platform",
  description:
    "SAPIENS AGENT — Autonomous AI that can Act, Learn, Adapt, and Operate within Boundaries. Anomaly detection, statistical reflection, episodic memory, and human-in-the-loop guardrails.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light h-full">
      <body className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#0C0C0D] selection:bg-[#71ce34] selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
