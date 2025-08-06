
'use client';

import AppSidebar from '@/components/layout/AppSidebar';
import SplashScreen from '@/components/layout/SplashScreen';


export default function WelcomePage() {
    return (
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto">
            <SplashScreen />
          </main>
        </div>
    );
}

    