import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Percent, ShieldAlert, Sliders, CheckCircle2 } from 'lucide-react';

export const PricingMarginTab: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const pricing = settings.pricing || {
    defaultProfitMargin: 22,
    pricingMethod: 'Markup on Cost',
    belowCostAction: 'Warning',
    costIncreaseAlerts: true,
    costIncreaseThreshold: 5,
  };

  const handleUpdate = (key: string, value: any) => {
    updateSettings({
      pricing: {
        ...pricing,
        [key]: value,
      },
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-slate-800">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Percent className="w-5 h-5 text-blue-600" />
          Pricing & Margin Configuration
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure default profit margins, markup vs gross margin rules, and below-cost sale behavior.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        
        {/* Default Profit Margin */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-800">
            Default Profit Margin (21% - 23%)
          </label>
          <p className="text-xs text-slate-500">
            Set the recommended default profit margin percentage applied when calculating retail selling prices or new item costs.
          </p>
          <div className="flex items-center gap-3">
            {[21, 22, 23].map((margin) => (
              <button
                key={margin}
                type="button"
                onClick={() => handleUpdate('defaultProfitMargin', margin)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  pricing.defaultProfitMargin === margin
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {margin}% Margin
              </button>
            ))}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Pricing Method */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-800">
            Pricing Calculation Method
          </label>
          <p className="text-xs text-slate-500">
            Choose whether recommended sale prices use Markup on Cost or True Gross Margin.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => handleUpdate('pricingMethod', 'Markup on Cost')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                pricing.pricingMethod === 'Markup on Cost'
                  ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 text-sm">Markup on Cost</span>
                {pricing.pricingMethod === 'Markup on Cost' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-500">
                Formula: Cost × (1 + Margin%)<br />
                Example: Rs 100 + 22% = Rs 122
              </p>
            </div>

            <div
              onClick={() => handleUpdate('pricingMethod', 'Gross Margin')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                pricing.pricingMethod === 'Gross Margin'
                  ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 text-sm">True Gross Margin</span>
                {pricing.pricingMethod === 'Gross Margin' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-500">
                Formula: Cost / (1 - Margin%)<br />
                Example: Rs 100 / (1 - 0.22) = Rs 128.21
              </p>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Below-Cost Sale Action */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-800">
            Below-Cost Sale Enforcement
          </label>
          <p className="text-xs text-slate-500">
            Determine system behavior when a selling price is lower than the weighted average cost.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => handleUpdate('belowCostAction', 'Warning')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                pricing.belowCostAction === 'Warning'
                  ? 'bg-amber-50/70 border-amber-500 ring-1 ring-amber-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 text-sm">Warning Only (Recommended)</span>
                {pricing.belowCostAction === 'Warning' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
              </div>
              <p className="text-xs text-slate-500">
                Display a strong warning dialog showing estimated loss per unit, but allow the user to continue if authorized.
              </p>
            </div>

            <div
              onClick={() => handleUpdate('belowCostAction', 'Block')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                pricing.belowCostAction === 'Block'
                  ? 'bg-rose-50/70 border-rose-600 ring-1 ring-rose-600'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 text-sm">Strictly Block Sale</span>
                {pricing.belowCostAction === 'Block' && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
              </div>
              <p className="text-xs text-slate-500">
                Prevent sale completion entirely until selling prices are corrected above cost.
              </p>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Cost Increase Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-bold text-slate-800 block">Purchase Cost Fluctuation Alerts</label>
              <p className="text-xs text-slate-500">Detect and alert when new purchase prices increase or decrease compared to history.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pricing.costIncreaseAlerts}
                onChange={(e) => handleUpdate('costIncreaseAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {pricing.costIncreaseAlerts && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Cost Increase Alert Threshold (%)</label>
              <div className="flex items-center gap-3">
                {[2, 5, 10, 20].map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => handleUpdate('costIncreaseThreshold', th)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      pricing.costIncreaseThreshold === th
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {th}% Threshold
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Triggers notices, warnings, or strong purchase alerts when unit purchase price fluctuates beyond this threshold.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
