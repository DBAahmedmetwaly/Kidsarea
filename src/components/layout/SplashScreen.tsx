
'use client';

import { Gamepad2 } from 'lucide-react';
import { useFirebase } from '@/context/FirebaseContext';


export default function SplashScreen() {
    const { policies, loading } = useFirebase();
    const appName = policies?.appName || 'FunTrack';

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background w-full">
            <div className="text-center">
                <Gamepad2 className="h-24 w-24 text-primary mx-auto animate-bounce" />
                <p className="mt-8 text-lg text-muted-foreground">مرحباً بكم في</p>
                <h1 className="mt-2 text-4xl font-bold">{appName}</h1>
                 <p className="mt-8 text-sm text-muted-foreground animate-pulse">{loading ? 'جاري تحميل البيانات...' : 'جاهز للإنطلاق!'}</p>
            </div>
        </div>
    );
}

    