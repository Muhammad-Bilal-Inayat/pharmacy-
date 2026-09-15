import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, Check, Zap, Calculator, Settings, 
  Search, Calendar, Camera, Upload, Image as ImageIcon,
  ChevronDown, FileText, CheckCircle2, AlertCircle, ShoppingBag, 
  ArrowRight, Sparkles, Building2, User, Minus, Maximize2, Minimize2,
  MoreVertical
} from 'lucide-react';
import { dbMedicines, dbSuppliers, dbPurchaseOrders, dbAuditLogs } from '../../lib/db';
import { Medicine, Supplier, PurchaseOrder, PurchaseOrderItem, AuditLog, PurchaseBillItem } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { InvoiceSettingsModal } from '../sales/InvoiceSettingsModal';
import { v4 as uuidv4 } from 'uuid';
import { getRecentPurchasePrices, calculateProportionalExpenses, calculateWeightedAverageCost, calculateCostChangePercentage } from '../../lib/inventoryCosting';
import { HistoricalPriceDropdown } from '../common/HistoricalPriceDropdown';
import { emitToast } from '../../contexts/ToastContext';

interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedOrder?: PurchaseOrder) => void;
  transactionType?: 'Purchase' | 'Payment Out' | 'Purchase Order' | 'Purchase Return';
  initialOrder?: PurchaseOrder | null;
}

const COMMON_UNITS = ['NONE', 'PCS', 'BOX', 'STRIP', 'BOTTLE', 'PACK', 'SET', 'VIAL', 'ROLL', 'BAG'];

