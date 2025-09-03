

'use client';

import React from 'react';
import type { ReceiptSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ReceiptItem {
    name: string;
    quantity: number;
    price: number;
}

export interface ProductReceiptProps {
  receiptId?: string;
  settings: ReceiptSettings | null;
  appName: string;
  branchName: string;
  items: ReceiptItem[];
  totalAmount: number;
  cashierName: string;
}

export const ProductReceipt = React.forwardRef<HTMLDivElement, ProductReceiptProps>(({
  receiptId,
  settings,
  appName,
  branchName,
  items,
  totalAmount,
  cashierName,
}, ref) => {
  
  const show = (key: keyof ReceiptSettings) => !settings || settings[key];
  const receiptWidth = settings?.receiptWidth || 72;

  return (
    <div ref={ref} className="bg-white p-1 text-black" style={{ width: `${receiptWidth}mm`, boxSizing: 'border-box' }}>
      <div className="text-center mb-1">
        {show('showAppName') && <h1 className="text-xl font-bold">{appName}</h1>}
        <p className="text-xs">{branchName}</p>
        <p className="text-xs font-semibold">فاتورة مشتريات</p>
      </div>

      <div className="space-y-0.5 border-t border-b border-dashed border-gray-400 py-1 my-1">
        <div className="grid grid-cols-12 text-xs font-bold">
            <span className="col-span-5 text-right">الصنف</span>
            <span className="col-span-2 text-center">الكمية</span>
            <span className="col-span-2 text-center">السعر</span>
            <span className="col-span-3 text-left">الإجمالي</span>
        </div>
         {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 text-xs">
                <span className="col-span-5 text-right">{item.name}</span>
                <span className="col-span-2 text-center">{item.quantity}</span>
                <span className="col-span-2 text-center font-mono">{item.price.toFixed(2)}</span>
                <span className="col-span-3 text-left font-mono">{`ج.م ${(item.price * item.quantity).toFixed(2)}`}</span>
            </div>
         ))}
      </div>
      
       <div className="flex justify-between items-center text-lg font-bold p-1 mt-1 bg-gray-200 rounded-md">
            <span>الإجمالي</span>
            <span>{`ج.م ${totalAmount.toFixed(2)}`}</span>
        </div>
      
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

ProductReceipt.displayName = 'ProductReceipt';
