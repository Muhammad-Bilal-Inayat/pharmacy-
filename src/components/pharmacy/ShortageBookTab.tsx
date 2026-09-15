import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Plus, Search, CheckCircle2, Clock, 
  Send, Trash2, ShoppingCart, Filter, Phone, User, 
  Sparkles, Download, FileText, ArrowRight
} from 'lucide-react';
import { ShortageItemRecord, Supplier } from '../../types';
import { dbShortageItems, dbSuppliers } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { sendShortageOrderViaWhatsApp } from '../common/WhatsAppReminders';
import { cn } from '../../lib/utils';

export const ShortageBookTab: React.FC = () => {
  const { business, activeRole } = useAuth();
  const [items, setItems] = useState<ShortageItemRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Ordered' | 'Fulfilled'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItemsForOrder, setSelectedItemsForOrder] = useState<string[]>([]);
  const [selectedDistributorPhone, setSelectedDistributorPhone] = useState('');
  const [selectedDistributorName, setSelectedDistributorName] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<ShortageItemRecord>>({
    medicineName: '',
    genericName: '',
    companyName: '',
    requestedQty: 1,
    customerName: '',
    customerPhone: '',
    urgency: 'Normal',
    estimatedPrice: 0,
    distributorName: '',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [allShortages, allSupps] = await Promise.all([
        dbShortageItems.getAll(),
        dbSuppliers.getAll()
      ]);
      setItems(allShortages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setSuppliers(allSupps.filter(s => s.partyType === 'Supplier'));
    } catch (e) {
      console.error('Error loading shortages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineName?.trim()) {
      alert('Please enter medicine name');
      return;
    }

    const newRecord: ShortageItemRecord = {
      id: `short-${Date.now()}`,
      medicineName: formData.medicineName.trim(),
      genericName: formData.genericName?.trim() || '',
      companyName: formData.companyName?.trim() || '',
      requestedQty: Number(formData.requestedQty) || 1,
      customerName: formData.customerName?.trim() || 'Walk-in Customer',
      customerPhone: formData.customerPhone?.trim() || '',
      urgency: formData.urgency || 'Normal',
      status: 'Pending',
      estimatedPrice: Number(formData.estimatedPrice) || 0,
      distributorName: formData.distributorName || '',
      notes: formData.notes?.trim() || '',
      recordedBy: activeRole,
      createdAt: new Date().toISOString()
    };

    await dbShortageItems.save(newRecord);
    setIsAddModalOpen(false);
    setFormData({
      medicineName: '',
      genericName: '',
      companyName: '',
      requestedQty: 1,
      customerName: '',
      customerPhone: '',
      urgency: 'Normal',
      estimatedPrice: 0,
      distributorName: '',
      notes: ''
    });
    await loadData();
  };

  const handleUpdateStatus = async (item: ShortageItemRecord, newStatus: ShortageItemRecord['status']) => {
    const updated: ShortageItemRecord = {
      ...item,
      status: newStatus,
      fulfilledAt: newStatus === 'Fulfilled' ? new Date().toISOString() : item.fulfilledAt
    };
    await dbShortageItems.save(updated);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this shortage entry?')) {
      await dbShortageItems.delete(id);
      await loadData();
    }
  };

  const toggleSelectForOrder = (id: string) => {
    setSelectedItemsForOrder(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSendWhatsAppOrder = () => {
    const orderItems = items.filter(it => selectedItemsForOrder.includes(it.id));
    if (orderItems.length === 0) {
      alert('Please select at least one item to send to distributor.');
      return;
    }

    sendShortageOrderViaWhatsApp({
      distributorName: selectedDistributorName || 'Distributor / Supplier',
      distributorPhone: selectedDistributorPhone,
      pharmacyName: business?.name || '3 Pharma',
      items: orderItems.map(it => ({
        name: `${it.medicineName} ${it.companyName ? `(${it.companyName})` : ''}`,
        qty: it.requestedQty,
        urgency: it.urgency
      }))
    });
  };

  // Filtered Items
  const filteredItems = items.filter(it => {
    const matchesSearch = 
      it.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (it.genericName && it.genericName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (it.customerName && it.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (it.companyName && it.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || it.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingItems = items.filter(i => i.status === 'Pending');
  const emergencyItems = items.filter(i => i.urgency === 'Emergency' && i.status === 'Pending');
  const totalLostSalesValue = items
    .filter(i => i.status !== 'Fulfilled' && i.estimatedPrice)
    .reduce((sum, i) => sum + ((i.estimatedPrice || 0) * i.requestedQty), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Demands</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{items.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Orders</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{pendingItems.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">🚨 Emergency Short</p>
            <p className="text-2xl font-black text-red-700 mt-1">{emergencyItems.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold animate-pulse">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Lost Demand Value</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">Rs. {totalLostSalesValue.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search medicine, customer name, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['All', 'Pending', 'Ordered', 'Fulfilled'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer",
                  statusFilter === tab
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Add Shortage Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Short Medicine (Demand)</span>
          </button>
        </div>

        {/* Bulk WhatsApp Order To Distributor Tool */}
        {selectedItemsForOrder.length > 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                {selectedItemsForOrder.length}
              </span>
              <span className="text-xs font-bold text-emerald-900">
                Items selected to dispatch as Purchase Order
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedDistributorPhone}
                onChange={(e) => {
                  setSelectedDistributorPhone(e.target.value);
                  const supp = suppliers.find(s => s.phone === e.target.value);
                  setSelectedDistributorName(supp ? supp.name : '');
                }}
                className="text-xs bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1 sm:flex-initial"
              >
                <option value="">-- Choose Distributor --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.phone}>
                    {s.name} ({s.phone || 'No phone'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSendWhatsAppOrder}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send via WhatsApp (Free)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table of Shortage Items */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedItemsForOrder.length > 0 && selectedItemsForOrder.length === filteredItems.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItemsForOrder(filteredItems.map(i => i.id));
                      } else {
                        setSelectedItemsForOrder([]);
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-3">Medicine & Salt</th>
                <th className="p-3">Qty Demanded</th>
                <th className="p-3">Customer / Phone</th>
                <th className="p-3">Urgency</th>
                <th className="p-3">Distributor</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Loading shortage items...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <p className="font-bold text-slate-600">No shortage records found</p>
                    <p className="text-[11px] mt-1">When customers demand medicines out-of-stock, add them here to track lost demand!</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedItemsForOrder.includes(item.id)}
                        onChange={() => toggleSelectForOrder(item.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{item.medicineName}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.genericName ? `Salt: ${item.genericName}` : ''} {item.companyName ? `• ${item.companyName}` : ''}
                      </p>
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {item.requestedQty} Packs
                      {item.estimatedPrice ? (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          ~Rs. {(item.estimatedPrice * item.requestedQty).toLocaleString()}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{item.customerName || 'Walk-in'}</p>
                      {item.customerPhone ? (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" /> {item.customerPhone}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        item.urgency === 'Emergency' ? "bg-red-100 text-red-700 animate-pulse" :
                        item.urgency === 'High' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {item.urgency}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {item.distributorName || 'Any Vendor'}
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1",
                        item.status === 'Fulfilled' ? "bg-emerald-100 text-emerald-800" :
                        item.status === 'Ordered' ? "bg-blue-100 text-blue-800" :
                        "bg-amber-100 text-amber-800"
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status !== 'Fulfilled' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item, 'Fulfilled')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold flex items-center gap-1"
                            title="Mark as Arrived / Fulfilled"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Fulfilled</span>
                          </button>
                        ) : null}

                        {item.status === 'Pending' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item, 'Ordered')}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold"
                            title="Mark as Ordered"
                          >
                            Ordered
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shortage Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Out-of-Stock Demand</h3>
                  <p className="text-[11px] text-slate-500">Add medicine customer requested that is short in stock</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Augmentin 625mg, Panadol CF, Xanax 0.5mg"
                  value={formData.medicineName}
                  onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Generic / Formula</label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxicillin + Clavulanic"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company / Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. GSK, Getz, Searle"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity Needed (Packs)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.requestedQty}
                    onChange={(e) => setFormData({ ...formData, requestedQty: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Urgency Level</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  >
                    <option value="Normal">Normal Demand</option>
                    <option value="High">High Demand</option>
                    <option value="Emergency">🚨 Emergency (Patient waiting)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Customer name (optional)"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    placeholder="03001234567"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Unit Price (Rs.)</label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={formData.estimatedPrice || ''}
                    onChange={(e) => setFormData({ ...formData, estimatedPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preferred Distributor</label>
                  <select
                    value={formData.distributorName}
                    onChange={(e) => setFormData({ ...formData, distributorName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Any Vendor / Distributor</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Customer needs this by evening"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Short Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
