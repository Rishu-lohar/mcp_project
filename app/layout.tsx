
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HuntBoard | MCP Learning Project",
  description:
    "A conversational job discovery workspace built while learning Model Context Protocol.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
