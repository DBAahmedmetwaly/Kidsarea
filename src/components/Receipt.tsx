
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

const ReceiptRow = ({ label, value }: { label: string, value: string | number }) => (
    <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-bold text-sm">{value}</p>
    </div>
);

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
    <div ref={ref} className="bg-white p-2 text-black text-center" style={{ width: '80mm', boxSizing: 'border-box' }}>
      <div className="mb-4">
        {show('showLogo') && <Gamepad2 className="w-10 h-10 mx-auto" />}
        {show('showAppName') && <h1 className="text-2xl font-bold">{appName}</h1>}
        {show('showThankYouMessage') && <p className="text-sm">{settings?.thankYouMessage}</p>}
      </div>

      <div className="space-y-3 text-sm">
        {show('showChildName') && (
            <ReceiptRow label="اسم الطفل" value={children.map(c => c.name).join(', ')} />
        )}
        {show('showParentName') && (
            <ReceiptRow label="ولي الأمر" value={parentName} />
        )}
        <hr className="border-dashed border-gray-400 my-2" />
        {show('showGameName') && (
            <ReceiptRow label="اللعبة" value={gameName} />
        )}
        {show('showCheckInTime') && (
            <ReceiptRow label="وقت الدخول" value={checkInTime.toLocaleTimeString('ar-EG')} />
        )}
        {show('showCheckOutTime') && (
            <ReceiptRow label="وقت الخروج" value={checkOutTime.toLocaleTimeString('ar-EG')} />
        )}
         {show('showDuration') && (
            <ReceiptRow label="المدة" value={duration} />
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
                        <div className="flex justify-between items-center px-2">
                            <span>تكلفة اللعب</span>
                            <span className="font-bold">{`ج.م ${(durationCost ?? 0).toFixed(2)}`}</span>
                        </div>
                    )}
                    {show('showEntryFee') && entryFee && entryFee > 0 && (
                        <div className="flex justify-between items-center px-2">
                           <span>رسوم دخول</span>
                           <span className="font-bold">{`ج.م ${entryFee.toFixed(2)}`}</span>
                        </div>
                    )}
                     {show('showDiscount') && discount && discount > 0 && (
                        <div className="flex justify-between items-center text-red-600 px-2">
                            <span>الخصم</span>
                            <span className="font-bold">{`-ج.م ${discount.toFixed(2)}`}</span>
                        </div>
                    )}
                </div>
                <hr className="border-dashed border-gray-400 my-2" />
                {show('showTotalCost') && (
                    <div className="flex justify-between items-center text-xl font-bold p-2 bg-gray-200 rounded-md">
                    <span>الإجمالي</span>
                    <span>{`ج.م ${totalCost.toFixed(2)}`}</span>
                    </div>
                )}
            </>
        )}
      </div>

       <div className="mt-6 text-xs text-gray-600 space-y-1">
            {show('showCashierName') && <p>الكاشير: {cashierName}</p>}
            {show('showReceiptId') && <p>رقم الإيصال: {receiptId}</p>}
            {show('showTimestamp') && <p>{new Date().toLocaleString('ar-EG')}</p>}
            {settings?.customFooter && <p>{settings.customFooter}</p>}
       </div>
    </div>
  );
});

PosReceipt.displayName = 'PosReceipt';
