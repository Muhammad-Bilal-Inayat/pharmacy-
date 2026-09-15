import React, { useEffect, useState } from 'react';
import { dbInvoices, dbPurchaseOrders } from '../../lib/db';
import { Clock, Check } from 'lucide-react';

interface HistoricalPriceDropdownProps {
  medicineId?: string;
  itemName: string;
  transactionType: 'Sale' | 'Purchase';
  currentPrice: number;
  onSelectPrice: (price: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const HistoricalPriceDropdown: React.FC<HistoricalPriceDropdownProps> = ({
  medicineId,
  itemName,
  transactionType,
  currentPrice,
  onSelectPrice,
  isOpen,
  onClose,
}) => {
  const [recentPrices, setRecentPrices] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || (!medicineId && !itemName)) return;

    const fetchHistoricalPrices = async () => {
      setLoading(true);
      try {
        const pricesSet = new Set<number>();
        const queryName = itemName.toLowerCase().trim();

        if (transactionType === 'Sale') {
          const invoices = await dbInvoices.getAll();
          for (const inv of invoices) {
            if (inv.items && Array.isArray(inv.items)) {
              for (const it of inv.items) {
                const matchesId = medicineId && it.medicineId === medicineId;
                const matchesName = it.name && it.name.toLowerCase().trim() === queryName;
                if (matchesId || matchesName) {
                  const price = Number(it.pricePerUnit !== undefined ? it.pricePerUnit : it.sellingPrice) || 0;
                  if (price > 0) {
                    pricesSet.add(price);
                    if (pricesSet.size >= 5) break;
                  }
                }
              }
            }
            if (pricesSet.size >= 5) break;
          }
        } else {
          const purchaseOrders = await dbPurchaseOrders.getAll();
          for (const po of purchaseOrders) {
            if (po.items && Array.isArray(po.items)) {
              for (const it of po.items) {
                const matchesId = medicineId && it.medicineId === medicineId;
                const matchesName = it.name && it.name.toLowerCase().trim() === queryName;
                if (matchesId || matchesName) {
                  const price = Number(it.purchasePrice || 0);
                  if (price > 0) {
                    pricesSet.add(price);
                    if (pricesSet.size >= 5) break;
                  }
                }
              }
            }
            if (pricesSet.size >= 5) break;
          }
        }

        setRecentPrices(Array.from(pricesSet).slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch historical prices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalPrices();
  }, [isOpen, medicineId, itemName, transactionType]);

  if (!isOpen || (!medicineId && !itemName)) return null;

  return (
    <div 
      className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-2 w-52 text-left animate-in fade-in zoom-in-95 duration-150"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="text-[11px] font-bold text-slate-500 px-2 py-1 border-b border-slate-100 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          Recent {transactionType === 'Sale' ? 'Sale' : 'Purchase'} Prices
        </span>
        <span className="text-[9px] text-blue-600 font-semibold">Click to apply</span>
      </div>

      <div className="mt-1 space-y-0.5">
        {loading ? (
          <div className="text-[11px] text-slate-400 p-2 text-center italic">Loading history...</div>
        ) : recentPrices.length === 0 ? (
          <div className="text-[11px] text-slate-400 p-2 text-center italic">No historical prices found</div>
        ) : (
          recentPrices.map((price, idx) => {
            const isSelected = Math.abs(currentPrice - price) < 0.001;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectPrice(price);
                  onClose();
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg flex items-center justify-between font-mono font-bold transition-colors cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Rs {price.toLocaleString()}</span>
                {idx === 0 && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-sans font-semibold">
                    Latest
                  </span>
                )}
                {isSelected && idx !== 0 && <Check className="w-3 h-3 text-blue-600" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
