
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import AuthProvider from '@/components/AuthProvider';
import { SessionProvider } from '@/context/SessionContext';
import { CustomerProvider } from '@/context/CustomerContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FirebaseProvider } from '@/context/FirebaseContext';


export const metadata: Metadata = {
  title: 'FunTrack Manager',
  description: 'Kids Play Area Management System',
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
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
        <AuthProvider>
            <CustomerProvider>
              <SessionProvider>
                <SidebarProvider>
                    {children}
                </SidebarProvider>
              </SessionProvider>
            </CustomerProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
