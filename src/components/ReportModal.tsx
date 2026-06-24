import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, MapPin, User, Users, FileText, X, FileDown, ShieldCheck, Cloud, RefreshCw } from 'lucide-react';
import { EventReport } from '../types';
import { formatDate, generateSingleReportPDF } from '../utils/pdfGenerator';

interface ReportModalProps {
  report: EventReport | null;
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSaveToDrive?: (report: EventReport) => Promise<void>;
  isUploadingToDrive?: string | null;
}

export default function ReportModal({ 
  report, 
  isOpen, 
  onClose,
  user,
  onSaveToDrive,
  isUploadingToDrive
}: ReportModalProps) {
  if (!report) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
            id="report-detail-modal"
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100"
          >
            {/* Header / Accent top bar */}
            <div className="bg-slate-800 px-6 py-5 text-white flex items-start justify-between">
              <div>
                <span className="text-xs font-mono tracking-widest text-indigo-400 uppercase">
                  Visualização de Relatório
                </span>
                <h3 className="text-lg font-bold font-sans tracking-tight leading-tight mt-1">
                  {report.evento}
                </h3>
              </div>
              <button
                id="close-modal-button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 max-h-[70vh] overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Data</p>
                    <p className="text-sm font-medium">{formatDate(report.data)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Hora</p>
                    <p className="text-sm font-medium">{report.hora}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Local</p>
                    <p className="text-sm font-medium">{report.local}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Responsável</p>
                    <p className="text-sm font-medium">{report.responsavel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Conferido por</p>
                    <p className="text-sm font-medium">{report.conferidoPor || <span className="text-slate-400 italic">Não informado</span>}</p>
                  </div>
                </div>
              </div>

              {/* Participants Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Users className="w-4 h-4 text-slate-500" />
                  <h4>Participantes</h4>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {report.participantes || <span className="text-slate-400 italic">Nenhum participante informado.</span>}
                </div>
              </div>

              {/* Detailed Description Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h4>Descrição Detalhada</h4>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {report.descricao || <span className="text-slate-400 italic">Nenhuma descrição detalhada informada.</span>}
                </div>
              </div>
            </div>

             {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:justify-end gap-2 border-t border-slate-100">
              {user && onSaveToDrive && (
                <button
                  id="modal-gdrive-button"
                  onClick={() => onSaveToDrive(report)}
                  disabled={isUploadingToDrive === report.id}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  {isUploadingToDrive === report.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  {isUploadingToDrive === report.id ? 'Salvando...' : 'Salvar no Google Drive'}
                </button>
              )}
              <button
                id="modal-pdf-button"
                onClick={() => generateSingleReportPDF(report)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                Gerar PDF deste relatório
              </button>
              <button
                id="modal-close-footer-button"
                onClick={onClose}
                className="w-full sm:w-auto bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer text-center"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
