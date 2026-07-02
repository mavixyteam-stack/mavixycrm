import type { Metadata } from 'next'
import './globals.css'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Mavixy OS — Agency Command Center',
  description: 'Content planning, client management, team workload and AI briefing — all in one calm command center.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        <Script 
          src="https://analyticscheck.netlify.app/analytics.js"
          strategy="afterInteractive"
          data-collector="true"
          data-project="mavixycrm"
          data-version="2.0.0"
        />
        
        <link 
          rel="preconnect" 
          href="https://analyticscheck.netlify.app" 
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
