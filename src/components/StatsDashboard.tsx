import { useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, FileText, Users, CalendarDays } from 'lucide-react';
import { EventReport } from '../types';

interface StatsDashboardProps {
  reports: EventReport[];
  totalUnfiltered: number;
  isFiltered: boolean;
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export default function StatsDashboard({ reports, totalUnfiltered, isFiltered }: StatsDashboardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const stats = useMemo(() => {
    // Contagem por mês (YYYY-MM -> count), ordenado cronologicamente
    const byMonthMap = new Map<string, number>();
    // Contagem por responsável
    const byResponsavelMap = new Map<string, number>();

    for (const report of reports) {
      if (report.data) {
        const monthKey = report.data.slice(0, 7); // YYYY-MM
        byMonthMap.set(monthKey, (byMonthMap.get(monthKey) || 0) + 1);
      }
      const responsavel = report.responsavel?.trim() || 'Não informado';
      byResponsavelMap.set(responsavel, (byResponsavelMap.get(responsavel) || 0) + 1);
    }

    const byMonth = Array.from(byMonthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const [year, month] = key.split('-');
        const idx = parseInt(month, 10) - 1;
        return { key, label: `${MONTH_NAMES_SHORT[idx] || month}/${year.slice(2)}`, count };
      });

    const byResponsavel = Array.from(byResponsavelMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6); // top 6

    const maxMonthCount = byMonth.reduce((max, m) => Math.max(max, m.count), 0);
    const maxResponsavelCount = byResponsavel.reduce((max, [, c]) => Math.max(max, c), 0);

    return { byMonth, byResponsavel, maxMonthCount, maxResponsavelCount };
  }, [reports]);

  return (
    <div className="col-span-12 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
      {/* Header / Toggle */}
      <button
        id="btn-toggle-dashboard"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-800">
              Estatísticas {isFiltered ? '(período filtrado)' : ''}
            </p>
            <p className="text-[11px] text-slate-400">
              {reports.length} {reports.length === 1 ? 'relatório' : 'relatórios'}
              {isFiltered ? ` de ${totalUnfiltered} no total` : ''}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-5">
          {reports.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              Nenhum relatório no período selecionado para gerar estatísticas.
            </p>
          ) : (
            <>
              {/* Top summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Total</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{reports.length}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Meses ativos</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{stats.byMonth.length}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Responsáveis</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{stats.byResponsavel.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Por mês */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Eventos por mês</p>
                  <div className="space-y-1.5">
                    {stats.byMonth.map((m) => (
                      <div key={m.key} className="flex items-center gap-2 text-xs">
                        <span className="w-10 text-slate-500 font-medium shrink-0">{m.label}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all"
                            style={{ width: `${stats.maxMonthCount ? (m.count / stats.maxMonthCount) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-slate-600 font-semibold shrink-0">{m.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Por responsável */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Por responsável (top 6)</p>
                  <div className="space-y-1.5">
                    {stats.byResponsavel.map(([name, count]) => (
                      <div key={name} className="flex items-center gap-2 text-xs">
                        <span className="w-24 text-slate-500 font-medium truncate shrink-0" title={name}>
                          {name}
                        </span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${stats.maxResponsavelCount ? (count / stats.maxResponsavelCount) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-slate-600 font-semibold shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
