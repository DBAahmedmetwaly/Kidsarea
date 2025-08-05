
'use client';

import { Gamepad2 } from 'lucide-react';
import { useFirebase } from '@/context/FirebaseContext';


export default function SplashScreen() {
    // We can fetch appName here if needed, or pass as a prop.
    // For simplicity, let's assume a static or context-based name.
    const { policies } = useFirebase();
    const appName = policies?.appName || 'FunTrack';

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background w-full">
            <div className="text-center">
                <Gamepad2 className="h-24 w-24 text-primary mx-auto animate-bounce" />
                <h1 className="mt-6 text-4xl font-bold">{appName}</h1>
                <p className="mt-2 text-lg text-muted-foreground">نظام إدارة مناطق ألعاب الأطفال</p>
                 <p className="mt-8 text-sm text-muted-foreground animate-pulse">جاري التحميل...</p>
            </div>
        </div>
    );
}
