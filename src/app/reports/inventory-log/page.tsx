

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useInventoryMovements } from '@/context/InventoryMovementContext';
import { useFirebase } from '@/context/FirebaseContext';
import { useAuth } from '@/components/AuthProvider';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as XLSX from 'xlsx';

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
import { PackageSearch, Calendar as CalendarIcon, FilterX, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

function InventoryLogContent() {
    const { inventoryMovements, loading } = useInventoryMovements();
    const { employees, branches, products } = useFirebase();
    const { user } = useAuth();

    // Filters
    const [productFilter, setProductFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [fromDate, setFromDate] = useState<Date | undefined>();
    const [toDate, setToDate] = useState<Date | undefined>();

    const currentUser = useMemo(() => {
        if (!user) return null;
        return employees.find(e => e.username === user.username);
    }, [user, employees]);
    
    const canChangeBranch = !currentUser || currentUser.branch === 'كل الفروع' || user?.username === 'admin';

    useEffect(() => {
        if (currentUser && !canChangeBranch) {
            setBranchFilter(currentUser.branch);
        }
    }, [currentUser, canChangeBranch]);

    const filteredMovements = useMemo(() => {
        return (inventoryMovements || []).filter(item => {
            const productMatch = productFilter === '' || item.productName.toLowerCase().includes(productFilter.toLowerCase());
            const branchMatch = branchFilter === 'all' || item.branchName === branchFilter;
            const typeMatch = typeFilter === 'all' || item.type === typeFilter;
            const dateMatch = fromDate && toDate 
                ? isWithinInterval(new Date(item.date), { start: startOfDay(fromDate), end: endOfDay(toDate) })
                : true;
            return productMatch && branchMatch && typeMatch && dateMatch;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [inventoryMovements, productFilter, branchFilter, typeFilter, fromDate, toDate]);
    
     const clearFilters = () => {
        if (!canChangeBranch) {
            // Don't clear branch filter
        } else {
            setBranchFilter('all');
        }
        setProductFilter('');
        setTypeFilter('all');
        setFromDate(undefined);
        setToDate(undefined);
    }
    
    const handleExport = () => {
        const dataToExport = filteredMovements.map(item => ({
            'التاريخ': new Date(item.date).toLocaleString('ar-EG'),
            'اسم المنتج': item.productName,
            'الفرع': item.branchName,
            'نوع الحركة': item.type,
            'الكمية قبل': item.quantityBefore,
            'كمية الحركة': item.change,
            'الكمية بعد': item.quantityAfter,
            'الموظف': item.recordedBy,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "حركة الأصناف");
        XLSX.writeFile(workbook, `Inventory_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden"><SidebarTrigger /></div>
        <PackageSearch className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl me-auto">تقرير حركة الأصناف</h1>
        <Button onClick={handleExport} size="sm" variant="outline" disabled={filteredMovements.length === 0}>
            <Download className="me-2 h-4 w-4" />
            تصدير إلى Excel
        </Button>
      </div>
      
       <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>فلترة التقرير</CardTitle>
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
                        <Select value={branchFilter} onValueChange={setBranchFilter} disabled={!canChangeBranch}>
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
                        <label className="text-sm font-medium">نوع الحركة</label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">كل الأنواع</SelectItem>
                                <SelectItem value="Sale">بيع</SelectItem>
                                <SelectItem value="Manual Adjustment">تعديل يدوي</SelectItem>
                                <SelectItem value="Initial Stock">رصيد افتتاحي</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-2">
                         <div className="space-y-2 w-1/2">
                            <label className="text-sm font-medium">من</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="me-2 h-4 w-4" />
                                    {fromDate ? format(fromDate, "PPP", { locale: ar }) : <span>تاريخ</span>}
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
                        <div className="space-y-2 w-1/2">
                            <label className="text-sm font-medium">إلى</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="me-2 h-4 w-4" />
                                    {toDate ? format(toDate, "PPP", { locale: ar }) : <span>تاريخ</span>}
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
                </div>
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل حركة الأصناف</CardTitle>
          <CardDescription>عرض تفصيلي لكل حركة تمت على أصناف المخزون.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-right">الفرع</TableHead>
                <TableHead className="text-center">نوع الحركة</TableHead>
                <TableHead className="text-center">الكمية قبل</TableHead>
                <TableHead className="text-center">كمية الحركة</TableHead>
                <TableHead className="text-center">الكمية بعد</TableHead>
                <TableHead className="text-right">بواسطة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map((item) => (
                <TableRow key={item.id}>
                    <TableCell className="text-right">{new Date(item.date).toLocaleString('ar-EG')}</TableCell>
                    <TableCell className="font-medium text-right">{item.productName}</TableCell>
                    <TableCell className="text-right">{item.branchName}</TableCell>
                    <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.type === 'Sale' ? 'bg-red-100 text-red-800' :
                            item.type === 'Manual Adjustment' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                        }`}>
                            {item.type === 'Sale' ? 'بيع' : item.type === 'Manual Adjustment' ? 'تعديل يدوي' : 'رصيد افتتاحي'}
                        </span>
                    </TableCell>
                    <TableCell className="text-center">{item.quantityBefore}</TableCell>
                    <TableCell className={`text-center font-bold ${item.change > 0 ? 'text-green-600' : 'text-red-600'}`}>{item.change}</TableCell>
                    <TableCell className="text-center font-semibold">{item.quantityAfter}</TableCell>
                    <TableCell className="text-right">{item.recordedBy}</TableCell>
                </TableRow>
              ))}
               {filteredMovements.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                        لا توجد حركات أصناف تطابق الفلاتر المحددة.
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


export default function InventoryLogPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <InventoryLogContent />
            </main>
            </div>
        </SidebarProvider>
    );
}
