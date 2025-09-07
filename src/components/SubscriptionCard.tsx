
'use client';

import { Gamepad2, Smile, User, Calendar, Star, Shield } from 'lucide-react';
import React from 'react';
import { BossBabyLogo } from './layout/BossBabyLogo';

export interface SubscriptionCardProps {
  appName: string;
  customerName: string;
  childName: string;
  planName: string;
  endDate: Date;
}

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex items-start gap-2">
        <Icon className="w-5 h-5 text-gray-500 mt-1" />
        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-semibold text-sm">{value}</p>
        </div>
    </div>
);

export const SubscriptionCard = React.forwardRef<HTMLDivElement, SubscriptionCardProps>(({
  appName,
  customerName,
  childName,
  planName,
  endDate,
}, ref) => {
  return (
    <div ref={ref} className="bg-white text-black" style={{ width: '80mm', boxSizing: 'border-box', direction: 'rtl' }}>
        <div className="p-2 border-2 border-gray-300 rounded-lg bg-white m-2">
            <div className="text-center mb-2 pb-2 border-b border-gray-200">
                <div className="flex justify-center items-center gap-2">
                    <BossBabyLogo className="w-8 h-8 text-primary" />
                    <h1 className="text-lg font-bold">{appName}</h1>
                </div>
                <p className="text-sm font-semibold text-primary">بطاقة عضوية</p>
            </div>

            <div className="flex gap-2">
                <div className="w-1/3 flex flex-col items-center justify-center space-y-2">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                         <Smile size={40} className="text-gray-400" />
                    </div>
                </div>

                <div className="w-2/3 space-y-2">
                    <DetailRow icon={Smile} label="اسم الطفل" value={childName} />
                    <DetailRow icon={Shield} label="ولي الأمر" value={customerName} />
                    <DetailRow icon={Star} label="الباقة" value={planName} />
                    <DetailRow icon={Calendar} label="صالح حتى" value={endDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })} />
                </div>
            </div>

             <div className="mt-2 text-center">
                 <p className="text-xs text-gray-500">بطاقة شخصية وغير قابلة للتحويل</p>
            </div>
        </div>
    </div>
  );
});

SubscriptionCard.displayName = 'SubscriptionCard';
