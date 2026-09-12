import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OMNIVORE AGENT | Autonomous Self-Learning & Guardrail AI Platform",
  description:
    "AI that can Act, Learn, Adapt, and Operate within Boundaries. Anomaly detection, statistical reflection, episodic memory, and human-in-the-loop guardrails.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-screen flex flex-col bg-[#080c15] text-slate-100 selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
