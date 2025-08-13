
'use client';

import { Gamepad2, Smile, Clock, User, Calendar, Hash, Tag, PlusCircle, Star, MinusCircle, PackageCheck } from 'lucide-react';
import React from 'react';
import type { ReceiptSettings, CustomerChild, Policies } from '@/lib/types';
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
  overtimeCost?: number;
}

const ReceiptRow = ({ label, value, valueClass = '', show }: { label: React.ReactNode, value: React.ReactNode, valueClass?: string, show?: boolean }) => {
    if (show === false) return null;
    return (
        <div className="grid grid-cols-2 items-start text-xs py-0.5">
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
  overtimeCost,
}, ref) => {
  
  const show = (key: keyof ReceiptSettings) => !settings || settings[key];

  const renderPaymentDetails = () => {
    if (isSubscription) {
      return (
        <div className="flex justify-center items-center text-md font-bold p-1 mt-1 bg-green-100 text-green-800 rounded-md">
            <span className="flex items-center gap-2">مدفوع بالاشتراك</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-0.5">
          <ReceiptRow show={show('showDurationCost') && !packagePrice} label="تكلفة اللعب" value={`ج.م ${(durationCost ?? 0).toFixed(2)}`} />
          <ReceiptRow show={show('showEntryFee') && !!entryFee && entryFee > 0 && !packagePrice} label="رسوم دخول" value={`ج.م ${entryFee.toFixed(2)}`} />
          <ReceiptRow show={!!packagePrice} label="تكلفة الباقة" value={`ج.م ${(packagePrice ?? 0).toFixed(2)}`} />
          <ReceiptRow show={!!overtimeCost && overtimeCost > 0} label="وقت إضافي" value={`ج.م ${(overtimeCost ?? 0).toFixed(2)}`} />
          <ReceiptRow show={show('showDiscount') && !!discount && discount > 0} label="الخصم" value={`-ج.م ${discount.toFixed(2)}`} valueClass='text-red-600' />
          
          {show('showTotalCost') && (
              <div className="flex justify-between items-center text-lg font-bold p-1 mt-1 bg-gray-200 rounded-md">
                  <span>الإجمالي</span>
                  <span>{`ج.م ${totalCost.toFixed(2)}`}</span>
              </div>
          )}
      </div>
    );
  }

  return (
    <div ref={ref} className="bg-white p-1 text-black" style={{ width: '80mm', boxSizing: 'border-box' }}>
      <div className="text-center mb-1">
        {show('showLogo') && <Gamepad2 className="w-8 h-8 mx-auto text-primary" />}
        {show('showAppName') && <h1 className="text-lg font-bold">{appName}</h1>}
        <p className="text-xs">{branchName}</p>
      </div>

      <div className="space-y-0 border-t border-b border-dashed border-gray-400 py-1 my-1">
        <ReceiptRow show={show('showParentName')} label="ولي الأمر" value={parentName} />
        <ReceiptRow show={show('showChildName')} label="الطفل" value={children.map(c => c.name).join(', ')} />
        <ReceiptRow show={show('showGameName')} label="اللعبة" value={gameName} />
        <ReceiptRow show={show('showCheckInTime')} label="دخول" value={checkInTime.toLocaleTimeString('ar-EG')} />
        <ReceiptRow show={show('showCheckOutTime')} label="خروج" value={checkOutTime.toLocaleTimeString('ar-EG')} />
        <ReceiptRow show={show('showDuration')} label="المدة" value={duration} />
      </div>

       {renderPaymentDetails()}
      
       <div className="mt-2 text-center text-xs text-gray-600 space-y-0">
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
