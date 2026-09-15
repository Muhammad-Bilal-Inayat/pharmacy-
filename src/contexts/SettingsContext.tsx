import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Firm {
  id: string;
  name: string;
  isDefault: boolean;
  address?: string;
  phone?: string;
  gstin?: string;
  email?: string;
}

export interface TaxRateItem {
  id: string;
  name: string;
  rate: number;
  type: 'GST' | 'IGST' | 'VAT' | 'WHT' | 'Cess';
  isDefault: boolean;
}

export interface TaxGroupItem {
  id: string;
  name: string;
  rate: number;
  subTaxes: string[];
  description?: string;
}

export interface FeatureFlags {
  universalSearch: boolean;
  product360: boolean;
  customer360: boolean;
  dataImportWizard: boolean;
  bulkEdit: boolean;
  duplicateDetection: boolean;
  safetyRules: boolean;
  quotationToInvoice: boolean;
  cashierShiftClosing: boolean;
  immutableInvoiceVoid: boolean;
  periodLock: boolean;
  documentAttachments: boolean;
  exceptionCenter: boolean;
  syncHealthCenter: boolean;
  idempotencyProtection: boolean;
  featureFlagsSwitchboard: boolean;
  databaseMigrationDiagnostics: boolean;
  taxEngine: boolean;
  productOnlineControl: boolean;
}

export interface SafetyRulesConfig {
  blockBelowCostSale: boolean;
  warnBelowCostSale: boolean;
  blockNegativeStockBilling: boolean;
  blockExpiredBatchBilling: boolean;
  blockExceededCreditLimit: boolean;
  requireBatchOnSale: boolean;
  requireCustomerPhoneOnCredit: boolean;
  strictBarcodeUniqueCheck: boolean;
}

export interface PeriodLockConfig {
  enabled: boolean;
  lockDate: string;
  allowAdminOverride: boolean;
  reason?: string;
}

