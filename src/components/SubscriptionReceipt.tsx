
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
      <div className="text-center mb-4">
        <div className="flex justify-center items-center gap-2">
            <Gamepad2 className="w-10 h-10" />
            <h1 className="text-2xl font-bold">{appName}</h1>
        </div>
        <p className="text-sm">إيصال اشتراك</p>
      </div>

      <div className="space-y-3 text-sm text-center">
        <div className="flex justify-between items-center">
          <span className="font-bold">{customerName}</span>
          <span className="flex items-center gap-2"><User size={16} /> ولي الأمر</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold">{childName}</span>
          <span className="flex items-center gap-2"><Smile size={16} /> اسم الطفل</span>
        </div>
        <hr className="border-dashed border-gray-400 my-2" />
        <div className="flex justify-between items-center">
          <span className="font-bold">{planName}</span>
          <span className="flex items-center gap-2"><Star size={16} /> الباقة</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold">{startDate.toLocaleDateString('ar-EG')}</span>
          <span className="flex items-center gap-2"><Calendar size={16} /> تاريخ البدء</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold">{endDate.toLocaleDateString('ar-EG')}</span>
          <span className="flex items-center gap-2"><Calendar size={16} /> تاريخ الانتهاء</span>
        </div>
        <hr className="border-dashed border-gray-400 my-2" />
        <div className="flex justify-between items-center text-xl font-bold p-2 bg-gray-200">
            <span>{`ج.م ${price.toFixed(2)}`}</span>
            <span>الإجمالي المدفوع</span>
        </div>
      </div>

       <div className="mt-6 text-xs text-gray-600 text-center space-y-1">
            <p>الكاشير: {cashierName}</p>
            <p>رقم الإيصال: {receiptId}</p>
            <p>{new Date().toLocaleString('ar-EG')}</p>
       </div>
    </div>
  );
});

SubscriptionReceipt.displayName = 'SubscriptionReceipt';

    