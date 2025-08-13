
'use client';

import { Gamepad2, ShoppingCart } from 'lucide-react';
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

const ReceiptRow = ({ label, value, valueClass = '', show }: { label: React.ReactNode, value: React.ReactNode, valueClass?: string, show?: boolean }) => {
    if (show === false) return null;
    return (
        <div className="flex justify-between items-start text-xs py-0.5">
            <span className="font-semibold flex items-center gap-1">{label}</span>
            <span className={cn("font-bold text-left break-all", valueClass)}>{value}</span>
        </div>
    );
};


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

  return (
    <div ref={ref} className="bg-white p-1 text-black" style={{ width: '80mm', boxSizing: 'border-box' }}>
      <div className="text-center mb-1">
        {show('showLogo') && <Gamepad2 className="w-8 h-8 mx-auto text-primary" />}
        {show('showAppName') && <h1 className="text-xl font-bold">{appName}</h1>}
        <p className="text-xs">{branchName}</p>
        <p className="text-xs font-semibold">فاتورة مشتريات</p>
      </div>

      <div className="space-y-0.5 border-t border-b border-dashed border-gray-400 py-1 my-1">
        <div className="flex justify-between text-xs font-bold">
            <span className="w-2/4">الصنف</span>
            <span className="w-1/4 text-center">الكمية</span>
            <span className="w-1/4 text-left">السعر</span>
        </div>
         {items.map((item, index) => (
            <div key={index} className="flex justify-between text-xs">
                <span className="w-2/4">{item.name}</span>
                <span className="w-1/4 text-center">{item.quantity}</span>
                <span className="w-1/4 text-left font-mono">{`ج.م ${(item.price * item.quantity).toFixed(2)}`}</span>
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
