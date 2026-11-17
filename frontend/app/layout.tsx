import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import './overrides.css'

const inter = localFont({
  src: './fonts/Inter-variable.ttf',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
})

const leagueSpartan = localFont({
  src: './fonts/LeagueSpartan-variable.ttf',
  weight: '100 900',
  style: 'normal',
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
      <body>
        {children}
      </body>
    </html>
  )
}
