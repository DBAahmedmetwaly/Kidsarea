
'use client';

import { Gamepad2, Smile, User, Calendar, Star, Tag } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import type { Policies, ReceiptSettings } from '@/lib/types';

export interface SubscriptionReceiptProps {
  appName: string;
  customerName: string;
  childName: string;
  planName: string;
  startDate: Date;
  endDate: Date;
  price: number;
  cashierName: string;
  settings: ReceiptSettings | null;
}

const ReceiptRow = ({ label, value, valueClass = '' }: { label: React.ReactNode, value: React.ReactNode, valueClass?: string }) => (
    <div className="flex justify-between items-center text-xs py-0.5 border-b border-dashed border-gray-400">
        <span className="font-semibold flex items-center gap-1">{label}</span>
        <span className={cn("font-bold text-left", valueClass)}>{value}</span>
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


export const SubscriptionReceipt = React.forwardRef<HTMLDivElement, SubscriptionReceiptProps>(({
  appName,
  customerName,
  childName,
  planName,
  startDate,
  endDate,
  price,
  cashierName,
  settings
}, ref) => {
  const receiptId = `SUB-${new Date().getTime().toString().slice(-6)}`;
  const receiptWidth = settings?.receiptWidth || 72;
  const show = (key: keyof ReceiptSettings) => !settings || settings[key];

  return (
    <div ref={ref} className="bg-white p-1 text-black" style={{ width: `${receiptWidth}mm`, boxSizing: 'border-box' }}>
      <div className="text-center mb-1">
        {show('showLogo') && <BossBabyLogo className="mx-auto h-12 w-12 text-black" />}
        <h1 className="text-xl font-bold">{appName}</h1>
        <p className="text-xs font-semibold">إيصال اشتراك</p>
      </div>

      <div className="space-y-0.5">
        <ReceiptRow label="ولي الأمر" value={customerName} />
        <ReceiptRow label="الطفل" value={childName} />

        <div className='my-1 border-t border-dashed border-gray-400' />
        
        <ReceiptRow label="الباقة" value={planName} />
        <ReceiptRow label="تاريخ البدء" value={startDate.toLocaleDateString('ar-EG')} />
        <ReceiptRow label="تاريخ الانتهاء" value={endDate.toLocaleDateString('ar-EG')} />

        <div className='my-1 border-t border-dashed border-gray-400' />
        
        <div className="flex justify-between items-center text-lg font-bold p-1 mt-1 bg-gray-200 rounded-md">
            <span>الإجمالي المدفوع</span>
            <span>{`ج.م ${price.toFixed(2)}`}</span>
        </div>
      </div>

       <div className="mt-2 text-center text-xs text-gray-600 space-y-0">
            <p>الكاشير: {cashierName}</p>
            <p>رقم الإيصال: {receiptId}</p>
            <p>{new Date().toLocaleString('ar-EG')}</p>
       </div>
    </div>
  );
});

SubscriptionReceipt.displayName = 'SubscriptionReceipt';
