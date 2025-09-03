

'use client';

import React from 'react';
import type { ReceiptSettings, CustomerChild } from '@/lib/types';
import { Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ReceiptRow = ({ label, value, show }: { label: string; value: React.ReactNode; show?: boolean; }) => {
  if (show === false || value === null || value === undefined) return null;
  return (
    <div className="flex justify-between items-baseline text-xs">
      <span className="font-semibold">{label}:</span>
      <span className="font-normal text-left">{value}</span>
    </div>
  );
};

const PaymentDetailRow = ({ label, value, show }: { label: string; value: number | undefined; show?: boolean }) => {
  if (show === false || !value || value === 0) return null;
  return (
    <div className="flex justify-between items-center text-sm">
      <span>{label}</span>
      <span className="font-mono">{`ج.م ${value.toFixed(2)}`}</span>
    </div>
  );
};

export interface PosReceiptProps {
  receiptId?: string;
  settings: ReceiptSettings | null;
  appName: string;
  branchName: string;
  children: CustomerChild[];
  parentName: string;
  phoneNumbers: string[];
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


export const PosReceipt = React.forwardRef<HTMLDivElement, PosReceiptProps>(({
  receiptId,
  settings,
  appName,
  branchName,
  children,
  parentName,
  phoneNumbers,
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
  const layout = settings?.layout || 'two-columns';
  const receiptWidth = settings?.receiptWidth || 72;

  const renderPaymentDetails = () => {
    if (isSubscription) {
      return (
        <div className="text-center text-sm font-bold p-2 my-1 bg-gray-100 rounded-md">
            <span>مدفوع بالاشتراك</span>
        </div>
      );
    }
    
    if (packagePrice && duration === '0 ساعة و 0 دقيقة') {
         return (
             <div className="space-y-1 py-1 my-1">
                <PaymentDetailRow show={show('showTotalCost')} label="تكلفة الباقة" value={packagePrice} />
                 {show('showTotalCost') && (
                    <div className="flex justify-between items-center text-md font-bold pt-1 mt-1 border-t border-dashed border-gray-400">
                        <span>الإجمالي</span>
                        <span className="font-mono">{`ج.م ${totalCost.toFixed(2)}`}</span>
                    </div>
                )}
             </div>
         )
    }

    return (
      <div className="space-y-1 py-1 my-1">
          <PaymentDetailRow show={show('showDurationCost')} label="تكلفة اللعب" value={durationCost} />
          <PaymentDetailRow show={show('showEntryFee')} label="رسوم دخول" value={entryFee} />
          <PaymentDetailRow show={true} label="وقت إضافي" value={overtimeCost} />
          <PaymentDetailRow show={show('showDiscount')} label="الخصم" value={discount} />
          
          {show('showTotalCost') && (
              <div className="flex justify-between items-center text-md font-bold pt-1 mt-1 border-t border-dashed border-gray-400">
                  <span>الإجمالي</span>
                  <span className='font-mono'>{`ج.م ${totalCost.toFixed(2)}`}</span>
              </div>
          )}
      </div>
    );
  }

  return (
    <div ref={ref} className="bg-white p-1 text-black" style={{ width: `${receiptWidth}mm`, boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="text-center mb-1">
        {show('showLogo') && <Gamepad2 className="mx-auto h-8 w-8 text-black" />}
        {show('showAppName') && <h1 className="text-lg font-bold">{appName}</h1>}
        {show('showAddress') && <p className="text-xs">{settings?.address}</p>}
        {show('showPhone') && <p className="text-xs">{settings?.phone}</p>}
      </div>

      {show('showCustomTitle') && (
        <div className="text-center my-1 py-0.5 bg-black text-white text-sm font-bold">
            {settings?.customTitle || 'فاتورة جلسة لعب'}
        </div>
      )}

      {/* Invoice Info */}
       <div className="text-xs my-1 py-1 border-y border-dashed border-gray-400">
        <div className='grid grid-cols-2 gap-x-2'>
            <ReceiptRow show={show('showReceiptId')} label="رقم الفاتورة" value={receiptId} />
            <ReceiptRow show={show('showTimestamp')} label="التاريخ" value={new Date().toLocaleDateString('ar-EG')} />
            <ReceiptRow show={show('showCashierName')} label="الكاشير" value={cashierName} />
            <ReceiptRow show={show('showTimestamp')} label="الوقت" value={new Date().toLocaleTimeString('ar-EG')} />
        </div>
       </div>

      {/* Session Details */}
       <div className="text-xs my-1 py-1 border-b border-dashed border-gray-400">
        <h2 className="font-bold text-center text-sm mb-1">بيانات الجلسة</h2>
        <div className={cn(layout === 'two-columns' ? 'grid grid-cols-2 gap-x-2' : 'flex flex-col')}>
            <ReceiptRow show={show('showParentName')} label="ولي الأمر" value={parentName} />
            <ReceiptRow show={show('showChildName')} label="الطفل" value={children.map(c => c.name).join(', ')} />
            <ReceiptRow show={show('showGameName')} label="اللعبة" value={gameName} />
            <ReceiptRow show={show('showCheckInTime')} label="وقت الدخول" value={checkInTime.toLocaleTimeString('ar-EG')} />
            <ReceiptRow show={show('showCheckOutTime')} label="وقت الخروج" value={checkOutTime.toLocaleTimeString('ar-EG')} />
            <ReceiptRow show={show('showDuration')} label="المدة" value={duration} />
        </div>
      </div>
      
       {/* Payment Details */}
       <div className="my-1 py-1 border-b border-dashed border-gray-400">
          <h2 className="font-bold text-center text-sm mb-1">تفاصيل الحساب</h2>
          {renderPaymentDetails()}
       </div>

       {/* Footer */}
       <div className="mt-2 text-center text-xs text-gray-600 space-y-0.5">
            {show('showThankYouMessage') && <p className="font-semibold">{settings?.thankYouMessage}</p>}
            {settings?.customFooter && <p>{settings.customFooter}</p>}
       </div>
    </div>
  );
});

PosReceipt.displayName = 'PosReceipt';
