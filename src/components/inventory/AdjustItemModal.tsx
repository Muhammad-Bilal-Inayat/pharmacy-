import React, { useState } from 'react';
import { Sliders, X, Plus, Minus, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Medicine, AuditLog } from '../../types';
import { dbMedicines, dbAuditLogs } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';

interface AdjustItemModalProps {
  isOpen: boolean;
  medicine: Medicine | null;
  onClose: () => void;
  onSuccess: (updatedMedicine: Medicine) => void;
}

export const AdjustItemModal: React.FC<AdjustItemModalProps> = ({
  isOpen,
  medicine,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !medicine) return null;

  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'REDUCE'>('ADD');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [unitPrice, setUnitPrice] = useState<number>(medicine.purchasePrice || 0);
  const [adjustDate, setAdjustDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState<string>('Stock Verification');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQty = medicine.quantity;
  const newQty = adjustmentType === 'ADD' 
    ? currentQty + Number(adjustQty || 0) 
    : currentQty - Number(adjustQty || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine || adjustQty <= 0) return;

    setIsSubmitting(true);
    try {
      const quantityDiff = adjustmentType === 'ADD' ? Number(adjustQty) : -Number(adjustQty);
      const updatedMedicine: Medicine = {
        ...medicine,
        quantity: newQty,
        purchasePrice: unitPrice > 0 ? unitPrice : medicine.purchasePrice,
        updatedAt: new Date().toISOString(),
      };

      await dbMedicines.save(updatedMedicine);

      // Create Audit Log
      const audit: AuditLog = {
        id: uuidv4(),
        date: new Date(adjustDate).toISOString(),
        action: 'ADJUST_STOCK',
        medicineId: medicine.id,
        medicineName: medicine.name,
        quantityChanged: quantityDiff,
        userId: 'admin',
        notes: `Adjustment: ${adjustmentType === 'ADD' ? '+' : '-'}${adjustQty} (${reason}${notes ? ` - ${notes}` : ''}) @ Rs ${unitPrice}`,
      };
      await dbAuditLogs.save(audit);

      onSuccess(updatedMedicine);
      onClose();
    } catch (err) {
      console.error('Failed to adjust item stock', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">Adjust Item Stock</h3>
              <p className="text-xs text-blue-100 font-medium truncate max-w-xs">{medicine.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Stock Banner */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-600">
            Current Stock: <span className={`font-bold font-mono text-sm ${currentQty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currentQty}</span>
          </div>
          <div className="text-slate-600">
            New Stock: <span className={`font-bold font-mono text-sm ${newQty >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>{newQty}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Action Type Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType('ADD')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  adjustmentType === 'ADD'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Plus className="w-4 h-4" />
                Add Stock (+)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('REDUCE')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  adjustmentType === 'REDUCE'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Minus className="w-4 h-4" />
                Reduce Stock (-)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Quantity */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Unit Price */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Cost / Unit Price (Rs)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Date</label>
              <input
                type="date"
                required
                value={adjustDate}
                onChange={(e) => setAdjustDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Cycle Count Physical Variance">Cycle Count Physical Variance</option>
                <option value="Stock Shortage / Discrepancy">Stock Shortage / Discrepancy</option>
                <option value="Stock Overage / Surplus">Stock Overage / Surplus</option>
                <option value="Damaged / Broken in Transit">Damaged / Broken in Transit</option>
                <option value="Expired Stock Quarantine">Expired Stock Quarantine</option>
                <option value="Theft / Unexplained Loss">Theft / Unexplained Loss</option>
                <option value="Counting Error Correction">Counting Error Correction</option>
                <option value="Supplier Short Shipment">Supplier Short Shipment</option>
                <option value="Internal Clinic / Hospital Use">Internal Clinic / Hospital Use</option>
                <option value="Customer Return Restock">Customer Return Restock</option>
                <option value="Opening Stock">Opening Stock Balance</option>
                <option value="Other">Other Reason</option>
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Remarks / Description</label>
            <input
              type="text"
              placeholder="e.g. Physical count reconciliation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Confirm Adjustment'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
