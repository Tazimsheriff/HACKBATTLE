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
    <html lang="en" className="light h-full">
      <body className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#0C0C0D] selection:bg-[#FA500F] selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
