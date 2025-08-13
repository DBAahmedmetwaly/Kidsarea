
'use client';

import { Gamepad2, Smile, Clock, User, Calendar, Hash, Tag, PlusCircle, Star, MinusCircle, PackageCheck } from 'lucide-react';
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
  packagePrice?: number;
}

const ReceiptRow = ({ label, value, valueClass = '', show }: { label: React.ReactNode, value: React.ReactNode, valueClass?: string, show?: boolean }) => {
    if (show === false) return null;
    return (
        <div className="grid grid-cols-2 items-start text-xs py-1">
            <span className="font-semibold flex items-center gap-1 justify-start">{label}</span>
            <span className={cn("font-bold text-left break-all", valueClass)}>{value}</span>
        </div>
    );
};


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
  packagePrice,
}, ref) => {
  
  const show = (key: keyof ReceiptSettings) => !settings || settings[key];

  const renderPaymentDetails = () => {
    if (isSubscription) {
      return (
        <div className="flex justify-center items-center text-md font-bold p-2 mt-1 bg-green-100 text-green-800 rounded-md">
            <span className="flex items-center gap-2"><Star size={16} /> مدفوع بالاشتراك</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-0.5">
          <ReceiptRow show={show('showDurationCost') && !packagePrice} label={<><Tag size={12}/> تكلفة اللعب</>} value={`ج.م ${(durationCost ?? 0).toFixed(2)}`} />
          <ReceiptRow show={show('showEntryFee') && !!entryFee && entryFee > 0 && !packagePrice} label={<><PlusCircle size={12}/> رسوم دخول</>} value={`ج.م ${entryFee.toFixed(2)}`} />
          <ReceiptRow show={!!packagePrice} label={<><PackageCheck size={12}/> تكلفة الباقة</>} value={`ج.م ${(packagePrice ?? 0).toFixed(2)}`} />
          <ReceiptRow show={show('showDiscount') && !!discount && discount > 0} label={<><MinusCircle size={12}/> الخصم</>} value={`-ج.م ${discount.toFixed(2)}`} valueClass='text-red-600' />
          
          {show('showTotalCost') && (
              <div className="flex justify-between items-center text-lg font-bold p-2 mt-2 bg-gray-200 rounded-md">
                  <span>الإجمالي</span>
                  <span>{`ج.م ${totalCost.toFixed(2)}`}</span>
              </div>
          )}
      </div>
    );
  }

  return (
    <div ref={ref} className="bg-white p-2 text-black" style={{ width: '80mm', boxSizing: 'border-box' }}>
      <div className="text-center mb-2">
        {show('showLogo') && <Gamepad2 className="w-8 h-8 mx-auto text-primary" />}
        {show('showAppName') && <h1 className="text-xl font-bold">{appName}</h1>}
        <p className="text-xs">{branchName}</p>
      </div>

      <div className="space-y-0.5 border-t border-b border-dashed border-gray-400 py-2 my-2">
        <ReceiptRow show={show('showParentName')} label={<><User size={12}/> ولي الأمر</>} value={parentName} />
        <ReceiptRow show={show('showChildName')} label={<><Smile size={12}/> الطفل</>} value={children.map(c => c.name).join(', ')} />
        <ReceiptRow show={show('showGameName')} label={<><Gamepad2 size={12}/> اللعبة</>} value={gameName} />
        <ReceiptRow show={show('showCheckInTime')} label={<><Clock size={12}/> دخول</>} value={checkInTime.toLocaleTimeString('ar-EG')} />
        <ReceiptRow show={show('showCheckOutTime')} label={<><Clock size={12}/> خروج</>} value={checkOutTime.toLocaleTimeString('ar-EG')} />
        <ReceiptRow show={show('showDuration')} label={<><Calendar size={12}/> المدة</>} value={duration} />
      </div>

       {renderPaymentDetails()}
      
       <div className="mt-4 text-center text-xs text-gray-600 space-y-1">
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
