
'use client';

import { Gamepad2, Smile, Clock, User, Calendar, Hash, Tag, PlusCircle, Star, MinusCircle } from 'lucide-react';
import React from 'react';
import type { ReceiptSettings, CustomerChild } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface PosReceiptProps {
  receiptId?: string;
  settings: ReceiptSettings | null;
  appName: string;
  branchName: string;
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

const ReceiptRow = ({ label, value, valueClass = '' }: { label: React.ReactNode, value: React.ReactNode, valueClass?: string }) => (
    <div className="flex justify-between items-center text-xs py-1 border-b border-dashed border-gray-400">
        <span className="font-semibold flex items-center gap-1">{label}</span>
        <span className={cn("font-bold text-left", valueClass)}>{value}</span>
    </div>
);


export const PosReceipt = React.forwardRef<HTMLDivElement, PosReceiptProps>(({
  receiptId,
  settings,
  appName,
  branchName,
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
  
  const show = (key: keyof ReceiptSettings) => !settings || settings[key];

  return (
    <div ref={ref} className="bg-white p-2 text-black" style={{ width: '80mm', boxSizing: 'border-box' }}>
      <div className="text-center mb-2">
        {show('showLogo') && <Gamepad2 className="w-8 h-8 mx-auto text-primary" />}
        {show('showAppName') && <h1 className="text-xl font-bold">{appName}</h1>}
        <p className="text-xs">{branchName}</p>
      </div>

      <div className="space-y-0.5">
        {show('showParentName') && (
            <ReceiptRow label={<><User/> ولي الأمر</>} value={parentName} />
        )}
        {show('showChildName') && (
            <ReceiptRow label={<><Smile/> الطفل</>} value={children.map(c => c.name).join(', ')} />
        )}
        
        {(show('showParentName') || show('showChildName')) && <div className='my-2 border-t border-dashed border-gray-400' />}
        
        {show('showGameName') && (
            <ReceiptRow label={<><Gamepad2/> اللعبة</>} value={gameName} />
        )}
        {show('showCheckInTime') && (
            <ReceiptRow label={<><Clock/> دخول</>} value={checkInTime.toLocaleTimeString('ar-EG')} />
        )}
        {show('showCheckOutTime') && (
            <ReceiptRow label={<><Clock/> خروج</>} value={checkOutTime.toLocaleTimeString('ar-EG')} />
        )}
         {show('showDuration') && (
            <ReceiptRow label={<><Calendar/> المدة</>} value={duration} />
        )}
        
        {(show('showGameName') || show('showCheckInTime') || show('showCheckOutTime') || show('showDuration')) && <div className='my-2 border-t border-dashed border-gray-400' />}
        
        {isSubscription ? (
             <div className="flex justify-center items-center text-md font-bold p-2 mt-1 bg-green-100 text-green-800 rounded-md">
                <span className="flex items-center gap-2"><Star size={16} /> مدفوع بالاشتراك</span>
            </div>
        ) : (
            <>
                {show('showDurationCost') && (
                    <ReceiptRow label={<><Tag/> تكلفة اللعب</>} value={`ج.م ${(durationCost ?? 0).toFixed(2)}`} />
                )}
                {show('showEntryFee') && entryFee && entryFee > 0 && (
                     <ReceiptRow label={<><PlusCircle/> رسوم دخول</>} value={`ج.م ${entryFee.toFixed(2)}`} />
                )}
                 {show('showDiscount') && discount && discount > 0 && (
                     <ReceiptRow label={<><MinusCircle/> الخصم</>} value={`-ج.م ${discount.toFixed(2)}`} valueClass='text-red-600' />
                 )}
                {show('showTotalCost') && (
                    <div className="flex justify-between items-center text-lg font-bold p-2 mt-1 bg-gray-200 rounded-md">
                        <span>الإجمالي</span>
                        <span>{`ج.م ${totalCost.toFixed(2)}`}</span>
                    </div>
                )}
            </>
        )}
      </div>

       <div className="mt-4 text-center text-xs text-gray-600 space-y-0.5">
            {show('showThankYouMessage') && <p className="font-bold text-sm">{settings?.thankYouMessage}</p>}
            {show('showCashierName') && <p>الكاشير: {cashierName}</p>}
            {show('showReceiptId') && receiptId && <p>رقم الإيصال: {receiptId}</p>}
            {show('showTimestamp') && <p>{new Date().toLocaleString('ar-EG')}</p>}
            {settings?.customFooter && <p>{settings.customFooter}</p>}
       </div>
    </div>
  );
});

PosReceipt.displayName = 'PosReceipt';
