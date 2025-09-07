
'use client';

import React from 'react';
import type { PosReceiptProps, ReceiptSettings } from '@/lib/types';

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
  sessionInfo?: {
    children: PosReceiptProps['children'];
    checkInTime: Date;
    expectedCheckOutTime: Date;
  }
  notes?: string;
}

const BossBabyLogo = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2a2 2 0 0 0-2 2v2H8c-1.1 0-2 .9-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2zm0 2c.55 0 1 .45 1 1v1h-2V5c0-.55.45-1 1-1zm-2 6h4v2h-4v-2zm0 4h4v2h-4v-2z" />
      <path d="M9 10.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .5-.25.95-.63 1.22-.5.37-1.17.58-1.87.58s-1.37-.21-1.87-.58C9.25 11.45 9 11 9 10.5zM15 10.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .5-.25.95-.63 1.22-.5.37-1.17.58-1.87.58s-1.37-.21-1.87-.58c-.38-.27-.63-.72-.63-1.22z" />
       <path d="M12 16.5c-1.93 0-3.5-1.57-3.5-3.5 0-.55.45-1 1-1s1 .45 1 1c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5c0-.55.45-1 1-1s1 .45 1 1c0 1.93-1.57 3.5-3.5 3.5z"/>
    </svg>
);

export const ProductReceipt = React.forwardRef<HTMLDivElement, ProductReceiptProps>(({
  receiptId,
  settings,
  appName,
  branchName,
  items,
  totalAmount,
  cashierName,
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
      
       <div className="flex justify-between items-center text-lg font-bold p-1 mt-1 bg-gray-200 rounded-md">
            <span>الإجمالي</span>
            <span>{`ج.م ${totalAmount.toFixed(2)}`}</span>
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
