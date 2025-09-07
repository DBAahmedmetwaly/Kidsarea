
'use client';

import AppSidebar from '@/components/layout/AppSidebar';
import { BossBabyLogo } from '@/components/layout/BossBabyLogo';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useFirebase } from '@/context/FirebaseContext';

function WelcomeContent() {
    const { policies, loading } = useFirebase();
    const appName = policies?.find(p => p.id === 'default')?.appName || 'FunTrack';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="flex items-center gap-4 absolute top-4 right-4 md:hidden">
            <SidebarTrigger />
        </div>
        <BossBabyLogo className="h-48 w-48 text-primary" />
        <p className="mt-8 text-lg text-muted-foreground">مرحباً بكم في</p>
        <h1 className="mt-2 text-4xl font-bold">{appName}</h1>
        <p className="mt-8 text-sm text-muted-foreground animate-pulse">{loading ? 'جاري تحميل البيانات...' : 'جاهز للإنطلاق!'}</p>
    </div>
  );
}

export default function WelcomePage() {
    return (
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            <WelcomeContent />
          </main>
        </div>
    );
}
