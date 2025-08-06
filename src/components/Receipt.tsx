
'use client';

import { Gamepad2, Smile, Clock, User, Calendar, Hash, Tag, PlusCircle, Star } from 'lucide-react';
import React from 'react';

export interface PosReceiptProps {
  appName: string;
  childName: string;
  parentName: string;
  gameName: string;
  checkInTime: Date;
  checkOutTime: Date;
  duration: string;
  totalCost: number;
  durationCost?: number;
  entryFee?: number;
  cashierName: string;
  isSubscription?: boolean;
}

export const PosReceipt = React.forwardRef<HTMLDivElement, PosReceiptProps>(({
  appName,
  childName,
  parentName,
  gameName,
  checkInTime,
  checkOutTime,
  duration,
  totalCost,
  durationCost,
  entryFee,
  cashierName,
  isSubscription,
}, ref) => {
  const receiptId = `R-${checkOutTime.getTime().toString().slice(-6)}`;

  return (
    <div ref={ref} className="bg-white p-2 text-black" style={{ width: '80mm', boxSizing: 'border-box' }}>
      <div className="text-center mb-4">
        <div className="flex justify-center items-center gap-2">
            <Gamepad2 className="w-10 h-10" />
            <h1 className="text-2xl font-bold">{appName}</h1>
        </div>
        <p className="text-sm">شكراً لزيارتكم!</p>
      </div>

      <div className="space-y-3 text-sm text-center">
        <div className="flex justify-between items-center">
          <span className="font-bold">{childName}</span>
          <span className="flex items-center gap-2"><Smile size={16} /> اسم الطفل</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold">{parentName}</span>
          <span className="flex items-center gap-2"><User size={16} /> ولي الأمر</span>
        </div>
        <hr className="border-dashed border-gray-400 my-2" />
        <div className="flex justify-between items-center">
          <span className="font-bold">{gameName}</span>
          <span className="flex items-center gap-2"><Gamepad2 size={16} /> اللعبة</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold">{checkInTime.toLocaleTimeString('ar-EG')}</span>
           <span className="flex items-center gap-2"><Calendar size={16} /> دخول</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold">{checkOutTime.toLocaleTimeString('ar-EG')}</span>
          <span className="flex items-center gap-2"><Calendar size={16} /> خروج</span>
        </div>
         <div className="flex justify-between items-center">
          <span className="font-bold">{duration}</span>
          <span className="flex items-center gap-2"><Clock size={16} /> المدة</span>
        </div>
        <hr className="border-dashed border-gray-400 my-2" />
        {isSubscription ? (
             <div className="flex justify-center items-center text-lg font-bold p-2 bg-green-100 text-green-800 rounded-md">
                <span className="flex items-center gap-2"><Star size={18} /> مدفوع بالاشتراك</span>
            </div>
        ) : (
            <>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="font-bold">{`ج.م ${(durationCost ?? totalCost).toFixed(2)}`}</span>
                        <span className="flex items-center gap-2"><Tag size={16} /> تكلفة اللعب</span>
                    </div>
                    {entryFee && entryFee > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="font-bold">{`ج.م ${entryFee.toFixed(2)}`}</span>
                            <span className="flex items-center gap-2"><PlusCircle size={16} /> رسوم دخول</span>
                        </div>
                    )}
                </div>
                <hr className="border-dashed border-gray-400 my-2" />
                <div className="flex justify-between items-center text-xl font-bold p-2 bg-gray-200">
                <span>{`ج.م ${totalCost.toFixed(2)}`}</span>
                <span>الإجمالي</span>
                </div>
            </>
        )}
      </div>

       <div className="mt-6 text-xs text-gray-600 text-center space-y-1">
            <p>الكاشير: {cashierName}</p>
            <p>رقم الإيصال: {receiptId}</p>
            <p>{new Date().toLocaleString('ar-EG')}</p>
       </div>
    </div>
  );
});

PosReceipt.displayName = 'PosReceipt';

    