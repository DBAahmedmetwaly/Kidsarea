
export const notificationMessages = {
    // General
    saveSuccess: { title: "تم الحفظ بنجاح" },
    saveError: { title: "خطأ", description: "فشلت عملية الحفظ.", variant: "destructive" },
    deleteSuccess: { title: "تم الحذف بنجاح" },
    deleteError: { title: "خطأ", description: "فشلت عملية الحذف.", variant: "destructive" },
    invalidInput: { title: "خطأ في الإدخال", variant: "destructive" },
    
    // Branches
    branchAdded: (name: string) => ({ title: "تمت الإضافة بنجاح", description: `تمت إضافة فرع "${name}" وخزينته التلقائية بنجاح.` }),
    branchAddError: { title: "خطأ", description: "لم يتم إضافة الفرع أو الخزينة.", variant: 'destructive' },
    branchUpdated: (name: string) => ({ title: "تم التعديل بنجاح", description: `تم تحديث فرع "${name}".` }),
    branchUpdateError: { title: "خطأ في التعديل", variant: 'destructive' },
    branchDeleteError: { title: 'خطأ', description: 'لم يتم حذف الفرع.', variant: 'destructive' },
    enableBranchAdd: { title: "تمكين الإضافة", description: "تم تفعيل زر إضافة فرع جديد." },
    wrongPassword: { title: "كلمة مرور خاطئة", variant: 'destructive' },

    // Customers
    customerAddedSuccess: (name: string) => ({ title: "تمت الإضافة بنجاح", description: `تمت إضافة العميل "${name}".` }),
    customerAddedError: { title: "خطأ", description: "لم يتم إضافة العميل", variant: 'destructive' },
    customerPhoneExistsError: { title: "خطأ", description: "أحد أرقام الهواتف المدخلة مسجل لعميل آخر.", variant: 'destructive' },
    customerUpdateSuccess: { title: "تم التعديل بنجاح" },
    customerUpdateError: { title: "خطأ في التعديل", variant: 'destructive' },
    customerDeleteSuccess: { title: "نجاح", description: "تم حذف العميل بنجاح" },
    customerDeleteError: { title: "خطأ", description: "لم يتم حذف العميل", variant: 'destructive' },
    customerChildAgeError: { title: "خطأ في الإدخال", description: "عمر الطفل يجب أن يكون سنة واحدة على الأقل.", variant: "destructive" },
    customerPhoneRequiredError: { title: "خطأ في الإدخال", description: "يجب إدخال رقم هاتف واحد على الأقل.", variant: "destructive" },
    customerUploadReading: { message: 'جاري قراءة الملف...' },
    customerUploadNoNew: { message: 'لم يتم العثور على عملاء جدد في الملف.' },
    customerUploadProcessing: (processed: number, total: number, chunk: number, totalChunks: number) => ({
        message: `جاري معالجة الدفعة ${chunk} من ${totalChunks}... (${processed}/${total})`
    }),
    customerUploadSuccess: (count: number) => ({ message: `تم استيراد ${count} عميل بنجاح!` }),
    customerUploadError: { message: 'خطأ في معالجة الملف. تأكد من أن الملف بالصيغة الصحيحة.' },
    customerUploadReadError: { message: 'فشل قراءة الملف.' },
    customerDeleteAllSuccess: { title: "نجاح", description: "تم حذف جميع العملاء بنجاح." },
    customerDeleteAllError: { title: "خطأ", description: "فشل حذف جميع العملاء.", variant: 'destructive' },
    
    // Data Management
    backupSuccess: { title: 'تم النسخ الاحتياطي بنجاح', description: 'تم تنزيل ملف النسخة الاحتياطية بنجاح.'},
    backupNoData: { title: 'لا توجد بيانات', description: 'قاعدة البيانات فارغة، لا يوجد شيء لنسخه.', variant: 'destructive' },
    backupError: { title: 'خطأ في النسخ الاحتياطي', description: 'فشل تنزيل النسخة الاحتياطية. يرجى المحاولة مرة أخرى.', variant: 'destructive'},
    restoreNoFile: { title: 'لم يتم اختيار ملف', description: 'يرجى اختيار ملف نسخة احتياطية أولاً.', variant: 'destructive' },
    restoreSuccess: { title: 'تمت الاستعادة بنجاح', description: 'تم استعادة جميع البيانات من ملف النسخة الاحتياطية.' },
    restoreError: { title: 'خطأ في الاستعادة', description: 'فشل في استعادة البيانات. تأكد من أن الملف صحيح.', variant: 'destructive' },
    restoreReadError: { title: 'خطأ في قراءة الملف', description: 'لا يمكن قراءة الملف المختار.', variant: 'destructive' },
    factoryResetSuccess: { title: 'تم الحذف بنجاح', description: 'تم حذف بيانات المعاملات، وتم تصفير أرصدة الخزائن.' },
    factoryResetError: { title: 'خطأ في الحذف', description: 'فشل حذف البيانات. يرجى المحاولة مرة أخرى.', variant: 'destructive' },
};

export const getNotificationMessage = (key: keyof typeof notificationMessages, ...args: any[]) => {
    const messageOrFn = notificationMessages[key];
    if (typeof messageOrFn === 'function') {
        return messageOrFn(...args);
    }
    return messageOrFn;
};
