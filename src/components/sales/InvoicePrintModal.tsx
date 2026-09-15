import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Printer, Download, Share2, Building2, CheckCircle2, 
  FileText, Image as ImageIcon, Loader2, QrCode, Landmark,
  SlidersHorizontal, Palette, Check, Eye, Sliders, ChevronRight
} from 'lucide-react';
import { Invoice } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { 
  captureElementAsPDF, 
  captureElementAsJPG, 
  triggerFileDownload,
  printHtmlElement
} from '../../lib/invoiceExport';
import { downloadSaleInvoicePDF } from '../../lib/pdfGenerator';
import { emitToast } from '../../contexts/ToastContext';
import { InvoiceShareModal } from './InvoiceShareModal';

const A4_TEMPLATES = [
  { id: 'A4_CLASSIC_TAX', name: 'Classic Tax Banner', style: 'Traditional Tax Grid Banner' },
  { id: 'A4_PHARMA_WHOLESALE', name: 'Pharma Wholesale', style: 'Batch, Expiry & Drug Lic Focus' },
  { id: 'A4_MODERN_MINIMAL', name: 'Modern Minimalist', style: 'Clean Contemporary Lines' },
  { id: 'A4_CORPORATE_BOXED', name: 'Corporate Boxed', style: 'Structured Border Panels' },
  { id: 'A4_COMPACT_PROFESSIONAL', name: 'Compact Professional', style: 'High-Density Item Ledger' },
];

const THERMAL_THEMES = [
  { id: 'THERMAL_CLASSIC', name: 'Thermal Classic POS', style: 'Standard 3-Inch Receipt' },
  { id: 'THERMAL_PHARMA', name: 'Thermal Detailed Pharma', style: 'Batch & Expiry POS Ticket' },
  { id: 'THERMAL_MINIMAL', name: 'Thermal Minimalist', style: 'Ultra-Clean Receipt' },
];

