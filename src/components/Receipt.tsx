

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
  if (value === undefined || value === 0) return null;
  return (
    <div className="grid grid-cols-2 text-sm py-0.5">
      <span className='text-right'>{label}</span>
      <span className="font-mono text-left">{`ج.م ${value.toFixed(2)}`}</span>
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
  packageName,
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
      <div className="space-y-1 py-1 my-1 border-t border-dashed border-gray-400">
          <PaymentDetailRow label="تكلفة الباقة" value={packagePrice} />
          <PaymentDetailRow label="تكلفة اللعب" value={durationCost} />
          <PaymentDetailRow label="رسوم دخول" value={entryFee} />
          <PaymentDetailRow label="وقت إضافي" value={overtimeCost} />
          <PaymentDetailRow label="الخصم" value={discount} />
          
          <div className="grid grid-cols-2 text-md font-bold pt-1 mt-1 border-t border-gray-400">
              <span className='text-right'>الإجمالي</span>
              <span className='font-mono text-left'>{`ج.م ${totalCost.toFixed(2)}`}</span>
          </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="bg-white p-1 text-black text-xs" style={{ width: `${receiptWidth}mm`, boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="text-center mb-1">
        {show('showLogo') && <Gamepad2 className="mx-auto h-6 w-6 text-black" />}
        {show('showAppName') && <h1 className="text-base font-bold">{appName}</h1>}
        {show('showAddress') && <p className="text-xs">{settings?.address}</p>}
        {show('showPhone') && <p className="text-xs font-mono">{settings?.phone}</p>}
      </div>

      <div className="text-center my-1 py-0.5 text-sm font-bold border-y border-dashed border-gray-400">
        {show('showCustomTitle') ? (settings?.customTitle || 'فاتورة جلسة لعب') : 'فاتورة جلسة لعب'}
      </div>

       {/* Invoice & Customer Info */}
       <div className='space-y-1 border-b border-dashed border-gray-400 pb-1 mb-1'>
            {show('showReceiptId') && <div className="grid grid-cols-2"><span>رقم الفاتورة:</span> <span className='text-left'>{receiptId}</span></div>}
            {show('showCashierName') && <div className="grid grid-cols-2"><span>الكاشير:</span> <span className='text-left'>{cashierName}</span></div>}
            {show('showParentName') && <div className="grid grid-cols-2"><span>ولي الأمر:</span> <span className='text-left'>{parentName}</span></div>}
            {show('showParentName') && <div className="grid grid-cols-2"><span>الهاتف:</span> <span className='text-left font-mono'>{(phoneNumbers || []).join('/')}</span></div>}
            <div className="grid grid-cols-2"><span>الأطفال ({children.length}):</span> <span className='text-left'>{children.map(c => c.name).join(', ')}</span></div>
       </div>

       {/* Session Details */}
       <div className='space-y-1 border-b border-dashed border-gray-400 pb-1 mb-1'>
          {show('showGameName') && <div className="grid grid-cols-2"><span>اللعبة:</span> <span className='text-left'>{gameName}</span></div>}
          {packageName && <div className="grid grid-cols-2"><span>الباقة:</span> <span className='text-left'>{packageName}</span></div>}
          <div className="grid grid-cols-2">
            {show('showCheckInTime') && <span>وقت الدخول:</span>}
            {show('showCheckInTime') && <span className='text-left font-mono'>{checkInTime.toLocaleTimeString('ar-EG')}</span>}
          </div>
           <div className="grid grid-cols-2">
              {show('showCheckOutTime') && !expectedCheckOutTime && <><span>وقت الخروج:</span><span className='text-left font-mono'>{checkOutTime.toLocaleTimeString('ar-EG')}</span></>}
              {show('showDuration') && !expectedCheckOutTime && <><span>المدة:</span><span className='text-left'>{duration}</span></>}
          </div>
          {expectedCheckOutTime && (
            <div className="grid grid-cols-2 font-bold text-red-600">
                <span>الخروج المتوقع:</span>
                <span className='text-left font-mono'>{expectedCheckOutTime.toLocaleTimeString('ar-EG')}</span>
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
            {show('showTimestamp') && <p className='font-mono'>{new Date().toLocaleString('ar-EG')}</p>}
       </div>
    </div>
  );
});

PosReceipt.displayName = 'PosReceipt';
