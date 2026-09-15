import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, Search, Calculator, Settings, Check, 
  Camera, FileText, Image as ImageIcon, ChevronDown, 
  ArrowLeftRight, AlertCircle, Sparkles, UserPlus, Phone, Printer, MessageCircle,
  Minus, Maximize2, Minimize2, ShieldAlert, Mic, Scan, MoreVertical
} from 'lucide-react';
import { Medicine, Party, Invoice, InvoiceItem, AuditLog } from '../../types';
import { dbMedicines, dbSuppliers, dbInvoices, dbAuditLogs } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { CalculatorModal } from './CalculatorModal';
import { AddPartyModal } from '../parties/AddPartyModal';
import { InvoiceSettingsModal } from './InvoiceSettingsModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { InvoicePrintModal } from './InvoicePrintModal';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { getRecentSalePrices } from '../../lib/inventoryCosting';
import { getFEFOBatches } from '../../lib/enterprisePharma';
import { HistoricalPriceDropdown } from '../common/HistoricalPriceDropdown';
import { emitToast } from '../../contexts/ToastContext';

interface SaleTabState {
  id: string;
  tabLabel: string;
  transactionType: 'Sale' | 'Estimate' | 'Sale Order' | 'Delivery Challan' | 'Sale Return';
  isCredit: boolean;
  selectedPartyId: string;
  customerName: string;
  billingName: string;
  customerPhone: string;
  customerAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerPoNumber?: string;
  customerPoDate?: string;
  paymentTerms?: string;
  dueDate?: string;
  items: (InvoiceItem & { tempId: string })[];
  description: string;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  isRoundOff: boolean;
  roundOffAmount: number;
  receivedAmount: number;
  imageAttachment?: string;
  documentAttachment?: string;
  isWarrantyBill?: boolean;
  warrantyPeriod?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyType?: 'Repair' | 'Replacement' | 'Service';
  warrantyTerms?: string;
  tinNtn?: string;
  claimContact?: string;
  shopStamp?: boolean;
}

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (savedInvoice: Invoice) => void;
  initialInvoice?: Invoice | null;
  defaultTransactionType?: 'Sale' | 'Estimate' | 'Sale Order' | 'Delivery Challan' | 'Sale Return';
}

const UNIT_OPTIONS = ['NONE', 'Box', 'Strip', 'Pcs', 'Tab', 'Vial', 'Bottle', 'Ampoule', 'Pack'];

const createEmptySaleRows = () => Array.from({ length: 5 }).map(() => ({
  tempId: uuidv4(),
  name: '',
  batchNumber: '',
  expiryDate: '',
  quantity: 0,
  unit: 'Box',
  pricePerUnit: 0,
  sellingPrice: 0,
  mrp: 0,
  total: 0
}));

