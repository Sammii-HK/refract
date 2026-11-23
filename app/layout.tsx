import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Refract: a shader workshop",
  icons:{icon:"/refract-icon.svg"},
  description: "Text to live GLSL shader generator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="antialiased">{children}</body>
    </html>
  );
}
