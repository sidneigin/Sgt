import { Eye, Edit3, Trash2, Calendar, MapPin, User, ChevronRight } from 'lucide-react';
import { EventReport } from '../types';
import { formatDate } from '../utils/formatDate';

interface ReportCardListProps {
  reports: EventReport[];
  selectedReportId: string | null;
  onSelectReport: (id: string) => void;
  onViewReport: (report: EventReport) => void;
  onLoadEditReport: (report: EventReport) => void;
  onRequestDelete: (report: EventReport) => void;
}

// Versão em cards da lista de relatórios, usada em telas estreitas (mobile),
// onde uma tabela com várias colunas fica ilegível e os alvos de toque ficam pequenos.
export default function ReportCardList({
  reports,
  selectedReportId,
  onSelectReport,
  onViewReport,
  onLoadEditReport,
  onRequestDelete,
}: ReportCardListProps) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {reports.map((report) => {
        const isSelected = report.id === selectedReportId;
        return (
          <div
            key={report.id}
            onClick={() => onSelectReport(report.id)}
            className={`rounded-xl border p-3 transition-all cursor-pointer ${
              isSelected
                ? 'border-indigo-200 bg-indigo-50/70'
                : 'border-slate-100 bg-white active:bg-slate-50'
            }`}
          >
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-semibold leading-snug ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                {report.evento}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewReport(report);
                }}
                className="shrink-0 p-2 -mr-1 -mt-1 rounded-lg text-slate-400 active:bg-slate-100"
                title="Visualizar em tela cheia"
                aria-label="Visualizar relatório completo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Meta info */}
            <div className="mt-1.5 flex flex-col gap-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {formatDate(report.data)} às {report.hora}
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{report.local}</span>
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{report.responsavel}</span>
              </span>
            </div>

            {/* Action buttons — sized for touch (min 44px tap target) */}
            <div
              className="mt-3 grid grid-cols-3 gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onViewReport(report)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-slate-100 active:bg-slate-200 text-slate-600 text-xs font-semibold"
              >
                <Eye className="w-4 h-4" />
                Ver
              </button>
              <button
                onClick={() => onLoadEditReport(report)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-indigo-50 active:bg-indigo-100 text-indigo-600 text-xs font-semibold"
              >
                <Edit3 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => onRequestDelete(report)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-rose-50 active:bg-rose-100 text-rose-600 text-xs font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
