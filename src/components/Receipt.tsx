
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

const BossBabyLogo = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      fill="currentColor"
    >
      <g>
        {/* Head */}
        <path d="M100,20 C133.14,20 160,46.86 160,80 C160,113.14 133.14,140 100,140 C66.86,140 40,113.14 40,80 C40,46.86 66.86,20 100,20 Z" fill="#FFDAB9" />
        <path d="M100,20 C110,20 120,22 128,25 C125,22 105,18 100,18 C95,18 75,22 72,25 C80,22 90,20 100,20" fill="#FFEBCD" />
        
        {/* Hair */}
        <path d="M100,18 C90,15 75,15 70,25 C70,15 80,10 100,10 C120,10 130,15 130,25 C125,15 110,15 100,18" fill="#F4A460" />
        <path d="M100,10 C105,8 110,12 110,15 C110,18 105,20 100,20 C95,20 90,18 90,15 C90,12 95,8 100,10" fill="#DEB887" />

        {/* Eyes */}
        <circle cx="80" cy="75" r="10" fill="white" />
        <circle cx="120" cy="75" r="10" fill="white" />
        <circle cx="80" cy="75" r="5" fill="#2E8B57" />
        <circle cx="120" cy="75" r="5" fill="#2E8B57" />
        <circle cx="82" cy="73" r="2" fill="white" />
        <circle cx="122" cy="73" r="2" fill="white" />

        {/* Eyebrows */}
        <path d="M70,60 Q80,55 90,60" stroke="black" strokeWidth="3" fill="none" />
        <path d="M110,60 Q120,55 130,60" stroke="black" strokeWidth="3" fill="none" />

        {/* Nose */}
        <path d="M98,85 Q100,90 102,85" stroke="#D2691E" strokeWidth="2" fill="none" />

        {/* Mouth */}
        <path d="M90,105 Q100,110 110,105" stroke="black" strokeWidth="2" fill="none" />

        {/* Body */}
        <path d="M100,135 C80,150 70,180 70,190 L130,190 C130,180 120,150 100,135 Z" fill="#2c3e50" />
        
        {/* Collar and Tie */}
        <path d="M90,140 L100,150 L110,140 Z" fill="white" />
        <path d="M100,150 L95,175 L105,175 L100,150 Z" fill="#c0392b" />
        <circle cx="100" cy="150" r="4" fill="#e74c3c" />
      </g>
    </svg>
);


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
  notes,
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
        {show('showLogo') && <BossBabyLogo className="mx-auto h-12 w-12 text-black" />}
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
            {show('showChildName') && <div className="grid grid-cols-2"><span>الأطفال ({children.length}):</span> <span className='text-left'>{children.map(c => c.name).join(', ')}</span></div>}
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
          </div>
          {expectedCheckOutTime ? (
            <div className="grid grid-cols-2 font-bold text-red-600">
                <span>الخروج المتوقع:</span>
                <span className='text-left font-mono'>{expectedCheckOutTime.toLocaleTimeString('ar-EG')}</span>
            </div>
           ) : (
            show('showDuration') && <div className="grid grid-cols-2"><span>المدة:</span><span className='text-left'>{duration}</span></div>
           )}
      </div>
      
       {/* Payment Details */}
       <div className="my-1">
          {renderPaymentDetails()}
       </div>

      {notes && (
          <div className="mt-2 text-xs border-t border-dashed pt-1">
              <p className="font-bold">ملاحظات:</p>
              <p>{notes}</p>
          </div>
      )}

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
