import type { Metadata } from 'next'
import { Poppins, Open_Sans } from 'next/font/google'
import './globals.css'
import { SettingsProvider } from '@/contexts/SettingsContext'
import SettingsMenu from '@/components/SettingsMenu'

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
})

const openSans = Open_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-open-sans',
})

export const metadata: Metadata = {
  title: 'Jira Burndown Chart',
  description: 'Track time spent vs estimated time across your Jira boards',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${openSans.variable}`}>
      <body className={openSans.className}>
        <SettingsProvider>
          {/* Settings Menu - Fixed position */}
          <div className="fixed top-4 right-4 z-50">
            <SettingsMenu />
          </div>

          {children}
        </SettingsProvider>
      </body>
    </html>
  )
}