const COLORS = [
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Teal Green', hex: '#0d9488' },
  { name: 'Ruby Red', hex: '#e11d48' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Amber Orange', hex: '#ea580c' },
  { name: 'Slate Charcoal', hex: '#334155' },
];

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  autoPrint?: boolean;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoice,
  autoPrint = false
}) => {
  const { business } = useAuth();
  const { settings, updatePrint } = useSettings();

  const [printFormat, setPrintFormat] = useState<'A4' | 'Thermal'>(
    settings.print.paperSize?.includes('Thermal') ? 'Thermal' : 'A4'
  );
  const [showCustomizer, setShowCustomizer] = useState<boolean>(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Auto-print triggered via shortcut or quick print
  useEffect(() => {
    if (!isOpen || !invoice) return;
    if (autoPrint) {
      const timer = setTimeout(() => {
        if (printAreaRef.current) {
          printHtmlElement(printAreaRef.current, `Invoice_${invoice.invoiceNumber}`, printFormat === 'Thermal');
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, invoice, autoPrint, printFormat]);

  // Keyboard shortcut listener within print modal
  useEffect(() => {
    if (!isOpen) return;
    const handlePrintKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        if (printAreaRef.current && invoice) {
          printHtmlElement(printAreaRef.current, `Invoice_${invoice.invoiceNumber}`, printFormat === 'Thermal');
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handlePrintKeyDown);
    return () => window.removeEventListener('keydown', handlePrintKeyDown);
  }, [isOpen, invoice, printFormat, onClose]);

  if (!isOpen || !invoice) return null;

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const curr = settings.general.currencySymbol || 'Rs.';
  const printConf = settings.print;
  const activeThemeColor = printConf.themeColor || '#2563eb';

  const businessName = (printConf.showCompanyName && printConf.companyName) 
    ? printConf.companyName 
    : (business?.name || 'MBI INVENTRA');
  const businessAddress = (printConf.showAddress && printConf.address)
    ? printConf.address
    : (business?.address || 'MBI Corporate Plaza, Commercial Center, Lahore');
  const businessPhone = (printConf.showPhone && printConf.phone)
    ? printConf.phone
    : (business?.phone || '03364585863');
  const businessEmail = (printConf.showEmail && printConf.email)
    ? printConf.email
    : (business?.email || '');
  const businessTaxNo = business?.taxNumber || '4928172-9';
  const drugLicenseNo = business?.drugLicenseNo || 'DL-09-2024-MBI';

  const cols = printConf.tableColumns || {
    serialNo: true,
    itemName: true,
    hsnSac: false,
    batchNo: true,
    expDate: true,
    mfgDate: false,
    mrp: false,
    quantity: true,
    unit: true,
    price: true,
    discount: true,
    taxPercent: true,
    taxAmount: true,
    total: true,
  };

  const handlePrint = () => {
    if (printAreaRef.current) {
      printHtmlElement(printAreaRef.current, `Invoice_${invoice.invoiceNumber}`, printFormat === 'Thermal');
    } else {
      window.print();
    }
    emitToast('Print dialog opened', 'info');
  };

  const handleSavePDF = async () => {
    if (!printAreaRef.current) return;
    setIsExporting(true);
    try {
      const cleanCustomer = (invoice.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Invoice_${invoice.invoiceNumber || 'INV'}_${cleanCustomer}.pdf`;
      const { blob } = await captureElementAsPDF(printAreaRef.current, fileName, printFormat === 'Thermal');
      triggerFileDownload(blob, fileName);
      showStatus('PDF exported and downloaded!');
      emitToast('PDF invoice downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to export PDF visually, using direct vector PDF:', err);
      try {
        downloadSaleInvoicePDF(invoice, {
          name: businessName,
          address: businessAddress,
          phone: businessPhone,
          email: businessEmail,
          taxNumber: businessTaxNo,
          drugLicenseNo: drugLicenseNo,
          terms: printConf.termsAndConditions
        });
        showStatus('Vector PDF invoice downloaded!');
        emitToast('PDF invoice downloaded successfully', 'success');
      } catch (fallbackErr) {
        console.error('Fallback vector PDF failed:', fallbackErr);
        emitToast('Failed to export PDF. Please try again.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveJPG = async () => {
    if (!printAreaRef.current) return;
    setIsExporting(true);
    try {
      const cleanCustomer = (invoice.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Invoice_${invoice.invoiceNumber || 'INV'}_${cleanCustomer}.jpg`;
      const blob = await captureElementAsJPG(printAreaRef.current);
      triggerFileDownload(blob, fileName);
      showStatus('JPG image exported and downloaded!');
      emitToast('JPG invoice image downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to export JPG:', err);
      emitToast('Error exporting JPG image', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDirectJSPDF = () => {
    try {
      downloadSaleInvoicePDF(invoice, {
        name: businessName,
        address: businessAddress,
        phone: businessPhone,
        email: businessEmail,
        taxNumber: businessTaxNo,
        drugLicenseNo: drugLicenseNo,
        terms: printConf.termsAndConditions
      });
      showStatus('Professional jsPDF Invoice downloaded!');
      emitToast('Vector jsPDF invoice generated & downloaded', 'success');
    } catch (err) {
      console.error('Direct jsPDF error:', err);
      emitToast('Error generating jsPDF invoice', 'error');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-150">
          
          {/* Modal Header & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900 text-white border-b border-slate-800 print:hidden flex-shrink-0 gap-2">
            
            {/* Title & Format Switcher */}
            <div className="flex items-center gap-3">
              <div>
                <span className="font-bold text-sm block">Invoice #{invoice.invoiceNumber}</span>
                <span className="text-[11px] text-slate-400">{invoice.customerName}</span>
              </div>
              
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setPrintFormat('A4');
                    if (printConf.theme.startsWith('THERMAL')) {
                      updatePrint({ theme: 'A4_CLASSIC_TAX' });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    printFormat === 'A4' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Standard A4
                </button>
                <button
                  onClick={() => {
                    setPrintFormat('Thermal');
                    if (!printConf.theme.startsWith('THERMAL')) {
                      updatePrint({ theme: 'THERMAL_CLASSIC' });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    printFormat === 'Thermal' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3-Inch Thermal
                </button>
              </div>
            </div>

            {/* Actions: Customize Sidebar Toggle, jsPDF, Save PDF, JPG, Share, Print */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Customize Bar Toggle */}
              <button
                onClick={() => setShowCustomizer(!showCustomizer)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  showCustomizer 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Toggle Print Customization Bar"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showCustomizer ? 'Hide Customizer' : 'Customize Print'}</span>
              </button>

              {/* Direct Vector jsPDF */}
              <button
                onClick={handleDirectJSPDF}
                title="Download vector PDF invoice"
                className="hidden md:flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>jsPDF</span>
              </button>

              {/* Save PDF */}
              <button
                onClick={handleSavePDF}
                disabled={isExporting}
                title="Save document as PDF"
                className="flex items-center gap-1 bg-rose-700/90 hover:bg-rose-700 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Save PDF</span>
              </button>

              {/* Save JPG */}
              <button
                onClick={handleSaveJPG}
                disabled={isExporting}
                title="Save document as JPG image"
                className="hidden lg:flex items-center gap-1 bg-indigo-700/80 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                <span>Save JPG</span>
              </button>

              {/* Share PDF / JPG Modal */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                title="Share via WhatsApp or Email"
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              {/* Print Now */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors ml-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Toast */}
          {statusMsg && (
            <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Main Area: Split between Left Invoice Preview & Right Customization Bar */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-100">
            
            {/* =========================================================================
                LEFT SIDE: Real Invoice Preview (Changes live as user tweaks right bar)
                ========================================================================= */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
              
              {printFormat === 'A4' ? (
                /* Standard A4 Formats */
                <div 
                  ref={printAreaRef}
                  id="invoice-a4-document"
                  className={`printable-bill-root bg-white text-slate-900 w-full max-w-[760px] shadow-md border border-slate-300 rounded-sm select-text transition-all ${
                    printConf.theme === 'A4_MODERN_MINIMAL' ? 'p-8 sm:p-10 font-sans' :
                    printConf.theme === 'A4_CORPORATE_BOXED' ? 'p-6 sm:p-8 font-sans' :
                    printConf.theme === 'A4_COMPACT_PROFESSIONAL' ? 'p-5 sm:p-6 text-[11px] font-sans' :
                    'p-6 sm:p-8 font-sans'
                  }`}
                  style={{
                    fontSize: printConf.invoiceTextSize === 'Large' ? '13px' : printConf.invoiceTextSize === 'Small' ? '11px' : '12px'
                  }}
                >
                  
                  {/* Top Original Watermark */}
                  {printConf.printOriginalDuplicate && (
                    <div className="flex justify-between items-center text-xs pb-2 mb-3 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Template: {printConf.theme.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 border border-slate-300 rounded text-slate-700 bg-slate-50">
                        Original For Recipient (اصل کاپی)
                      </span>
                    </div>
                  )}

                  {/* Header Banner according to Theme */}
                  {printConf.theme === 'A4_CLASSIC_TAX' && (
                    <div 
                      className="p-5 rounded-xl text-white flex items-start justify-between gap-4 mb-4 shadow-sm"
                      style={{ backgroundColor: activeThemeColor }}
                    >
                      <div className="space-y-1 min-w-0">
                        <h1 className="text-xl font-black uppercase tracking-wide truncate">
                          {businessName}
                        </h1>
                        <p className="text-xs opacity-95">{businessAddress}</p>
                        <div className="flex flex-wrap gap-3 text-xs opacity-90 pt-0.5">
                          {businessPhone && <span>Phone: {businessPhone}</span>}
                          {businessEmail && <span>Email: {businessEmail}</span>}
                        </div>
                        <p className="text-[10.5px] opacity-90 font-mono">
                          NTN/GST: {businessTaxNo} | Drug Lic: {drugLicenseNo}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0 space-y-1">
                        <span className="text-xs font-black bg-white/20 px-3 py-1 rounded-lg uppercase tracking-wider block text-center border border-white/30">
                          {invoice.transactionType || printConf.transactionTitle || 'TAX INVOICE'}
                        </span>
                        <p className="text-xs font-mono font-bold">Inv #: {invoice.invoiceNumber}</p>
                        <p className="text-[11px] opacity-90">Date: {invoice.date.slice(0, 10)}</p>
                        <p className="text-[10px] opacity-85">Type: {invoice.paymentType || 'Cash'}</p>
                      </div>
                    </div>
                  )}

                  {printConf.theme === 'A4_PHARMA_WHOLESALE' && (
                    <div 
                      className="p-5 rounded-xl bg-white border-2 flex items-start justify-between gap-4 mb-4 shadow-sm border-l-8"
                      style={{ borderLeftColor: activeThemeColor, borderColor: `${activeThemeColor}30` }}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-white"
                            style={{ backgroundColor: activeThemeColor }}
                          >
                            PHARMACEUTICAL WHOLESALE DISTRIBUTOR
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            DRUG ACT 1976 COMPLIANT
                          </span>
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-wide text-slate-900">
                          {businessName}
                        </h1>
                        <p className="text-xs text-slate-600">{businessAddress}</p>
                        <p className="text-xs font-bold font-mono text-emerald-800">
                          Drug Lic #: {drugLicenseNo} | NTN: {businessTaxNo}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0 space-y-1">
                        <span 
                          className="text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider block text-center text-white"
                          style={{ backgroundColor: activeThemeColor }}
                        >
                          {invoice.transactionType || 'SALE TAX INVOICE'}
                        </span>
                        <p className="text-xs font-mono font-bold text-slate-900">Inv #: {invoice.invoiceNumber}</p>
                        <p className="text-[11px] text-slate-500">Date: {invoice.date.slice(0, 10)}</p>
                      </div>
                    </div>
                  )}

                  {printConf.theme === 'A4_MODERN_MINIMAL' && (
                    <div className="space-y-3 mb-4">
                      <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: activeThemeColor }}></div>
                      <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                        <div>
                          <h1 className="text-xl font-light tracking-wide uppercase text-slate-900">{businessName}</h1>
                          <p className="text-xs text-slate-500">{businessAddress}</p>
                          <p className="text-xs text-slate-500">Phone: {businessPhone}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold tracking-wider uppercase block" style={{ color: activeThemeColor }}>
                            {invoice.transactionType || 'INVOICE'}
                          </span>
                          <p className="text-xs font-mono font-bold text-slate-800">#{invoice.invoiceNumber}</p>
                          <p className="text-[11px] text-slate-400">{invoice.date.slice(0, 10)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {printConf.theme === 'A4_CORPORATE_BOXED' && (
                    <div 
                      className="p-4 rounded-xl border-2 flex items-start justify-between gap-4 mb-4 shadow-sm"
                      style={{ borderColor: activeThemeColor }}
                    >
                      <div>
                        <span 
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded text-white inline-block mb-1"
                          style={{ backgroundColor: activeThemeColor }}
                        >
                          CORPORATE BILLING
                        </span>
                        <h1 className="text-xl font-black uppercase text-slate-900">{businessName}</h1>
                        <p className="text-xs text-slate-600">{businessAddress}</p>
                      </div>
                      <div 
                        className="p-2.5 rounded-lg border text-right"
                        style={{ borderColor: `${activeThemeColor}40`, backgroundColor: `${activeThemeColor}0a` }}
                      >
                        <span className="text-xs font-black uppercase block" style={{ color: activeThemeColor }}>
                          {invoice.transactionType || 'INVOICE'}
                        </span>
                        <p className="text-xs font-mono font-bold text-slate-900">#{invoice.invoiceNumber}</p>
                        <p className="text-[10px] text-slate-500">{invoice.date.slice(0, 10)}</p>
                      </div>
                    </div>
                  )}

                  {printConf.theme === 'A4_COMPACT_PROFESSIONAL' && (
                    <div 
                      className="p-3 rounded-lg text-white flex items-center justify-between gap-4 mb-3"
                      style={{ backgroundColor: activeThemeColor }}
                    >
                      <div>
                        <h1 className="text-base font-black uppercase truncate">{businessName}</h1>
                        <p className="text-[10px] opacity-90">{businessAddress} | Ph: {businessPhone}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded uppercase block">
                          {invoice.transactionType || 'COMPACT INVOICE'}
                        </span>
                        <span className="text-[10px] font-mono">#{invoice.invoiceNumber}</span>
                      </div>
                    </div>
                  )}

                  {/* Bill To & Party Details */}
                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-200 text-xs mb-4">
                    <div>
                      <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block mb-1">
                        Billed To (خریدار):
                      </span>
                      <div className="font-bold text-sm text-slate-900">{invoice.customerName}</div>
                      {invoice.billingName && invoice.billingName !== invoice.customerName && (
                        <div className="text-slate-600">Attn: {invoice.billingName}</div>
                      )}
                      {invoice.customerPhone && (
                        <div className="text-slate-600 mt-0.5">Phone: {invoice.customerPhone}</div>
                      )}
                      {invoice.customerAddress && (
                        <div className="text-slate-600 mt-0.5">{invoice.customerAddress}</div>
                      )}
                    </div>

                    <div className="text-right flex flex-col justify-between">
                      <div>
                        <span className="text-slate-600">Payment Status: </span>
                        <strong className={invoice.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {invoice.balanceDue > 0 ? 'Unpaid / Credit' : 'Paid in Full'}
                        </strong>
                      </div>
                      {invoice.balanceDue > 0 && (
                        <div className="text-slate-600 text-xs mt-0.5">
                          Balance Due: <strong className="text-rose-700">{curr} {invoice.balanceDue.toLocaleString()}</strong>
                        </div>
                      )}
                      {printConf.currentPartyBalance && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Party Current Balance: <span className="font-mono font-bold text-slate-800">{curr} {(invoice.balanceDue || 0).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden mb-5 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr 
                          className="font-bold border-b border-slate-300 text-slate-800"
                          style={{ 
                            backgroundColor: printConf.theme === 'A4_MODERN_MINIMAL' 
                              ? '#f8fafc' 
                              : `${activeThemeColor}14`
                          }}
                        >
                          {cols.serialNo && <th className="p-2 text-center w-8">#</th>}
                          {cols.itemName && <th className="p-2">Item Description</th>}
                          {(cols.batchNo || invoice.isWarrantyBill) && <th className="p-2 text-center w-20">Batch</th>}
                          {(cols.expDate || invoice.isWarrantyBill) && <th className="p-2 text-center w-20">Exp</th>}
                          {cols.unit && <th className="p-2 text-center w-16">Unit</th>}
                          {cols.quantity && <th className="p-2 text-right w-14">Qty</th>}
                          {cols.price && <th className="p-2 text-right w-24">Price ({curr})</th>}
                          {cols.discount && <th className="p-2 text-right w-16">Disc %</th>}
                          {cols.taxPercent && <th className="p-2 text-right w-16">GST %</th>}
                          {cols.total && <th className="p-2 text-right w-28">Total ({curr})</th>}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        {invoice.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {cols.serialNo && <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>}
                            {cols.itemName && (
                              <td className="p-2 font-bold text-slate-900">
                                {item.name}
                                {item.batchNumber && !cols.batchNo && (
                                  <span className="block text-[10px] font-mono text-slate-400">
                                    Batch: {item.batchNumber} {item.expiryDate ? `| Exp: ${item.expiryDate}` : ''}
                                  </span>
                                )}
                              </td>
                            )}
                            {(cols.batchNo || invoice.isWarrantyBill) && (
                              <td className="p-2 text-center font-mono text-[11px] text-slate-600">
                                {item.batchNumber || '-'}
                              </td>
                            )}
                            {(cols.expDate || invoice.isWarrantyBill) && (
                              <td className="p-2 text-center font-mono text-[11px] text-slate-600">
                                {item.expiryDate ? item.expiryDate.slice(0, 7) : '-'}
                              </td>
                            )}
                            {cols.unit && <td className="p-2 text-center text-slate-600">{item.unit || 'Box'}</td>}
                            {cols.quantity && <td className="p-2 text-right font-bold text-slate-900">{item.quantity}</td>}
                            {cols.price && <td className="p-2 text-right font-mono">{(item.sellingPrice || item.pricePerUnit || 0).toLocaleString()}</td>}
                            {cols.discount && <td className="p-2 text-right font-mono text-emerald-700">{item.discountPercentage || 0}%</td>}
                            {cols.taxPercent && <td className="p-2 text-right font-mono">{item.taxPercentage || item.gstPercentage || 0}%</td>}
                            {cols.total && <td className="p-2 text-right font-bold font-mono text-slate-900">{item.total.toLocaleString()}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Totals */}
                  <div className="grid grid-cols-2 gap-6 pt-2 text-xs">
                    
                    {/* Left Notes, Bank Details & QR */}
                    <div className="space-y-2.5">
                      {printConf.printTerms && (
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1">
                          <span className="font-bold text-slate-700 block">Terms & Conditions:</span>
                          <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                            {printConf.termsAndConditions || invoice.description || 'Goods once sold will not be returned without original cash receipt.'}
                          </p>
                        </div>
                      )}

                      {printConf.printBankDetails && printConf.bankDetailsText && (
                        <div 
                          className="p-2.5 rounded-lg border text-[11px] space-y-0.5"
                          style={{ borderColor: `${activeThemeColor}30`, backgroundColor: `${activeThemeColor}06` }}
                        >
                          <span className="font-bold flex items-center gap-1" style={{ color: activeThemeColor }}>
                            <Landmark className="w-3.5 h-3.5" /> Bank Details for Payment:
                          </span>
                          <p className="whitespace-pre-line font-mono text-[10.5px] text-slate-700">
                            {printConf.bankDetailsText}
                          </p>
                        </div>
                      )}

                      {printConf.printQrCode && (
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="w-12 h-12 bg-white border border-slate-300 rounded flex items-center justify-center">
                            <QrCode className="w-9 h-9 text-slate-900" />
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Scan to Pay / Verify Invoice #{invoice.invoiceNumber}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Financial Calculation */}
                    <div className="space-y-1.5 font-medium">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-mono">{curr} {invoice.subTotal.toLocaleString()}</span>
                      </div>

                      {invoice.discountAmount && invoice.discountAmount > 0 ? (
                        <div className="flex justify-between text-emerald-700">
                          <span>Discount ({invoice.discountPercentage || 0}%):</span>
                          <span className="font-mono">- {curr} {invoice.discountAmount.toLocaleString()}</span>
                        </div>
                      ) : null}

                      {invoice.taxAmount && invoice.taxAmount > 0 ? (
                        <div className="flex justify-between text-slate-600">
                          <span>Tax / GST:</span>
                          <span className="font-mono">+ {curr} {invoice.taxAmount.toLocaleString()}</span>
                        </div>
                      ) : null}

                      {/* Grand Total Box (Uses active Theme Color) */}
                      <div 
                        className="flex justify-between text-sm font-black text-white p-2.5 rounded-lg shadow-xs"
                        style={{ backgroundColor: activeThemeColor }}
                      >
                        <span>Grand Total:</span>
                        <span className="font-mono text-base">{curr} {invoice.grandTotal.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-xs pt-1">
                        <span className="text-slate-600">Paid Amount:</span>
                        <span className="font-mono font-bold text-emerald-700">{curr} {invoice.receivedAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-xs border-t border-slate-200 pt-1 font-bold">
                        <span className="text-slate-700">Balance Due:</span>
                        <span className={`font-mono ${invoice.balanceDue > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                          {curr} {invoice.balanceDue.toLocaleString()}
                        </span>
                      </div>

                      {printConf.youSaved && invoice.discountAmount && invoice.discountAmount > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-1.5 rounded text-center font-bold text-[11px] mt-2">
                          🎉 Total Savings on this Bill: {curr} {invoice.discountAmount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signatures */}
                  {printConf.printSignatureText && (
                    <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
                      <div>
                        <div className="h-8 border-b border-dashed border-slate-400 mx-auto w-36"></div>
                        <span className="mt-1 block font-medium">Customer's Signature</span>
                      </div>
                      <div>
                        <div className="h-8 border-b border-dashed border-slate-400 mx-auto w-36"></div>
                        <span className="mt-1 block font-medium">
                          {printConf.signatureText || `For ${businessName}`}
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* -------------------------------------------------------------
                    3-Inch POS Thermal Receipt Format
                    ------------------------------------------------------------- */
                <div 
                  ref={printAreaRef}
                  id="invoice-thermal-document"
                  className="printable-bill-root bg-white border border-slate-300 p-4 rounded-sm shadow-sm w-[320px] text-slate-900 text-xs font-mono select-text"
                >
                  <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                    <div className="font-black text-sm uppercase">{businessName}</div>
                    <div className="text-[10px] text-slate-600">{businessAddress}</div>
                    <div className="text-[10px] text-slate-600">Tel: {businessPhone}</div>
                    {drugLicenseNo && (
                      <div className="text-[9.5px] text-emerald-800 font-bold mt-0.5">Drug Lic: {drugLicenseNo}</div>
                    )}
                    <div className="text-[10px] font-bold mt-1">*** {printConf.theme === 'THERMAL_PHARMA' ? 'PHARMA POS SLIP' : 'SALE INVOICE'} ***</div>
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
                    <div>Inv #: {invoice.invoiceNumber}</div>
                    <div>Date: {invoice.date.slice(0, 10)}</div>
                    <div>Customer: {invoice.customerName}</div>
                    <div>Payment: {invoice.paymentType}</div>
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-400">
                    <div className="flex justify-between font-bold text-[10px] pb-1">
                      <span>ITEM</span>
                      <span>QTY x PRICE</span>
                      <span>AMT</span>
                    </div>
                    {invoice.items.map((it, idx) => (
                      <div key={idx} className="text-[10px] py-1 border-b border-slate-100 last:border-0">
                        <div className="font-bold truncate">{it.name}</div>
                        {it.batchNumber && (
                          <div className="text-[9px] text-slate-500 font-sans">
                            Batch: {it.batchNumber} {it.expiryDate ? `| Exp: ${it.expiryDate.slice(0, 7)}` : ''}
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                          <span>{it.quantity} x {(it.sellingPrice || it.pricePerUnit || 0)}</span>
                          <span className="font-bold text-slate-900">{it.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-slate-400 font-bold">
                    <div className="flex justify-between">
                      <span>TOTAL:</span>
                      <span>{curr} {invoice.grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>PAID:</span>
                      <span>{curr} {invoice.receivedAmount.toLocaleString()}</span>
                    </div>
                    {invoice.balanceDue > 0 && (
                      <div className="flex justify-between text-rose-700">
                        <span>DUE:</span>
                        <span>{curr} {invoice.balanceDue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {printConf.printBankDetails && printConf.bankDetailsText && (
                    <div className="py-1.5 border-b border-dashed border-slate-400 text-[9.5px]">
                      <div className="font-bold">Bank Details:</div>
                      <div className="text-slate-600 whitespace-pre-line">{printConf.bankDetailsText}</div>
                    </div>
                  )}

                  <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
                    <div>{printConf.termsAndConditions || 'Thank you for your business!'}</div>
                    <div className="text-[9px] font-semibold text-slate-400">Theme: {printConf.theme}</div>
                    <div>Software by MBI Inventra</div>
                  </div>
                </div>
              )}

            </div>

            {/* =========================================================================
                RIGHT SIDE: Customization Bar (When Toggled Open)
                Allows on-the-fly theme, color, and column adjustments with LIVE updates!
                ========================================================================= */}
            {showCustomizer && (
              <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-4 overflow-y-auto space-y-4 flex-shrink-0 animate-in slide-in-from-right-4 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Quick Customize Bar</span>
                  </div>
                  <button 
                    onClick={() => setShowCustomizer(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>

                {/* Templates Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Template Design:</label>
                  <div className="space-y-1.5">
                    {(printFormat === 'A4' ? A4_TEMPLATES : THERMAL_THEMES).map(t => (
                      <button
                        key={t.id}
                        onClick={() => updatePrint({ theme: t.id })}
                        className={`w-full text-left p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                          printConf.theme === t.id 
                            ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900 ring-1 ring-blue-500/20' 
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{t.name}</span>
                          {printConf.theme === t.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                        <span className="text-[10px] font-normal text-slate-500 block">{t.style}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Color Palette */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">Color Theme:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {COLORS.map(c => (
                      <button
                        key={c.hex}
                        onClick={() => updatePrint({ themeColor: c.hex })}
                        className={`h-7 rounded-md border transition-all flex items-center justify-center cursor-pointer ${
                          activeThemeColor.toLowerCase() === c.hex.toLowerCase()
                            ? 'ring-2 ring-slate-900 border-white'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {activeThemeColor.toLowerCase() === c.hex.toLowerCase() && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column Toggles */}
                {printFormat === 'A4' && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 block">Table Columns:</label>
                    <div className="space-y-1 text-xs">
                      {[
                        { key: 'batchNo', label: 'Batch Number' },
                        { key: 'expDate', label: 'Expiry Date' },
                        { key: 'unit', label: 'Unit (Box/Pcs)' },
                        { key: 'discount', label: 'Discount %' },
                        { key: 'taxPercent', label: 'GST Tax %' },
                      ].map(col => (
                        <label key={col.key} className="flex items-center justify-between p-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                          <span className="text-[11px] text-slate-700">{col.label}</span>
                          <input
                            type="checkbox"
                            checked={(cols as any)[col.key]}
                            onChange={(e) => updatePrint({
                              tableColumns: {
                                ...printConf.tableColumns,
                                [col.key]: e.target.checked
                              }
                            })}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Toggles */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <label className="text-xs font-bold text-slate-700 block">Print Elements:</label>
                  <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                    <span className="text-[11px] text-slate-700">Bank Details</span>
                    <input
                      type="checkbox"
                      checked={printConf.printBankDetails}
                      onChange={(e) => updatePrint({ printBankDetails: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                    <span className="text-[11px] text-slate-700">QR Code Stamp</span>
                    <input
                      type="checkbox"
                      checked={printConf.printQrCode}
                      onChange={(e) => updatePrint({ printQrCode: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                    <span className="text-[11px] text-slate-700">Terms & Conditions</span>
                    <input
                      type="checkbox"
                      checked={printConf.printTerms}
                      onChange={(e) => updatePrint({ printTerms: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                    <span className="text-[11px] text-slate-700">Authorized Signature</span>
                    <input
                      type="checkbox"
                      checked={printConf.printSignatureText}
                      onChange={(e) => updatePrint({ printSignatureText: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                  </label>
                </div>

                <div className="pt-2 text-center">
                  <span className="text-[10px] text-slate-400">Settings save automatically as defaults</span>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Share Modal child */}
      <InvoiceShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        invoice={invoice}
      />
    </>
  );
};