export const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  transactionType = 'Purchase',
  initialOrder
}) => {
  const { business } = useAuth();
  const { settings } = useSettings();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  
  // Tabs & Bill Identification
  const [activeTabNumber, setActiveTabNumber] = useState(1);
  const [billNumber, setBillNumber] = useState('1');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));

  // Additional Form Fields configured via Settings
  const [billingName, setBillingName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [dueDate, setDueDate] = useState('');

  // Selected Party
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  // Items State
  const [items, setItems] = useState<PurchaseBillItem[]>([
    { id: uuidv4(), name: '', quantity: 1, unit: 'NONE', purchasePrice: 0, total: 0 },
    { id: uuidv4(), name: '', quantity: 1, unit: 'NONE', purchasePrice: 0, total: 0 },
    { id: uuidv4(), name: '', quantity: 1, unit: 'NONE', purchasePrice: 0, total: 0 }
  ]);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [medicineDropdownRow, setMedicineDropdownRow] = useState<number | null>(null);

  // Quick / Rapid Entry Bar
  const [lightningQuery, setLightningQuery] = useState('');
  const [lightningShowDropdown, setLightningShowDropdown] = useState(false);
  const [lightningSelectedMed, setLightningSelectedMed] = useState<Medicine | null>(null);
  const [lightningQty, setLightningQty] = useState(1);
  const [lightningPrice, setLightningPrice] = useState(0);
  const [lightningUnit, setLightningUnit] = useState('Box');

  // Bottom Settings & Totals
  const [paymentType, setPaymentType] = useState<'Cash' | 'Credit' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [roundOff, setRoundOff] = useState(true);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [hasCustomPaidAmount, setHasCustomPaidAmount] = useState(false);
  
  // Expandable Description & Image
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Calculator Popup
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSubMenuOpen, setIsMobileSubMenuOpen] = useState(false);

  // Mobile 2-Step View State
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Window Controls: Fullscreen Overlay, Minimize, Maximize
  const [isMaximized, setIsMaximized] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Historical & Additional Expenses State
  const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [additionalExpenses, setAdditionalExpenses] = useState({
    transport: 0,
    shipping: 0,
    handling: 0,
    loading: 0,
    unloading: 0,
    delivery: 0,
    other: 0
  });

  const getPrefix = () => {
    const prefixes = (settings.transaction?.prefixes as any) || {};
    if (transactionType === 'Purchase Return') return prefixes.debitNote || 'DN-';
    if (transactionType === 'Purchase Order') return prefixes.purchaseOrder || 'PO-';
    return prefixes.purchaseBill || 'BILL-';
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const [suppList, medList, poList] = await Promise.all([
      dbSuppliers.getAll(),
      dbMedicines.getAll(),
      dbPurchaseOrders.getAll()
    ]);
    
    setSuppliers(suppList);
    setMedicines(medList);
    setAllPurchaseOrders(poList);

    const prefix = getPrefix();

    if (initialOrder) {
      setBillNumber(initialOrder.billNumber || initialOrder.poNumber || `${prefix}1`);
      setBillDate(initialOrder.date ? initialOrder.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setSelectedSupplierId(initialOrder.supplierId || initialOrder.partyId || '');
      setSupplierSearchQuery(initialOrder.supplierName || initialOrder.partyName || '');
      setPaymentType(initialOrder.paymentType || 'Cash');
      
      if (initialOrder.items && initialOrder.items.length > 0) {
        setItems(initialOrder.items.map(it => ({
          id: uuidv4(),
          medicineId: it.medicineId,
          name: it.name,
          quantity: it.quantity || 1,
          freeQuantity: it.freeQuantity || 0,
          unit: it.unit || 'NONE',
          purchasePrice: it.purchasePrice || 0,
          mrp: it.mrp || 0,
          batchNumber: it.batchNumber || '',
          expiryDate: it.expiryDate || '',
          mfgDate: it.mfgDate || '',
          hsnCode: it.hsnCode || '',
          discountPercentage: it.discountPercentage || 0,
          taxPercentage: it.taxPercentage || 0,
          total: it.total || ((it.quantity || 1) * (it.purchasePrice || 0))
        })));
      }
      setPaidAmount(initialOrder.paidAmount !== undefined ? initialOrder.paidAmount : (initialOrder.totalAmount || 0));
      setHasCustomPaidAmount(true);
      setDescription(initialOrder.description || '');
      if (initialOrder.description) setShowDescription(true);
      if (initialOrder.imageAttachment) {
        setImageAttachment(initialOrder.imageAttachment);
        setShowImageUpload(true);
      }
    } else {
      // Auto-assign next bill number with prefix
      const nextNum = poList.length + 1;
      const formatted = `${prefix}${nextNum}`;
      setBillNumber(formatted);
      setActiveTabNumber(nextNum);
      resetForm(formatted);
    }
  };

  const resetForm = (newBillNo?: string) => {
    const prefix = getPrefix();
    const formatted = newBillNo || `${prefix}${activeTabNumber + 1}`;
    setBillNumber(formatted);
    setBillDate(new Date().toISOString().slice(0, 10));
    setSelectedSupplierId('');
    setSupplierSearchQuery('');
    setBillingName('');
    setPoNumber('');
    setPoDate('');
    setPaymentTerms('Due on Receipt');
    setDueDate('');
    setItems(Array.from({ length: 5 }).map(() => ({
      id: uuidv4(),
      name: '',
      quantity: 0,
      unit: 'NONE',
      purchasePrice: 0,
      total: 0
    })));
    setActiveRowIndex(0);
    setMedicineDropdownRow(null);
    setPaymentType('Cash');
    setPaidAmount(0);
    setHasCustomPaidAmount(false);
    setDescription('');
    setImageAttachment(null);
    setShowDescription(false);
    setShowImageUpload(false);
    setErrorMessage(null);
  };

  // Find currently selected supplier object
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Calculations
  const rawSubTotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  
  // Calculate round off respecting settings.transaction.roundOffType
  const roundOffType = settings.transaction?.roundOffType || 'Nearest';
  const calculatedGrandTotal = roundOff ? (
    roundOffType === 'Up' ? Math.ceil(rawSubTotal) :
    roundOffType === 'Down' ? Math.floor(rawSubTotal) :
    roundOffType === 'None' ? rawSubTotal :
    Math.round(rawSubTotal)
  ) : rawSubTotal;

  const roundOffAmount = Number((calculatedGrandTotal - rawSubTotal).toFixed(2));
  const grandTotal = calculatedGrandTotal;

  const effectivePaidAmount = hasCustomPaidAmount 
    ? paidAmount 
    : (paymentType === 'Credit' ? 0 : grandTotal);
  const balanceDue = Math.max(0, grandTotal - effectivePaidAmount);
  const totalQuantity = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  // Update item row
  const handleItemChange = (index: number, field: keyof PurchaseBillItem, val: any) => {
    const newItems = [...items];
    const current = { ...newItems[index], [field]: val };
    
    // Auto calculate row total with discount and tax
    const qty = field === 'quantity' ? Number(val) : Number(current.quantity || 0);
    const price = field === 'purchasePrice' ? Number(val) : Number(current.purchasePrice || 0);
    const disc = field === 'discountPercentage' ? Number(val) : Number(current.discountPercentage || 0);
    const tax = field === 'taxPercentage' ? Number(val) : Number(current.taxPercentage || 0);

    const base = qty * price;
    const discAmt = (base * disc) / 100;
    const taxable = base - discAmt;
    const taxAmt = (taxable * tax) / 100;
    current.total = Math.round(taxable + taxAmt);
    
    newItems[index] = current;
    setItems(newItems);
  };

  // Select medicine from autocomplete
  const handleSelectMedicine = (index: number, med: Medicine) => {
    const newItems = [...items];
    const current = newItems[index];
    const qty = current.quantity || 1;
    const price = med.purchasePrice || 0;
    const disc = current.discountPercentage || 0;
    const tax = med.gstPercentage || current.taxPercentage || 0;

    const base = qty * price;
    const discAmt = (base * disc) / 100;
    const taxable = base - discAmt;
    const taxAmt = (taxable * tax) / 100;
    const total = Math.round(taxable + taxAmt);

    newItems[index] = {
      ...current,
      medicineId: med.id,
      name: med.name,
      unit: med.unit || 'NONE',
      purchasePrice: price,
      mrp: med.mrp || 0,
      batchNumber: med.batchNumber || current.batchNumber || '',
      expiryDate: med.expiryDate ? med.expiryDate.slice(0, 7) : (current.expiryDate || ''),
      taxPercentage: tax,
      total: total
    };
    setItems(newItems);
    setMedicineDropdownRow(null);
  };

  // Quick Lightning Entry Handler
  const commitPurchaseLightningItem = (medOrName: Medicine | string, qty: number, price: number) => {
    const isMedObj = typeof medOrName !== 'string';
    const med = isMedObj ? (medOrName as Medicine) : null;
    const name = med ? med.name : (medOrName as string).trim();
    if (!name) return;

    const unit = lightningUnit || med?.unit || 'Box';
    const effectivePrice = price || med?.purchasePrice || 0;
    const effectiveQty = qty > 0 ? qty : 1;

    const newItem: PurchaseBillItem = {
      id: uuidv4(),
      medicineId: med?.id,
      name,
      quantity: effectiveQty,
      unit,
      purchasePrice: effectivePrice,
      mrp: med?.mrp || effectivePrice,
      batchNumber: med?.batchNumber || '',
      expiryDate: med?.expiryDate || '',
      total: effectiveQty * effectivePrice
    };

    const firstEmptyIndex = items.findIndex(it => !it.name.trim());
    if (firstEmptyIndex !== -1) {
      const updated = [...items];
      updated[firstEmptyIndex] = newItem;
      setItems(updated);
      setActiveRowIndex(firstEmptyIndex);
    } else {
      setItems([newItem, ...items]);
      setActiveRowIndex(0);
    }

    setLightningQuery('');
    setLightningSelectedMed(null);
    setLightningQty(1);
    setLightningPrice(0);
    setLightningShowDropdown(false);
  };

  const handleConfirmLightningItem = () => {
    const target = lightningSelectedMed || lightningQuery;
    const price = lightningPrice || (lightningSelectedMed ? lightningSelectedMed.purchasePrice : 0);
    commitPurchaseLightningItem(target, lightningQty, price);
  };

  // Add new item row
  const handleAddRow = () => {
    const newRow: PurchaseBillItem = {
      id: uuidv4(),
      name: '',
      quantity: 1,
      unit: 'NONE',
      purchasePrice: 0,
      total: 0
    };
    setItems([...items, newRow]);
    setActiveRowIndex(items.length);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setItems([{ id: uuidv4(), name: '', quantity: 1, unit: 'NONE', purchasePrice: 0, total: 0 }]);
      setActiveRowIndex(0);
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    setActiveRowIndex(Math.max(0, index - 1));
  };

  // Quick Add Supplier
  const handleQuickAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: newSupplierName.trim(),
      contactPerson: newSupplierName.trim(),
      phone: newSupplierPhone.trim() || '0300-0000000',
      email: '',
      address: 'Main Market',
      paymentTerms: 'Due on Receipt',
      openingBalance: 0,
      creditLimit: 200000,
      balance: 0,
      createdAt: new Date().toISOString()
    };
    await dbSuppliers.save(newSup);
    setSuppliers(prev => [...prev, newSup]);
    setSelectedSupplierId(newSup.id);
    setSupplierSearchQuery(newSup.name);
    setShowQuickAddSupplier(false);
    setNewSupplierName('');
    setNewSupplierPhone('');
  };

  // Handle Image Upload
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Common Save Handler
  const executeSave = async (): Promise<PurchaseOrder | null> => {
    setErrorMessage(null);

    // 1. Validation
    const partyName = selectedSupplier?.name || supplierSearchQuery.trim() || (paymentType === 'Cash' ? 'Cash Supplier / Counter' : '');
    if (!partyName) {
      setErrorMessage('Please select or enter a Supplier / Party name for Credit transactions.');
      return null;
    }

    const validItems = items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      setErrorMessage('Please add at least one valid item with name and quantity greater than 0.');
      return null;
    }

    // Determine purchase status
    let status: 'Paid' | 'Partial' | 'Unpaid' | 'Completed' = 'Paid';
    if (balanceDue === 0) {
      status = 'Paid';
    } else if (effectivePaidAmount > 0 && balanceDue > 0) {
      status = 'Partial';
    } else {
      status = 'Unpaid';
    }

    const prefix = getPrefix();
    const orderId = initialOrder?.id || `po-${Date.now()}`;
    const formattedBillNo = billNumber.trim() || `${prefix}${Date.now().toString().slice(-5)}`;

    const now = new Date();
    let purchaseDateObj = billDate ? new Date(billDate) : now;
    if (billDate && billDate === now.toISOString().slice(0, 10)) {
      purchaseDateObj = now;
    } else if (billDate) {
      purchaseDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    const newPurchase: PurchaseOrder = {
      id: orderId,
      poNumber: formattedBillNo,
      billNumber: formattedBillNo,
      supplierId: selectedSupplierId || 'sup-custom',
      partyId: selectedSupplierId || 'sup-custom',
      supplierName: partyName,
      partyName: partyName,
      date: purchaseDateObj.toISOString(),
      paymentType: paymentType,
      items: validItems.map(vi => ({
        medicineId: vi.medicineId || 'med-custom',
        name: vi.name,
        quantity: Number(vi.quantity),
        freeQuantity: Number(vi.freeQuantity) || 0,
        unit: vi.unit,
        batchNumber: vi.batchNumber,
        expiryDate: vi.expiryDate,
        mfgDate: vi.mfgDate,
        mrp: vi.mrp,
        hsnCode: vi.hsnCode,
        discountPercentage: vi.discountPercentage,
        taxPercentage: vi.taxPercentage,
        purchasePrice: Number(vi.purchasePrice),
        total: Number(vi.total)
      })),
      subTotal: rawSubTotal,
      totalAmount: grandTotal,
      paidAmount: effectivePaidAmount,
      balanceDue: balanceDue,
      description: description.trim() || undefined,
      imageAttachment: imageAttachment || undefined,
      firmName: business?.name || 'MBI INVENTRA',
      userName: 'Admin',
      status: status,
      transactionType: transactionType as 'Purchase' | 'Payment Out' | 'Purchase Order' | 'Purchase Return',
      createdAt: initialOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // 2. Save Purchase Record to IndexedDB
      await dbPurchaseOrders.save(newPurchase);

      // Apply Proportional Expenses
      const { adjustedItems } = calculateProportionalExpenses(validItems, additionalExpenses);

      // 3. Update Medicine Inventory Stock & Batch Info with Weighted Average Cost
      for (const item of adjustedItems) {
        const adjustedUnitCost = item.adjustedUnitCost || item.purchasePrice;
        let med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase() === item.name.toLowerCase());
        if (med) {
          // Increase stock for purchase, decrease for purchase return
          const stockDelta = transactionType === 'Purchase Return' ? -item.quantity : item.quantity;
          const newAvgCost = calculateWeightedAverageCost(med.quantity || 0, med.purchasePrice || 0, item.quantity, adjustedUnitCost);
          const updatedMedicine: Medicine = {
            ...med,
            quantity: Math.max(0, (med.quantity || 0) + stockDelta),
            purchasePrice: newAvgCost,
            unit: item.unit && item.unit !== 'NONE' ? item.unit : med.unit,
            batchNumber: item.batchNumber || med.batchNumber,
            expiryDate: item.expiryDate || med.expiryDate,
            mrp: item.mrp || med.mrp,
            updatedAt: new Date().toISOString()
          };
          await dbMedicines.save(updatedMedicine);
        } else {
          // Create new item in inventory if not exists
          const newMed: Medicine = {
            id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            barcode: `8964${Math.floor(100000000 + Math.random() * 900000000)}`,
            name: item.name.trim(),
            batchNumber: item.batchNumber || 'BATCH-01',
            manufacturer: partyName,
            unit: item.unit || 'PCS',
            expiryDate: item.expiryDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
            quantity: item.quantity,
            lowStockThreshold: 10,
            purchasePrice: adjustedUnitCost,
            mrp: item.mrp || (adjustedUnitCost * 1.3),
            sellingPrice: item.mrp ? item.mrp * 0.95 : (adjustedUnitCost * 1.25),
            gstPercentage: item.taxPercentage || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await dbMedicines.save(newMed);
        }

        // Record Audit Log
        const audit: AuditLog = {
          id: uuidv4(),
          date: new Date().toISOString(),
          action: transactionType === 'Purchase Return' ? 'ADJUST_STOCK' : 'PO_RECEIVE',
          medicineId: item.medicineId || 'N/A',
          medicineName: item.name,
          quantityChanged: transactionType === 'Purchase Return' ? -item.quantity : item.quantity,
          userId: 'Admin',
          notes: `Purchase Bill #${formattedBillNo} from ${partyName} (Adj. Cost: ${adjustedUnitCost})`
        };
        await dbAuditLogs.save(audit);
      }

      // 4. Update Supplier Balance if credit / balance due
      if (selectedSupplierId && balanceDue > 0) {
        const sup = suppliers.find(s => s.id === selectedSupplierId);
        if (sup) {
          const updatedSup: Supplier = {
            ...sup,
            balance: (sup.balance || 0) + balanceDue,
            updatedAt: new Date().toISOString()
          };
          await dbSuppliers.save(updatedSup);
        }
      }

      return newPurchase;
    } catch (err: any) {
      console.error('Failed to save purchase bill:', err);
      setErrorMessage(err?.message || 'Error saving purchase bill.');
      return null;
    }
  };

  // Button 1: Save (Closes form and returns to list)
  const handleSave = async () => {
    const saved = await executeSave();
    if (saved) {
      emitToast(`Purchase #${saved.billNumber || saved.poNumber} saved successfully!`, 'success');
      setToastMessage(`Purchase #${saved.billNumber || saved.poNumber} saved successfully!`);
      setTimeout(() => {
        onSaved(saved);
        onClose();
      }, 500);
    }
  };

  // Button 2: Save & New (Saves and resets form with next bill number immediately!)
  const handleSaveAndNew = async () => {
    const saved = await executeSave();
    if (saved) {
      const prefix = getPrefix();
      const digits = (saved.billNumber || '').match(/\d+/g);
      const lastNum = digits ? parseInt(digits[digits.length - 1], 10) : 1;
      const nextFormattedBillNo = `${prefix}${lastNum + 1}`;

      setToastMessage(`Purchase #${saved.billNumber} saved! Ready for #${nextFormattedBillNo}.`);
      onSaved(saved);
      // Reset form fields with new bill number
      resetForm(nextFormattedBillNo);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  if (!isOpen) return null;

  // Minimized floating pill docked at bottom right
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 bg-[#1e293b] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">
            {transactionType === 'Purchase Return' ? 'Purchase Return' : 'Purchase Bill'} #{billNumber}
          </span>
          <span className="text-[10px] bg-blue-600/60 text-blue-200 px-1.5 py-0.5 rounded font-medium">Minimized</span>
        </div>
        <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            title="Restore Window"
            className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close Form"
            className="p-1.5 hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const filteredMedicines = (medicines || []).filter(m => {
    const activeItemName = items[activeRowIndex]?.name || '';
    if (!activeItemName) return true;
    return m.name.toLowerCase().includes(activeItemName.toLowerCase()) || 
           (m.barcode && m.barcode.includes(activeItemName));
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    (s.phone && s.phone.includes(supplierSearchQuery))
  );

  return (
    <div className={`fixed inset-0 z-50 flex ${
      isMaximized ? 'p-0 overflow-hidden' : 'items-center justify-center p-2 sm:p-4 overflow-y-auto'
    } bg-slate-900/75 backdrop-blur-md`}>
      <div className={`w-full bg-white flex flex-col overflow-hidden transition-all ${
        isMaximized 
          ? 'h-full max-h-screen rounded-none' 
          : 'max-w-6xl max-h-[96vh] rounded-xl shadow-2xl border border-slate-300'
      }`}>
        
        {/* Top Header Bar */}
        <div className="bg-[#1e293b] text-white px-3 sm:px-4 py-2 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="font-bold text-xs sm:text-sm tracking-wide truncate">
              {transactionType === 'Purchase Return' ? 'Purchase Return' :
               transactionType === 'Purchase Order' ? 'Purchase Order' : 'Purchase Bill'}
            </span>
            <span className="text-[11px] sm:text-xs bg-blue-600/60 text-blue-200 px-2 py-0.5 rounded font-mono font-semibold">
              #{billNumber}
            </span>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1.5 text-slate-300">
            {/* Desktop Quick Calculator Button */}
            <button
              type="button"
              onClick={() => setShowCalculator(!showCalculator)}
              title="Calculator"
              className="hidden sm:flex p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition items-center gap-1 text-xs"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Calculator</span>
            </button>

            {/* Desktop Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings & Table Columns"
              className="hidden sm:flex p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition items-center gap-1 text-xs"
            >
              <Settings className="w-4 h-4" />
              <span className="font-semibold">Settings</span>
            </button>

            {/* Mobile Minimize */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize Window"
              className="sm:hidden p-1.5 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Mobile Maximize / Restore */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore Window" : "Maximize Window"}
              className="sm:hidden p-1.5 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Mobile Submenu Dropdown Trigger */}
            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setIsMobileSubMenuOpen(!isMobileSubMenuOpen)}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
                title="More Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMobileSubMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-black/20" 
                    onClick={() => setIsMobileSubMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCalculator(!showCalculator);
                        setIsMobileSubMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      <span>Calculator</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(true);
                        setIsMobileSubMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 border-t border-slate-800"
                    >
                      <Settings className="w-4 h-4 text-blue-400" />
                      <span>Invoice Settings</span>
                    </button>
                    <div className="border-t border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsMinimized(true);
                        setIsMobileSubMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left font-semibold text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Minus className="w-4 h-4" />
                      <span>Minimize Window</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMaximized(!isMaximized);
                        setIsMobileSubMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left font-semibold text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      <span>{isMaximized ? 'Restore Size' : 'Maximize Window'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:block h-4 w-[1px] bg-slate-700 mx-1" />

            {/* Window Controls: Minimize, Maximize/Restore, Close */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize Window"
              className="hidden sm:block p-1.5 hover:bg-slate-700 hover:text-white rounded transition-colors text-slate-300"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore Window" : "Maximize Window"}
              className="hidden sm:block p-1.5 hover:bg-slate-700 hover:text-white rounded transition-colors text-slate-300"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Window"
              className="p-1.5 hover:bg-rose-600 hover:text-white rounded transition-colors text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Calculator Floating Window */}
        {showCalculator && (
          <div className="absolute top-12 right-6 z-50 w-52 bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700 p-2.5 text-xs">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-800">
              <span className="font-bold text-[10px] text-slate-400">QUICK CALC</span>
              <button type="button" onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-slate-800 p-2 rounded text-right font-mono text-sm font-bold text-emerald-400 mb-2 min-h-[32px] break-all">
              {calcInput || '0'}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','C'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === 'C') setCalcInput('');
                    else if (btn === '=') {
                      try {
                        // eslint-disable-next-line no-eval
                        setCalcInput(String(Function(`'use strict'; return (${calcInput})`)()));
                      } catch {
                        setCalcInput('Err');
                      }
                    } else {
                      setCalcInput(prev => prev + btn);
                    }
                  }}
                  className={`p-1.5 rounded font-semibold text-center ${
                    btn === '=' ? 'bg-blue-600 col-span-2' : 
                    btn === 'C' ? 'bg-rose-600 col-span-2' : 
                    ['/','*','-','+'].includes(btn) ? 'bg-slate-700 text-blue-300' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-[#f8fafc]">
          
          {/* Mobile 2-Step Stepper Tabs */}
          <div className="sm:hidden flex items-center bg-slate-200/80 p-1 rounded-xl border border-slate-300">
            <button
              type="button"
              onClick={() => setMobileStep(1)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mobileStep === 1
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                mobileStep === 1 ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'
              }`}>1</span>
              <span>Supplier & Bill Info</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileStep(2)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mobileStep === 2
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                mobileStep === 2 ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'
              }`}>2</span>
              <span>Items & Expenses</span>
              {items.filter(i => i.name?.trim()).length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  mobileStep === 2 ? 'bg-white text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {items.filter(i => i.name?.trim()).length}
                </span>
              )}
            </button>
          </div>

          {/* Notification Toast */}
          {toastMessage && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button type="button" onClick={() => setToastMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded-lg shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Top Row: Search Party by Name/Phone & Bill Number/Date */}
          <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-white p-4 rounded-xl border border-slate-200 shadow-xs ${mobileStep === 1 ? 'grid' : 'hidden sm:grid'}`}>
            
            {/* Supplier / Party Search Box */}
            <div className="md:col-span-6 relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supplier / Party <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Supplier Name / Phone *"
                  value={supplierSearchQuery}
                  onFocus={() => setIsSupplierDropdownOpen(true)}
                  onChange={(e) => {
                    setSupplierSearchQuery(e.target.value);
                    setIsSupplierDropdownOpen(true);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                />
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              {/* Selected Supplier Badge */}
              {selectedSupplier && (
                <div className="mt-1 text-xs text-slate-600 flex items-center gap-3">
                  <span>Phone: <strong className="text-slate-800">{selectedSupplier.phone}</strong></span>
                  <span>Balance: <strong className="text-rose-600">{formatCurrency(selectedSupplier.balance || 0)}</strong></span>
                </div>
              )}

              {/* Supplier Search Dropdown */}
              {isSupplierDropdownOpen && (
                <div 
                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl z-40 max-h-56 overflow-y-auto"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <span className="text-xs font-semibold text-slate-500">Suppliers ({filteredSuppliers.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickAddSupplier(true);
                        setIsSupplierDropdownOpen(false);
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Supplier
                    </button>
                  </div>
                  
                  {filteredSuppliers.map((sup) => (
                    <button
                      key={sup.id}
                      type="button"
                      onClick={() => {
                        setSelectedSupplierId(sup.id);
                        setSupplierSearchQuery(sup.name);
                        setIsSupplierDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 flex justify-between items-center transition"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{sup.name}</div>
                        <div className="text-[11px] text-slate-500">{sup.phone} • {sup.address}</div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">
                        {formatCurrency(sup.balance || 0)}
                      </span>
                    </button>
                  ))}

                  {filteredSuppliers.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No supplier found for "{supplierSearchQuery}"
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setNewSupplierName(supplierSearchQuery);
                            setShowQuickAddSupplier(true);
                            setIsSupplierDropdownOpen(false);
                          }}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          + Create "{supplierSearchQuery}" as new Supplier
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Add Supplier Modal Popup */}
            {showQuickAddSupplier && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Add New Supplier / Party</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Supplier Name *</label>
                      <input
                        type="text"
                        value={newSupplierName}
                        onChange={e => setNewSupplierName(e.target.value)}
                        placeholder="e.g. Ali Pharma Distributors"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={newSupplierPhone}
                        onChange={e => setNewSupplierPhone(e.target.value)}
                        placeholder="0300-xxxxxxx"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        type="button"
                        onClick={() => setShowQuickAddSupplier(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={handleQuickAddSupplier}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                      >
                        Save Supplier
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bill Number & Date on Right */}
            <div className="md:col-span-6 flex flex-col sm:flex-row items-center justify-end gap-4">
              <div className="w-full sm:w-40">
                <label className="block text-xs font-bold text-slate-700 mb-1">Bill Number</label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={e => setBillNumber(e.target.value)}
                  placeholder="e.g. BILL-1"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold font-mono text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="w-full sm:w-44">
                <label className="block text-xs font-bold text-slate-700 mb-1">Bill Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={billDate}
                    onChange={e => setBillDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Optional Settings-driven Form Fields */}
            {(settings.transaction?.billingNameOfParties || settings.transaction?.customerPoDetails || settings.transaction?.dueDatesAndPaymentTerms) && (
              <div className="col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                {settings.transaction?.billingNameOfParties && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Billing / Firm Name</label>
                    <input
                      type="text"
                      placeholder="Billing Name"
                      value={billingName}
                      onChange={e => setBillingName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {settings.transaction?.customerPoDetails && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">P.O. Number</label>
                      <input
                        type="text"
                        placeholder="PO-xxx"
                        value={poNumber}
                        onChange={e => setPoNumber(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">P.O. Date</label>
                      <input
                        type="date"
                        value={poDate}
                        onChange={e => setPoDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {settings.transaction?.dueDatesAndPaymentTerms && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms</label>
                      <select
                        value={paymentTerms}
                        onChange={e => setPaymentTerms(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Net 7">Net 7 Days</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Step 1 Next Button */}
            <div className="col-span-12 sm:hidden pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileStep(2)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform active:scale-98"
              >
                <span>Proceed to Items & Expenses</span>
                <span className="bg-blue-800/80 px-2 py-0.5 rounded-full text-[11px]">
                  {items.filter(i => i.name?.trim()).length} items
                </span>
                <span>→</span>
              </button>
            </div>

          </div>

          {/* Items & Expenses Section (Step 2 on mobile, always visible on desktop) */}
          <div className={`space-y-4 ${mobileStep === 2 ? 'block' : 'hidden sm:block'}`}>
            
            {/* Mobile Step 2 Back & Summary Bar */}
            <div className="sm:hidden flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <button
                type="button"
                onClick={() => setMobileStep(1)}
                className="text-xs font-bold text-blue-700 flex items-center gap-1 hover:underline"
              >
                <span>←</span>
                <span>Back to Supplier</span>
              </button>
              <span className="text-xs font-mono font-black text-blue-900">
                Total: {formatCurrency(grandTotal)}
              </span>
            </div>

            {/* Quick Item Entry Bar (If enabled in Transaction Settings) */}
            {settings.transaction?.quickEntry && (
            <div className="bg-blue-50/90 border border-blue-200 p-2.5 rounded-xl grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 sm:col-span-5 relative">
                <div className="relative">
                  <Zap className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Quick Barcode / Medicine Scan (Enter)..."
                    value={lightningQuery}
                    onChange={(e) => {
                      setLightningQuery(e.target.value);
                      setLightningShowDropdown(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const matches = medicines.filter(m => m.name.toLowerCase().includes(lightningQuery.toLowerCase()) || (m.barcode && m.barcode.includes(lightningQuery)));
                        if (matches.length > 0) {
                          commitPurchaseLightningItem(matches[0], lightningQty > 0 ? lightningQty : 1, matches[0].purchasePrice || 0);
                        } else {
                          handleConfirmLightningItem();
                        }
                      }
                    }}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {lightningShowDropdown && lightningQuery.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {medicines
                      .filter(m => m.name.toLowerCase().includes(lightningQuery.toLowerCase()) || (m.barcode && m.barcode.includes(lightningQuery)))
                      .slice(0, 8)
                      .map(med => (
                        <div
                          key={med.id}
                          onClick={() => {
                            commitPurchaseLightningItem(med, lightningQty > 0 ? lightningQty : 1, med.purchasePrice || 0);
                          }}
                          className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-50"
                        >
                          <span className="font-bold text-slate-800">{med.name}</span>
                          <span className="text-slate-500 font-mono text-[11px]">{formatCurrency(med.purchasePrice || 0)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={lightningQty || ''}
                  onChange={(e) => setLightningQty(parseInt(e.target.value) || 1)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                  className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-center text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number"
                  placeholder="Pur. Price"
                  value={lightningPrice || ''}
                  onChange={(e) => setLightningPrice(parseFloat(e.target.value) || 0)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                  className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-4 sm:col-span-3 flex justify-end gap-1">
                <button
                  type="button"
                  onClick={handleConfirmLightningItem}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>
          )}

          {/* Items Table (Synced with Print / Table Columns Settings) */}
          <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-left border-collapse text-xs">
                
                {/* Table Header */}
                <thead className="bg-[#f8fafc] border-b border-slate-300 text-slate-700 uppercase font-bold text-[11px] select-none">
                  <tr>
                    <th className="w-10 px-3 py-2.5 text-center border-r border-slate-200">#</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 min-w-[180px]">ITEM</th>
                    {settings.print?.tableColumns?.hsnSac && <th className="px-3 py-2.5 border-r border-slate-200 w-20">HSN/SAC</th>}
                    {settings.print?.tableColumns?.batchNo && <th className="px-3 py-2.5 border-r border-slate-200 w-22">BATCH NO.</th>}
                    {settings.print?.tableColumns?.expDate && <th className="px-3 py-2.5 border-r border-slate-200 w-22 text-center">EXP. DATE</th>}
                    {settings.print?.tableColumns?.mfgDate && <th className="px-3 py-2.5 border-r border-slate-200 w-22 text-center">MFG. DATE</th>}
                    {settings.print?.tableColumns?.mrp && <th className="px-3 py-2.5 border-r border-slate-200 w-20 text-right">MRP</th>}
                    <th className="px-3 py-2.5 border-r border-slate-200 w-16 text-center">QTY</th>
                    {settings.transaction?.freeItemQuantity && <th className="px-3 py-2.5 border-r border-slate-200 w-16 text-center">FREE QTY</th>}
                    {settings.print?.tableColumns?.unit !== false && <th className="px-3 py-2.5 border-r border-slate-200 w-20 text-center">UNIT</th>}
                    <th className="px-3 py-2.5 border-r border-slate-200 w-24 text-right">PURCHASE PRICE</th>
                    {settings.print?.tableColumns?.discount && <th className="px-3 py-2.5 border-r border-slate-200 w-20 text-right">DISC %</th>}
                    {settings.print?.tableColumns?.taxPercent && <th className="px-3 py-2.5 border-r border-slate-200 w-20 text-right">TAX %</th>}
                    <th className="px-3 py-2.5 border-r border-slate-200 w-24 text-right">AMOUNT</th>
                    <th className="w-10 px-2 py-2.5 text-center"></th>
                  </tr>
                </thead>

                {/* Table Body Rows */}
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, idx) => {
                    const isActive = activeRowIndex === idx;

                    return (
                      <tr 
                        key={item.id || idx} 
                        onClick={() => setActiveRowIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                          if (isNaN(dragIndex) || dragIndex === idx) return;
                          const newItems = [...items];
                          const [moved] = newItems.splice(dragIndex, 1);
                          newItems.splice(idx, 0, moved);
                          setItems(newItems);
                        }}
                        className={`transition relative ${isActive ? 'bg-[#f0f7ff]' : 'hover:bg-slate-50'}`}
                      >
                        {/* Drag Handle & Row Index */}
                        <td className="px-1 py-2 text-center border-r border-[#E2E8F0] bg-slate-50/50 w-10 text-xs text-slate-500 font-mono select-none">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', idx.toString());
                              }}
                              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 font-bold select-none px-0.5"
                              title="Drag to reorder row"
                            >
                              ⋮⋮
                            </span>
                            {isActive ? (
                              <Zap className="w-4 h-4 text-blue-500 inline fill-blue-500" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>
                        </td>

                        {/* Item Name Input with Auto-complete */}
                        <td className="px-2 py-1.5 border-r border-slate-200 relative">
                          <input
                            type="text"
                            value={item.name}
                            onFocus={() => {
                              setActiveRowIndex(idx);
                              setMedicineDropdownRow(idx);
                            }}
                            onChange={e => {
                              handleItemChange(idx, 'name', e.target.value);
                              setMedicineDropdownRow(idx);
                            }}
                            placeholder="Enter item name or scan barcode"
                            className="w-full bg-transparent border-0 p-1 text-xs text-slate-900 focus:ring-0 focus:outline-none font-bold"
                          />

                          {/* Medicine Autocomplete Dropdown */}
                          {medicineDropdownRow === idx && item.name && (
                            <div 
                              className="absolute left-0 top-full mt-0.5 w-80 bg-white border border-slate-300 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto"
                              onMouseDown={e => e.preventDefault()}
                            >
                              <div className="p-1.5 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-semibold">
                                INVENTORY ITEMS ({filteredMedicines.length})
                              </div>
                              {filteredMedicines.map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => handleSelectMedicine(idx, m)}
                                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 border-b border-slate-100 flex justify-between items-center transition"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-800">{m.name}</div>
                                    <div className="text-[10px] text-slate-500">
                                      Stock: <span className={m.quantity < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>{m.quantity} {m.unit || 'PCS'}</span> • MRP: {formatCurrency(m.mrp || 0)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-blue-700">{formatCurrency(m.purchasePrice)}</div>
                                    <div className="text-[10px] text-slate-400">Pur. Price</div>
                                  </div>
                                </button>
                              ))}

                              {filteredMedicines.length === 0 && (
                                <div className="p-2 text-center text-[11px] text-slate-500">
                                  Item not in stock. Adding as new purchase item.
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* HSN/SAC */}
                        {settings.print?.tableColumns?.hsnSac && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <input
                              type="text"
                              value={item.hsnCode || ''}
                              placeholder="HSN"
                              onChange={e => handleItemChange(idx, 'hsnCode', e.target.value)}
                              className="w-full bg-transparent border-0 p-1 text-xs text-slate-800 font-mono text-center focus:ring-0 focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Batch No */}
                        {settings.print?.tableColumns?.batchNo && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <input
                              type="text"
                              value={item.batchNumber || ''}
                              placeholder="Batch"
                              onChange={e => handleItemChange(idx, 'batchNumber', e.target.value)}
                              className="w-full bg-transparent border-0 p-1 text-xs text-slate-800 font-mono focus:ring-0 focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Expiry Date */}
                        {settings.print?.tableColumns?.expDate && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <input
                              type="date"
                              value={item.expiryDate ? item.expiryDate.slice(0, 10) : ''}
                              onChange={e => handleItemChange(idx, 'expiryDate', e.target.value)}
                              className="w-24 bg-white border border-slate-200 rounded p-1 text-xs text-slate-800 font-mono text-center"
                            />
                          </td>
                        )}

                        {/* Mfg Date */}
                        {settings.print?.tableColumns?.mfgDate && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <input
                              type="date"
                              value={item.mfgDate ? item.mfgDate.slice(0, 10) : ''}
                              onChange={e => handleItemChange(idx, 'mfgDate', e.target.value)}
                              className="w-24 bg-white border border-slate-200 rounded p-1 text-xs text-slate-800 font-mono text-center"
                            />
                          </td>
                        )}

                        {/* MRP */}
                        {settings.print?.tableColumns?.mrp && (
                          <td className="px-2 py-1.5 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.mrp || 0}
                              placeholder="0"
                              onChange={e => handleItemChange(idx, 'mrp', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-0 p-1 text-xs text-slate-800 font-mono text-right focus:ring-0 focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Qty Input */}
                        <td className="px-2 py-1.5 border-r border-slate-200">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onFocus={() => setActiveRowIndex(idx)}
                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full text-center bg-transparent border-0 p-1 text-xs text-slate-900 focus:ring-0 focus:outline-none font-bold"
                          />
                        </td>

                        {/* Free Qty */}
                        {settings.transaction?.freeItemQuantity && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.freeQuantity || 0}
                              placeholder="0"
                              onChange={e => handleItemChange(idx, 'freeQuantity', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full text-center bg-transparent border-0 p-1 text-xs text-slate-900 focus:ring-0 focus:outline-none font-semibold"
                            />
                          </td>
                        )}

                        {/* Unit Dropdown */}
                        {settings.print?.tableColumns?.unit !== false && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <select
                              value={item.unit || 'NONE'}
                              onFocus={() => setActiveRowIndex(idx)}
                              onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                              className="w-full bg-transparent border-0 p-1 text-xs text-slate-700 focus:ring-0 focus:outline-none text-center uppercase font-medium"
                            >
                              {COMMON_UNITS.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>
                        )}

                        {/* Purchase Price Input */}
                        <td className="px-2 py-1.5 border-r border-slate-200 text-right relative">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.purchasePrice}
                            onFocus={() => setActiveRowIndex(idx)}
                            onChange={e => handleItemChange(idx, 'purchasePrice', e.target.value)}
                            className="w-full text-right bg-transparent border-0 p-1 text-xs text-slate-900 focus:ring-0 focus:outline-none font-bold font-mono"
                          />
                          {/* Historical Purchase Prices Dropdown & Cost Increase Alert */}
                          {isActive && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-1.5 w-48 text-left">
                              <div className="text-[10px] font-bold text-slate-400 px-1 py-0.5 border-b border-slate-100 flex items-center justify-between">
                                <span>Recent Purchase Rates</span>
                                <span className="text-[9px] text-blue-600">Click to set</span>
                              </div>
                              {(() => {
                                const recent = getRecentPurchasePrices(item.medicineId || '', item.name, allPurchaseOrders);
                                if (recent.length === 0) {
                                  return <div className="text-[10px] text-slate-400 p-1.5 italic">No previous purchase price</div>;
                                }
                                const prev = recent[0];
                                const change = calculateCostChangePercentage(prev, Number(item.purchasePrice));
                                return (
                                  <>
                                    {recent.map((p, pIdx) => (
                                      <div
                                        key={pIdx}
                                        onClick={() => handleItemChange(idx, 'purchasePrice', p.toString())}
                                        className="px-2 py-1 text-xs hover:bg-blue-50 text-slate-700 font-bold font-mono cursor-pointer rounded flex items-center justify-between"
                                      >
                                        <span>Rs {p}</span>
                                        {pIdx === 0 && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-sans">Latest</span>}
                                      </div>
                                    ))}
                                    {change.type !== 'equal' && Number(item.purchasePrice) > 0 && (
                                      <div className={`mt-1 p-1 rounded text-[9px] font-bold ${change.type === 'increase' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>
                                        {change.type === 'increase' ? `⚠ Cost Increased by ${change.percent}%` : `↓ Cost Decreased by ${change.percent}%`}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </td>

                        {/* Discount % */}
                        {settings.print?.tableColumns?.discount && (
                          <td className="px-2 py-1.5 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.discountPercentage || 0}
                              onChange={e => handleItemChange(idx, 'discountPercentage', parseFloat(e.target.value) || 0)}
                              className="w-full text-right bg-transparent border-0 p-1 text-xs text-slate-800 font-mono focus:ring-0 focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Tax % */}
                        {settings.print?.tableColumns?.taxPercent && (
                          <td className="px-2 py-1.5 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.taxPercentage || 0}
                              onChange={e => handleItemChange(idx, 'taxPercentage', parseFloat(e.target.value) || 0)}
                              className="w-full text-right bg-transparent border-0 p-1 text-xs text-slate-800 font-mono focus:ring-0 focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Amount Calculated */}
                        <td className="px-3 py-1.5 border-r border-slate-200 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(item.total)}
                        </td>

                        {/* Row Actions */}
                        <td className="px-1 py-1.5 text-center">
                          {isActive ? (
                            <button
                              type="button"
                              onClick={() => handleAddRow()}
                              title="Commit row and add next"
                              className="w-6 h-6 bg-[#1877f2] hover:bg-blue-700 text-white rounded flex items-center justify-center mx-auto shadow-xs transition active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveRow(idx);
                              }}
                              title="Remove item"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer: Add Row & Total Bar */}
                <tfoot className="bg-[#f8fafc] border-t border-slate-300 font-semibold text-xs">
                  <tr>
                    <td className="px-3 py-2 border-r border-slate-200"></td>
                    <td className="px-3 py-2 border-r border-slate-200">
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>ADD ROW</span>
                      </button>
                    </td>
                    <td colSpan={10} className="px-3 py-2 text-right border-r border-slate-200 text-slate-500 font-semibold">
                      Total Qty: <strong className="text-slate-900 ml-1 mr-4">{totalQuantity}</strong>
                      Subtotal: <strong className="text-slate-900 text-sm ml-1 font-mono">{formatCurrency(rawSubTotal)}</strong>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>

          {/* Bottom Section: Payment Type, Description, Images, Totals */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 items-start">
            
            {/* Left Controls: Payment Type, + Description, + Image */}
            <div className="md:col-span-6 space-y-4">
              
              {/* Payment Type Selection */}
              <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs">
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Type</label>
                <div className="relative">
                  <select
                    value={paymentType}
                    onChange={e => {
                      const pt = e.target.value as any;
                      setPaymentType(pt);
                      if (pt === 'Credit') {
                        setPaidAmount(0);
                        setHasCustomPaidAmount(true);
                      } else {
                        setPaidAmount(grandTotal);
                        setHasCustomPaidAmount(false);
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit">Credit (Udhaar)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Additional Bill Expenses (Transport, Handling, Shipping, etc.) */}
              <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span>Additional Bill Expenses</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Proportionally Allocated</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Transport</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.transport || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, transport: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Shipping</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.shipping || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, shipping: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Handling</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.handling || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, handling: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Loading</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.loading || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, loading: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Delivery</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.delivery || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, delivery: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Other</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.other || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, other: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                </div>
                {(Object.values(additionalExpenses) as number[]).reduce((a, b) => a + (b || 0), 0) > 0 && (
                  <div className="text-[11px] text-blue-700 font-bold pt-1 flex justify-between">
                    <span>Total Additional Expenses:</span>
                    <span className="font-mono">{formatCurrency((Object.values(additionalExpenses) as number[]).reduce((a, b) => a + (b || 0), 0))}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Add Description & Add Image */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDescription(!showDescription)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-2xs transition"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>+ ADD DESCRIPTION</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowImageUpload(true);
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-2xs transition"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>+ ADD IMAGE</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageFile} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Expandable Description Text Area */}
              {showDescription && (
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs space-y-1">
                  <label className="text-xs font-bold text-slate-700">Bill Remarks / Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Enter bill remarks, supplier terms, or batch details..."
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Expandable Image Preview */}
              {imageAttachment && (
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={imageAttachment} 
                      alt="Attachment" 
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                    />
                    <span className="text-xs font-medium text-slate-700">Receipt / Bill Image Attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageAttachment(null)}
                    className="text-xs text-rose-600 hover:underline font-bold"
                  >
                    Remove
                  </button>
                </div>
              )}

            </div>

            {/* Right Controls: Round Off, Totals, Paid & Balance Due */}
            <div className="md:col-span-6 bg-white border border-slate-300 rounded-xl p-4 shadow-xs space-y-3">
              
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={roundOff}
                    onChange={e => setRoundOff(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>Round off ({roundOffType})</span>
                </label>
                <span className="text-slate-500 font-mono">
                  {roundOff ? (roundOffAmount >= 0 ? `+${roundOffAmount}` : `${roundOffAmount}`) : '0.00'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm font-semibold text-slate-800">
                <span>Total Amount</span>
                <span className="text-base font-bold text-slate-900 font-mono">{formatCurrency(grandTotal)}</span>
              </div>

              <div className="flex justify-between items-center text-xs font-medium text-slate-700">
                <span>Paid / Given Amount</span>
                <div className="w-36">
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    step="0.01"
                    value={effectivePaidAmount}
                    onChange={e => {
                      setPaidAmount(parseFloat(e.target.value) || 0);
                      setHasCustomPaidAmount(true);
                    }}
                    className="w-full text-right bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-slate-200">
                <span className="text-rose-600">Balance Due</span>
                <span className="text-rose-600 font-mono">{formatCurrency(balanceDue)}</span>
              </div>

            </div>

          </div>

          </div>

        </div>

        {/* Modal Footer Action Buttons (Save & New and Save) */}
        <div className="bg-[#f1f5f9] border-t border-slate-300 px-4 sm:px-6 py-3 flex items-center justify-between sm:justify-end gap-2.5 select-none">
          
          {/* Save & New Button */}
          <button
            type="button"
            onClick={handleSaveAndNew}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-blue-600 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-50 transition shadow-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Save & New</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-[#1877f2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Save {transactionType === 'Purchase Return' ? 'Return' : 'Purchase'}</span>
          </button>

        </div>

      </div>

      <InvoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
