
'use client';

import { Gamepad2, Smile, Clock, User, Calendar, Hash } from 'lucide-react';

export interface ReceiptProps {
  childName: string;
  parentName: string;
  gameName: string;
  checkInTime: Date;
  checkOutTime: Date;
  duration: string;
  cost: number;
  cashierName: string;
}

export function Receipt({
  childName,
  parentName,
  gameName,
  checkInTime,
  checkOutTime,
  duration,
  cost,
  cashierName,
}: ReceiptProps) {
  const receiptId = `R-${checkOutTime.getTime().toString().slice(-6)}`;
  return (
    <div className="bg-light-blue-50 p-6 rounded-lg border-2 border-dashed border-primary printable-area font-sans">
      <div className="text-center mb-6">
        <div className="flex justify-center items-center gap-2">
            <Gamepad2 className="w-10 h-10 text-accent" />
            <h1 className="text-3xl font-bold text-primary">FunTrack</h1>
        </div>
        <p className="text-muted-foreground">شكراً لزيارتكم!</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-2"><Smile size={16} /> اسم الطفل</span>
          <span className="font-medium">{childName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-2"><User size={16} /> اسم ولي الأمر</span>
          <span className="font-medium">{parentName}</span>
        </div>
        <hr className="border-dashed" />
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-2"><Gamepad2 size={16} /> اللعبة</span>
          <span className="font-medium">{gameName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-2"><Calendar size={16} /> تاريخ الدخول</span>
          <span className="font-medium">{checkInTime.toLocaleString('ar-EG')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-2"><Calendar size={16} /> تاريخ الخروج</span>
          <span className="font-medium">{checkOutTime.toLocaleString('ar-EG')}</span>
        </div>
         <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-2"><Clock size={16} /> مدة اللعب</span>
          <span className="font-medium">{duration}</span>
        </div>
        <hr className="border-dashed" />
        <div className="flex justify-between items-center text-xl font-bold bg-blue-100 p-3 rounded-lg">
          <span className="text-primary">الإجمالي</span>
          <span className="text-primary">{`ج.م ${cost.toFixed(2)}`}</span>
        </div>
      </div>

       <div className="mt-6 text-xs text-muted-foreground text-center space-y-1">
            <p>الكاشير: {cashierName}</p>
            <p>رقم الإيصال: {receiptId}</p>
            <p>{new Date().toLocaleString('ar-EG')}</p>
       </div>
    </div>
  );
}
