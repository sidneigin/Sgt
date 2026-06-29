import { useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { DateFilterState, QuickRange, describeDateFilter, defaultDateFilter } from '../utils/dateFilters';

interface DateFilterPanelProps {
  filter: DateFilterState;
  onChange: (filter: DateFilterState) => void;
}

const QUICK_OPTIONS: { value: QuickRange; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
];

export default function DateFilterPanel({ filter, onChange }: DateFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isActive = filter.mode !== 'all';

  const handleQuickSelect = (quickRange: QuickRange) => {
    onChange({ ...defaultDateFilter, mode: 'quick', quickRange });
  };

  const handleMonthChange = (monthValue: string) => {
    onChange({ ...defaultDateFilter, mode: 'month', monthValue });
  };

  const handleRangeChange = (field: 'rangeStart' | 'rangeEnd', value: string) => {
    onChange({ ...filter, mode: 'range', [field]: value });
  };

  const handleClear = () => {
    onChange(defaultDateFilter);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        id="btn-date-filter-toggle"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center gap-2 text-xs font-semibold py-2 px-3.5 rounded-xl border transition-all cursor-pointer ${
          isActive
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span className="max-w-[140px] truncate">{describeDateFilter(filter)}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Click-away backdrop. No mobile também escurece o fundo, como um modal. */}
          <div
            className="fixed inset-0 z-20 sm:bg-transparent bg-slate-900/30"
            onClick={() => setIsOpen(false)}
          />

          {/* Mobile: modal centralizado na tela. Desktop: dropdown ancorado no botão. */}
          <div
            className="fixed sm:absolute inset-x-4 sm:inset-x-auto top-1/2 sm:top-auto -translate-y-1/2 sm:translate-y-0 sm:right-0 sm:left-auto sm:mt-2 sm:w-72 z-30 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 space-y-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700">Filtrar por data</p>
              {isActive && (
                <button
                  onClick={handleClear}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Limpar
                </button>
              )}
            </div>

            {/* Quick shortcuts */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Atalhos rápidos</p>
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleQuickSelect(opt.value)}
                    className={`text-[11px] font-semibold py-1.5 rounded-lg transition-all cursor-pointer ${
                      filter.mode === 'quick' && filter.quickRange === opt.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific month/year */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mês específico</p>
              <input
                type="month"
                value={filter.mode === 'month' ? filter.monthValue : ''}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 outline-none focus:ring-3 transition-all"
              />
            </div>

            {/* Custom range */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Intervalo personalizado</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  placeholder="De"
                  value={filter.mode === 'range' ? filter.rangeStart : ''}
                  onChange={(e) => handleRangeChange('rangeStart', e.target.value)}
                  className="w-full px-2.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 outline-none focus:ring-3 transition-all"
                />
                <input
                  type="date"
                  placeholder="Até"
                  value={filter.mode === 'range' ? filter.rangeEnd : ''}
                  onChange={(e) => handleRangeChange('rangeEnd', e.target.value)}
                  className="w-full px-2.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 outline-none focus:ring-3 transition-all"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
