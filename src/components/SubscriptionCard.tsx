
'use client';

import { Gamepad2, Smile, User, Calendar, Star, Sun, Shield } from 'lucide-react';
import React from 'react';

export interface SubscriptionCardProps {
  appName: string;
  customerName: string;
  childName: string;
  planName: string;
  endDate: Date;
}

export const SubscriptionCard = React.forwardRef<HTMLDivElement, SubscriptionCardProps>(({
  appName,
  customerName,
  childName,
  planName,
  endDate,
}, ref) => {
  return (
    <div ref={ref} className="bg-white text-black" style={{ width: '80mm', boxSizing: 'border-box', direction: 'rtl' }}>
        <div className="p-4 border-4 border-dashed border-gray-400 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 m-2">
            <div className="text-center mb-4 pb-2 border-b-2 border-gray-300">
                <div className="flex justify-center items-center gap-2">
                    <Gamepad2 className="w-8 h-8 text-primary" />
                    <h1 className="text-xl font-bold">{appName}</h1>
                </div>
                <p className="text-md font-semibold text-primary">بطاقة عضوية</p>
            </div>

            <div className="space-y-4 text-right">
                 <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                         <Smile size={32} className="text-gray-500" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">اسم الطفل</p>
                        <p className="text-lg font-bold">{childName}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <Shield size={24} className="text-gray-500 w-8"/>
                    <div>
                        <p className="text-sm text-gray-600">ولي الأمر</p>
                        <p className="font-semibold">{customerName}</p>
                    </div>
                </div>
                
                 <div className="flex items-center gap-3">
                    <Star size={24} className="text-gray-500 w-8"/>
                     <div>
                        <p className="text-sm text-gray-600">الباقة</p>
                        <p className="font-semibold">{planName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Sun size={24} className="text-gray-500 w-8"/>
                     <div>
                        <p className="text-sm text-gray-600">صالح حتى</p>
                        <p className="font-semibold">{endDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>
             <div className="mt-4 text-center">
                 <p className="text-xs text-gray-500">بطاقة شخصية وغير قابلة للتحويل</p>
            </div>
        </div>
    </div>
  );
});

SubscriptionCard.displayName = 'SubscriptionCard';
