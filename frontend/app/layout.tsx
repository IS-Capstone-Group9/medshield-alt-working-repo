import type { Metadata } from 'next'
import { Inter, League_Spartan } from 'next/font/google'
import './globals.css'
import './overrides.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-league-spartan',
})

export const metadata: Metadata = {
  title: 'MedShield Pharma Corp. - Decision Support System',
  description: 'MedShield Pharma Corp. Enterprise Decision Support System for pharmaceutical supply chain optimization.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${leagueSpartan.variable}`}>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js" defer></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
