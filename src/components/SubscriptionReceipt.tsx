
'use client';

import { Gamepad2, Smile, User, Calendar, Star, Tag } from 'lucide-react';
import React from 'react';

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

const ReceiptRow = ({ label, value }: { label: string, value: string | number }) => (
    <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-bold text-sm">{value}</p>
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
    <div ref={ref} className="bg-white p-2 text-black text-center" style={{ width: '80mm', boxSizing: 'border-box' }}>
      <div className="mb-4">
        <div className="flex justify-center items-center gap-2">
            <Gamepad2 className="w-10 h-10" />
            <h1 className="text-2xl font-bold">{appName}</h1>
        </div>
        <p className="text-sm">إيصال اشتراك</p>
      </div>

      <div className="space-y-3 text-sm">
        <ReceiptRow label="ولي الأمر" value={customerName} />
        <ReceiptRow label="اسم الطفل" value={childName} />

        <hr className="border-dashed border-gray-400 my-2" />
        
        <ReceiptRow label="الباقة" value={planName} />
        <ReceiptRow label="تاريخ البدء" value={startDate.toLocaleDateString('ar-EG')} />
        <ReceiptRow label="تاريخ الانتهاء" value={endDate.toLocaleDateString('ar-EG')} />

        <hr className="border-dashed border-gray-400 my-2" />
        <div className="flex justify-between items-center text-xl font-bold p-2 bg-gray-200 rounded-md">
            <span>الإجمالي المدفوع</span>
            <span>{`ج.م ${price.toFixed(2)}`}</span>
        </div>
      </div>

       <div className="mt-6 text-xs text-gray-600 space-y-1">
            <p>الكاشير: {cashierName}</p>
            <p>رقم الإيصال: {receiptId}</p>
            <p>{new Date().toLocaleString('ar-EG')}</p>
       </div>
    </div>
  );
});

SubscriptionReceipt.displayName = 'SubscriptionReceipt';
