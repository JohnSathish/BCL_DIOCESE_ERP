import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'BCL Diocese ERP',
  description: 'BCL Enterprise Suite — Catholic Diocese & Parish Management',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png', sizes: '1024x1024' }],
    apple: [{ url: '/icon-192.png', sizes: '1024x1024' }],
  },
};

const themeBootScript = `
(function(){
  try {
    var color = localStorage.getItem('bcl_color_theme_v2') || 'navy';
    var mode = localStorage.getItem('bcl_theme_mode') || localStorage.getItem('bcl_theme') || 'system';
    if (mode === 'auto') mode = 'system';
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (mode === 'light') dark = false;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.colorTheme = color;
    document.documentElement.dataset.themeMode = dark ? 'dark' : 'light';
    var appearance = {};
    try { appearance = JSON.parse(localStorage.getItem('bcl_appearance_v2') || '{}') || {}; } catch (e) {}
    document.documentElement.dataset.density = appearance.density === 'compact' ? 'compact' : 'comfortable';
    document.documentElement.dataset.sidebarStyle = appearance.sidebarStyle || 'solid';
    var radii = { sm: '6px', md: '12px', lg: '16px', xl: '20px', corporate: '8px' };
    if (appearance.radius && radii[appearance.radius]) {
      document.documentElement.style.setProperty('--bcl-radius', radii[appearance.radius]);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-sidebar-style="solid" data-color-theme="navy">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans antialiased"
        style={{
          ['--font-shp-display' as string]: '"Playfair Display", Georgia, serif',
          ['--font-shp-sans' as string]: 'Inter, "Source Sans 3", system-ui, sans-serif',
        }}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}