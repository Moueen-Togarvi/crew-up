import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/crewup/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrewUp — Connect Contractors & Subcontractors",
  description:
    "CrewUp connects contractors with subcontractors. Find work, hire crews, manage opportunities, and build reliable business relationships in construction.",
  keywords: [
    "CrewUp",
    "construction marketplace",
    "contractors",
    "subcontractors",
    "construction crews",
    "hire construction workers",
    "construction jobs",
  ],
  authors: [{ name: "CrewUp" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "CrewUp — Construction Workforce Marketplace",
    description:
      "Find work, hire crews, manage opportunities, and build reliable business relationships.",
    siteName: "CrewUp",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
