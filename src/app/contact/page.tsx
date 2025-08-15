
'use client';

import { Phone, User, Building } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ZeroLogo = () => (
    <svg width="64" height="64" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
        <rect width="200" height="200" rx="40" fill="hsl(var(--primary))"/>
        <path d="M128.5 54.5L71.5 145.5" stroke="hsl(var(--primary-foreground))" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M128.5 54.5H86C77.7157 54.5 71.5 60.7157 71.5 69V75.5" stroke="hsl(var(--primary-foreground))" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M71.5 145.5H114C122.284 145.5 128.5 139.284 128.5 131V124.5" stroke="hsl(var(--primary-foreground))" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


function ContactContent() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <Phone className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl">اتصل بنا</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <ZeroLogo />
            <CardTitle className="text-2xl pt-4">Zero for Programming and IT Services</CardTitle>
            <CardDescription>للدعم الفني والاستفسارات، يمكنكم التواصل معنا عبر القنوات التالية:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                <div className="space-y-2 p-4 border rounded-lg">
                    <User className="h-8 w-8 text-primary mx-auto" />
                    <h3 className="font-semibold text-lg">أحمد متولي</h3>
                    <a href="tel:01015117371" className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <Phone className="h-4 w-4" />
                        <span>01015117371</span>
                    </a>
                </div>
                <div className="space-y-2 p-4 border rounded-lg">
                    <User className="h-8 w-8 text-primary mx-auto" />
                    <h3 className="font-semibold text-lg">عمر عصام</h3>
                     <a href="tel:01274554868" className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <Phone className="h-4 w-4" />
                        <span>01274554868</span>
                    </a>
                </div>
            </div>
             <div className="text-center text-muted-foreground pt-4 border-t">
                <p>&copy; {new Date().getFullYear()} Zero Services. جميع الحقوق محفوظة.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ContactPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                    <ContactContent />
                </main>
            </div>
        </SidebarProvider>
    );
}
