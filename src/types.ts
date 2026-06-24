export interface EventReport {
  id: string;
  evento: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  local: string;
  participantes: string;
  descricao: string; // Descrição detalhada
  responsavel: string; // Quem fez o relatório
  conferidoPor: string; // Conferido por
  createdAt: number;
  userId?: string;
}
