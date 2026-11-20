import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { themeScript } from "@/components/theme/theme-script";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Salary — финансовый аналитик",
    template: "%s · Salary",
  },
  description:
    "Учёт доходов и расходов по категориям, бюджеты и наглядные графики.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
