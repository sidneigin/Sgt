import { EventReport } from '../types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Valida os campos essenciais de um relatório antes de ele ser gravado
// (seja vindo do formulário, de uma sincronização local, ou de qualquer outra origem).
// Isso evita que um dado malformado (ex: data inválida) seja salvo e quebre
// a renderização para outros usuários que compartilham a mesma lista.
export function validateEventReport(report: Partial<EventReport>): ValidationResult {
  const errors: string[] = [];

  if (!report.evento || !report.evento.trim()) {
    errors.push('O nome do evento é obrigatório.');
  }

  if (!report.data) {
    errors.push('A data do evento é obrigatória.');
  } else if (!DATE_REGEX.test(report.data)) {
    errors.push('A data do evento está em um formato inválido (esperado AAAA-MM-DD).');
  } else {
    // Verifica se é uma data real (ex: rejeita 2026-13-45)
    const [year, month, day] = report.data.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    const isRealDate =
      parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
    if (!isRealDate) {
      errors.push('A data do evento não é uma data válida.');
    }
  }

  if (!report.hora) {
    errors.push('O horário é obrigatório.');
  } else if (!TIME_REGEX.test(report.hora)) {
    errors.push('O horário está em um formato inválido (esperado HH:MM).');
  }

  if (!report.local || !report.local.trim()) {
    errors.push('O local é obrigatório.');
  }

  if (!report.descricao || !report.descricao.trim()) {
    errors.push('A descrição detalhada é obrigatória.');
  }

  if (!report.responsavel || !report.responsavel.trim()) {
    errors.push('O responsável é obrigatório.');
  }

  if (!report.conferidoPor || !report.conferidoPor.trim()) {
    errors.push('O conferente é obrigatório.');
  }

  // Limites de tamanho para evitar documentos excessivamente grandes
  // (proteção básica contra abuso e contra estourar limites do Firestore)
  if (report.descricao && report.descricao.length > 10000) {
    errors.push('A descrição detalhada excede o limite de 10.000 caracteres.');
  }
  if (report.participantes && report.participantes.length > 5000) {
    errors.push('A lista de participantes excede o limite de 5.000 caracteres.');
  }

  return { valid: errors.length === 0, errors };
}
