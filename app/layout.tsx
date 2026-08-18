import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Tribunal — agnet-project",
  description: "AI courtroom simulator: submit a case, get advocate arguments and judge verdicts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
