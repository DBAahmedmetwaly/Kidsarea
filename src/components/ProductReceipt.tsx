
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
