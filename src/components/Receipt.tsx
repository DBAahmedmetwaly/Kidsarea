

'use client';

import React from 'react';
import type { PosReceiptProps } from '@/lib/types';
import { Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';


const ReceiptRow = ({ label, value }: { label: string; value: React.ReactNode; }) => (
    <div className="flex justify-between items-baseline text-xs py-0.5">
      <span className="font-semibold">{label}:</span>
      <span className="font-normal text-left">{value}</span>
    </div>
);

const PaymentDetailRow = ({ label, value }: { label: string; value: number | undefined }) => {
  if (!value || value === 0) return null;
  return (
    <div className="flex justify-between items-center text-sm py-0.5">
      <span>{label}</span>
      <span className="font-mono">{`ج.م ${value.toFixed(2)}`}</span>
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
  packageDuration,
  overtimeCost,
}, ref) => {
  
  const show = (key: keyof PosReceiptProps['settings']) => !settings || settings[key];
  const receiptWidth = settings?.receiptWidth || 72;

  const expectedCheckOutTime = packageDuration ? new Date(checkInTime.getTime() + packageDuration * 60 * 1000) : null;

  const renderPaymentDetails = () => {
    if (isSubscription) {
      return (
        <div className="text-center text-sm font-bold p-2 my-1 bg-gray-100 rounded-md">
            <span>مدفوع بالاشتراك</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-1 py-1 my-1">
          <div className='border-y border-dashed border-gray-400 py-1 space-y-1'>
            <PaymentDetailRow label="تكلفة الباقة" value={packagePrice} />
            <PaymentDetailRow label="تكلفة اللعب" value={durationCost} />
            <PaymentDetailRow label="رسوم دخول" value={entryFee} />
            <PaymentDetailRow label="وقت إضافي" value={overtimeCost} />
            <PaymentDetailRow label="الخصم" value={discount} />
          </div>
          <div className="flex justify-between items-center text-md font-bold pt-1 mt-1 bg-gray-200 p-1 rounded-md">
              <span>الإجمالي</span>
              <span className='font-mono'>{`ج.م ${totalCost.toFixed(2)}`}</span>
          </div>
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
        {show('showPhone') && <p className="text-xs font-mono">{settings?.phone}</p>}
      </div>

      <div className="text-center my-1 py-0.5 text-sm font-bold border-y border-dashed border-gray-400">
        {show('showCustomTitle') ? (settings?.customTitle || 'فاتورة جلسة لعب') : 'فاتورة جلسة لعب'}
      </div>

      {/* Invoice Info */}
       <div className="grid grid-cols-2 gap-x-2 text-xs my-1 py-1">
          <div className="space-y-0.5">
            {show('showReceiptId') && <div className="flex justify-between"><span>رقم الفاتورة:</span><span>{receiptId}</span></div>}
            {show('showCashierName') && <div className="flex justify-between"><span>الكاشير:</span><span>{cashierName}</span></div>}
          </div>
          <div className="space-y-0.5 text-left">
             <div className="flex justify-between"><span>التاريخ:</span><span>{new Date().toLocaleDateString('ar-EG')}</span></div>
             <div className="flex justify-between"><span>الوقت:</span><span>{new Date().toLocaleTimeString('ar-EG')}</span></div>
          </div>
       </div>
       
       <div className="text-xs my-1 py-1 border-t border-dashed border-gray-400 space-y-1">
        <div className="flex justify-between"><span>ولي الأمر: {parentName}</span><span>الطفل: {children.map(c => c.name).join(', ')}</span></div>
        <div>اللعبة: {gameName}</div>
        <div className="flex justify-between">
            {show('showCheckInTime') && <span>الدخول: {checkInTime.toLocaleTimeString('ar-EG')}</span>}
            {show('showCheckOutTime') && !expectedCheckOutTime && <span>الخروج: {checkOutTime.toLocaleTimeString('ar-EG')}</span>}
            {show('showDuration') && !expectedCheckOutTime && <span>المدة: {duration}</span>}
        </div>
         {expectedCheckOutTime && (
            <div className="flex justify-between font-bold text-red-600">
                <span>الخروج المتوقع:</span>
                <span>{expectedCheckOutTime.toLocaleTimeString('ar-EG')}</span>
            </div>
        )}
      </div>
      
       {/* Payment Details */}
       <div className="my-1">
          {renderPaymentDetails()}
       </div>

       {/* Footer */}
       <div className="mt-2 text-center text-xs text-gray-600 space-y-0.5 pt-1">
            {show('showThankYouMessage') && <p className="font-semibold">{settings?.thankYouMessage}</p>}
            {settings?.customFooter && <p>{settings.customFooter}</p>}
       </div>
    </div>
  );
});

PosReceipt.displayName = 'PosReceipt';
