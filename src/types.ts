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
  fotoUrl?: string;       // URL de visualização da foto (Google Drive thumbnail)
  fotoDriveId?: string;   // ID do arquivo no Drive, para exclusão quando o relatório for removido
}
