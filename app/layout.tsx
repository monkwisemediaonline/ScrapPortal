import type { Metadata } from 'next'
import { Inter, Archivo, Noto_Sans_Devanagari, Noto_Sans_Gurmukhi } from 'next/font/google'
import Header from '@/components/Header'
import { APP_NAME, CITY } from '@/lib/config'
import { getDict } from '@/lib/i18n'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'], weight: ['600', '700', '800'] })
const deva = Noto_Sans_Devanagari({ variable: '--font-deva', subsets: ['devanagari'], weight: ['400', '600', '700'] })
const guru = Noto_Sans_Gurmukhi({ variable: '--font-guru', subsets: ['gurmukhi'], weight: ['400', '600', '700'] })

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — Daily scrap rates & auctions`, template: `%s · ${APP_NAME}` },
  description: `Today's industrial scrap rates in ${CITY} — iron, katran, cardboard, plastic — and live scrap lot auctions for factories, furnaces and mills.`,
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const { locale } = await getDict()
  return (
    <html lang={locale} className={`${inter.variable} ${archivo.variable} ${deva.variable} ${guru.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted flex flex-col sm:flex-row gap-2 justify-between">
            <span>© {new Date().getFullYear()} {APP_NAME}</span>
            <span>{CITY}, Punjab</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
