import type { Metadata } from 'next'
import './globals.css'
import './overrides.css'


export const metadata: Metadata = {
  title: 'MedShield Pharma Corp. - Decision Support System',
  description: 'MedShield Pharma Corp. decision support dashboard',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
