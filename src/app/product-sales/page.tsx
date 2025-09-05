

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/context/FirebaseContext';
import { useAuth } from '@/components/AuthProvider';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Receipt, Calendar as CalendarIcon, FilterX, ShoppingCart, CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductSale, InventoryItem } from '@/lib/types';
import { StatCard } from '@/components/StatCard';


type FlattenedSaleItem = {
    saleId: string;
    receiptNumber?: number;
    productName: string;
    cartQuantity: number;
    price: number;
    createdAt: string;
    branchName: string;
    cashierName: string;
};

function ProductSalesContent() {
    const { productSales, employees, branches, loading } = useFirebase();
    const { user } = useAuth();

    const [productFilter, setProductFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('all');
    const [fromDate, setFromDate] = useState<Date | undefined>();
    const [toDate, setToDate] = useState<Date | undefined>();

    const currentUser = useMemo(() => {
        if (!user) return null;
        return employees.find(e => e.username === user.username);
    }, [user, employees]);

    useEffect(() => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            setBranchFilter(currentUser.branch);
        }
    }, [currentUser]);


    const flattenedSales = useMemo(() => {
        return productSales.flatMap(sale => 
            sale.items.map(item => ({
                saleId: sale.id,
                receiptNumber: sale.receiptNumber,
                productName: item.productName,
                cartQuantity: item.cartQuantity,
                price: item.price,
                createdAt: sale.createdAt,
                branchName: sale.branchName,
                cashierName: sale.cashierName,
            }))
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [productSales]);

    const filteredSales = useMemo(() => {
        return flattenedSales.filter(item => {
            const productMatch = productFilter === '' || item.productName.toLowerCase().includes(productFilter.toLowerCase());
            const branchMatch = branchFilter === 'all' || item.branchName === branchFilter;
            const dateMatch = fromDate && toDate 
                ? isWithinInterval(new Date(item.createdAt), { start: startOfDay(fromDate), end: endOfDay(toDate) })
                : true;
            return productMatch && branchMatch && dateMatch;
        });
    }, [flattenedSales, productFilter, branchFilter, fromDate, toDate]);
    
    const summaryStats = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
        const totalItemsSold = filteredSales.reduce((sum, item) => sum + item.cartQuantity, 0);
        const totalTransactions = new Set(filteredSales.map(item => item.saleId)).size;
        return { totalRevenue, totalItemsSold, totalTransactions };
    }, [filteredSales]);
    
     const clearFilters = () => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            // Don't clear branch filter
        } else {
            setBranchFilter('all');
        }
        setProductFilter('');
        setFromDate(undefined);
        setToDate(undefined);
    }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden"><SidebarTrigger /></div>
        <Receipt className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl">تقرير مبيعات المنتجات</h1>
      </div>
      
       <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>فلترة التقرير</CardTitle>
                  <CardDescription>
                  استخدم الفلاتر أدناه لعرض مبيعات محددة.
                  </CardDescription>
                </div>
                 <Button variant="ghost" onClick={clearFilters}>
                    <FilterX className="me-2 h-4 w-4" />
                    مسح الفلاتر
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">بحث بالصنف</label>
                         <Input 
                            placeholder="ابحث باسم المنتج..."
                            value={productFilter}
                            onChange={(e) => setProductFilter(e.target.value)}
                         />
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">الفرع</label>
                        <Select value={branchFilter} onValueChange={setBranchFilter} disabled={currentUser?.branch !== 'كل الفروع'}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر الفرع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">كل الفروع</SelectItem>
                                {branches.map(branch => (
                                    <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">من تاريخ</label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {fromDate ? format(fromDate, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={fromDate}
                                onSelect={setFromDate}
                                disabled={(date) => toDate ? date > toDate : false}
                                initialFocus
                                locale={ar}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">إلى تاريخ</label>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {toDate ? format(toDate, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={toDate}
                                onSelect={setToDate}
                                disabled={(date) => fromDate ? date < fromDate : false}
                                initialFocus
                                locale={ar}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardContent>
        </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
            title="إجمالي الإيرادات"
            value={`ج.م ${summaryStats.totalRevenue.toFixed(2)}`}
            icon={CircleDollarSign}
            description="مجموع إيرادات المنتجات حسب الفلتر"
        />
         <StatCard 
            title="إجمالي المنتجات المباعة"
            value={`${summaryStats.totalItemsSold}`}
            icon={ShoppingCart}
            description="مجموع كميات المنتجات المباعة"
        />
        <StatCard 
            title="عدد فواتير البيع"
            value={`${summaryStats.totalTransactions}`}
            icon={Receipt}
            description="إجمالي عدد عمليات البيع المنفصلة"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل المبيعات التفصيلي</CardTitle>
          <CardDescription>عرض تفصيلي لكل منتج تم بيعه.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الإيصال</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الفرع</TableHead>
                <TableHead className="text-right">الكاشير</TableHead>
                <TableHead className="text-right">اسم المنتج</TableHead>
                <TableHead className="text-center">الكمية</TableHead>
                <TableHead className="text-center">سعر الوحدة</TableHead>
                <TableHead className="text-center">الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((item, index) => (
                <TableRow key={`${item.saleId}-${item.productName}-${index}`}>
                    <TableCell className="text-right font-mono">{`${item.branchName.substring(0,3).toUpperCase()}-${item.receiptNumber}`}</TableCell>
                    <TableCell className="text-right">{new Date(item.createdAt).toLocaleString('ar-EG')}</TableCell>
                    <TableCell className="text-right">{item.branchName}</TableCell>
                    <TableCell className="text-right">{item.cashierName}</TableCell>
                    <TableCell className="font-medium text-right">{item.productName}</TableCell>
                    <TableCell className="text-center">{item.cartQuantity}</TableCell>
                    <TableCell className="text-center">{`ج.م ${item.price.toFixed(2)}`}</TableCell>
                    <TableCell className="font-semibold text-center">{`ج.م ${(item.price * item.cartQuantity).toFixed(2)}`}</TableCell>
                </TableRow>
              ))}
               {filteredSales.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                        لا توجد مبيعات تطابق الفلاتر المحددة.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


export default function ProductSalesPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <ProductSalesContent />
            </main>
            </div>
        </SidebarProvider>
    );
}
