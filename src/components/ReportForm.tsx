import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Users, FileText, CheckCircle, RotateCcw, AlertCircle, Sparkles } from 'lucide-react';
import { EventReport } from '../types';
import logoImg from '../assets/images/sgt_armas_logo_ui.jpg';

interface ReportFormProps {
  editingReport: EventReport | null;
  onSave: (reportData: Omit<EventReport, 'id' | 'createdAt'>) => void;
  onCancelEdit: () => void;
}

export default function ReportForm({ editingReport, onSave, onCancelEdit }: ReportFormProps) {
  const [evento, setEvento] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [local, setLocal] = useState('');
  const [participantes, setParticipantes] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [conferidoPor, setConferidoPor] = useState('');
  
  // Validation errors state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showSuccessHint, setShowSuccessHint] = useState(false);

  // Set form fields if editingReport is provided
  useEffect(() => {
    if (editingReport) {
      setEvento(editingReport.evento);
      setData(editingReport.data);
      setHora(editingReport.hora);
      setLocal(editingReport.local);
      setParticipantes(editingReport.participantes);
      setDescricao(editingReport.descricao);
      setResponsavel(editingReport.responsavel);
      setConferidoPor(editingReport.conferidoPor || '');
      setErrors({});
    } else {
      clearForm();
    }
  }, [editingReport]);

  const clearForm = () => {
    setEvento('');
    setData('');
    setHora('');
    setLocal('');
    setParticipantes('');
    setDescricao('');
    setResponsavel('');
    setConferidoPor('');
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!evento.trim()) newErrors.evento = 'O nome do evento é obrigatório.';
    if (!data) {
      newErrors.data = 'A data do evento é obrigatória.';
    } else {
      const [year, month, day] = data.split('-').map(Number);
      const parsed = new Date(year, month - 1, day);
      const isRealDate =
        parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
      if (!isRealDate) newErrors.data = 'A data informada não é válida.';
    }
    if (!hora) newErrors.hora = 'O horário é obrigatório.';
    if (!local.trim()) newErrors.local = 'O local é obrigatório.';
    if (!descricao.trim()) {
      newErrors.descricao = 'A descrição detalhada é obrigatória.';
    } else if (descricao.length > 10000) {
      newErrors.descricao = `A descrição excede o limite de 10.000 caracteres (atual: ${descricao.length}).`;
    }
    if (participantes.length > 5000) {
      newErrors.participantes = `A lista de participantes excede o limite de 5.000 caracteres (atual: ${participantes.length}).`;
    }
    if (!responsavel.trim()) newErrors.responsavel = 'O responsável é obrigatório.';
    if (!conferidoPor.trim()) newErrors.conferidoPor = 'O conferente é obrigatório.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      evento: evento.trim(),
      data,
      hora,
      local: local.trim(),
      participantes: participantes.trim(),
      descricao: descricao.trim(),
      responsavel: responsavel.trim(),
      conferidoPor: conferidoPor.trim(),
    });

    if (!editingReport) {
      // Show short success hint
      setShowSuccessHint(true);
      setTimeout(() => setShowSuccessHint(false), 3000);
      clearForm();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 flex flex-col md:h-full md:overflow-hidden">
      {/* Form Header */}
      <div className="mb-5 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 shadow-xs">
            <img 
              src={logoImg} 
              alt="Insanos MC Logo" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans tracking-tight text-slate-800">
              {editingReport ? 'Editar Relatório' : 'Participação - Contenção - Sgt Armas'}
            </h2>
            <p className="text-xs text-slate-400">
              {editingReport ? 'Altere os campos para atualizar os dados.' : 'Preencha os campos abaixo e clique em Salvar.'}
            </p>
          </div>
        </div>
      </div>

      {/* Form container scrollable */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
        {/* Success Hint */}
        {showSuccessHint && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Relatório salvo com sucesso no banco de dados local!</span>
          </div>
        )}

        {/* Evento */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 block">Evento *</label>
          <div className="relative">
            <input
              type="text"
              id="input-evento"
              value={evento}
              onChange={(e) => setEvento(e.target.value)}
              placeholder="Ex: Reunião Geral de Alinhamento"
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                errors.evento ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
              } outline-none focus:ring-3 transition-all`}
            />
            <Sparkles className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          {errors.evento && (
            <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.evento}
            </p>
          )}
        </div>

        {/* Grid para Data e Hora */}
        <div className="grid grid-cols-2 gap-3">
          {/* Data */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 block">Data *</label>
            <div className="relative">
              <input
                type="date"
                id="input-data"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={`w-full pl-9 pr-2 py-2 text-sm rounded-xl border ${
                  errors.data ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                } outline-none focus:ring-3 transition-all`}
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
            {errors.data && (
              <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.data}
              </p>
            )}
          </div>

          {/* Hora */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 block">Hora *</label>
            <div className="relative">
              <input
                type="time"
                id="input-hora"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className={`w-full pl-9 pr-2 py-2 text-sm rounded-xl border ${
                  errors.hora ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                } outline-none focus:ring-3 transition-all`}
              />
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
            {errors.hora && (
              <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.hora}
              </p>
            )}
          </div>
        </div>

        {/* Local */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 block">Local *</label>
          <div className="relative">
            <input
              type="text"
              id="input-local"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Ex: Sala de Reuniões A ou Auditório Principal"
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                errors.local ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
              } outline-none focus:ring-3 transition-all`}
            />
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          {errors.local && (
            <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.local}
            </p>
          )}
        </div>

        {/* Participantes */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 block">Participantes</label>
          <div className="relative">
            <textarea
              id="input-participantes"
              value={participantes}
              onChange={(e) => setParticipantes(e.target.value)}
              placeholder="Ex: Sidnei Bogas, Ana Souza, Carlos Eduardo..."
              rows={2}
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                errors.participantes ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
              } outline-none focus:ring-3 transition-all resize-none`}
            />
            <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          {errors.participantes && (
            <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.participantes}
            </p>
          )}
        </div>

        {/* Descrição Detalhada */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 block">Descrição detalhada *</label>
          <div className="relative flex-1">
            <textarea
              id="input-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Escreva os pontos discutidos, decisões e próximas etapas com detalhes..."
              rows={4}
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                errors.descricao ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
              } outline-none focus:ring-3 transition-all resize-y min-h-[100px]`}
            />
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          {errors.descricao && (
            <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.descricao}
            </p>
          )}
        </div>

        {/* Responsável - Quem fez o relatório */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 block">Quem fez o relatório (Responsável) *</label>
          <div className="relative">
            <input
              type="text"
              id="input-responsavel"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Nome do responsável"
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                errors.responsavel ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
              } outline-none focus:ring-3 transition-all`}
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          {errors.responsavel && (
            <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.responsavel}
            </p>
          )}
        </div>

        {/* Conferido por */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 block">Conferido por *</label>
          <div className="relative">
            <input
              type="text"
              id="input-conferido-por"
              value={conferidoPor}
              onChange={(e) => setConferidoPor(e.target.value)}
              placeholder="Nome de quem conferiu o relatório"
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                errors.conferidoPor ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
              } outline-none focus:ring-3 transition-all`}
            />
            <CheckCircle className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          {errors.conferidoPor && (
            <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.conferidoPor}
            </p>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          {editingReport ? (
            <>
              <button
                type="submit"
                id="form-submit-update"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-50 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Atualizar
              </button>
              <button
                type="button"
                id="form-cancel-edit"
                onClick={onCancelEdit}
                className="bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-600 border border-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Cancelar
              </button>
            </>
          ) : (
            <div className="flex gap-2 w-full">
              <button
                type="submit"
                id="form-submit-save"
                className="flex-[2] bg-slate-800 hover:bg-slate-900 active:bg-black text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Salvar Relatório
              </button>
              <button
                type="button"
                id="form-clear-fields"
                onClick={clearForm}
                className="flex-1 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                title="Limpar todos os campos do formulário"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Limpar
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
