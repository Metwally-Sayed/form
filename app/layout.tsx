import type { Metadata } from "next"
import { Archivo, Newsreader, Spline_Sans_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

// Display: editorial serif with real italics — dignity, not dashboard.
const fontDisplay = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
})

// Body: sturdy print-derived grotesque, holds up at form-label sizes.
const fontBody = Archivo({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

// Meta: index numbers, column labels, record IDs.
const fontCode = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Community Forms",
    template: "%s | Community Forms",
  },
  description: "Secure community forms powered by Masjid Fikra.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        fontDisplay.variable,
        fontBody.variable,
        fontCode.variable
      )}
    >
      <body className="min-h-svh">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