export const AddSaleModal: React.FC<AddSaleModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  initialInvoice,
  defaultTransactionType = 'Sale'
}) => {
  const { business } = useAuth();
  const { settings, updateTransaction } = useSettings();
  
  // Master lists
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [activePriceRowId, setActivePriceRowId] = useState<string | null>(null);
  
  // Tabs State (multi-sale support)
  const [tabs, setTabs] = useState<SaleTabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Modals inside AddSale
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<Invoice | null>(null);
  const [autoTriggerPrint, setAutoTriggerPrint] = useState(false);
  
  // Quick Lightning Entry Row State
  const [lightningQuery, setLightningQuery] = useState('');
  const [lightningResults, setLightningResults] = useState<Medicine[]>([]);
  const [lightningSelectedMed, setLightningSelectedMed] = useState<Medicine | null>(null);
  const [lightningQty, setLightningQty] = useState<number>(1);
  const [lightningUnit, setLightningUnit] = useState<string>('Box');
  const [lightningPrice, setLightningPrice] = useState<number>(0);
  const [lightningHsn, setLightningHsn] = useState('');
  const [lightningBatch, setLightningBatch] = useState('');
  const [lightningExpDate, setLightningExpDate] = useState('');
  const [lightningMfgDate, setLightningMfgDate] = useState('');
  const [lightningMrp, setLightningMrp] = useState<number>(0);
  const [lightningFreeQty, setLightningFreeQty] = useState<number>(0);
  const [lightningDiscount, setLightningDiscount] = useState<number>(0);
  const [lightningTax, setLightningTax] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);

  // Customer dropdown search
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isPlusDropdownOpen, setIsPlusDropdownOpen] = useState(false);
  const [activeMedDropdownTempId, setActiveMedDropdownTempId] = useState<string | null>(null);
  const [customerSelectedIndex, setCustomerSelectedIndex] = useState(0);
  const [lightningSelectedIndex, setLightningSelectedIndex] = useState(0);
  const [tableMedSelectedIndex, setTableMedSelectedIndex] = useState(0);

  // Active field target for calculator value insertion
  const [activeCalcTarget, setActiveCalcTarget] = useState<'price' | 'received' | null>(null);

  // Mobile 2-Step View state (Step 1: Party & Details, Step 2: Items & Totals)
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const [isMobileSubMenuOpen, setIsMobileSubMenuOpen] = useState(false);

  // Show attachment boxes
  const [showDescription, setShowDescription] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);

  // Status Alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState<boolean>(false);

  const handleBarcodeScanned = (scannedCode: string, format?: string) => {
    setIsBarcodeScannerOpen(false);
    const clean = scannedCode.trim().toLowerCase();
    
    // Find matching medicine in loaded database
    const matched = medicines.find(m => 
      (m.barcode && m.barcode.trim().toLowerCase() === clean) ||
      m.id.toLowerCase() === clean ||
      (m.batchNumber && m.batchNumber.trim().toLowerCase() === clean)
    );

    if (matched) {
      handleSelectLightningMed(matched, true);
      setSuccessMessage(`Scanned & Added: ${matched.name} (Barcode: ${scannedCode})`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } else {
      setLightningQuery(scannedCode);
      handleLightningSearch(scannedCode);
      setErrorMessage(`Barcode ${scannedCode} scanned. No existing medicine matches. Please enter medicine name.`);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Window Controls: Fullscreen Overlay, Minimize, Maximize
  const [isMaximized, setIsMaximized] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const lightningInputRef = useRef<HTMLInputElement>(null);
  const lightningQtyInputRef = useRef<HTMLInputElement>(null);
  const lightningPriceInputRef = useRef<HTMLInputElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const plusDropdownRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusDropdownRef.current && !plusDropdownRef.current.contains(event.target as Node)) {
        setIsPlusDropdownOpen(false);
      }
    };
    if (isPlusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPlusDropdownOpen]);

  // Load medicines, parties & initialize default tab
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [medsData, partiesData, invoicesData] = await Promise.all([
        dbMedicines.getAll(),
        dbSuppliers.getAll(),
        dbInvoices.getAll()
      ]);
      setMedicines(medsData);
      setParties(partiesData);
      setAllInvoices(invoicesData);

      // Determine next invoice number based on prefixes in settings
      const type = initialInvoice?.transactionType || defaultTransactionType || 'Sale';
      const prefixes = (settings.transaction.prefixes as any) || {};
      const typePrefix = 
        type === 'Estimate' ? (prefixes.estimate || 'EST-') :
        type === 'Sale Order' ? (prefixes.saleOrder || 'SO-') :
        type === 'Delivery Challan' ? (prefixes.deliveryChallan || 'DC-') :
        type === 'Sale Return' ? (prefixes.creditNote || 'SR-') :
        (prefixes.sale || '');
      
      const typeLabel = 
        type === 'Estimate' ? 'Estimate' :
        type === 'Sale Order' ? 'Sale Order' :
        type === 'Delivery Challan' ? 'Challan' :
        type === 'Sale Return' ? 'Sale Return' : 'Sale';

      let nextNum = '1';
      const matchingInvoices = invoicesData.filter(inv => inv.transactionType === type || (!inv.transactionType && type === 'Sale'));
      if (matchingInvoices.length > 0) {
        const nums = matchingInvoices
          .map(inv => parseInt(inv.invoiceNumber.replace(/\D/g, '') || '0'))
          .filter(n => !isNaN(n));
        const max = nums.length > 0 ? Math.max(...nums) : 0;
        nextNum = (max + 1).toString();
      }
      const formattedNum = typePrefix ? `${typePrefix}${nextNum}` : nextNum;

      const todayStr = new Date().toISOString().slice(0, 10);
      const oneYearLaterStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      if (initialInvoice) {
        // Editing existing invoice
        const initialTab: SaleTabState = {
          id: 'tab-edit',
          tabLabel: `${typeLabel} #${initialInvoice.invoiceNumber}`,
          transactionType: initialInvoice.transactionType || 'Sale',
          isCredit: initialInvoice.paymentType === 'Credit',
          selectedPartyId: initialInvoice.partyId || '',
          customerName: initialInvoice.customerName || '',
          billingName: initialInvoice.billingName || '',
          customerPhone: initialInvoice.customerPhone || '',
          customerAddress: initialInvoice.customerAddress || '',
          invoiceNumber: initialInvoice.invoiceNumber,
          invoiceDate: initialInvoice.date.slice(0, 10),
          items: initialInvoice.items.map(item => ({ ...item, tempId: uuidv4() })),
          description: initialInvoice.description || '',
          discountPercentage: initialInvoice.discountPercentage || 0,
          discountAmount: initialInvoice.discountAmount || 0,
          taxPercentage: initialInvoice.taxPercentage || 0,
          isRoundOff: !!initialInvoice.roundOff,
          roundOffAmount: initialInvoice.roundOff || 0,
          receivedAmount: initialInvoice.receivedAmount || 0,
          imageAttachment: initialInvoice.imageAttachment,
          documentAttachment: initialInvoice.documentAttachment,
          isWarrantyBill: initialInvoice.isWarrantyBill || false,
          warrantyPeriod: initialInvoice.warrantyDetails?.warrantyPeriod || '1 Year',
          warrantyStartDate: initialInvoice.warrantyDetails?.warrantyStartDate || initialInvoice.date.slice(0, 10),
          warrantyEndDate: initialInvoice.warrantyDetails?.warrantyEndDate || oneYearLaterStr,
          warrantyType: initialInvoice.warrantyDetails?.warrantyType || 'Replacement',
          warrantyTerms: initialInvoice.warrantyDetails?.warrantyTerms || 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.',
          tinNtn: initialInvoice.warrantyDetails?.tinNtn || 'TIN-982738-1',
          claimContact: initialInvoice.warrantyDetails?.claimContact || 'support@mbiinventra.com / 0336-4585863',
        };
        setTabs([initialTab]);
        setActiveTabId(initialTab.id);
        if (initialInvoice.description) setShowDescription(true);
        if (initialInvoice.imageAttachment) setShowImageUpload(true);
        if (initialInvoice.documentAttachment) setShowDocUpload(true);
      } else {
        // Create initial default tab
        const defaultTab: SaleTabState = {
          id: uuidv4(),
          tabLabel: `${typeLabel} #${formattedNum}`,
          transactionType: type as any,
          isCredit: false,
          selectedPartyId: '',
          customerName: '',
          billingName: '',
          customerPhone: '',
          customerAddress: '',
          invoiceNumber: formattedNum,
          invoiceDate: todayStr,
          items: createEmptySaleRows(),
          description: '',
          discountPercentage: 0,
          discountAmount: 0,
          taxPercentage: 0,
          isRoundOff: false,
          roundOffAmount: 0,
          receivedAmount: 0,
          isWarrantyBill: !!settings?.transaction?.warrantyMode,
          warrantyPeriod: '1 Year',
          warrantyStartDate: todayStr,
          warrantyEndDate: oneYearLaterStr,
          warrantyType: 'Replacement',
          warrantyTerms: 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.',
          tinNtn: 'TIN-982738-1',
          claimContact: 'support@mbiinventra.com / 0336-4585863',
        };
        setTabs([defaultTab]);
        setActiveTabId(defaultTab.id);
      }
    } catch (err) {
      console.error('Failed to load initial sale data:', err);
    }
  };

  // Active Tab Getter & Updater
  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateCurrentTab = (updates: Partial<SaleTabState>) => {
    if (!currentTab) return;
    setTabs(prev => prev.map(t => (t.id === currentTab.id ? { ...t, ...updates } : t)));
  };

  const handleAddSpecificTab = (type: 'Sale' | 'Estimate' | 'Sale Order' | 'Delivery Challan' | 'Sale Return') => {
    try {
      const prefixes = (settings?.transaction?.prefixes as any) || {};
      const typePrefix = 
        type === 'Estimate' ? (prefixes.estimate || 'EST-') :
        type === 'Sale Order' ? (prefixes.saleOrder || 'SO-') :
        type === 'Delivery Challan' ? (prefixes.deliveryChallan || 'DC-') :
        type === 'Sale Return' ? (prefixes.creditNote || 'SR-') :
        (prefixes.sale || '');

      const typeLabel = 
        type === 'Estimate' ? 'Estimate' :
        type === 'Sale Order' ? 'Sale Order' :
        type === 'Delivery Challan' ? 'Challan' :
        type === 'Sale Return' ? 'Return' : 'Sale';

      const nextTabNum = (tabs?.length || 0) + 1;
      const currentInvNum = currentTab?.invoiceNumber || '1';
      const digits = currentInvNum.replace(/\D/g, '');
      const rawNum = (digits ? parseInt(digits, 10) : 1) + nextTabNum - 1;
      const formattedNum = typePrefix ? `${typePrefix}${rawNum}` : rawNum.toString();

      const newTab: SaleTabState = {
        id: uuidv4(),
        tabLabel: `${typeLabel} #${formattedNum}`,
        transactionType: type,
        isCredit: false,
        selectedPartyId: '',
        customerName: '',
        billingName: '',
        customerPhone: '',
        customerAddress: '',
        invoiceNumber: formattedNum,
        invoiceDate: new Date().toISOString().slice(0, 10),
        items: createEmptySaleRows(),
        description: '',
        discountPercentage: 0,
        discountAmount: 0,
        taxPercentage: 0,
        isRoundOff: false,
        roundOffAmount: 0,
        receivedAmount: 0,
        isWarrantyBill: !!settings?.transaction?.warrantyMode,
        warrantyPeriod: '1 Year',
        warrantyStartDate: new Date().toISOString().slice(0, 10),
        warrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        warrantyType: 'Replacement',
        warrantyTerms: 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.',
        tinNtn: 'TIN-982738-1',
        claimContact: 'support@mbiinventra.com / 0336-4585863',
      };
      setTabs(prev => [...(prev || []), newTab]);
      setActiveTabId(newTab.id);
    } catch (err) {
      console.error('Error adding specific tab:', err);
    }
  };

  // Add a new tab (defaults to current type)
  const handleAddNewTab = () => {
    handleAddSpecificTab(currentTab?.transactionType || 'Sale');
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      onClose();
      return;
    }
    const filtered = tabs.filter(t => t.id !== tabId);
    setTabs(filtered);
    if (activeTabId === tabId) {
      setActiveTabId(filtered[0].id);
    }
  };

  // Customer selection logic
  const handleSelectParty = (party: Party) => {
    updateCurrentTab({
      selectedPartyId: party.id,
      customerName: party.name,
      billingName: party.contactPerson || party.name,
      customerPhone: party.phone || '',
      customerAddress: party.address || ''
    });
    setCustomerSearchQuery(party.name);
    setIsCustomerDropdownOpen(false);
  };

  const handlePartyCreated = async (newParty: Party) => {
    await dbSuppliers.save(newParty as any);
    const updatedParties = await dbSuppliers.getAll();
    setParties(updatedParties);
    handleSelectParty(newParty);
    setIsAddPartyOpen(false);
  };

  // Quick Lightning Item Search Logic
  const handleLightningSearch = (query: string) => {
    setLightningQuery(query);
    setLightningSelectedIndex(0);
    if (!query.trim()) {
      setLightningResults([]);
      return;
    }
    const q = query.toLowerCase();
    const results = medicines.filter(
      m => m.name.toLowerCase().includes(q) || 
           m.barcode.toLowerCase().includes(q) || 
           m.batchNumber.toLowerCase().includes(q)
    );
    setLightningResults(results.slice(0, 6));
  };

  const handleApplyTemplate = (type: 'med_pack' | 'first_aid' | 'syrups') => {
    if (!currentTab) return;
    let sampleItems: any[] = [];
    if (type === 'med_pack') {
      sampleItems = [
        { tempId: uuidv4(), name: 'Panadol 500mg Tablet', batchNumber: 'PN-401', expiryDate: '10/2027', quantity: 50, unit: 'Strip', pricePerUnit: 25, sellingPrice: 30, mrp: 35, total: 1500 },
        { tempId: uuidv4(), name: 'Augmentin 625mg', batchNumber: 'AG-882', expiryDate: '05/2028', quantity: 10, unit: 'Box', pricePerUnit: 650, sellingPrice: 720, mrp: 800, total: 7200 },
        { tempId: uuidv4(), name: 'Brufen 400mg', batchNumber: 'BR-110', expiryDate: '12/2026', quantity: 20, unit: 'Strip', pricePerUnit: 40, sellingPrice: 48, mrp: 55, total: 960 },
      ];
    } else if (type === 'first_aid') {
      sampleItems = [
        { tempId: uuidv4(), name: 'Blue Tex Cotton Pad 100g', batchNumber: 'BT-902', expiryDate: '12/2028', quantity: 15, unit: 'Pack', pricePerUnit: 150, sellingPrice: 180, mrp: 200, total: 2700 },
        { tempId: uuidv4(), name: 'Sterile Gauze Bandage', batchNumber: 'GZ-331', expiryDate: '01/2029', quantity: 25, unit: 'Piece', pricePerUnit: 45, sellingPrice: 55, mrp: 60, total: 1375 },
        { tempId: uuidv4(), name: 'Surgical Adhesive Tape', batchNumber: 'TP-105', expiryDate: '06/2028', quantity: 10, unit: 'Piece', pricePerUnit: 90, sellingPrice: 110, mrp: 125, total: 1100 },
      ];
    } else if (type === 'syrups') {
      sampleItems = [
        { tempId: uuidv4(), name: 'Panadol Syrup 120ml', batchNumber: 'PS-602', expiryDate: '08/2027', quantity: 12, unit: 'Bottle', pricePerUnit: 120, sellingPrice: 145, mrp: 160, total: 1740 },
        { tempId: uuidv4(), name: 'Calpol Pediatric Drops', batchNumber: 'CP-211', expiryDate: '04/2027', quantity: 8, unit: 'Bottle', pricePerUnit: 95, sellingPrice: 115, mrp: 130, total: 920 },
      ];
    }

    updateCurrentTab({
      items: [...currentTab.items, ...sampleItems]
    });
  };

  const commitLightningItem = (medOrName: Medicine | string, qty: number, unitPrice: number) => {
    if (!currentTab) return;
    const isMedObj = typeof medOrName !== 'string';
    const med = isMedObj ? (medOrName as Medicine) : null;
    const itemName = med ? med.name : (medOrName as string).trim();
    if (!itemName) return;

    const unit = lightningUnit || med?.unit || 'Box';
    const effectiveQty = qty > 0 ? qty : 1;
    const effectivePrice = unitPrice !== undefined && unitPrice !== null ? unitPrice : (med?.sellingPrice || 0);
    const disc = lightningDiscount || 0;
    const tax = lightningTax || (med?.gstPercentage || 0);
    const base = effectiveQty * effectivePrice;
    const discAmt = (base * disc) / 100;
    const taxable = base - discAmt;
    const total = taxable + (taxable * tax) / 100;

    const newItem: InvoiceItem & { tempId: string } = {
      tempId: uuidv4(),
      medicineId: med?.id,
      name: itemName,
      hsnCode: lightningHsn || med?.hsnCode || '',
      batchNumber: lightningBatch || med?.batchNumber || '',
      expiryDate: lightningExpDate || med?.expiryDate || '',
      mfgDate: lightningMfgDate || med?.manufacturingDate || '',
      quantity: effectiveQty,
      freeQuantity: lightningFreeQty || 0,
      unit: unit,
      pricePerUnit: effectivePrice,
      sellingPrice: effectivePrice,
      mrp: lightningMrp || med?.mrp || effectivePrice,
      discountPercentage: disc,
      gstPercentage: tax,
      total: total
    };

    // Replace the first empty row or append at the bottom
    const firstEmptyIdx = currentTab.items.findIndex(it => !it.name || !it.name.trim());
    let updatedItems: (InvoiceItem & { tempId: string })[];
    if (firstEmptyIdx !== -1) {
      updatedItems = [...currentTab.items];
      updatedItems[firstEmptyIdx] = newItem;
    } else {
      updatedItems = [...currentTab.items, newItem];
    }

    updateCurrentTab({
      items: updatedItems
    });

    // Reset ALL lightning fields to empty and re-focus input for next item
    setLightningQuery('');
    setLightningSelectedMed(null);
    setLightningPrice(0);
    setLightningQty(1);
    setLightningUnit('Box');
    setLightningBatch('');
    setLightningExpDate('');
    setLightningMfgDate('');
    setLightningHsn('');
    setLightningMrp(0);
    setLightningFreeQty(0);
    setLightningDiscount(0);
    setLightningTax(0);
    setLightningResults([]);
    setTimeout(() => {
      lightningInputRef.current?.focus();
    }, 50);
  };

  const handleSelectLightningMed = (med: Medicine, autoAdd = false) => {
    // DRAP Quarantine & Recall Block Protection
    if (med.stockStatus === 'Quarantined' || med.stockStatus === 'Recalled') {
      emitToast(`⚠️ Blocked: ${med.name} (Batch: ${med.batchNumber}) is ${med.stockStatus.toUpperCase()} and cannot be sold.`, 'error');
      return;
    }

    // FEFO Engine (First Expiry, First Out)
    const fefoBatches = getFEFOBatches(med, medicines);
    const bestBatch = fefoBatches[0];

    setLightningSelectedMed(med);
    setLightningQuery(med.name);
    const price = med.sellingPrice || med.mrp || 0;
    setLightningPrice(price);
    setLightningUnit(med.unit || 'Box');
    setLightningBatch(bestBatch?.batchNumber || med.batchNumber || '');
    setLightningExpDate(bestBatch?.expiryDate || med.expiryDate || '');
    setLightningMrp(bestBatch?.mrp || med.mrp || price);
    setLightningResults([]);

    if (fefoBatches.length > 1 && bestBatch) {
      emitToast(`FEFO: Auto-selected earliest expiry batch ${bestBatch.batchNumber} (Exp: ${bestBatch.expiryDate ? bestBatch.expiryDate.slice(0, 7) : 'N/A'})`, 'info');
    }

    if (autoAdd) {
      commitLightningItem(med, lightningQty > 0 ? lightningQty : 1, price);
    } else {
      setTimeout(() => {
        lightningQtyInputRef.current?.focus();
        lightningQtyInputRef.current?.select();
      }, 50);
    }
  };

  const handleConfirmLightningItem = () => {
    if (!currentTab) return;
    const unitPrice = lightningPrice || (lightningSelectedMed?.sellingPrice || 0);
    const qty = lightningQty > 0 ? lightningQty : 1;
    const target = lightningSelectedMed || lightningQuery;
    commitLightningItem(target, qty, unitPrice);
  };

  // Add empty custom row
  const handleAddBlankRow = () => {
    if (!currentTab) return;
    const blankItem: InvoiceItem & { tempId: string } = {
      tempId: uuidv4(),
      name: '',
      batchNumber: '',
      quantity: 1,
      unit: 'Box',
      pricePerUnit: 0,
      sellingPrice: 0,
      mrp: 0,
      total: 0
    };
    updateCurrentTab({
      items: [...currentTab.items, blankItem]
    });
  };

  // Voice-to-Text Speech Recognition Handler
  const handleStartVoiceRecognition = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setErrorMessage("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSuccessMessage("Listening for voice command... (e.g. 'Paracetamol 2')");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setLightningQuery(transcript);
        parseVoiceCommand(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setErrorMessage(`Speech recognition error: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setErrorMessage("Failed to start microphone voice recognition.");
    }
  };

  const parseVoiceCommand = (transcript: string) => {
    const cleaned = transcript.trim();
    const words = cleaned.split(' ');
    let qty = 1;
    let medNameQuery = cleaned;

    const lastWord = words[words.length - 1];
    const parsedNum = parseInt(lastWord);
    if (!isNaN(parsedNum)) {
      qty = parsedNum;
      medNameQuery = words.slice(0, words.length - 1).join(' ');
    }

    const matched = medicines.find(m => 
      m.name.toLowerCase().includes(medNameQuery.toLowerCase()) || 
      medNameQuery.toLowerCase().includes(m.name.toLowerCase())
    );

    if (matched) {
      setLightningSelectedMed(matched);
      setLightningQty(qty);
      setLightningPrice(matched.sellingPrice || 0);
      setLightningBatch(matched.batchNumber || '');
      setLightningExpDate(matched.expiryDate || '');
      setLightningMrp(matched.mrp || matched.sellingPrice || 0);
      setLightningHsn(matched.hsnCode || '');
      setSuccessMessage(`Voice matched: ${matched.name} (${qty} units). Press Enter to add.`);
    } else {
      setLightningQuery(cleaned);
      setErrorMessage(`Could not find medicine matching "${medNameQuery}".`);
    }
  };

  // Update item row inline
  const handleUpdateItemRow = (tempId: string, updates: Partial<InvoiceItem>) => {
    if (!currentTab) return;
    const updatedItems = currentTab.items.map(it => {
      if (it.tempId === tempId) {
        const item = { ...it, ...updates };
        const price = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
        const qty = Number(item.quantity) || 1;
        const discPercent = Number(item.discountPercentage) || 0;
        const taxPercent = Number(item.taxPercentage) || 0;

        const base = price * qty;
        const discAmt = (base * discPercent) / 100;
        const taxable = base - discAmt;
        const taxAmt = (taxable * taxPercent) / 100;

        item.sellingPrice = price;
        item.pricePerUnit = price;
        item.discountAmount = discAmt;
        item.taxableAmount = taxable;
        item.total = Math.round(taxable + taxAmt);
        return item;
      }
      return it;
    });
    updateCurrentTab({ items: updatedItems });
  };

  const handleDeleteItemRow = (tempId: string) => {
    if (!currentTab) return;
    updateCurrentTab({
      items: currentTab.items.filter(it => it.tempId !== tempId)
    });
  };

  // Financial Calculations
  const rawSubtotal = currentTab ? currentTab.items.reduce((sum, item) => sum + (item.total || 0), 0) : 0;
  const totalQty = currentTab ? currentTab.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;

  // Handle bidirectional discount updates
  const handleDiscountPercentChange = (percent: number) => {
    const discAmount = Math.round((rawSubtotal * percent) / 100);
    updateCurrentTab({
      discountPercentage: percent,
      discountAmount: discAmount
    });
  };

  const handleDiscountAmountChange = (amount: number) => {
    const percent = rawSubtotal > 0 ? parseFloat(((amount / rawSubtotal) * 100).toFixed(2)) : 0;
    updateCurrentTab({
      discountAmount: amount,
      discountPercentage: percent
    });
  };

  // Tax calculation
  const calculatedTaxAmount = currentTab?.taxPercentage 
    ? Math.round(((rawSubtotal - (currentTab.discountAmount || 0)) * currentTab.taxPercentage) / 100)
    : 0;

  // Raw Grand Total before Round Off
  const preliminaryTotal = rawSubtotal - (currentTab?.discountAmount || 0) + calculatedTaxAmount;
  
  // Round off calculation based on settings
  let effectiveRoundOff = currentTab?.roundOffAmount || 0;
  let finalGrandTotal = preliminaryTotal;
  if (currentTab?.isRoundOff) {
    const roundType = settings.transaction.roundOffType || 'Nearest';
    let rounded = preliminaryTotal;
    if (roundType === 'Nearest') rounded = Math.round(preliminaryTotal);
    else if (roundType === 'Up') rounded = Math.ceil(preliminaryTotal);
    else if (roundType === 'Down') rounded = Math.floor(preliminaryTotal);
    else rounded = preliminaryTotal;
    
    effectiveRoundOff = rounded - preliminaryTotal;
    finalGrandTotal = rounded;
  } else {
    finalGrandTotal = preliminaryTotal + (currentTab?.roundOffAmount || 0);
  }

  // Handle Received Amount vs Credit Mode
  const effectiveReceivedAmount = currentTab?.isCredit 
    ? (currentTab.receivedAmount || 0)
    : (currentTab?.receivedAmount !== undefined && currentTab.receivedAmount !== 0 ? currentTab.receivedAmount : finalGrandTotal);

  const effectiveBalanceDue = Math.max(0, finalGrandTotal - effectiveReceivedAmount);

  // File Upload Handlers
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCurrentTab({ imageAttachment: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCurrentTab({ documentAttachment: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Keyboard Shortcuts: Ctrl+P for instant browser print dialog, Ctrl+S for saving
  useEffect(() => {
    if (!isOpen || isMinimized) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid stealing shortcuts if child submodal is open
      if (isCalculatorOpen || isAddPartyOpen || isSettingsOpen || isPrintModalOpen) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        handleTriggerPrint();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        handleSaveInvoice('save');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, isCalculatorOpen, isAddPartyOpen, isSettingsOpen, isPrintModalOpen, currentTab, rawSubtotal, calculatedTaxAmount, effectiveRoundOff, finalGrandTotal, effectiveReceivedAmount, effectiveBalanceDue]);

  // Construct active invoice object for printing or saving
  const buildActiveInvoice = (forPrint: boolean = false): Invoice => {
    if (!currentTab) throw new Error("No active sale tab");
    const customerName = currentTab.customerName.trim() || (currentTab.isCredit ? '' : 'Walk-in / Cash Customer');
    const validItems = currentTab.items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) > 0);
    const txType = currentTab.transactionType || initialInvoice?.transactionType || defaultTransactionType || 'Sale';

    const now = new Date();
    let invoiceDateObj = new Date(currentTab.invoiceDate);
    if (currentTab.invoiceDate === now.toISOString().slice(0, 10)) {
      invoiceDateObj = now;
    } else {
      invoiceDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    return {
      id: initialInvoice ? initialInvoice.id : (forPrint ? `preview-${Date.now()}` : uuidv4()),
      invoiceNumber: currentTab.invoiceNumber || `${Date.now()}`,
      date: invoiceDateObj.toISOString(),
      partyId: currentTab.selectedPartyId || undefined,
      customerName: customerName,
      billingName: currentTab.billingName || customerName,
      customerPhone: currentTab.customerPhone || undefined,
      customerAddress: currentTab.customerAddress || undefined,
      transactionType: txType,
      status: txType === 'Sale Return' ? 'Completed' : txType === 'Delivery Challan' ? 'Dispatched' : 'Pending',
      paymentType: currentTab.isCredit ? 'Credit' : 'Cash',
      items: validItems.length > 0 
        ? validItems.map(({ tempId, ...rest }) => rest)
        : currentTab.items.filter(i => i.name && i.name.trim().length > 0).map(({ tempId, ...rest }) => rest),
      subTotal: rawSubtotal,
      discountPercentage: currentTab.discountPercentage,
      discountAmount: currentTab.discountAmount,
      taxPercentage: currentTab.taxPercentage,
      taxAmount: calculatedTaxAmount,
      roundOff: effectiveRoundOff,
      grandTotal: finalGrandTotal,
      receivedAmount: effectiveReceivedAmount,
      balanceDue: effectiveBalanceDue,
      description: currentTab.description || undefined,
      imageAttachment: currentTab.imageAttachment,
      documentAttachment: currentTab.documentAttachment,
      isWarrantyBill: currentTab.isWarrantyBill,
      warrantyDetails: currentTab.isWarrantyBill ? {
        warrantyPeriod: currentTab.warrantyPeriod || '1 Year',
        warrantyStartDate: currentTab.warrantyStartDate || currentTab.invoiceDate,
        warrantyEndDate: currentTab.warrantyEndDate || '',
        warrantyType: currentTab.warrantyType || 'Replacement',
        warrantyTerms: currentTab.warrantyTerms || 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.',
        tinNtn: currentTab.tinNtn || 'TIN-982738-1',
        claimContact: currentTab.claimContact || 'support@mbiinventra.com / 0336-4585863',
        shopStamp: true
      } : undefined,
      firmName: business?.name || 'MBI INVENTRA',
      userName: 'Admin',
      cashierId: '1',
      createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Instantly trigger browser print dialog for current active invoice
  const handleTriggerPrint = () => {
    if (!currentTab) return;
    const validItems = currentTab.items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      emitToast('Please add at least one item before printing the invoice (Ctrl+P)', 'warning');
      return;
    }
    const inv = buildActiveInvoice(true);
    setPrintInvoiceData(inv);
    setAutoTriggerPrint(true);
    setIsPrintModalOpen(true);
    emitToast('Opening browser print dialog (Ctrl+P)...', 'info');
  };

  // Save Sale Invoice Logic
  const handleSaveInvoice = async (mode: 'save' | 'save_and_new' | 'save_and_print' = 'save') => {
    if (!currentTab) return;
    setErrorMessage(null);

    const customerName = currentTab.customerName.trim() || (currentTab.isCredit ? '' : 'Walk-in / Cash Customer');
    if (!customerName) {
      setErrorMessage('Please enter or select a customer name for Credit transactions.');
      return;
    }

    const validItems = currentTab.items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      setErrorMessage('Please add at least one item with a name and quantity greater than 0.');
      return;
    }

    if (currentTab.isWarrantyBill) {
      if (!currentTab.warrantyEndDate || !currentTab.warrantyEndDate.trim()) {
        setErrorMessage('Warranty End Date is required when Warranty Mode is active.');
        return;
      }
      if (!currentTab.warrantyType) {
        setErrorMessage('Warranty Type is required when Warranty Mode is active.');
        return;
      }
    }

    const txType = currentTab.transactionType || initialInvoice?.transactionType || defaultTransactionType || 'Sale';

    if (txType === 'Sale') {
      const belowCostItems = validItems.filter(item => {
        const med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase().trim() === item.name.toLowerCase().trim());
        const avgCost = med ? (med.purchasePrice || 0) : 0;
        const sellPrice = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
        return sellPrice > 0 && avgCost > 0 && sellPrice < avgCost;
      });

      if (belowCostItems.length > 0) {
        const action = settings.pricing?.belowCostAction || 'Warning';
        if (action === 'Block') {
          setErrorMessage(`Cannot complete sale: Selling price is below purchase/average cost for item(s): ${belowCostItems.map(i => i.name).join(', ')}. Blocked by admin policy.`);
          return;
        } else if (action === 'Warning') {
          const confirmed = window.confirm(`⚠ WARNING: One or more items (${belowCostItems.map(i => i.name).join(', ')}) are being sold below their weighted average cost. Do you want to proceed anyway?`);
          if (!confirmed) return;
        }
      }

      // Check Customer Credit Limit for Credit sales
      if (currentTab.isCredit && currentTab.selectedPartyId && effectiveBalanceDue > 0) {
        const party = parties.find(p => p.id === currentTab.selectedPartyId);
        if (party && party.creditLimit && party.creditLimit > 0) {
          const currentBal = party.balance || 0;
          const projectedBal = currentBal + effectiveBalanceDue;
          if (projectedBal > party.creditLimit) {
            const overAmount = projectedBal - party.creditLimit;
            const proceed = window.confirm(
              `🛑 CREDIT LIMIT WARNING:\nCustomer "${party.name}" has a Credit Limit of Rs. ${party.creditLimit.toLocaleString()}.\n` +
              `Current Balance: Rs. ${currentBal.toLocaleString()}\n` +
              `New Balance after this sale: Rs. ${projectedBal.toLocaleString()} (Exceeds limit by Rs. ${overAmount.toLocaleString()}).\n\n` +
              `Do you have Admin approval to override the credit limit and proceed?`
            );
            if (!proceed) {
              setErrorMessage(`Sale blocked: Customer credit limit of Rs. ${party.creditLimit.toLocaleString()} exceeded.`);
              return;
            }
          }
        }
      }
    }

    const now = new Date();
    let invoiceDateObj = new Date(currentTab.invoiceDate);
    if (currentTab.invoiceDate === now.toISOString().slice(0, 10)) {
      invoiceDateObj = now;
    } else {
      invoiceDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    const newInvoice: Invoice = {
      id: initialInvoice ? initialInvoice.id : uuidv4(),
      invoiceNumber: currentTab.invoiceNumber || `${Date.now()}`,
      date: invoiceDateObj.toISOString(),
      partyId: currentTab.selectedPartyId || undefined,
      customerName: customerName,
      billingName: currentTab.billingName || customerName,
      customerPhone: currentTab.customerPhone || undefined,
      customerAddress: currentTab.customerAddress || undefined,
      transactionType: txType,
      status: txType === 'Sale Return' ? 'Completed' : txType === 'Delivery Challan' ? 'Dispatched' : 'Pending',
      paymentType: currentTab.isCredit ? 'Credit' : 'Cash',
      items: validItems.map(({ tempId, ...rest }) => rest),
      subTotal: rawSubtotal,
      discountPercentage: currentTab.discountPercentage,
      discountAmount: currentTab.discountAmount,
      taxPercentage: currentTab.taxPercentage,
      taxAmount: calculatedTaxAmount,
      roundOff: effectiveRoundOff,
      grandTotal: finalGrandTotal,
      receivedAmount: effectiveReceivedAmount,
      balanceDue: effectiveBalanceDue,
      description: currentTab.description || undefined,
      imageAttachment: currentTab.imageAttachment,
      documentAttachment: currentTab.documentAttachment,
      isWarrantyBill: currentTab.isWarrantyBill,
      warrantyDetails: currentTab.isWarrantyBill ? {
        warrantyPeriod: currentTab.warrantyPeriod || '1 Year',
        warrantyStartDate: currentTab.warrantyStartDate || currentTab.invoiceDate,
        warrantyEndDate: currentTab.warrantyEndDate || '',
        warrantyType: currentTab.warrantyType || 'Replacement',
        warrantyTerms: currentTab.warrantyTerms || 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.',
        tinNtn: currentTab.tinNtn || 'TIN-982738-1',
        claimContact: currentTab.claimContact || 'support@mbiinventra.com / 0336-4585863',
        shopStamp: true
      } : undefined,
      firmName: business?.name || 'MBI INVENTRA',
      userName: 'Admin',
      cashierId: '1',
      createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Save Invoice in database
      await dbInvoices.save(newInvoice);

      // 2. Inventory & Stock sync based on Transaction Type
      if (txType === 'Sale') {
        // Deduct inventory quantities & save Audit Logs
        for (const item of validItems) {
          if (item.medicineId) {
            const med = medicines.find(m => m.id === item.medicineId);
            if (med) {
              const updatedQty = Math.max(0, med.quantity - item.quantity);
              await dbMedicines.save({ ...med, quantity: updatedQty });

              const audit: AuditLog = {
                id: uuidv4(),
                date: new Date().toISOString(),
                action: 'SALE',
                medicineId: med.id,
                medicineName: med.name,
                quantityChanged: -item.quantity,
                userId: '1',
                notes: `Sold in Invoice #${newInvoice.invoiceNumber} to ${newInvoice.customerName}`,
              };
              await dbAuditLogs.save(audit);
            }
          }
        }
      } else if (txType === 'Sale Return') {
        // Return adds stock BACK into inventory!
        for (const item of validItems) {
          if (item.medicineId) {
            const med = medicines.find(m => m.id === item.medicineId);
            if (med) {
              const updatedQty = med.quantity + item.quantity;
              await dbMedicines.save({ ...med, quantity: updatedQty });

              const audit: AuditLog = {
                id: uuidv4(),
                date: new Date().toISOString(),
                action: 'ADD_STOCK',
                medicineId: med.id,
                medicineName: med.name,
                quantityChanged: item.quantity,
                userId: '1',
                notes: `Returned item in Return #${newInvoice.invoiceNumber} from ${newInvoice.customerName}`,
              };
              await dbAuditLogs.save(audit);
            }
          }
        }
      }

      // 3. Update customer party balance if credit or party exists
      if (currentTab.selectedPartyId) {
        const party = parties.find(p => p.id === currentTab.selectedPartyId);
        if (party) {
          const currentBal = party.balance || 0;
          if (txType === 'Sale') {
            const updatedBal = currentBal + effectiveBalanceDue;
            await dbSuppliers.save({ ...party, balance: updatedBal });
          } else if (txType === 'Sale Return') {
            // Returns reduce customer dues / provide credit
            const updatedBal = Math.max(0, currentBal - finalGrandTotal);
            await dbSuppliers.save({ ...party, balance: updatedBal });
          }
        }
      }

      onSaveSuccess(newInvoice);
      emitToast(`${txType} Saved: #${newInvoice.invoiceNumber}`, 'success');

      if (mode === 'save_and_new') {
        const type = txType;
        const prefixes = (settings.transaction.prefixes as any) || {};
        const typePrefix = 
          type === 'Estimate' ? (prefixes.estimate || 'EST-') :
          type === 'Sale Order' ? (prefixes.saleOrder || 'SO-') :
          type === 'Delivery Challan' ? (prefixes.deliveryChallan || 'DC-') :
          type === 'Sale Return' ? (prefixes.creditNote || 'SR-') :
          (prefixes.sale || 'INV-');
        
        const typeLabel = 
          type === 'Estimate' ? 'Estimate' :
          type === 'Sale Order' ? 'Sale Order' :
          type === 'Delivery Challan' ? 'Challan' :
          type === 'Sale Return' ? 'Sale Return' : 'Sale';

        // Increment number cleanly
        const digits = (newInvoice.invoiceNumber || '').match(/\d+/g);
        const lastNum = digits ? parseInt(digits[digits.length - 1], 10) : 1;
        const nextFormattedNum = `${typePrefix}${lastNum + 1}`;

        const freshTab: SaleTabState = {
          id: uuidv4(),
          tabLabel: `${typeLabel} #${nextFormattedNum}`,
          transactionType: txType as any,
          isCredit: false,
          selectedPartyId: '',
          customerName: '',
          billingName: '',
          customerPhone: '',
          customerAddress: '',
          invoiceNumber: nextFormattedNum,
          invoiceDate: new Date().toISOString().slice(0, 10),
          items: createEmptySaleRows(),
          description: '',
          discountPercentage: 0,
          discountAmount: 0,
          taxPercentage: 0,
          isRoundOff: false,
          roundOffAmount: 0,
          receivedAmount: 0,
        };

        setTabs([freshTab]);
        setActiveTabId(freshTab.id);
        setCustomerSearchQuery('');
        setSuccessMessage(`Invoice #${newInvoice.invoiceNumber} saved! Ready for #${nextFormattedNum}.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else if (mode === 'save_and_print') {
        setPrintInvoiceData(newInvoice);
        setAutoTriggerPrint(true);
        setIsPrintModalOpen(true);
        emitToast(`Invoice #${newInvoice.invoiceNumber} saved & print initiated!`, 'success');
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to save sale invoice:', err);
      setErrorMessage(err?.message || 'Error saving invoice. Please verify your entries.');
    }
  };

  if (!isOpen || !currentTab) return null;

  // Minimized floating pill docked at bottom right
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 bg-[#1e293b] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">{currentTab?.tabLabel || 'Sale Form'}</span>
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

  return (
    <div className={`fixed inset-0 z-50 flex ${
      isMaximized ? 'p-0 overflow-hidden' : 'items-center justify-center p-2 sm:p-4 overflow-y-auto'
    } bg-slate-900/75 backdrop-blur-md`}>
      <div className={`bg-[#f8fafc] w-full flex flex-col overflow-hidden text-slate-800 transition-all ${
        isMaximized 
          ? 'h-full max-h-screen rounded-none' 
          : 'max-w-6xl max-h-[96vh] rounded-2xl shadow-2xl border border-slate-300'
      }`}>
        
        {/* Top Sale Tabs & Action Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#1e293b] text-white border-b border-slate-800 flex-shrink-0">
          
          {/* Desktop Tabs List */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {tabs.map((tab) => {
              const isActive = tab.id === currentTab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{tab.tabLabel}</span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 hover:text-rose-500 rounded transition-colors text-slate-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Plus Tab Button */}
            <button
              type="button"
              onClick={handleAddNewTab}
              title="Add New Tab"
              className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 flex-shrink-0 ml-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Active Tab Pill */}
          <div className="sm:hidden flex items-center gap-2 flex-1 min-w-0 mr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-black text-white truncate">
              {currentTab.tabLabel || `Invoice #${currentTab.invoiceNumber}`}
            </span>
            {tabs.length > 1 && (
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded-full font-bold shrink-0">
                {tabs.findIndex(t => t.id === currentTab.id) + 1}/{tabs.length}
              </span>
            )}
          </div>

          {/* Desktop Utility Tools & Window Controls */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
            <button
              type="button"
              onClick={handleTriggerPrint}
              title="Print Invoice (Ctrl+P)"
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span className="font-semibold">Print</span>
              <kbd className="hidden md:inline px-1 py-0.2 bg-slate-800 border border-slate-700 text-slate-400 rounded text-[10px] font-mono">Ctrl+P</kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              title="Open Calculator"
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Calculator</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Invoice & Sale Settings"
              className={`p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1 ${
                isSettingsOpen ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="font-semibold">Settings</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-700 mx-1" />

            {/* Window Controls: Minimize, Maximize/Restore, Close */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize Window"
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore Window" : "Maximize Window"}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Window"
              className="p-1.5 hover:bg-rose-600 hover:text-white rounded-lg transition-colors text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Actions & Window Controls */}
          <div className="sm:hidden flex items-center gap-0.5 text-slate-300">
            {/* Mobile Minimize */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize Window"
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Mobile Maximize / Restore */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore Window" : "Maximize Window"}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Mobile Submenu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMobileSubMenuOpen(!isMobileSubMenuOpen)}
                title="Invoice Actions & Tools"
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMobileSubMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsMobileSubMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 text-slate-200 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); handleTriggerPrint(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-blue-300 font-bold text-left cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Invoice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); setIsCalculatorOpen(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-emerald-300 font-bold text-left cursor-pointer"
                    >
                      <Calculator className="w-4 h-4" />
                      <span>Calculator</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); setIsSettingsOpen(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 font-bold text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Invoice Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); handleAddNewTab(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-amber-300 font-bold text-left cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Bill Tab</span>
                    </button>
                    <div className="border-t border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); setIsMinimized(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 font-bold text-left cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                      <span>Minimize Window</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); setIsMaximized(!isMaximized); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 font-bold text-left cursor-pointer"
                    >
                      {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      <span>{isMaximized ? 'Restore Size' : 'Maximize Window'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Close */}
            <button
              type="button"
              onClick={onClose}
              title="Close Window"
              className="p-1.5 hover:bg-rose-600 hover:text-white rounded-lg transition-colors text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Modal Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-white">

          {/* Mobile 2-Step Stepper Tabs (Visible only on mobile screens) */}
          <div className="sm:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
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
                mobileStep === 1 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>1</span>
              <span>Party & Details</span>
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
                mobileStep === 2 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>2</span>
              <span>Items & Billing</span>
              {currentTab.items.filter(i => i.name?.trim()).length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  mobileStep === 2 ? 'bg-white text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {currentTab.items.filter(i => i.name?.trim()).length}
                </span>
              )}
            </button>
          </div>

          {/* Status Alert Banners */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          {/* Top Form Row: Title, Credit/Cash Toggle, Customer, Invoice Details */}
          <div className={`bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl space-y-3 sm:space-y-4 ${mobileStep === 1 ? 'block' : 'hidden sm:block'}`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {currentTab?.transactionType === 'Sale Return' ? 'Return' : currentTab?.transactionType || 'Sale'}
                  </h2>
                  <span className="text-[11px] sm:text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                    #{currentTab.invoiceNumber}
                  </span>
                </div>

                {/* Credit <-> Cash Toggle Pill */}
                <div className="flex items-center bg-slate-200 p-0.5 sm:p-1 rounded-full text-xs font-bold shadow-inner">
                  <button
                    type="button"
                    onClick={() => updateCurrentTab({ isCredit: true })}
                    className={`px-2.5 sm:px-3 py-1 rounded-full transition-all ${
                      currentTab.isCredit 
                        ? 'bg-rose-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCurrentTab({ isCredit: false })}
                    className={`px-2.5 sm:px-3 py-1 rounded-full transition-all ${
                      !currentTab.isCredit 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cash
                  </button>
                </div>

                {/* Warranty Bill High-Contrast Animated Toggle Switch */}
                <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all duration-300 ease-in-out shadow-sm border ${
                  currentTab.isWarrantyBill 
                    ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-amber-200/50 ring-2 ring-amber-400/30' 
                    : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}>
                  <div className="flex items-center gap-1">
                    <ShieldAlert className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 ${currentTab.isWarrantyBill ? 'text-amber-700 scale-110 animate-pulse' : 'text-slate-400'}`} />
                    <span className="tracking-wide text-[11px] sm:text-xs">Warranty</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !currentTab.isWarrantyBill;
                      updateCurrentTab({ isWarrantyBill: nextVal });
                      updateTransaction({ warrantyMode: nextVal });
                    }}
                    className={`relative inline-flex h-5 sm:h-6 w-9 sm:w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                      currentTab.isWarrantyBill ? 'bg-amber-600 shadow-md' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 sm:h-5 w-4 sm:w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out ${
                        currentTab.isWarrantyBill ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Invoice Number & Date */}
              <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-xs">
                  <span className="font-semibold text-slate-600 text-[11px] sm:text-xs">Invoice No:</span>
                  <input
                    type="text"
                    value={currentTab.invoiceNumber}
                    onChange={(e) => updateCurrentTab({ invoiceNumber: e.target.value })}
                    placeholder="Invoice #"
                    className="w-full sm:w-36 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-left font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                    title="Enter custom reference or invoice number"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-xs">
                  <span className="font-semibold text-slate-500 text-[11px] sm:text-xs">Date:</span>
                  <input
                    type="date"
                    value={currentTab.invoiceDate}
                    onChange={(e) => updateCurrentTab({ invoiceDate: e.target.value })}
                    className="w-full sm:w-auto px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Customer Inputs Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
              
              {/* Customer Selector / Autocomplete */}
              <div className="relative" ref={customerDropdownRef}>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Customer <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search or Enter Customer Name"
                      value={currentTab.customerName}
                      onChange={(e) => {
                        updateCurrentTab({ customerName: e.target.value });
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerDropdownOpen(true);
                        setCustomerSelectedIndex(0);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      onKeyDown={(e) => {
                        const filtered = parties.filter(p => p.name.toLowerCase().includes((customerSearchQuery || currentTab.customerName).toLowerCase()));
                        if (isCustomerDropdownOpen && filtered.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setCustomerSelectedIndex(prev => (prev + 1) % filtered.length);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setCustomerSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filtered[customerSelectedIndex]) {
                              handleSelectParty(filtered[customerSelectedIndex]);
                            }
                          } else if (e.key === 'Escape') {
                            setIsCustomerDropdownOpen(false);
                          }
                        }
                      }}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddPartyOpen(true)}
                    title="Add New Party"
                    className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors flex-shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>

                {/* Dropdown for Customer Suggestions */}
                {isCustomerDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto">
                    {parties
                      .filter(p => p.name.toLowerCase().includes((customerSearchQuery || currentTab.customerName).toLowerCase()))
                      .map((p, idx) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectParty(p)}
                          className={`px-3.5 py-2.5 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center text-xs ${
                            idx === customerSelectedIndex ? 'bg-blue-100 text-slate-900 font-bold' : 'hover:bg-blue-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {p.phone ? `Phone: ${p.phone}` : ''} {p.city ? `• ${p.city}` : ''}
                            </div>
                          </div>
                          {p.balance !== undefined && (
                            <div className={`font-bold font-mono text-[11px] ${p.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              Bal: Rs {p.balance.toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}

                    {parties.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No registered parties found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Billing Name (Optional) */}
              {settings.transaction?.billingNameOfParties && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Billing Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Doctor, Pharmacy or Dept Name"
                    value={currentTab.billingName}
                    onChange={(e) => updateCurrentTab({ billingName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Phone Number */}
              {settings.transaction?.customerPhone !== false && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Customer Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="0321-xxxxxxx"
                      value={currentTab.customerPhone}
                      onChange={(e) => updateCurrentTab({ customerPhone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Customer PO Details */}
              {settings.transaction?.customerPoDetails && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      P.O. Number
                    </label>
                    <input
                      type="text"
                      placeholder="PO-xxxx"
                      value={currentTab.customerPoNumber || ''}
                      onChange={(e) => updateCurrentTab({ customerPoNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      P.O. Date
                    </label>
                    <input
                      type="date"
                      value={currentTab.customerPoDate || ''}
                      onChange={(e) => updateCurrentTab({ customerPoDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Due Date & Payment Terms */}
              {settings.transaction?.dueDatesAndPaymentTerms && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={currentTab.paymentTerms || 'Due on Receipt'}
                      onChange={(e) => updateCurrentTab({ paymentTerms: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Net 7">Net 7 Days</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={currentTab.dueDate || ''}
                      onChange={(e) => updateCurrentTab({ dueDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Warranty Bill Configuration Panel (Visible only when Warranty is ON) */}
            {currentTab.isWarrantyBill && (
              <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Warranty Bill Mode Active</h3>
                  </div>
                  <span className="text-[11px] text-amber-800 font-medium">Warranty fields & 15% MRP discount enabled</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Warranty Type</label>
                    <select
                      value={currentTab.warrantyType || 'Replacement'}
                      onChange={(e) => updateCurrentTab({ warrantyType: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Replacement">Replacement</option>
                      <option value="Repair">Repair</option>
                      <option value="Service">Service</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Warranty Period</label>
                    <input
                      type="text"
                      value={currentTab.warrantyPeriod || '1 Year'}
                      onChange={(e) => updateCurrentTab({ warrantyPeriod: e.target.value })}
                      placeholder="e.g. 1 Year / 6 Months"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Warranty Start Date</label>
                    <input
                      type="date"
                      value={currentTab.warrantyStartDate || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => updateCurrentTab({ warrantyStartDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Warranty Expiry Date</label>
                    <input
                      type="date"
                      value={currentTab.warrantyEndDate || ''}
                      onChange={(e) => updateCurrentTab({ warrantyEndDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">TIN / NTN Number</label>
                    <input
                      type="text"
                      value={currentTab.tinNtn || 'TIN-982738-1'}
                      onChange={(e) => updateCurrentTab({ tinNtn: e.target.value })}
                      placeholder="Enter TIN or NTN"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Claim Contact Details</label>
                    <input
                      type="text"
                      value={currentTab.claimContact || 'support@mbiinventra.com / 0336-4585863'}
                      onChange={(e) => updateCurrentTab({ claimContact: e.target.value })}
                      placeholder="Support phone / email"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Warranty Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={currentTab.warrantyTerms || 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.'}
                    onChange={(e) => updateCurrentTab({ warrantyTerms: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Selected Party Financial Status Card */}
            {(() => {
              if (!currentTab.selectedPartyId) return null;
              const party = parties.find(p => p.id === currentTab.selectedPartyId);
              if (!party) return null;
              const curBal = party.balance || 0;
              const limit = party.creditLimit || 0;
              const isOverLimit = limit > 0 && curBal > limit;

              return (
                <div className={`mt-3 px-3.5 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                  isOverLimit 
                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                    : 'bg-blue-50/70 border-blue-200 text-blue-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{party.name}</span>
                    {party.phone && <span className="text-[11px] text-slate-500 font-mono">({party.phone})</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-slate-500 text-[11px]">Current Due: </span>
                      <strong className={`font-mono font-bold ${curBal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        Rs. {curBal.toLocaleString()}
                      </strong>
                    </div>
                    {limit > 0 && (
                      <div>
                        <span className="text-slate-500 text-[11px]">Credit Limit: </span>
                        <strong className="font-mono font-bold text-slate-700">
                          Rs. {limit.toLocaleString()}
                        </strong>
                        {isOverLimit && (
                          <span className="ml-1.5 bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded">
                            Exceeded!
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Mobile Step 1 Next Button */}
            <div className="sm:hidden pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileStep(2)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform active:scale-98"
              >
                <span>Proceed to Items & Billing</span>
                <span className="bg-blue-800/80 px-2 py-0.5 rounded-full text-[11px]">
                  {currentTab.items.filter(i => i.name?.trim()).length} items
                </span>
                <span>→</span>
              </button>
            </div>

          </div>

          {/* Items & Billing Section (Visible in Step 2 on mobile, always on desktop) */}
          <div className={`space-y-4 ${mobileStep === 2 ? 'block' : 'hidden sm:block'}`}>
            
            {/* Mobile Step 2 Back & Summary Bar */}
            <div className="sm:hidden flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <button
                type="button"
                onClick={() => setMobileStep(1)}
                className="text-xs font-bold text-blue-700 flex items-center gap-1 hover:underline"
              >
                <span>←</span>
                <span>Back to Customer</span>
              </button>
              <span className="text-xs font-mono font-black text-blue-900">
                Total: Rs {finalGrandTotal.toLocaleString()}
              </span>
            </div>

            {/* Items Table Grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
            
            {/* Real-Time Below-Cost Warning Banner */}
            {(() => {
              const belowCostList = currentTab.items.filter(item => {
                if (!item.name || !item.name.trim()) return false;
                const med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                const avgCost = med ? (med.purchasePrice || 0) : 0;
                const sellPrice = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
                return sellPrice > 0 && avgCost > 0 && sellPrice < avgCost;
              });

              if (belowCostList.length === 0) return null;

              return (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <strong className="font-bold">Selling Below Cost Warning:</strong> {belowCostList.length} item(s) ({belowCostList.map(i => i.name).join(', ')}) priced below weighted average purchase cost.
                    </div>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                    Policy: {settings.pricing?.belowCostAction === 'Block' ? 'Strict Block' : 'Warning'}
                  </div>
                </div>
              );
            })()}
            
            {/* Items Table Header */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-slate-900">ITEMS INVOICED</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {currentTab.items.length} items
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => lightningInputRef.current?.focus()}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Rapid Add Mode</span>
                </button>
              </div>
            </div>

            {/* Invoiced Items Table */}
            <div className="overflow-x-auto min-h-[160px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">#</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[180px]">ITEM</th>
                    {settings.print?.tableColumns?.hsnSac && <th className="py-2.5 px-3 w-20 border-r border-slate-200">HSN/SAC</th>}
                    {(settings.print?.tableColumns?.batchNo || currentTab.isWarrantyBill) && <th className="py-2.5 px-3 w-22 border-r border-slate-200">BATCH NO.</th>}
                    {(settings.print?.tableColumns?.expDate || currentTab.isWarrantyBill) && <th className="py-2.5 px-3 w-22 border-r border-slate-200">EXP. DATE</th>}
                    {settings.print?.tableColumns?.mfgDate && <th className="py-2.5 px-3 w-22 border-r border-slate-200">MFG. DATE</th>}
                    {(settings.print?.tableColumns?.mrp || currentTab.isWarrantyBill) && <th className="py-2.5 px-3 w-20 text-right border-r border-slate-200">MRP</th>}
                    <th className="py-2.5 px-3 w-16 text-center border-r border-slate-200">QTY</th>
                    {settings.transaction?.freeItemQuantity && <th className="py-2.5 px-3 w-16 text-center border-r border-slate-200">FREE QTY</th>}
                    {settings.print?.tableColumns?.unit !== false && <th className="py-2.5 px-3 w-20 text-center border-r border-slate-200">UNIT</th>}
                    <th className="py-2.5 px-3 w-24 text-right border-r border-slate-200">PRICE/UNIT</th>
                    {settings.print?.tableColumns?.discount && <th className="py-2.5 px-3 w-20 text-right border-r border-slate-200">DISCOUNT</th>}
                    {settings.print?.tableColumns?.taxPercent && <th className="py-2.5 px-3 w-20 text-right border-r border-slate-200">TAX / GST</th>}
                    <th className="py-2.5 px-3 w-24 text-right border-r border-slate-200">AMOUNT</th>
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                {settings.transaction?.quickEntry !== false && (
                  <thead className="bg-blue-50/90 border-b-2 border-blue-200">
                    <tr>
                      <td className="py-2 px-1 text-center border-r border-slate-200 w-10 text-amber-500 font-bold text-sm">⚡</td>
                      <td className="py-2 px-3 border-r border-slate-200 relative min-w-[210px]">
                        <div className="flex items-center gap-1">
                          <input
                            ref={lightningInputRef}
                            type="text"
                            placeholder="Scan Barcode or Search Medicine..."
                            value={lightningQuery}
                            onChange={(e) => handleLightningSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (lightningResults.length > 0) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setLightningSelectedIndex(prev => (prev + 1) % lightningResults.length);
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setLightningSelectedIndex(prev => (prev - 1 + lightningResults.length) % lightningResults.length);
                                } else if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  if (lightningResults[lightningSelectedIndex]) {
                                    handleSelectLightningMed(lightningResults[lightningSelectedIndex], false);
                                    setLightningSelectedIndex(0);
                                  } else if (e.key === 'Enter') {
                                    handleConfirmLightningItem();
                                  }
                                } else if (e.key === 'Escape') {
                                  setLightningResults([]);
                                }
                              } else {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleConfirmLightningItem();
                                }
                              }
                            }}
                            className="w-full px-2 py-1 bg-white border border-blue-300 rounded text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {(settings.general.enableVoiceMic ?? true) && (
                            <button
                              type="button"
                              onClick={handleStartVoiceRecognition}
                              title="Voice-to-Text Input (Speak medicine & qty)"
                              className={`p-1.5 rounded border transition-all flex items-center justify-center flex-shrink-0 ${
                                isListening 
                                  ? 'bg-rose-600 text-white animate-pulse border-rose-700 shadow-sm' 
                                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
                              }`}
                            >
                              <Mic className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(settings.general.enableQrScanner ?? true) && (
                            <button
                              type="button"
                              onClick={() => setIsBarcodeScannerOpen(true)}
                              title="Scan Barcode via Camera (EAN-13, UPC, Code128, QR)"
                              className="p-1.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer"
                            >
                              <Scan className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {/* Auto-suggest dropdown */}
                        {lightningResults.length > 0 && (
                          <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-blue-200 rounded-xl shadow-2xl z-40 max-h-56 overflow-y-auto">
                            {lightningResults.map((med, idx) => {
                              const showBatch = settings.transaction?.showBatchInAutocomplete !== false;
                              const showStock = settings.transaction?.showStockInAutocomplete !== false;
                              const showMrp = settings.transaction?.showMrpInAutocomplete !== false;
                              const showPurRate = settings.transaction?.showPurchasePriceInAutocomplete !== false;
                              const showSaleRate = settings.transaction?.showSalePriceInAutocomplete !== false;
                              const showExpDate = settings.transaction?.showExpDateInAutocomplete && med.expiryDate;

                              const metaItems: React.ReactNode[] = [];
                              if (showBatch && med.batchNumber) {
                                metaItems.push(
                                  <span key="batch">Batch: <span className="font-mono text-slate-700 font-medium">{med.batchNumber}</span></span>
                                );
                              }
                              if (showStock) {
                                metaItems.push(
                                  <span key="stock">Stock: <strong className={med.quantity <= 10 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>{med.quantity}</strong> {med.unit ? `(${med.unit})` : ''}</span>
                                );
                              }
                              if (showMrp && (med.mrp || med.mrp === 0)) {
                                metaItems.push(
                                  <span key="mrp">MRP: <span className="font-mono text-slate-700 font-medium">Rs {med.mrp}</span></span>
                                );
                              }
                              if (showPurRate) {
                                metaItems.push(
                                  <span key="purRate" className="text-amber-800 font-semibold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                    Pur. Rate: <span className="font-mono font-bold">Rs {med.purchasePrice || 0}</span>
                                  </span>
                                );
                              }
                              if (showExpDate) {
                                metaItems.push(
                                  <span key="exp" className="text-purple-800 font-medium bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                                    Exp: <span className="font-mono">{med.expiryDate}</span>
                                  </span>
                                );
                              }

                              return (
                                <div
                                  key={med.id}
                                  onClick={() => handleSelectLightningMed(med, false)}
                                  className={`px-3 py-2 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center text-xs transition-colors ${
                                    idx === lightningSelectedIndex ? 'bg-blue-100 text-slate-900 font-bold' : 'hover:bg-blue-50'
                                  }`}
                                >
                                  <div className="min-w-0 pr-3">
                                    <div className="font-bold text-slate-900 truncate">{med.name}</div>
                                    {metaItems.length > 0 && (
                                      <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        {metaItems.map((elem, mIdx) => (
                                          <React.Fragment key={mIdx}>
                                            {mIdx > 0 && <span className="text-slate-300">|</span>}
                                            {elem}
                                          </React.Fragment>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {showSaleRate && (
                                    <div className="text-right flex-shrink-0">
                                      <span className="font-black font-mono text-blue-700 text-sm">Rs {med.sellingPrice}</span>
                                      <div className="text-[9px] text-slate-400">Sale Rate</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      {settings.print?.tableColumns?.hsnSac && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={lightningHsn}
                            onChange={(e) => setLightningHsn(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="HSN"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}
                      {(settings.print?.tableColumns?.batchNo || currentTab.isWarrantyBill) && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={lightningBatch}
                            onChange={(e) => setLightningBatch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="Batch"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}
                      {(settings.print?.tableColumns?.expDate || currentTab.isWarrantyBill) && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="date"
                            value={lightningExpDate}
                            onChange={(e) => setLightningExpDate(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            className="w-24 px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}
                      {settings.print?.tableColumns?.mfgDate && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="date"
                            value={lightningMfgDate}
                            onChange={(e) => setLightningMfgDate(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            className="w-24 px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}
                      {(settings.print?.tableColumns?.mrp || currentTab.isWarrantyBill) && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            value={lightningMrp || ''}
                            onChange={(e) => setLightningMrp(parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                      )}
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          ref={lightningQtyInputRef}
                          type="number"
                          min="1"
                          value={lightningQty || ''}
                          onChange={(e) => setLightningQty(parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => { 
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleConfirmLightningItem();
                            } else if (e.key === 'Tab' && !e.shiftKey) {
                              // If Tab is pressed in qty, naturally focus price or commit
                            }
                          }}
                          placeholder="1"
                          className="w-16 px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      {settings.transaction?.freeItemQuantity && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            min="0"
                            value={lightningFreeQty || ''}
                            onChange={(e) => setLightningFreeQty(parseInt(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0"
                            className="w-16 px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}
                      {settings.print?.tableColumns?.unit !== false && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <select
                            value={lightningUnit}
                            onChange={(e) => setLightningUnit(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                          >
                            {UNIT_OPTIONS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          ref={lightningPriceInputRef}
                          type="number"
                          value={lightningPrice || ''}
                          onChange={(e) => setLightningPrice(parseFloat(e.target.value) || 0)}
                          onKeyDown={(e) => { 
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleConfirmLightningItem();
                            }
                          }}
                          placeholder="0"
                          className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      {settings.print?.tableColumns?.discount && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            value={lightningDiscount || ''}
                            onChange={(e) => setLightningDiscount(parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                      )}
                      {settings.print?.tableColumns?.taxPercent && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            value={lightningTax || ''}
                            onChange={(e) => setLightningTax(parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                      )}
                      <td className="py-2 px-2 border-r border-slate-200 text-right font-mono font-bold text-xs">
                        Rs {(((lightningPrice || lightningSelectedMed?.sellingPrice || 0) * lightningQty) * (1 - (lightningDiscount || 0) / 100) * (1 + (lightningTax || 0) / 100)).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={handleConfirmLightningItem}
                          title="Add Item (Enter)"
                          className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-slate-100 font-medium">
                  {currentTab.items.map((item, index) => (
                    <tr
                      key={item.tempId}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        if (isNaN(dragIndex) || dragIndex === index) return;
                        const newItems = [...currentTab.items];
                        const [moved] = newItems.splice(dragIndex, 1);
                        newItems.splice(index, 0, moved);
                        updateCurrentTab({ items: newItems });
                      }}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-2 px-1 text-center border-r border-slate-200 bg-slate-50/50 w-10 text-xs text-slate-500 font-mono select-none">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', index.toString());
                            }}
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 font-bold select-none px-0.5"
                            title="Drag to reorder row"
                          >
                            ⋮⋮
                          </span>
                          <span>{index + 1}</span>
                        </div>
                      </td>

                      {/* Item Name & Batch */}
                      <td className="py-2 px-3 border-r border-slate-200 relative">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            handleUpdateItemRow(item.tempId, { name: e.target.value });
                            setActiveMedDropdownTempId(item.tempId);
                            setTableMedSelectedIndex(0);
                          }}
                          onKeyDown={(e) => {
                            const filteredMeds = medicines
                              .filter(m => m.name.toLowerCase().includes(item.name.toLowerCase()) || m.barcode.toLowerCase().includes(item.name.toLowerCase()))
                              .slice(0, 10);
                            if (activeMedDropdownTempId === item.tempId && filteredMeds.length > 0) {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setTableMedSelectedIndex(prev => (prev + 1) % filteredMeds.length);
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setTableMedSelectedIndex(prev => (prev - 1 + filteredMeds.length) % filteredMeds.length);
                              } else if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                if (filteredMeds[tableMedSelectedIndex]) {
                                  const m = filteredMeds[tableMedSelectedIndex];
                                  handleUpdateItemRow(item.tempId, {
                                    medicineId: m.id,
                                    name: m.name,
                                    batchNumber: m.batchNumber || '',
                                    expiryDate: m.expiryDate || '',
                                    mrp: m.mrp || 0,
                                    pricePerUnit: m.sellingPrice || m.mrp || 0,
                                    unit: m.unit || 'Box'
                                  });
                                  setActiveMedDropdownTempId(null);
                                  setTableMedSelectedIndex(0);
                                }
                              } else if (e.key === 'Escape') {
                                setActiveMedDropdownTempId(null);
                              }
                            }
                          }}
                          placeholder="Medicine / Item name"
                          className="w-full font-bold text-slate-900 bg-transparent focus:bg-white focus:border focus:border-blue-400 rounded px-1.5 py-0.5 focus:outline-none"
                        />
                        {!settings.print?.tableColumns?.batchNo && item.batchNumber && (
                          <div className="text-[10px] text-slate-400 font-mono px-1.5">
                            Batch: {item.batchNumber}
                          </div>
                        )}

                        {/* Medicine Autocomplete Dropdown */}
                        {activeMedDropdownTempId === item.tempId && item.name && (
                          <div 
                            className="absolute left-0 top-full mt-0.5 w-[720px] bg-white border border-slate-300 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
                            onMouseDown={e => e.preventDefault()}
                          >
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-blue-600">
                                <Plus className="w-3.5 h-3.5" /> Add Item
                              </span>
                              <div className="flex items-center gap-6 text-[10px] tracking-wider text-slate-500 uppercase font-bold">
                                {settings.transaction?.showSalePriceInAutocomplete !== false && <span className="w-20 text-right">Sale Price</span>}
                                {settings.transaction?.showPurchasePriceInAutocomplete !== false && <span className="w-20 text-right text-amber-800">Pur. Rate</span>}
                                {settings.transaction?.showStockInAutocomplete !== false && <span className="w-16 text-right">Stock</span>}
                              </div>
                            </div>
                            {medicines
                              .filter(m => m.name.toLowerCase().includes(item.name.toLowerCase()) || m.barcode.toLowerCase().includes(item.name.toLowerCase()))
                              .slice(0, 10)
                              .map((m, idx) => {
                                const showBatch = settings.transaction?.showBatchInAutocomplete !== false;
                                const showStock = settings.transaction?.showStockInAutocomplete !== false;
                                const showMrp = settings.transaction?.showMrpInAutocomplete !== false;
                                const showPurRate = settings.transaction?.showPurchasePriceInAutocomplete !== false;
                                const showSaleRate = settings.transaction?.showSalePriceInAutocomplete !== false;
                                const showExpDate = settings.transaction?.showExpDateInAutocomplete && m.expiryDate;

                                const subDetails: string[] = [];
                                if (showBatch && m.batchNumber) subDetails.push(`Batch: ${m.batchNumber}`);
                                if (showMrp && (m.mrp || m.mrp === 0)) subDetails.push(`MRP: Rs ${m.mrp}`);
                                if (showExpDate && m.expiryDate) subDetails.push(`Exp: ${m.expiryDate}`);
                                if (m.unit) subDetails.push(`Unit: ${m.unit}`);

                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateItemRow(item.tempId, {
                                        medicineId: m.id,
                                        name: m.name,
                                        batchNumber: m.batchNumber || '',
                                        expiryDate: m.expiryDate || '',
                                        mrp: m.mrp || 0,
                                        pricePerUnit: m.sellingPrice || m.mrp || 0,
                                        unit: m.unit || 'Box'
                                      });
                                      setActiveMedDropdownTempId(null);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 text-xs border-b border-slate-100 flex justify-between items-center transition cursor-pointer ${
                                      idx === tableMedSelectedIndex ? 'bg-blue-100 font-bold text-slate-900' : 'hover:bg-blue-50'
                                    }`}
                                  >
                                    <div className="pr-3 min-w-0 flex-1">
                                      <div className="font-bold text-slate-900 text-xs truncate">{m.name}</div>
                                      <div className="text-[10px] text-slate-500 mt-0.5">{subDetails.join(' • ') || (m.unit || 'Box')}</div>
                                    </div>
                                    <div className="flex items-center gap-6 flex-shrink-0 font-mono text-xs">
                                      {showSaleRate && (
                                        <div className="w-20 text-right font-bold text-blue-700">Rs {m.sellingPrice || m.mrp || 0}</div>
                                      )}
                                      {showPurRate && (
                                        <div className="w-20 text-right font-bold text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                          Rs {m.purchasePrice || 0}
                                        </div>
                                      )}
                                      {showStock && (
                                        <div className={`w-16 text-right font-bold ${Number(m.quantity) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                          {m.quantity}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </td>

                      {/* HSN/SAC */}
                      {settings.print?.tableColumns?.hsnSac && (
                        <td className="py-2 px-3 border-r border-slate-200">
                          <input
                            type="text"
                            value={item.hsnCode || ''}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { hsnCode: e.target.value })}
                            placeholder="HSN"
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                          />
                        </td>
                      )}

                      {/* Batch No */}
                      {(settings.print?.tableColumns?.batchNo || currentTab.isWarrantyBill) && (
                        <td className="py-2 px-3 border-r border-slate-200">
                          <input
                            type="text"
                            value={item.batchNumber || ''}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { batchNumber: e.target.value })}
                            placeholder="Batch"
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono font-medium"
                          />
                        </td>
                      )}

                      {/* Exp Date */}
                      {(settings.print?.tableColumns?.expDate || currentTab.isWarrantyBill) && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="date"
                            value={item.expiryDate ? item.expiryDate.slice(0, 10) : ''}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { expiryDate: e.target.value })}
                            className="w-24 px-1 py-1 border border-slate-200 rounded text-xs font-mono text-center bg-white"
                          />
                        </td>
                      )}

                      {/* Mfg Date */}
                      {settings.print?.tableColumns?.mfgDate && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="date"
                            value={item.mfgDate ? item.mfgDate.slice(0, 10) : ''}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { mfgDate: e.target.value })}
                            className="w-24 px-1 py-1 border border-slate-200 rounded text-xs font-mono text-center bg-white"
                          />
                        </td>
                      )}

                      {/* MRP */}
                      {(settings.print?.tableColumns?.mrp || currentTab.isWarrantyBill) && (
                        <td className="py-2 px-2 text-right border-r border-slate-200">
                          <input
                            type="number"
                            value={item.mrp || 0}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { mrp: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-1.5 py-1 border border-slate-200 rounded text-right font-mono text-xs"
                          />
                        </td>
                      )}

                      {/* Quantity */}
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemRow(item.tempId, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-16 px-1.5 py-1 border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                        />
                      </td>

                      {/* Free Qty */}
                      {settings.transaction?.freeItemQuantity && (
                        <td className="py-2 px-2 text-center border-r border-slate-200">
                          <input
                            type="number"
                            min="0"
                            value={item.freeQuantity || 0}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { freeQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-16 px-1.5 py-1 border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                          />
                        </td>
                      )}

                      {/* Unit */}
                      {settings.print?.tableColumns?.unit !== false && (
                        <td className="py-2 px-2 text-center border-r border-slate-200">
                          <select
                            value={item.unit || 'Box'}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { unit: e.target.value })}
                            className="w-20 px-1 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            {UNIT_OPTIONS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Price / Unit */}
                      <td className="py-2 px-2 text-right relative border-r border-slate-200">
                        <input
                          type="number"
                          value={item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice}
                          onFocus={() => setActivePriceRowId(item.tempId)}
                          onChange={(e) => handleUpdateItemRow(item.tempId, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-1.5 py-1 border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                        />
                        {/* Historical Sale Prices Dropdown & Below-Cost Warning */}
                        <HistoricalPriceDropdown
                          medicineId={item.medicineId}
                          itemName={item.name}
                          transactionType="Sale"
                          currentPrice={Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0}
                          onSelectPrice={(p) => handleUpdateItemRow(item.tempId, { pricePerUnit: p })}
                          isOpen={activePriceRowId === item.tempId}
                          onClose={() => setActivePriceRowId(null)}
                        />
                        {activePriceRowId === item.tempId && (() => {
                          const matchedMed = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                          const avgCost = matchedMed ? (matchedMed.purchasePrice || 0) : 0;
                          const currentSell = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
                          const isBelow = currentSell > 0 && avgCost > 0 && currentSell < avgCost;
                          if (!isBelow && avgCost <= 0) return null;
                          return (
                            <div className="absolute right-0 top-[calc(100%+8rem)] mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-1.5 w-48 text-left">
                              {avgCost > 0 && (
                                <div className="text-[10px] text-slate-600 flex justify-between font-mono mb-1">
                                  <span>Avg Cost:</span>
                                  <span className="font-bold">Rs {avgCost}</span>
                                </div>
                              )}
                              {isBelow && (
                                <div className="p-1 rounded bg-rose-50 text-rose-700 text-[9px] font-bold">
                                  ⚠ Selling Below Cost!
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Discount */}
                      {settings.print?.tableColumns?.discount && (
                        <td className="py-2 px-2 text-right border-r border-slate-200">
                          <input
                            type="number"
                            value={item.discountPercentage || 0}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { discountPercentage: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-1.5 py-1 border border-slate-200 rounded text-right font-mono text-xs"
                            placeholder="%"
                          />
                        </td>
                      )}

                      {/* Tax % */}
                      {settings.print?.tableColumns?.taxPercent && (
                        <td className="py-2 px-2 text-right border-r border-slate-200">
                          <input
                            type="number"
                            value={item.taxPercentage || 0}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { taxPercentage: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-1.5 py-1 border border-slate-200 rounded text-right font-mono text-xs"
                            placeholder="%"
                          />
                        </td>
                      )}

                      {/* Amount */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        Rs {(item.total || 0).toLocaleString()}
                      </td>

                      {/* Remove Button */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItemRow(item.tempId)}
                          title="Remove item"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {currentTab.items.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-8 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <p className="text-xs font-bold text-slate-500">
                            No items added yet. Use the rapid entry search above (⚡), click <strong>ADD ROW</strong>, or load a quick template:
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('med_pack')}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors border border-blue-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <span>💊</span> Standard Med Pack
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('first_aid')}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors border border-emerald-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <span>🩹</span> First Aid & Surgical
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('syrups')}
                              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-colors border border-purple-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <span>🧪</span> Syrups & Drops
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Bottom Action & Subtotal Ribbon */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAddBlankRow}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>ADD ROW</span>
              </button>

              <div className="flex items-center gap-8 text-xs font-bold">
                <div className="text-slate-600">
                  TOTAL QTY: <span className="font-mono text-slate-900 font-black ml-1">{totalQty}</span>
                </div>
                <div className="text-slate-600">
                  SUBTOTAL: <span className="font-mono text-blue-900 font-black text-sm ml-1">Rs {rawSubtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Grid: Left Attachments & Remarks vs Right Calculation Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            
            {/* Left Column: Description, Image & Document triggers */}
            <div className="lg:col-span-7 space-y-3">
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowDescription(!showDescription)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    showDescription || currentTab.description
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  + ADD DESCRIPTION
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowImageUpload(true);
                    imageInputRef.current?.click();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                    currentTab.imageAttachment
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  {currentTab.imageAttachment ? 'Image Attached' : '+ ADD IMAGE'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDocUpload(true);
                    docInputRef.current?.click();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                    currentTab.documentAttachment
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {currentTab.documentAttachment ? 'Document Attached' : '+ ADD DOCUMENT'}
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                onChange={handleDocFileChange}
                className="hidden"
              />

              {/* Description / Notes Box */}
              {(showDescription || currentTab.description) && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Invoice Notes / Delivery Instructions / Remarks:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter notes or terms to be printed on this invoice..."
                    value={currentTab.description}
                    onChange={(e) => updateCurrentTab({ description: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Image Preview if uploaded */}
              {currentTab.imageAttachment && (
                <div className="relative inline-block p-2 border border-slate-200 rounded-xl bg-slate-50">
                  <img
                    src={currentTab.imageAttachment}
                    alt="Invoice Attachment"
                    className="w-32 h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateCurrentTab({ imageAttachment: undefined })}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs shadow"
                  >
                    ✕
                  </button>
                </div>
              )}

            </div>

            {/* Right Column: Financial Calculation Box */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 font-medium text-xs">
              
              {/* Discount Row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-bold">Discount:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                    <input
                      type="number"
                      placeholder="0"
                      value={currentTab.discountPercentage || ''}
                      onChange={(e) => handleDiscountPercentChange(parseFloat(e.target.value) || 0)}
                      className="w-12 text-right text-xs font-mono font-bold focus:outline-none"
                    />
                    <span className="text-slate-400 font-bold ml-1">%</span>
                  </div>

                  <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                    <span className="text-slate-400 font-bold mr-1">Rs</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={currentTab.discountAmount || ''}
                      onChange={(e) => handleDiscountAmountChange(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right text-xs font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-bold">Tax / GST:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={currentTab.taxPercentage}
                    onChange={(e) => updateCurrentTab({ taxPercentage: parseFloat(e.target.value) || 0 })}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                  >
                    <option value={0}>NONE (0%)</option>
                    <option value={5}>GST 5%</option>
                    <option value={12}>GST 12%</option>
                    <option value={18}>GST 18%</option>
                  </select>
                  <span className="font-mono font-bold text-slate-700 w-24 text-right">
                    Rs {calculatedTaxAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Round Off */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-bold">
                  <input
                    type="checkbox"
                    checked={currentTab.isRoundOff}
                    onChange={(e) => updateCurrentTab({ isRoundOff: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Round Off:</span>
                </label>
                <span className="font-mono text-slate-500">
                  {effectiveRoundOff >= 0 ? `+${effectiveRoundOff}` : effectiveRoundOff}
                </span>
              </div>

              {/* Grand Total Box */}
              <div className="flex items-center justify-between pt-2 border-t-2 border-slate-300 text-sm">
                <span className="font-black text-slate-900">Total:</span>
                <div className="bg-white border-2 border-blue-600 px-3 py-1.5 rounded-xl font-black font-mono text-lg text-blue-900 shadow-xs">
                  Rs {finalGrandTotal.toLocaleString()}
                </div>
              </div>

              {/* Received Amount vs Balance Due */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-700 font-bold">Received Amount:</span>
                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 py-1">
                  <span className="text-slate-400 mr-1 font-bold">Rs</span>
                  <input
                    type="number"
                    value={effectiveReceivedAmount}
                    onChange={(e) => updateCurrentTab({ receivedAmount: parseFloat(e.target.value) || 0 })}
                    className="w-24 text-right font-mono font-bold text-emerald-700 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-bold">
                <span className="text-slate-700">Balance Due:</span>
                <span className={`font-mono text-sm ${effectiveBalanceDue > 0 ? 'text-rose-600 font-black' : 'text-slate-700'}`}>
                  Rs {effectiveBalanceDue.toLocaleString()}
                </span>
              </div>

            </div>

          </div>

          </div>

        </div>

        {/* Footer Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 bg-slate-100 border-t border-slate-200 flex-shrink-0 gap-3">
          
          <div className="hidden sm:flex text-xs text-slate-500 items-center gap-2 flex-wrap">
            <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px]">Ctrl+P</kbd> to Print</span>
            <span className="text-slate-300">•</span>
            <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px]">Ctrl+S</kbd> to Save</span>
            <span className="text-slate-300">•</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px]">Enter</kbd> in rapid box</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            
            {/* Quick Print Button */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              title="Trigger browser print dialog (Ctrl+P)"
              className="hidden sm:flex px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-colors items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Print</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[10px] font-mono">Ctrl+P</kbd>
            </button>

            {/* Save & Print Button */}
            <button
              type="button"
              onClick={() => handleSaveInvoice('save_and_print')}
              title="Save invoice and trigger print dialog"
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              <span>Save & Print</span>
            </button>

            {/* Save & New split button */}
            <button
              type="button"
              onClick={() => handleSaveInvoice('save_and_new')}
              className="hidden sm:inline-flex px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              Save & New
            </button>

            {/* Primary Save Button */}
            <button
              type="button"
              onClick={() => handleSaveInvoice('save')}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0070f3] hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Save {currentTab?.transactionType === 'Sale Return' ? 'Return' : currentTab?.transactionType || initialInvoice?.transactionType || defaultTransactionType || 'Sale'}</span>
            </button>

          </div>

        </div>

      </div>

      {/* Sub-modals inside AddSale */}
      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onInsertValue={(val) => {
          if (activeCalcTarget === 'received') {
            updateCurrentTab({ receivedAmount: val });
          } else {
            setLightningPrice(val);
          }
        }}
      />

      <AddPartyModal
        isOpen={isAddPartyOpen}
        onClose={() => setIsAddPartyOpen(false)}
        onSave={handlePartyCreated}
      />

      <InvoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
        title="Scan Product Barcode (Add Sale POS)"
      />

      {/* Invoice Print & Export Preview Modal */}
      <InvoicePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintInvoiceData(null);
          setAutoTriggerPrint(false);
        }}
        invoice={printInvoiceData}
        autoPrint={autoTriggerPrint}
      />

    </div>
  );
};
