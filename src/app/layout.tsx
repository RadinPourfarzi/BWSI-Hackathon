import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { animationConfig } from "@/config/animation";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Signal or Synthetic",
    template: "%s · Signal or Synthetic",
  },
  description:
    "A fast educational game for spotting AI media, scam emails, and synthetic voices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const animationVariables = {
    "--animation-feedback": `${animationConfig.feedbackMs}ms`,
    "--animation-page-enter": `${animationConfig.pageEnterMs}ms`,
    "--animation-easing": animationConfig.easing,
  } as CSSProperties;

  return (
    <html lang="en" style={animationVariables}>
      <body>{children}</body>
    </html>
  );
}
