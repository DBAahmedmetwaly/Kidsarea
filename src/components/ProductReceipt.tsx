
'use client';

import React from 'react';
import type { PosReceiptProps, ReceiptSettings } from '@/lib/types';
import { BossBabyLogo } from './layout/BossBabyLogo';

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
  amountPaid?: number;
  change?: number;
  sessionInfo?: {
    children: PosReceiptProps['children'];
    parentName: string;
    phoneNumbers: string[];
    checkInTime: Date;
    expectedCheckOutTime: Date;
  }
  notes?: string;
}

export const ProductReceipt = React.forwardRef<HTMLDivElement, ProductReceiptProps>(({
  receiptId,
  settings,
  appName,
  branchName,
  items,
  totalAmount,
  cashierName,
  amountPaid,
  change,
  sessionInfo,
  notes
}, ref) => {
  
  const show = (key: keyof ReceiptSettings) => !settings || settings[key];
  const receiptWidth = settings?.receiptWidth || 72;

  return (
    <div ref={ref} className="bg-white p-1 text-black" style={{ width: `${receiptWidth}mm`, boxSizing: 'border-box' }}>
      <div className="text-center mb-1">
        {show('showLogo') && <BossBabyLogo className="mx-auto h-8 w-8 text-black" />}
        {show('showAppName') && <h1 className="text-xl font-bold">{appName}</h1>}
        <p className="text-xs">{branchName}</p>
        <p className="text-xs font-semibold">فاتورة مشتريات</p>
      </div>
      
      {sessionInfo && (
        <div className="space-y-0.5 border-t border-b border-dashed border-gray-400 py-1 my-1 text-xs">
           {show('showParentName') && <div className="grid grid-cols-2"><span>ولي الأمر:</span> <span className='text-left font-bold'>{sessionInfo.parentName}</span></div>}
           {show('showCustomerPhone') && <div className="grid grid-cols-2"><span>الهاتف:</span> <span className='text-left font-mono'>{sessionInfo.phoneNumbers.join(' / ')}</span></div>}
           <div className="grid grid-cols-2"><span>الأطفال:</span> <span className='text-left font-bold'>{sessionInfo.children.map(c => c.name).join(', ')}</span></div>
           <div className="grid grid-cols-2"><span>وقت الدخول:</span> <span className='text-left font-mono'>{sessionInfo.checkInTime.toLocaleTimeString('ar-EG')}</span></div>
           <div className="grid grid-cols-2"><span>الخروج المتوقع:</span> <span className='text-left font-mono'>{sessionInfo.expectedCheckOutTime.toLocaleTimeString('ar-EG')}</span></div>
        </div>
      )}


      <div className="space-y-0.5 border-t border-b border-dashed border-gray-400 py-1 my-1">
        <table className="w-full text-xs">
            <thead>
                <tr>
                    <th className="w-[50%] text-right font-bold">الصنف</th>
                    <th className="w-[15%] text-center font-bold">الكمية</th>
                    <th className="w-[15%] text-center font-bold">السعر</th>
                    <th className="w-[20%] text-left font-bold">الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                        <td className="text-right">{item.name}</td>
                        <td className="text-center font-mono">{item.quantity}</td>
                        <td className="text-center font-mono">{item.price.toFixed(2)}</td>
                        <td className="text-left font-mono">{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
      
       <div className="space-y-1 text-sm mt-1">
            <div className="flex justify-between items-center font-bold">
                <span>الإجمالي المطلوب:</span>
                <span>{`ج.م ${totalAmount.toFixed(2)}`}</span>
            </div>
            {amountPaid !== undefined && (
                 <div className="flex justify-between items-center">
                    <span>المدفوع:</span>
                    <span>{`ج.م ${amountPaid.toFixed(2)}`}</span>
                </div>
            )}
             {change !== undefined && change > 0 && (
                 <div className="flex justify-between items-center">
                    <span>الباقي:</span>
                    <span>{`ج.م ${change.toFixed(2)}`}</span>
                </div>
            )}
       </div>
      
      {notes && (
          <div className="mt-2 text-xs border-t border-dashed pt-1">
              <p className="font-bold">ملاحظات:</p>
              <p>{notes}</p>
          </div>
      )}

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