export interface AppSettings {
  general: {
    theme: 'light' | 'dark' | 'system';
    enablePasscode: boolean;
    passcode: string;
    currency: string;
    currencySymbol: string;
    decimalPlaces: number;
    tinNumber: boolean;
    tinValue: string;
    estimateQuotation: boolean;
    salePurchaseOrder: boolean;
    otherIncome: boolean;
    fixedAssets: boolean;
    deliveryChallan: boolean;
    deliveryChallanReturn: boolean;
    deliveryChallanPrintAmount: boolean;
    multiFirm: boolean;
    firms: Firm[];
    autoBackup: boolean;
    autoBackupFrequency: 'daily' | 'weekly' | 'onClose';
    lastBackupDate: string;
    enableVoiceMic: boolean;
    enableQrScanner: boolean;
  };
  featureFlags: FeatureFlags;
  safetyRules: SafetyRulesConfig;
  periodLock: PeriodLockConfig;
  transaction: {
    billingNameOfParties: boolean;
    customerPhone: boolean;
    customerPoDetails: boolean;
    freeItemQuantity: boolean;
    countLabelEnabled: boolean;
    countLabelText: string;
    roundOffType: 'Nearest' | 'None' | 'Up' | 'Down';
    roundOffValue: number;
    quickEntry: boolean;
    doNotShowInvoicePreview: boolean;
    enablePasscodeForTxn: boolean;
    discountDuringPayments: boolean;
    linkPaymentsToInvoices: boolean;
    dueDatesAndPaymentTerms: boolean;
    showProfitOnSale: boolean;
    showPurchasePriceInAutocomplete: boolean;
    showBatchInAutocomplete: boolean;
    showStockInAutocomplete: boolean;
    showMrpInAutocomplete: boolean;
    showSalePriceInAutocomplete: boolean;
    showExpDateInAutocomplete: boolean;
    prefixes: {
      sale: string;
      creditNote: string;
      saleOrder: string;
      purchaseOrder: string;
      estimate: string;
      deliveryChallan: string;
      paymentIn: string;
      purchaseBill: string;
      debitNote: string;
    };
    additionalFields: Array<{ id: string; name: string; enabled: boolean; showInPrint: boolean }>;
    transportDetails: {
      enabled: boolean;
      transportName: boolean;
      vehicleNo: boolean;
      lrNo: boolean;
      deliveryLocation: boolean;
    };
    additionalCharges: {
      enabled: boolean;
      shipping: boolean;
      packaging: boolean;
      insurance: boolean;
      labor: boolean;
    };
    warrantyMode: boolean;
  };
  print: {
    printerType: 'REGULAR' | 'THERMAL';
    theme: string;
    themeColor: string;
    makeRegularDefault: boolean;
    repeatHeader: boolean;
    showCompanyName: boolean;
    companyName: string;
    showCompanyLogo: boolean;
    companyLogo?: string;
    showAddress: boolean;
    address: string;
    showEmail: boolean;
    email: string;
    showPhone: boolean;
    phone: string;
    paperSize: 'A4' | 'A5' | 'Letter' | 'Thermal 80mm' | 'Thermal 58mm';
    companyNameSize: 'Large' | 'Medium' | 'Small';
    invoiceTextSize: 'Large' | 'Medium' | 'Small';
    printOriginalDuplicate: boolean;
    extraSpaceTop: number;
    transactionTitle: string;
    minItemRows: number;
    tableColumns: {
      serialNo: boolean;
      itemName: boolean;
      hsnSac: boolean;
      batchNo: boolean;
      expDate: boolean;
      mfgDate: boolean;
      mrp: boolean;
      quantity: boolean;
      unit: boolean;
      price: boolean;
      discount: boolean;
      taxPercent: boolean;
      taxAmount: boolean;
      total: boolean;
    };
    amountWithDecimal: boolean;
    receivedAmount: boolean;
    balanceAmount: boolean;
    currentPartyBalance: boolean;
    taxDetails: boolean;
    youSaved: boolean;
    amountWithGrouping: boolean;
    printDescription: boolean;
    printTerms: boolean;
    termsAndConditions: string;
    printSignatureText: boolean;
    signatureText: string;
    paymentMode: boolean;
    printAcknowledgement: boolean;
    printBankDetails: boolean;
    bankDetailsText: string;
    printQrCode: boolean;
  };
  taxes: {
    taxRates: TaxRateItem[];
    taxGroups: TaxGroupItem[];
    enableRcm: boolean;
    compositeScheme: boolean;
    enableTcsTds: boolean;
  };
  party: {
    partyGrouping: boolean;
    shippingAddress: boolean;
    enablePaymentReminder: boolean;
    reminderDays: number;
    reminderMessage: string;
    creditLimitWarning: boolean;
    loyaltyPoints: boolean;
    additionalFields: Array<{
      id: string;
      name: string;
      placeholder: string;
      enabled: boolean;
      showInPrint: boolean;
      type: 'text' | 'date';
    }>;
  };
  item: {
    enableItem: boolean;
    barcodeScan: boolean;
    stockMaintenance: boolean;
    manufacturing: boolean;
    showLowStockDialog: boolean;
    itemsUnit: boolean;
    defaultUnit: string;
    itemCategory: boolean;
    partyWiseItemRate: boolean;
    description: boolean;
    itemWiseTax: boolean;
    itemWiseDiscount: boolean;
    updateSalePriceFromTxn: boolean;
    quantityDecimals: number;
    wholesalePrice: boolean;
    onlineStore: boolean;
    mrp: boolean;
    serialTracking: boolean;
    batchTracking: boolean;
    expDate: boolean;
    expDateFormat: 'mm/yy' | 'dd/mm/yy' | 'yyyy-mm-dd';
    mfgDate: boolean;
    mfgDateFormat: 'dd/mm/yy' | 'mm/yy' | 'yyyy-mm-dd';
    modelNo: boolean;
    size: boolean;
    itemCustomFields: Array<{ id: string; name: string; enabled: boolean }>;
  };
  pricing: {
    defaultProfitMargin: number;
    pricingMethod: 'Markup on Cost' | 'Gross Margin';
    belowCostAction: 'Warning' | 'Block';
    costIncreaseAlerts: boolean;
    costIncreaseThreshold: number;
  };
  controlledAndGeneric: {
    masterEnabled: boolean;
    genericSystemEnabled: boolean;
    genericSearchEnabled: boolean;
    showAllBrandsByGeneric: boolean;
    controlledItemsEnabled: boolean;
    hideControlledFromNormalPOS: boolean;
    hideControlledFromNormalSearch: boolean;
    specialControlledSaleEnabled: boolean;
    controlledSaleAuthRequired: boolean;
    controlledPrescriptionRequired: boolean;
    controlledRegisterReportEnabled: boolean;
    form7PrintTemplateEnabled: boolean;
    controlledInvoicePrintEnabled: boolean;
    controlledReprintEnabled: boolean;
    controlledOnlineSaleAllowed: boolean;
  };
  modules: {
    sales: boolean;
    purchases: boolean;
    inventory: boolean;
    parties: boolean;
    expenses: boolean;
    banking: boolean;
    reports: boolean;
    pos: boolean;
    syncShare: boolean;
  };
}

