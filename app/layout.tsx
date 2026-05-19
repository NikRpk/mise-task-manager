import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { CacheProvider } from "@/lib/cache-context";
import { PeopleProvider } from "@/lib/people-context";
import { ToastProvider } from "@/lib/toast-context";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mise",
  description: "Task and notes management",
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            <CacheProvider>
              <PeopleProvider>
                <ThemeProvider>
                  <ToastProvider>
                    {children}
                  </ToastProvider>
                </ThemeProvider>
              </PeopleProvider>
            </CacheProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
