
'use client';

import { Gamepad2, Smile, User, Calendar, Star, Shield } from 'lucide-react';
import React from 'react';

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

const BossBabyLogo = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      fill="currentColor"
    >
      <g>
        {/* Head */}
        <path d="M100,20 C133.14,20 160,46.86 160,80 C160,113.14 133.14,140 100,140 C66.86,140 40,113.14 40,80 C40,46.86 66.86,20 100,20 Z" fill="#FFDAB9" />
        <path d="M100,20 C110,20 120,22 128,25 C125,22 105,18 100,18 C95,18 75,22 72,25 C80,22 90,20 100,20" fill="#FFEBCD" />
        
        {/* Hair */}
        <path d="M100,18 C90,15 75,15 70,25 C70,15 80,10 100,10 C120,10 130,15 130,25 C125,15 110,15 100,18" fill="#F4A460" />
        <path d="M100,10 C105,8 110,12 110,15 C110,18 105,20 100,20 C95,20 90,18 90,15 C90,12 95,8 100,10" fill="#DEB887" />

        {/* Eyes */}
        <circle cx="80" cy="75" r="10" fill="white" />
        <circle cx="120" cy="75" r="10" fill="white" />
        <circle cx="80" cy="75" r="5" fill="#2E8B57" />
        <circle cx="120" cy="75" r="5" fill="#2E8B57" />
        <circle cx="82" cy="73" r="2" fill="white" />
        <circle cx="122" cy="73" r="2" fill="white" />

        {/* Eyebrows */}
        <path d="M70,60 Q80,55 90,60" stroke="black" strokeWidth="3" fill="none" />
        <path d="M110,60 Q120,55 130,60" stroke="black" strokeWidth="3" fill="none" />

        {/* Nose */}
        <path d="M98,85 Q100,90 102,85" stroke="#D2691E" strokeWidth="2" fill="none" />

        {/* Mouth */}
        <path d="M90,105 Q100,110 110,105" stroke="black" strokeWidth="2" fill="none" />

        {/* Body */}
        <path d="M100,135 C80,150 70,180 70,190 L130,190 C130,180 120,150 100,135 Z" fill="#2c3e50" />
        
        {/* Collar and Tie */}
        <path d="M90,140 L100,150 L110,140 Z" fill="white" />
        <path d="M100,150 L95,175 L105,175 L100,150 Z" fill="#c0392b" />
        <circle cx="100" cy="150" r="4" fill="#e74c3c" />
      </g>
    </svg>
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