export const defaultSettings: AppSettings = {
  general: {
    theme: 'light',
    enablePasscode: false,
    passcode: '',
    currency: 'PKR (Rs.)',
    currencySymbol: 'Rs.',
    decimalPlaces: 2,
    tinNumber: true,
    tinValue: 'PK-NTN-4928172-9',
    estimateQuotation: true,
    salePurchaseOrder: true,
    otherIncome: true,
    fixedAssets: true,
    deliveryChallan: true,
    deliveryChallanReturn: false,
    deliveryChallanPrintAmount: true,
    multiFirm: false,
    firms: [
      {
        id: 'firm-1',
        name: 'MBI INVENTRA',
        isDefault: true,
        address: 'MBI Corporate Plaza, Commercial Center, Lahore',
        phone: '03364585863',
        gstin: 'PK-NTN-4928172-9',
        email: 'support@mbinventra.com',
      },
    ],
    autoBackup: true,
    autoBackupFrequency: 'daily',
    lastBackupDate: '01/09/2026 | 09:09 AM',
    enableVoiceMic: true,
    enableQrScanner: true,
  },
  featureFlags: {
    universalSearch: true,
    product360: true,
    customer360: true,
    dataImportWizard: true,
    bulkEdit: true,
    duplicateDetection: true,
    safetyRules: true,
    quotationToInvoice: true,
    cashierShiftClosing: true,
    immutableInvoiceVoid: true,
    periodLock: true,
    documentAttachments: true,
    exceptionCenter: true,
    syncHealthCenter: true,
    idempotencyProtection: true,
    featureFlagsSwitchboard: true,
    databaseMigrationDiagnostics: true,
    taxEngine: true,
    productOnlineControl: true,
  },
  safetyRules: {
    blockBelowCostSale: false,
    warnBelowCostSale: true,
    blockNegativeStockBilling: false,
    blockExpiredBatchBilling: true,
    blockExceededCreditLimit: false,
    requireBatchOnSale: false,
    requireCustomerPhoneOnCredit: true,
    strictBarcodeUniqueCheck: true,
  },
  periodLock: {
    enabled: false,
    lockDate: '',
    allowAdminOverride: true,
    reason: 'Fiscal year-end audit lock',
  },
  transaction: {
    billingNameOfParties: true,
    customerPhone: true,
    customerPoDetails: true,
    freeItemQuantity: true,
    countLabelEnabled: true,
    countLabelText: 'Total Items Count',
    roundOffType: 'Nearest',
    roundOffValue: 1,
    quickEntry: true,
    doNotShowInvoicePreview: false,
    enablePasscodeForTxn: false,
    discountDuringPayments: true,
    linkPaymentsToInvoices: true,
    dueDatesAndPaymentTerms: true,
    showProfitOnSale: true,
    showPurchasePriceInAutocomplete: true,
    showBatchInAutocomplete: true,
    showStockInAutocomplete: true,
    showMrpInAutocomplete: true,
    showSalePriceInAutocomplete: true,
    showExpDateInAutocomplete: false,
    prefixes: {
      sale: 'INV-',
      creditNote: 'CN-',
      saleOrder: 'SO-',
      purchaseOrder: 'PO-',
      estimate: 'EST-',
      deliveryChallan: 'DC-',
      paymentIn: 'REC-',
      purchaseBill: 'BILL-',
      debitNote: 'DN-',
    },
    additionalFields: [
      { id: 'f1', name: 'P.O. Number', enabled: true, showInPrint: true },
      { id: 'f2', name: 'E-Way Bill No', enabled: false, showInPrint: false },
      { id: 'f3', name: 'Vehicle / Driver No', enabled: true, showInPrint: true },
    ],
    transportDetails: {
      enabled: true,
      transportName: true,
      vehicleNo: true,
      lrNo: true,
      deliveryLocation: true,
    },
    additionalCharges: {
      enabled: true,
      shipping: true,
      packaging: true,
      insurance: false,
      labor: false,
    },
    warrantyMode: false,
  },
  print: {
    printerType: 'REGULAR',
    theme: 'Tax Theme 1',
    themeColor: '#2563eb', // Primary Blue
    makeRegularDefault: true,
    repeatHeader: true,
    showCompanyName: true,
    companyName: 'MBI INVENTRA',
    showCompanyLogo: true,
    showAddress: true,
    address: 'MBI Corporate Plaza, Commercial Center, Lahore',
    showEmail: true,
    email: 'support@mbinventra.com',
    showPhone: true,
    phone: '03364585863',
    paperSize: 'A4',
    companyNameSize: 'Large',
    invoiceTextSize: 'Medium',
    printOriginalDuplicate: true,
    extraSpaceTop: 0,
    transactionTitle: 'TAX INVOICE',
    minItemRows: 5,
    tableColumns: {
      serialNo: true,
      itemName: true,
      hsnSac: true,
      batchNo: true,
      expDate: true,
      mfgDate: false,
      mrp: true,
      quantity: true,
      unit: true,
      price: true,
      discount: true,
      taxPercent: true,
      taxAmount: true,
      total: true,
    },
    amountWithDecimal: true,
    receivedAmount: true,
    balanceAmount: true,
    currentPartyBalance: true,
    taxDetails: true,
    youSaved: true,
    amountWithGrouping: true,
    printDescription: true,
    printTerms: true,
    termsAndConditions: '1. Goods once sold will not be taken back without original invoice.\n2. Warranty as per manufacturer policy.\n3. Payment due within specified terms.',
    printSignatureText: true,
    signatureText: 'Authorized Signatory',
    paymentMode: true,
    printAcknowledgement: false,
    printBankDetails: true,
    bankDetailsText: 'Bank: Meezan Bank Ltd | A/C: 0102-0103456789 | Title: MBI Inventra | IBAN: PK36MEZN0001020103456789',
    printQrCode: true,
  },
  taxes: {
    taxRates: [
      { id: 'tax-0', name: 'Exempted / Zero Tax (0%)', rate: 0, type: 'GST', isDefault: false },
      { id: 'tax-5', name: 'GST 5%', rate: 5, type: 'GST', isDefault: false },
      { id: 'tax-12', name: 'GST 12%', rate: 12, type: 'GST', isDefault: false },
      { id: 'tax-18', name: 'Standard GST (18%)', rate: 18, type: 'GST', isDefault: true },
      { id: 'tax-28', name: 'Luxury / Extra Tax (28%)', rate: 28, type: 'GST', isDefault: false },
      { id: 'tax-wht', name: 'WHT / Advance Tax 4.5%', rate: 4.5, type: 'WHT', isDefault: false },
    ],
    taxGroups: [
      { id: 'tg-1', name: 'GST 18% (CGST 9% + SGST 9%)', rate: 18, subTaxes: ['CGST 9%', 'SGST 9%'], description: 'Standard Intra-state tax split' },
      { id: 'tg-2', name: 'GST 18% + 1% Extra Cess', rate: 19, subTaxes: ['GST 18%', 'Cess 1%'], description: 'Medical equipment cess levy' },
    ],
    enableRcm: false,
    compositeScheme: false,
    enableTcsTds: true,
  },
  party: {
    partyGrouping: true,
    shippingAddress: true,
    enablePaymentReminder: true,
    reminderDays: 1,
    reminderMessage: 'Dear {party_name}, this is a gentle reminder from {firm_name} that your outstanding invoice balance of Rs. {due_amount} is due on {due_date}. Kindly arrange the payment. Thank you!',
    creditLimitWarning: true,
    loyaltyPoints: true,
    additionalFields: [
      { id: 'pf1', name: 'Drug License / DL No.', placeholder: 'e.g. DL-09-2024-KTM', enabled: true, showInPrint: true, type: 'text' },
      { id: 'pf2', name: 'Area / Delivery Route', placeholder: 'e.g. Sargodha Main Road', enabled: true, showInPrint: false, type: 'text' },
      { id: 'pf3', name: 'Sales Representative', placeholder: 'e.g. Tariq Mehmood', enabled: true, showInPrint: true, type: 'text' },
      { id: 'pf4', name: 'License Validity Date', placeholder: 'dd/mm/yy', enabled: true, showInPrint: true, type: 'date' },
    ],
  },
  item: {
    enableItem: true,
    barcodeScan: true,
    stockMaintenance: true,
    manufacturing: false,
    showLowStockDialog: true,
    itemsUnit: true,
    defaultUnit: 'PCS',
    itemCategory: true,
    partyWiseItemRate: true,
    description: true,
    itemWiseTax: true,
    itemWiseDiscount: true,
    updateSalePriceFromTxn: true,
    quantityDecimals: 2,
    wholesalePrice: true,
    onlineStore: false,
    mrp: true,
    serialTracking: true,
    batchTracking: true,
    expDate: true,
    expDateFormat: 'mm/yy',
    mfgDate: true,
    mfgDateFormat: 'dd/mm/yy',
    modelNo: true,
    size: true,
    itemCustomFields: [
      { id: 'icf1', name: 'Generic Formula / Salt', enabled: true },
      { id: 'icf2', name: 'Storage Temperature', enabled: true },
    ],
  },
  pricing: {
    defaultProfitMargin: 22,
    pricingMethod: 'Markup on Cost',
    belowCostAction: 'Warning',
    costIncreaseAlerts: true,
    costIncreaseThreshold: 5,
  },
  controlledAndGeneric: {
    masterEnabled: true,
    genericSystemEnabled: true,
    genericSearchEnabled: true,
    showAllBrandsByGeneric: true,
    controlledItemsEnabled: true,
    hideControlledFromNormalPOS: true,
    hideControlledFromNormalSearch: true,
    specialControlledSaleEnabled: true,
    controlledSaleAuthRequired: true,
    controlledPrescriptionRequired: true,
    controlledRegisterReportEnabled: true,
    form7PrintTemplateEnabled: true,
    controlledInvoicePrintEnabled: true,
    controlledReprintEnabled: true,
    controlledOnlineSaleAllowed: false,
  },
  modules: {
    sales: true,
    purchases: true,
    inventory: true,
    parties: true,
    expenses: true,
    banking: true,
    reports: true,
    pos: true,
    syncShare: true,
  },
};

