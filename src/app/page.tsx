
'use client';

import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useFirebase } from '@/context/FirebaseContext';

const BossBabyLogo = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2a2 2 0 0 0-2 2v2H8c-1.1 0-2 .9-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2zm0 2c.55 0 1 .45 1 1v1h-2V5c0-.55.45-1 1-1zm-2 6h4v2h-4v-2zm0 4h4v2h-4v-2z" />
      <path d="M9 10.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .5-.25.95-.63 1.22-.5.37-1.17.58-1.87.58s-1.37-.21-1.87-.58C9.25 11.45 9 11 9 10.5zM15 10.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .5-.25.95-.63 1.22-.5.37-1.17.58-1.87.58s-1.37-.21-1.87-.58c-.38-.27-.63-.72-.63-1.22z" />
       <path d="M12 16.5c-1.93 0-3.5-1.57-3.5-3.5 0-.55.45-1 1-1s1 .45 1 1c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5c0-.55.45-1 1-1s1 .45 1 1c0 1.93-1.57 3.5-3.5 3.5z"/>
    </svg>
);


function WelcomeContent() {
    const { policies, loading } = useFirebase();
    const appName = policies?.find(p => p.id === 'default')?.appName || 'FunTrack';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="flex items-center gap-4 absolute top-4 right-4 md:hidden">
            <SidebarTrigger />
        </div>
        <BossBabyLogo className="h-24 w-24 text-primary animate-bounce" />
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
