
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
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2a2 2 0 0 0-2 2v2H8c-1.1 0-2 .9-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2zm0 2c.55 0 1 .45 1 1v1h-2V5c0-.55.45-1 1-1zm-2 6h4v2h-4v-2zm0 4h4v2h-4v-2z" />
      <path d="M9 10.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .5-.25.95-.63 1.22-.5.37-1.17.58-1.87.58s-1.37-.21-1.87-.58C9.25 11.45 9 11 9 10.5zM15 10.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .5-.25.95-.63 1.22-.5.37-1.17.58-1.87.58s-1.37-.21-1.87-.58c-.38-.27-.63-.72-.63-1.22z" />
       <path d="M12 16.5c-1.93 0-3.5-1.57-3.5-3.5 0-.55.45-1 1-1s1 .45 1 1c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5c0-.55.45-1 1-1s1 .45 1 1c0 1.93-1.57 3.5-3.5 3.5z"/>
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
        {show('showLogo') && <BossBabyLogo className="mx-auto h-8 w-8 text-black" />}
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
