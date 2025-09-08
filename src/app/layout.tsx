
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import AuthProvider from '@/components/AuthProvider';
import { SessionProvider } from '@/context/SessionContext';
import { CustomerProvider } from '@/context/CustomerContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FirebaseProvider } from '@/context/FirebaseContext';
import { PermissionsProvider } from '@/context/PermissionsContext';


export const metadata: Metadata = {
  title: 'FunTrack Manager',
  description: 'Kids Play Area Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><g><path d='M100,20 C133.14,20 160,46.86 160,80 C160,113.14 133.14,140 100,140 C66.86,140 40,113.14 40,80 C40,46.86 66.86,20 100,20 Z' fill='%23FFDAB9' /><path d='M100,20 C110,20 120,22 128,25 C125,22 105,18 100,18 C95,18 75,22 72,25 C80,22 90,20 100,20' fill='%23FFEBCD' /><path d='M100,18 C90,15 75,15 70,25 C70,15 80,10 100,10 C120,10 130,15 130,25 C125,15 110,15 100,18' fill='%23F4A460' /><path d='M100,10 C105,8 110,12 110,15 C110,18 105,20 100,20 C95,20 90,18 90,15 C90,12 95,8 100,10' fill='%23DEB887' /><circle cx='80' cy='75' r='10' fill='white' /><circle cx='120' cy='75' r='10' fill='white' /><circle cx='80' cy='75' r='5' fill='%232E8B57' /><circle cx='120' cy='75' r='5' fill='%232E8B57' /><circle cx='82' cy='73' r='2' fill='white' /><circle cx='122' cy='73' r='2' fill='white' /><path d='M70,60 Q80,55 90,60' stroke='black' stroke-width='3' fill='none' /><path d='M110,60 Q120,55 130,60' stroke='black' stroke-width='3' fill='none' /><path d='M98,85 Q100,90 102,85' stroke='%23D2691E' stroke-width='2' fill='none' /><path d='M90,105 Q100,110 110,105' stroke='black' stroke-width='2' fill='none' /><path d='M100,135 C80,150 70,180 70,190 L130,190 C130,180 120,150 100,135 Z' fill='%232c3e50' /><path d='M90,140 L100,150 L110,140 Z' fill='white' /><path d='M100,150 L95,175 L105,175 L100,150 Z' fill='%23c0392b' /><circle cx='100' cy='150' r='4' fill='%23e74c3c' /></g></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#4ab7e2" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased'
        )}
      >
        <FirebaseProvider>
            <AuthProvider>
              <PermissionsProvider>
                <CustomerProvider>
                  <SessionProvider>
                    <SidebarProvider>
                        {children}
                        <Toaster />
                    </SidebarProvider>
                  </SessionProvider>
                </CustomerProvider>
              </PermissionsProvider>
            </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
