
'use client';

import { Gamepad2, Smile, Clock, User, Calendar, Hash, Tag, PlusCircle } from 'lucide-react';
import React from 'react';
import { useFirebase } from '@/context/FirebaseContext';

export interface ReceiptProps {
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
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({
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
}, ref) => {
  const { policies } = useFirebase();
  const receiptId = `R-${checkOutTime.getTime().toString().slice(-6)}`;
  const appName = policies?.appName || 'FunTrack';

  return (
    <div ref={ref} className="bg-white p-4 text-black printable-area font-sans">
      <div className="text-center mb-4">
        <div className="flex justify-center items-center gap-2">
            <Gamepad2 className="w-8 h-8" />
            <h1 className="text-2xl font-bold">{appName}</h1>
        </div>
        <p className="text-xs">شكراً لزيارتكم!</p>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><Smile size={12} /> اسم الطفل</span>
          <span className="font-medium">{childName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><User size={12} /> ولي الأمر</span>
          <span className="font-medium">{parentName}</span>
        </div>
        <hr className="border-dashed border-gray-400 my-2" />
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><Gamepad2 size={12} /> اللعبة</span>
          <span className="font-medium">{gameName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><Calendar size={12} /> دخول</span>
          <span className="font-medium text-right">{checkInTime.toLocaleTimeString('ar-EG')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><Calendar size={12} /> خروج</span>
          <span className="font-medium text-right">{checkOutTime.toLocaleTimeString('ar-EG')}</span>
        </div>
         <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><Clock size={12} /> المدة</span>
          <span className="font-medium">{duration}</span>
        </div>
        <hr className="border-dashed border-gray-400 my-2" />
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <span className="flex items-center gap-1"><Tag size={12} /> تكلفة اللعب</span>
                <span className="font-medium">{`ج.م ${(durationCost ?? totalCost).toFixed(2)}`}</span>
            </div>
            {entryFee && entryFee > 0 && (
                 <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1"><PlusCircle size={12} /> رسوم دخول</span>
                    <span className="font-medium">{`ج.م ${entryFee.toFixed(2)}`}</span>
                </div>
            )}
        </div>
        <hr className="border-dashed border-gray-400 my-2" />
        <div className="flex justify-between items-center text-sm font-bold p-2 bg-gray-200">
          <span>الإجمالي</span>
          <span>{`ج.م ${totalCost.toFixed(2)}`}</span>
        </div>
      </div>

       <div className="mt-4 text-[8px] text-gray-600 text-center space-y-0.5">
            <p>الكاشير: {cashierName}</p>
            <p>رقم الإيصال: {receiptId}</p>
            <p>{new Date().toLocaleString('ar-EG')}</p>
       </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
