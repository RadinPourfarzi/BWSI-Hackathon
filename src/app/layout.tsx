import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { animationConfig } from "@/config/animation";
import "./globals.css";

const themeInitializationScript = `
  (() => {
    try {
      const savedTheme = window.localStorage.getItem("bot-or-not-theme");
      const preferredTheme = window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
      document.documentElement.dataset.theme =
        savedTheme === "light" || savedTheme === "dark"
          ? savedTheme
          : preferredTheme;
    } catch {
      document.documentElement.dataset.theme = "dark";
    }
  })();
`;

export const metadata: Metadata = {
  title: {
    default: "Bot or Not",
    template: "%s · Bot or Not",
  },
  description:
    "A fast educational game for spotting AI media, scam emails, and synthetic voices.",
  icons: {
    icon: "/brand/bot-or-not-logo.png",
    apple: "/brand/bot-or-not-logo.png",
  },
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
    <html
      data-scroll-behavior="smooth"
      lang="en"
      style={animationVariables}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
          id="theme-initializer"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
