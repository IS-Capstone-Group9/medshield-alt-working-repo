import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './overrides.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'MedShield Pharma Corp. - Decision Support System',
  description: 'MedShield Pharma Corp. Enterprise Decision Support System for pharmaceutical supply chain optimization.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
      </body>
    </html>
  )
}

