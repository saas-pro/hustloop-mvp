

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import TwinklingStars from '@/components/layout/twinkling-stars';
import Script from 'next/script';
import { ThemeProvider } from '@/components/theme-provider';
import GoogleAnalytics from "./metrics/GoogleAnalytics"
import MicrosoftClarity from "./metrics/MicrosoftClarity"
import ZohoChatbot from "@/components/layout/zoho-chatbot";
import { AuthProvider } from '@/providers/AuthContext';



export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://hustloop.com'),
  title: {
    default: 'Hustloop | Connect, Collaborate, Build Stronger Startup & Innovators Meet',
    template: '%s | Hustloop',
  },
  description: 'Hustloop is an open innovation and startup collaboration platform that connects founders, corporates, innovators, and students to solve real business challenges and drive technology transfer.',
  keywords: [
    // Core Business
    'startup collaboration platform',
    'open innovation platform',
    'technology transfer platform',
    'corporate innovation hub',
    'startup ecosystem',

    // User Types
    'for startups and founders',
    'corporate innovation teams',
    'student innovators',
    'entrepreneur network',
    'tech professionals community',

    // Solutions
    'solve business challenges',
    'startup-corporate collaboration',
    'innovation management',
    'startup scouting platform',
    'corporate venturing',

    // Benefits
    'find startup partners',
    'corporate startup programs',
    'startup funding opportunities',
    'technology commercialization',
    'business innovation solutions',

    // Features
    'startup matchmaking',
    'innovation challenges platform',
    'startup acceleration programs',
    'corporate startup partnerships',
    'technology scouting platform',

    // Location (if applicable)
    'India startup network',
    'global innovation platform',
    'emerging market startups',
    'technology transfer India',
    'incentive challenges salem',
    'technology transfer salem',
    'incentive challenges',
    'technology transfer'
  ],

  authors: [{ name: 'Hustloop' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hustloop.com',
    title: 'Hustloop | Connect, Collaborate, Build Stronger Startup & Innovators Meet',
    description: 'Hustloop is an open innovation and startup collaboration platform that connects founders, corporates, innovators, and students to solve real business challenges and drive technology transfer.',
    siteName: 'Hustloop',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Hustloop',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hustloop | Connect, Collaborate, Build Stronger Startup & Innovators Meet',
    description: 'Hustloop is an open innovation and startup collaboration platform that connects founders, corporate, innovators, and students to solve real business challenges and drive technology transfer.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://hustloop.com',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background font-sans" suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <div className="flex-grow ">
              {/* <TwinklingStars /> */}
              {children}
            </div>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
        <Script id="org-schema" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Hustloop",
            "url": "https://hustloop.com",
            "description": "Hustloop is an open innovation and startup collaboration platform that connects founders, corporate, innovators, and students to solve real business challenges and drive technology transfer.",
            "logo": "https://hustloop.com/logo.png"
          })}
        </Script>
        <Script id="website-schema" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Hustloop",
            "description": "Hustloop is an open innovation and startup collaboration platform that connects founders, corporate, innovators, and students to solve real business challenges and drive technology transfer.",
            "url": "https://hustloop.com"
          })}
        </Script>
        <GoogleAnalytics />
        <MicrosoftClarity />
        <ZohoChatbot />
      </body>
    </html >
  );
}
