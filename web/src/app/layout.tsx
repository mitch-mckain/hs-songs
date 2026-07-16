import type { Metadata } from 'next'
import { IBM_Plex_Mono, Archivo, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
})

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
})

export const metadata: Metadata = {
  title: 'Heavy Sweater Resource',
  description: 'Band internal song tool',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Heavy Sweater',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexMono.variable} ${archivo.variable} ${ibmPlexSans.variable}`}>
      <body className="antialiased">
        <div id="app-splash" style={{ position: 'fixed', inset: 0, background: '#F6F2E8', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, transition: 'opacity 0.4s ease' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="64" height="64" style={{ animation: 'splash-pulse 1.4s ease-in-out infinite' }}>
            <defs>
              <linearGradient id="sp-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4A4440"/><stop offset="1" stopColor="#0A0908"/></linearGradient>
              <linearGradient id="sp-cass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF"/><stop offset="1" stopColor="#E9E5E0"/></linearGradient>
              <mask id="sp-mask">
                <g transform="rotate(-6 50 50)">
                  <rect x="10" y="24" width="80" height="52" rx="9" fill="#FFFFFF"/>
                  <rect x="16" y="35" width="68" height="30" rx="15" fill="#000000"/>
                  <line x1="32" y1="42.5" x2="68" y2="42.5" stroke="#FFFFFF" strokeWidth="3"/>
                  <line x1="32" y1="57.5" x2="68" y2="57.5" stroke="#FFFFFF" strokeWidth="3"/>
                  <circle cx="32" cy="50" r="9.5" fill="#FFFFFF"/>
                  <circle cx="32" cy="50" r="3.8" fill="#000000"/>
                  <circle cx="68" cy="50" r="9.5" fill="#FFFFFF"/>
                  <circle cx="68" cy="50" r="3.8" fill="#000000"/>
                </g>
              </mask>
            </defs>
            <rect width="100" height="100" rx="20" fill="url(#sp-bg)"/>
            <g transform="translate(50 50) scale(0.88) translate(-50 -50)">
              <rect width="100" height="100" rx="20" fill="url(#sp-cass)" mask="url(#sp-mask)"/>
            </g>
          </svg>
        </div>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function hideSplash() {
              var s = document.getElementById('app-splash');
              if (s) { s.style.opacity = '0'; setTimeout(function() { if (s.parentNode) s.parentNode.removeChild(s); }, 400); }
            }
            // Only show splash on first load — skip it on subsequent page navigations
            if (sessionStorage.getItem('hs_loaded')) {
              var s = document.getElementById('app-splash');
              if (s) s.style.display = 'none';
            } else {
              sessionStorage.setItem('hs_loaded', '1');
              if (document.readyState === 'complete') { setTimeout(hideSplash, 100); }
              else { window.addEventListener('load', function() { setTimeout(hideSplash, 100); }); }
            }
          })();
        ` }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
