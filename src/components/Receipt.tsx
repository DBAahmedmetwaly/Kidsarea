
'use client';

import React from 'react';
import type { ReceiptSettings, CustomerChild } from '@/lib/types';

const ReceiptRow = ({ label, value, show, boldValue = true }: { label: string; value: React.ReactNode; show?: boolean; boldValue?: boolean }) => {
  if (show === false || value === null || value === undefined) return null;
  return (
    <div className="flex justify-between items-center text-xs py-0.5">
      <span className="text-gray-600">{label}</span>
      <span className={boldValue ? "font-bold text-right" : "text-right"}>{value}</span>
    </div>
  );
};

const PaymentDetailRow = ({ label, value, show }: { label: string; value: number | undefined; show?: boolean }) => {
  if (show === false || !value || value === 0) return null;
  return (
    <div className="flex justify-between items-center text-xs">
      <span>{label}</span>
      <span className="font-mono text-left">{`ج.م ${value.toFixed(2)}`}</span>
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
        <div className="text-center text-md font-bold p-2 my-2 bg-gray-100 rounded-md">
            <span>مدفوع بالاشتراك</span>
        </div>
      );
    }
    
    // This case handles the receipt for the initial purchase of a package
    if (packagePrice && duration === '0 ساعة و 0 دقيقة') {
         return (
             <div className="space-y-1 py-2 my-2 border-y border-dashed border-gray-400">
                <PaymentDetailRow show={show('showTotalCost')} label="تكلفة الباقة" value={packagePrice} />
                 {show('showTotalCost') && (
                    <div className="flex justify-between items-center text-lg font-bold pt-2 mt-2 border-t border-gray-300">
                        <span>الإجمالي</span>
                        <span>{`ج.م ${totalCost.toFixed(2)}`}</span>
                    </div>
                )}
             </div>
         )
    }

    return (
      <div className="space-y-1 py-2 my-2 border-y border-dashed border-gray-400">
          <PaymentDetailRow show={show('showDurationCost')} label="تكلفة اللعب" value={durationCost} />
          <PaymentDetailRow show={show('showEntryFee')} label="رسوم دخول" value={entryFee} />
          <PaymentDetailRow show={true} label="وقت إضافي" value={overtimeCost} />
          <PaymentDetailRow show={show('showDiscount')} label="الخصم" value={discount ? -discount : 0} />
          
          {show('showTotalCost') && (
              <div className="flex justify-between items-center text-lg font-bold pt-2 mt-2 border-t border-gray-300">
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
        {show('showAppName') && <h1 className="text-lg font-bold">{appName}</h1>}
        <p className="text-xs">{branchName}</p>
      </div>

      <div className="space-y-1 py-2 border-y border-dashed border-gray-400">
        <ReceiptRow show={show('showParentName')} label="ولي الأمر:" value={parentName} />
        <ReceiptRow show={show('showChildName')} label="الطفل:" value={children.map(c => c.name).join(', ')} />
        <ReceiptRow show={show('showGameName')} label="اللعبة:" value={gameName} />
        <ReceiptRow show={show('showCheckInTime')} label="وقت الدخول:" value={checkInTime.toLocaleTimeString('ar-EG')} />
        <ReceiptRow show={show('showCheckOutTime')} label="وقت الخروج:" value={checkOutTime.toLocaleTimeString('ar-EG')} />
        <ReceiptRow show={show('showDuration')} label="مدة اللعب:" value={duration} />
      </div>

       {renderPaymentDetails()}
      
       <div className="mt-2 text-center text-xs text-gray-600 space-y-0.5">
            {show('showThankYouMessage') && <p className="font-semibold">{settings?.thankYouMessage}</p>}
            {show('showCashierName') && <p>الكاشير: {cashierName}</p>}
            {show('showReceiptId') && receiptId && <p>رقم الإيصال: {receiptId}</p>}
            {show('showTimestamp') && <p>{new Date().toLocaleString('ar-EG')}</p>}
            {settings?.customFooter && <p className="pt-1">{settings.customFooter}</p>}
       </div>
    </div>
  );
});

PosReceipt.displayName = 'PosReceipt';
