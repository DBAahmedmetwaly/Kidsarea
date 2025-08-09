
'use client';

import { Gamepad2, Smile, User, Calendar, Star, Tag } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';

export interface SubscriptionReceiptProps {
  appName: string;
  customerName: string;
  childName: string;
  planName: string;
  startDate: Date;
  endDate: Date;
  price: number;
  cashierName: string;
}

const ReceiptRow = ({ label, value, valueClass = '' }: { label: React.ReactNode, value: React.ReactNode, valueClass?: string }) => (
    <div className="flex justify-between items-center text-xs py-1 border-b border-dashed border-gray-400">
        <span className="font-semibold flex items-center gap-1">{label}</span>
        <span className={cn("font-bold text-left", valueClass)}>{value}</span>
    </div>
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
}, ref) => {
  const receiptId = `SUB-${new Date().getTime().toString().slice(-6)}`;

  return (
    <div ref={ref} className="bg-white p-2 text-black" style={{ width: '80mm', boxSizing: 'border-box' }}>
      <div className="text-center mb-2">
        <Gamepad2 className="w-8 h-8 mx-auto text-primary" />
        <h1 className="text-xl font-bold">{appName}</h1>
        <p className="text-xs font-semibold">إيصال اشتراك</p>
      </div>

      <div className="space-y-0.5">
        <ReceiptRow label={<><User/> ولي الأمر</>} value={customerName} />
        <ReceiptRow label={<><Smile/> الطفل</>} value={childName} />

        <div className='my-2 border-t border-dashed border-gray-400' />
        
        <ReceiptRow label={<><Star/> الباقة</>} value={planName} />
        <ReceiptRow label={<><Calendar/> تاريخ البدء</>} value={startDate.toLocaleDateString('ar-EG')} />
        <ReceiptRow label={<><Calendar/> تاريخ الانتهاء</>} value={endDate.toLocaleDateString('ar-EG')} />

        <div className='my-2 border-t border-dashed border-gray-400' />
        
        <div className="flex justify-between items-center text-lg font-bold p-2 mt-1 bg-gray-200 rounded-md">
            <span>الإجمالي المدفوع</span>
            <span>{`ج.م ${price.toFixed(2)}`}</span>
        </div>
      </div>

       <div className="mt-4 text-center text-xs text-gray-600 space-y-0.5">
            <p>الكاشير: {cashierName}</p>
            <p>رقم الإيصال: {receiptId}</p>
            <p>{new Date().toLocaleString('ar-EG')}</p>
       </div>
    </div>
  );
});

SubscriptionReceipt.displayName = 'SubscriptionReceipt';