const STORAGE_KEY = 'vyapar_system_app_settings_v2';

interface SettingsContextType {
  settings: AppSettings;
  theme: 'light' | 'dark' | 'system';
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updateGeneral: (data: Partial<AppSettings['general']>) => void;
  updateFeatureFlags: (data: Partial<AppSettings['featureFlags']>) => void;
  updateSafetyRules: (data: Partial<AppSettings['safetyRules']>) => void;
  updatePeriodLock: (data: Partial<AppSettings['periodLock']>) => void;
  updateTransaction: (data: Partial<AppSettings['transaction']>) => void;
  updateTransactionSettings: (data: Partial<AppSettings['transaction']>) => void;
  updatePrint: (data: Partial<AppSettings['print']>) => void;
  updatePrintSettings: (data: Partial<AppSettings['print']>) => void;
  updateTaxes: (data: Partial<AppSettings['taxes']>) => void;
  updateParty: (data: Partial<AppSettings['party']>) => void;
  updateItem: (data: Partial<AppSettings['item']>) => void;
  updatePricing: (data: Partial<AppSettings['pricing']>) => void;
  updateControlledAndGeneric: (data: Partial<AppSettings['controlledAndGeneric']>) => void;
  updateModules: (data: Partial<AppSettings['modules']>) => void;
  addTaxRate: (item: Omit<TaxRateItem, 'id'>) => void;
  deleteTaxRate: (id: string) => void;
  addTaxGroup: (item: Omit<TaxGroupItem, 'id'>) => void;
  deleteTaxGroup: (id: string) => void;
  addFirm: (firm: Omit<Firm, 'id'>) => void;
  updateFirm: (id: string, data: Partial<Firm>) => void;
  deleteFirm: (id: string) => void;
  setDefaultFirm: (id: string) => void;
  resetToDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          ...parsed,
          general: { ...defaultSettings.general, ...(parsed.general || {}) },
          featureFlags: { ...defaultSettings.featureFlags, ...(parsed.featureFlags || {}) },
          safetyRules: { ...defaultSettings.safetyRules, ...(parsed.safetyRules || {}) },
          periodLock: { ...defaultSettings.periodLock, ...(parsed.periodLock || {}) },
          transaction: { ...defaultSettings.transaction, ...(parsed.transaction || {}) },
          print: { ...defaultSettings.print, ...(parsed.print || {}) },
          taxes: { ...defaultSettings.taxes, ...(parsed.taxes || {}) },
          party: { ...defaultSettings.party, ...(parsed.party || {}) },
          item: { ...defaultSettings.item, ...(parsed.item || {}) },
          pricing: { ...defaultSettings.pricing, ...(parsed.pricing || {}) },
          controlledAndGeneric: { ...defaultSettings.controlledAndGeneric, ...(parsed.controlledAndGeneric || {}) },
          modules: { ...defaultSettings.modules, ...(parsed.modules || {}) },
        };
      }
    } catch (e) {
      console.error('Failed to load settings from storage', e);
    }
    return defaultSettings;
  });

  const updateGeneral = (data: Partial<AppSettings['general']>) => {
    setSettings(prev => ({ ...prev, general: { ...prev.general, ...data } }));
  };

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const activeTheme = settings.general.theme || 'light';
  const isDarkMode = activeTheme === 'dark' || (activeTheme === 'system' && systemPrefersDark);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    if (isDarkMode) {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [isDarkMode]);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    updateGeneral({ theme: newTheme });
  };

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    updateGeneral({ theme: nextTheme });
  };

  const updateFeatureFlags = (data: Partial<AppSettings['featureFlags']>) => {
    setSettings(prev => ({ ...prev, featureFlags: { ...prev.featureFlags, ...data } }));
  };

  const updateSafetyRules = (data: Partial<AppSettings['safetyRules']>) => {
    setSettings(prev => ({ ...prev, safetyRules: { ...prev.safetyRules, ...data } }));
  };

  const updatePeriodLock = (data: Partial<AppSettings['periodLock']>) => {
    setSettings(prev => ({ ...prev, periodLock: { ...prev.periodLock, ...data } }));
  };

  const updateModules = (data: Partial<AppSettings['modules']>) => {
    setSettings(prev => ({ ...prev, modules: { ...prev.modules, ...data } }));
  };

  const updateTransaction = (data: Partial<AppSettings['transaction']>) => {
    setSettings(prev => ({
      ...prev,
      transaction: {
        ...prev.transaction,
        ...data,
        prefixes: data.prefixes ? { ...prev.transaction.prefixes, ...data.prefixes } : prev.transaction.prefixes,
        transportDetails: data.transportDetails ? { ...prev.transaction.transportDetails, ...data.transportDetails } : prev.transaction.transportDetails,
      }
    }));
  };

  const updatePrint = (data: Partial<AppSettings['print']>) => {
    setSettings(prev => ({
      ...prev,
      print: {
        ...prev.print,
        ...data,
        tableColumns: data.tableColumns ? { ...prev.print.tableColumns, ...data.tableColumns } : prev.print.tableColumns,
      }
    }));
  };

  const updateTaxes = (data: Partial<AppSettings['taxes']>) => {
    setSettings(prev => ({ ...prev, taxes: { ...prev.taxes, ...data } }));
  };

  const updateParty = (data: Partial<AppSettings['party']>) => {
    setSettings(prev => ({ ...prev, party: { ...prev.party, ...data } }));
  };

  const updateItem = (data: Partial<AppSettings['item']>) => {
    setSettings(prev => ({ ...prev, item: { ...prev.item, ...data } }));
  };

  const updatePricing = (data: Partial<AppSettings['pricing']>) => {
    setSettings(prev => ({ ...prev, pricing: { ...prev.pricing, ...data } }));
  };

  const updateControlledAndGeneric = (data: Partial<AppSettings['controlledAndGeneric']>) => {
    setSettings(prev => ({ ...prev, controlledAndGeneric: { ...prev.controlledAndGeneric, ...data } }));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      general: newSettings.general ? { ...prev.general, ...newSettings.general } : prev.general,
      transaction: newSettings.transaction ? { ...prev.transaction, ...newSettings.transaction } : prev.transaction,
      print: newSettings.print ? { ...prev.print, ...newSettings.print } : prev.print,
      taxes: newSettings.taxes ? { ...prev.taxes, ...newSettings.taxes } : prev.taxes,
      party: newSettings.party ? { ...prev.party, ...newSettings.party } : prev.party,
      item: newSettings.item ? { ...prev.item, ...newSettings.item } : prev.item,
      pricing: newSettings.pricing ? { ...prev.pricing, ...newSettings.pricing } : prev.pricing,
      controlledAndGeneric: newSettings.controlledAndGeneric ? { ...prev.controlledAndGeneric, ...newSettings.controlledAndGeneric } : prev.controlledAndGeneric,
      modules: newSettings.modules ? { ...prev.modules, ...newSettings.modules } : prev.modules,
    }));
  };

  const addTaxRate = (item: Omit<TaxRateItem, 'id'>) => {
    const newRate: TaxRateItem = { ...item, id: `tax-${Date.now()}` };
    setSettings(prev => ({
      ...prev,
      taxes: { ...prev.taxes, taxRates: [...prev.taxes.taxRates, newRate] },
    }));
  };

  const deleteTaxRate = (id: string) => {
    setSettings(prev => ({
      ...prev,
      taxes: { ...prev.taxes, taxRates: prev.taxes.taxRates.filter(t => t.id !== id) },
    }));
  };

  const addTaxGroup = (item: Omit<TaxGroupItem, 'id'>) => {
    const newGroup: TaxGroupItem = { ...item, id: `tg-${Date.now()}` };
    setSettings(prev => ({
      ...prev,
      taxes: { ...prev.taxes, taxGroups: [...prev.taxes.taxGroups, newGroup] },
    }));
  };

  const deleteTaxGroup = (id: string) => {
    setSettings(prev => ({
      ...prev,
      taxes: { ...prev.taxes, taxGroups: prev.taxes.taxGroups.filter(tg => tg.id !== id) },
    }));
  };

  const addFirm = (firm: Omit<Firm, 'id'>) => {
    const newFirm: Firm = { ...firm, id: `firm-${Date.now()}` };
    setSettings(prev => ({
      ...prev,
      general: { ...prev.general, firms: [...prev.general.firms, newFirm] },
    }));
  };

  const updateFirm = (id: string, data: Partial<Firm>) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
        firms: prev.general.firms.map(f => (f.id === id ? { ...f, ...data } : f)),
      },
    }));
  };

  const deleteFirm = (id: string) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
        firms: prev.general.firms.filter(f => f.id !== id),
      },
    }));
  };

  const setDefaultFirm = (id: string) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
        firms: prev.general.firms.map(f => ({ ...f, isDefault: f.id === id })),
      },
    }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        theme: activeTheme,
        isDarkMode,
        toggleTheme,
        setTheme,
        updateSettings,
        updateGeneral,
        updateFeatureFlags,
        updateSafetyRules,
        updatePeriodLock,
        updateTransaction,
        updateTransactionSettings: updateTransaction,
        updatePrint,
        updatePrintSettings: updatePrint,
        updateTaxes,
        updateParty,
        updateItem,
        updatePricing,
        updateControlledAndGeneric,
        updateModules,
        addTaxRate,
        deleteTaxRate,
        addTaxGroup,
        deleteTaxGroup,
        addFirm,
        updateFirm,
        deleteFirm,
        setDefaultFirm,
        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
