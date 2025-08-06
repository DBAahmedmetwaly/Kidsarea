
'use client';

import { Gamepad2, Smile, Clock, User, Calendar, Hash, Tag, PlusCircle, Star, MinusCircle } from 'lucide-react';
import React from 'react';
import type { ReceiptSettings, CustomerChild } from '@/lib/types';

export interface PosReceiptProps {
  settings: ReceiptSettings | null;
  appName: string;
  children: CustomerChild[];
  parentName: string;
  gameName: string;
  checkInTime: Date;
  checkOutTime: Date;
  duration: string;
  totalCost: number;
  durationCost?: number;
  entryFee?: number;
  discount?: number;
  cashierName: string;
  isSubscription?: boolean;
}

export const PosReceipt = React.forwardRef<HTMLDivElement, PosReceiptProps>(({
  settings,
  appName,
  children,
  parentName,
  gameName,
  checkInTime,
  checkOutTime,
  duration,
  totalCost,
  durationCost,
  entryFee,
  discount,
  cashierName,
  isSubscription,
}, ref) => {
  const receiptId = `R-${checkOutTime.getTime().toString().slice(-6)}`;

  const show = (key: keyof ReceiptSettings) => !settings || settings[key];

  return (
    <div ref={ref} className="bg-white p-2 text-black" style={{ width: '80mm', boxSizing: 'border-box' }}>
      <div className="text-center mb-4">
        {show('showLogo') && <Gamepad2 className="w-10 h-10 mx-auto" />}
        {show('showAppName') && <h1 className="text-2xl font-bold">{appName}</h1>}
        {show('showThankYouMessage') && <p className="text-sm">{settings?.thankYouMessage}</p>}
      </div>

      <div className="space-y-3 text-sm text-center">
        {show('showChildName') && (
            <div className="flex justify-between items-center">
                <span className="font-bold">{children.map(c => c.name).join(', ')}</span>
                <span className="flex items-center gap-2"><Smile size={16} /> اسم الطفل</span>
            </div>
        )}
        {show('showParentName') && (
            <div className="flex justify-between items-center">
                <span className="font-bold">{parentName}</span>
                <span className="flex items-center gap-2"><User size={16} /> ولي الأمر</span>
            </div>
        )}
        <hr className="border-dashed border-gray-400 my-2" />
        {show('showGameName') && (
            <div className="flex justify-between items-center">
                <span className="font-bold">{gameName}</span>
                <span className="flex items-center gap-2"><Gamepad2 size={16} /> اللعبة</span>
            </div>
        )}
        {show('showCheckInTime') && (
            <div className="flex justify-between items-center">
                <span className="font-bold">{checkInTime.toLocaleTimeString('ar-EG')}</span>
                <span className="flex items-center gap-2"><Calendar size={16} /> دخول</span>
            </div>
        )}
        {show('showCheckOutTime') && (
            <div className="flex justify-between items-center">
                <span className="font-bold">{checkOutTime.toLocaleTimeString('ar-EG')}</span>
                <span className="flex items-center gap-2"><Calendar size={16} /> خروج</span>
            </div>
        )}
         {show('showDuration') && (
            <div className="flex justify-between items-center">
                <span className="font-bold">{duration}</span>
                <span className="flex items-center gap-2"><Clock size={16} /> المدة</span>
            </div>
        )}
        <hr className="border-dashed border-gray-400 my-2" />
        {isSubscription ? (
             <div className="flex justify-center items-center text-lg font-bold p-2 bg-green-100 text-green-800 rounded-md">
                <span className="flex items-center gap-2"><Star size={18} /> مدفوع بالاشتراك</span>
            </div>
        ) : (
            <>
                <div className="space-y-2">
                    {show('showDurationCost') && (
                        <div className="flex justify-between items-center">
                            <span className="font-bold">{`ج.م ${(durationCost ?? 0).toFixed(2)}`}</span>
                            <span className="flex items-center gap-2"><Tag size={16} /> تكلفة اللعب</span>
                        </div>
                    )}
                    {show('showEntryFee') && entryFee && entryFee > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="font-bold">{`ج.م ${entryFee.toFixed(2)}`}</span>
                            <span className="flex items-center gap-2"><PlusCircle size={16} /> رسوم دخول</span>
                        </div>
                    )}
                     {show('showDiscount') && discount && discount > 0 && (
                        <div className="flex justify-between items-center text-red-600">
                            <span className="font-bold">{`-ج.م ${discount.toFixed(2)}`}</span>
                            <span className="flex items-center gap-2"><MinusCircle size={16} /> الخصم</span>
                        </div>
                    )}
                </div>
                <hr className="border-dashed border-gray-400 my-2" />
                {show('showTotalCost') && (
                    <div className="flex justify-between items-center text-xl font-bold p-2 bg-gray-200">
                    <span>{`ج.م ${totalCost.toFixed(2)}`}</span>
                    <span>الإجمالي</span>
                    </div>
                )}
            </>
        )}
      </div>

       <div className="mt-6 text-xs text-gray-600 text-center space-y-1">
            {show('showCashierName') && <p>الكاشير: {cashierName}</p>}
            {show('showReceiptId') && <p>رقم الإيصال: {receiptId}</p>}
            {show('showTimestamp') && <p>{new Date().toLocaleString('ar-EG')}</p>}
            {settings?.customFooter && <p>{settings.customFooter}</p>}
       </div>
    </div>
  );
});

PosReceipt.displayName = 'PosReceipt';
