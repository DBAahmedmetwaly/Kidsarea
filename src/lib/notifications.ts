
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
    branchFormFieldsError: { title: "خطأ في الإدخال", description: "يرجى تعبئة جميع الحقول.", variant: "destructive" },

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
    
    // Employees
    employeeFormFieldsError: { title: "خطأ في الإدخال", description: "يرجى تعبئة جميع الحقول الأساسية.", variant: "destructive" },
    employeeCredentialsRequiredError: { title: "خطأ في الإدخال", description: "يجب إدخال اسم المستخدم وكلمة المرور لهذا الدور.", variant: "destructive" },
    employeeAddedSuccess: (name: string) => ({ title: "تمت الإضافة بنجاح", description: `تمت إضافة الموظف "${name}" إلى القائمة.` }),
    employeeAddError: { title: "خطأ", description: "لم يتم إضافة الموظف", variant: 'destructive' },
    employeeUpdateSuccess: (name: string) => ({ title: "تم التعديل بنجاح", description: `تم تحديث بيانات الموظف "${name}".` }),
    employeeUpdateError: { title: "خطأ في التعديل", description: "لم يتم تحديث بيانات الموظف.", variant: 'destructive' },
    employeeDeleteSuccess: { title: "نجاح", description: "تم حذف الموظف بنجاح" },
    employeeDeleteError: { title: "خطأ", description: "لم يتم حذف الموظف", variant: 'destructive' },
    
    // Expenses
    expenseTypeAdded: { title: 'تمت إضافة النوع بنجاح' },
    expenseTypeAddError: { title: 'خطأ', description: 'فشل إضافة نوع المصروف', variant: 'destructive' },
    expenseTypeRequired: { title: 'اسم النوع مطلوب', variant: 'destructive' },
    expenseTypeDeleteSuccess: { title: 'تم حذف النوع بنجاح' },
    expenseTypeDeleteError: { title: 'خطأ', description: 'فشل حذف النوع', variant: 'destructive' },
    expenseAddedSuccess: { title: 'تم تسجيل المصروف بنجاح' },
    expenseAddError: { title: 'خطأ', description: 'فشل تسجيل المصروف', variant: 'destructive' },
    expenseMissingSafeOrEmployee: { title: 'خطأ', description: 'لم يتم العثور على الخزينة أو الموظف.', variant: 'destructive' },
    
    // Game Categories
    categoryAddedSuccess: (name: string) => ({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة التصنيف "${name}".` }),
    categoryUpdateSuccess: (name: string) => ({ title: 'تم التعديل بنجاح', description: `تم تحديث التصنيف "${name}".` }),
    categoryOperationError: { title: 'خطأ', description: 'فشلت العملية.', variant: 'destructive' },
    categoryDeleteSuccess: { title: 'تم الحذف بنجاح' },
    categoryDeleteError: { title: 'خطأ', description: 'فشل حذف التصنيف.', variant: 'destructive' },
    
    // Games
    gameFormFieldsError: { title: "خطأ في الإدخال", description: "يرجى تعبئة جميع الحقول الأساسية.", variant: "destructive" },
    gameAddedSuccess: (name: string) => ({ title: "تمت الإضافة بنجاح", description: `تمت إضافة لعبة "${name}" إلى القائمة.` }),
    gameAddError: { title: "خطأ", description: "لم يتم إضافة اللعبة", variant: 'destructive' },
    gameUpdateSuccess: (name: string) => ({ title: "تم التعديل بنجاح", description: `تم تحديث بيانات اللعبة "${name}".` }),
    gameUpdateError: { title: "خطأ في التعديل", description: "لم يتم تحديث بيانات اللعبة.", variant: 'destructive' },
    gameDeleteSuccess: { title: "نجاح", description: "تم حذف اللعبة بنجاح" },
    gameDeleteError: { title: "خطأ", description: "لم يتم حذف اللعبة", variant: 'destructive' },

    // Inventory
    inventoryProductRequired: { title: "خطأ في الإدخال", description: "يرجى اختيار منتج.", variant: "destructive" },
    inventoryInvalidPriceQuantity: { title: "خطأ في الإدخال", description: "يرجى إدخال سعر وكمية صالحين.", variant: "destructive" },
    inventoryBranchNotFound: { title: "خطأ", description: "لم يتم العثور على الفرع المحدد.", variant: "destructive" },
    inventoryProductNotFound: { title: "خطأ", description: "لم يتم العثور على المنتج المحدد.", variant: "destructive" },
    inventoryUpdateSuccess: (name: string) => ({ title: 'تم التعديل بنجاح', description: `تم تحديث المنتج "${name}".` }),
    inventoryAddSuccess: (name: string) => ({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة المنتج "${name}" للمخزون.` }),
    inventoryDeleteSuccess: { title: 'تم الحذف بنجاح' },
    inventoryDeleteError: { title: 'خطأ', description: 'فشل حذف المنتج من المخزون.', variant: 'destructive' },
    inventoryQuantityInsufficient: { title: "الكمية غير كافية", variant: "destructive" },
    inventoryItemSoldOut: { title: "نفدت الكمية", variant: "destructive" },

    // Login
    loginSuccess: { title: 'تم تسجيل الدخول بنجاح', description: 'مرحباً بعودتك!' },
    loginSuccessUser: (name: string) => ({ title: 'تم تسجيل الدخول بنجاح', description: `مرحباً بعودتك، ${name}!` }),
    loginAccountDisabled: { title: 'الحساب معطل', description: 'تم تعطيل هذا الحساب. يرجى مراجعة المدير.', variant: 'destructive' },
    loginPermissionDenied: { title: 'فشل تسجيل الدخول', description: 'هذا المستخدم ليس لديه صلاحية للدخول.', variant: 'destructive' },
    loginFailed: { title: 'فشل تسجيل الدخول', description: 'اسم المستخدم أو كلمة المرور غير صحيحة.', variant: 'destructive' },
    
    // POS (Point of Sale)
    posPackageRequired: { messageKey: 'invalidInput', description: "يرجى اختيار باقة وقت واحدة على الأقل" },
    posCapacityExceeded: (capacity: number) => ({ messageKey: 'invalidInput', description: `لا يمكن إضافة المزيد من الأطفال. السعة القصوى هي ${capacity} طفل.` }),
    posChildAlreadyActive: (name: string) => ({ messageKey: 'invalidInput', description: `الطفل "${name}" موجود بالفعل في جلسة نشطة.` }),
    posCashierNotFound: { messageKey: 'saveError', description: 'لم يتم تحديد الكاشير الحالي.' },
    posCheckinSuccess: (names: string) => ({ title: 'تم تسجيل الدخول بنجاح', description: `تم تسجيل دخول الأطفال: ${names}.` }),
    posCheckinError: { messageKey: 'saveError', description: 'خطأ في تسجيل الدخول' },
    posCheckoutSuccess: { title: "تم تسجيل الخروج بنجاح" },
    posCheckoutError: { messageKey: 'saveError', description: 'خطأ في تسجيل الخروج' },
    posOriginalSessionNotFound: { messageKey: 'saveError', description: "لم يتم العثور على الجلسة الأصلية." },
    posOvertimeCheckoutError: { messageKey: 'saveError', description: "فشل تحديث الجلسة الأصلية." },
    posOvertimeOriginalInvoiceMissing: { messageKey: 'saveError', description: 'لا يمكن العثور على الفاتورة الأصلية لهذه الجلسة.' },
    posTimeEndedNotification: (names: string) => ({ title: "🔔 انتهى الوقت!", description: `انتهى وقت اللعب للطفل/الأطفال: ${names}.`, variant: "destructive"}),

    // POS Sale
    posSaleSuccess: { title: "تمت عملية البيع بنجاح", description: "تم تسجيل الفاتورة وتحديث البيانات." },
    posSaleError: { messageKey: 'saveError', description: "فشل تسجيل عملية البيع."},
    posSaleBranchNotFound: { messageKey: 'saveError', description: "لم يتم العثور على الفرع الحالي."},

    // Product Categories
    productCategoryAddSuccess: (name: string) => ({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة الفئة "${name}".` }),
    productCategoryUpdateSuccess: (name: string) => ({ title: 'تم التعديل بنجاح', description: `تم تحديث الفئة "${name}".` }),
    productCategoryDeleteError: { title: 'خطأ', description: 'فشل حذف الفئة.', variant: 'destructive' },
    
    // Products
    productUpdateSuccess: (name: string) => ({ title: 'تم التعديل بنجاح', description: `تم تحديث المنتج "${name}" في الكتالوج والمخزون.` }),
    productAddSuccess: (name: string) => ({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة المنتج "${name}".` }),
    productDeleteError: { title: 'خطأ', description: 'فشل حذف المنتج.', variant: 'destructive' },
    
    // Roles
    rolesUpdateSuccess: (role: string) => ({ description: `تم تحديث صلاحيات دور "${role}".` }),
    
    // Safes
    safeAddSuccess: (name: string) => ({ title: "تمت الإضافة بنجاح", description: `تمت إضافة الخزينة "${name}" إلى القائمة.` }),
    safeAddError: { title: "خطأ", description: "لم يتم إضافة الخزينة", variant: 'destructive' },
    safeAddDuplicateError: (name: string) => ({ title: "لا يمكن إضافة الخزينة", description: `يوجد بالفعل خزينة لهذا الفرع (${name}). لا يمكن إضافة أكثر من خزينة لكل فرع.`, variant: 'destructive' }),
    safeDeleteError: { title: "خطأ", description: "لم يتم حذف الخزينة", variant: 'destructive' },
    
    // Shift Closing
    shiftEmployeeNotFound: { error: 'لم يتم العثور على الموظف.' },
    shiftCloseSuccess: { title: 'تم استلام النقدية', description: 'تم إغلاق الوردية ويمكن الآن ترحيلها في خطوة "إغلاق اليومية".'},
    shiftDbError: { error: 'فشل حفظ البيانات الأساسية في قاعدة البيانات.' },
    shiftOpenSuccess: (name: string) => ({ title: 'تم فتح الوردية', description: `تم فتح وردية جديدة للموظف ${name}.` }),
    shiftOpenError: { title: "خطأ", description: "لم يتم فتح الوردية", variant: 'destructive' },
    shiftSettleNoShifts: { title: "بيانات غير مكتملة", description: "يرجى تحديد وردية واحدة على الأقل. يجب أن يكون للفرع خزينة واحدة على الأقل.", variant: 'destructive' },
    shiftSettleMultipleBranches: { title: "خطأ في التحديد", description: "لا يمكن ترحيل ورديات من فروع مختلفة في نفس العملية. يرجى ترحيل كل فرع على حدة.", variant: 'destructive' },
    shiftSettleSuccess: (total: number, safeName: string) => ({ title: "تم إغلاق اليومية بنجاح", description: `تم ترحيل مبلغ ${total.toFixed(2)} ج.م إلى خزينة ${safeName}.` }),
    shiftSettleError: { title: "خطأ أثناء ترحيل النقدية", variant: "destructive" },
    
    // Subscriptions
    subscriptionUserError: { title: "خطأ", description: "لم يتم تحديد المستخدم الحالي."},
    subscriptionDataError: { title: "خطأ", description: "بيانات العميل أو الباقة غير صحيحة."},
    subscriptionDuplicateError: (name: string) => ({ title: "اشتراك مكرر", description: `الطفل "${name}" لديه اشتراك فعال بالفعل. يمكن تجديده قبل 5 أيام من تاريخ الانتهاء.`, variant: 'destructive'}),
    subscriptionCreateError: (name: string) => ({ title: "خطأ", description: `فشل إنشاء الاشتراك للطفل ${name}`, variant: 'destructive'}),
    subscriptionCreateSuccess: (count: number) => ({ title: `تم إنشاء ${count} اشتراك بنجاح!`}),
    subscriptionDeleteError: { title: "خطأ", description: "فشل حذف الاشتراك", variant: 'destructive'},
    
    // Subscription Plans
    planUpdateSuccess: (name: string) => ({ title: 'تم التعديل بنجاح', description: `تم تحديث باقة "${name}".` }),
    planAddSuccess: (name: string) => ({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة باقة "${name}".` }),
    planDeleteError: { title: 'خطأ', description: 'فشل حذف الباقة.', variant: 'destructive' },
    
    // Change Password
    passwordMismatch: { messageKey: 'invalidInput', description: "كلمتا المرور الجديدتان غير متطابقتين."},
    passwordUserError: { messageKey: 'saveError', description: "لا يمكن تغيير كلمة مرور هذا المستخدم."},
    passwordUserNotFound: { messageKey: 'saveError', description: "لم يتم العثور على المستخدم."},
    passwordIncorrect: { messageKey: 'wrongPassword', description: "كلمة المرور الحالية غير صحيحة."},
    passwordUpdateSuccess: { messageKey: 'saveSuccess', description: "تم تغيير كلمة المرور بنجاح."},
    passwordUpdateError: { messageKey: 'saveError', description: "فشل تحديث كلمة المرور."},
};

export type NotificationKey = keyof typeof notificationMessages;

export const getNotificationMessage = (key: NotificationKey, ...args: any[]) => {
    const messageOrFn = notificationMessages[key];
    if (typeof messageOrFn === 'function') {
        return messageOrFn(...args);
    }
    return messageOrFn;
};
