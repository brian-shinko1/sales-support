import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Support",
  description: "Transcribe, edit, and summarize with AI",
  icons: { icon: "/Shinko1_Hands_Icon_Red.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script src="https://accounts.google.com/gsi/client" async></script>
      </head>
      <body className="h-full bg-[#0a0a0a] text-[#ededed] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
