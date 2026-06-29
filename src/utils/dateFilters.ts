import { EventReport } from '../types';

export type DateFilterMode = 'all' | 'quick' | 'month' | 'range';
export type QuickRange = 'today' | 'week' | 'month' | 'year';

export interface DateFilterState {
  mode: DateFilterMode;
  quickRange: QuickRange;
  // month mode: '2026-06' (YYYY-MM)
  monthValue: string;
  // range mode: YYYY-MM-DD strings
  rangeStart: string;
  rangeEnd: string;
}

export const defaultDateFilter: DateFilterState = {
  mode: 'all',
  quickRange: 'month',
  monthValue: '',
  rangeStart: '',
  rangeEnd: '',
};

// Helper: parse a YYYY-MM-DD string into a local Date at midnight (avoids UTC shift issues)
function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

// Returns the [start, end] local Date range (inclusive) for a quick range option
function getQuickRangeBounds(quickRange: QuickRange): [Date, Date] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (quickRange) {
    case 'today':
      return [startOfToday, endOfToday];
    case 'week': {
      // Monday-based week
      const dayOfWeek = (startOfToday.getDay() + 6) % 7; // 0 = Monday
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return [start, end];
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return [start, end];
    }
    case 'month':
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return [start, end];
    }
  }
}

// Applies a DateFilterState to a list of reports, returning only the matching ones
export function applyDateFilter(reports: EventReport[], filter: DateFilterState): EventReport[] {
  if (filter.mode === 'all') return reports;

  if (filter.mode === 'quick') {
    const [start, end] = getQuickRangeBounds(filter.quickRange);
    return reports.filter((r) => {
      const d = parseLocalDate(r.data);
      return d !== null && d >= start && d <= end;
    });
  }

  if (filter.mode === 'month') {
    if (!filter.monthValue) return reports;
    return reports.filter((r) => r.data && r.data.startsWith(filter.monthValue));
  }

  if (filter.mode === 'range') {
    const start = filter.rangeStart ? parseLocalDate(filter.rangeStart) : null;
    const end = filter.rangeEnd ? parseLocalDate(filter.rangeEnd) : null;
    return reports.filter((r) => {
      const d = parseLocalDate(r.data);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }

  return reports;
}

// Human-readable label describing the active filter (for UI display)
export function describeDateFilter(filter: DateFilterState): string {
  if (filter.mode === 'all') return 'Todos os períodos';
  if (filter.mode === 'quick') {
    const labels: Record<QuickRange, string> = {
      today: 'Hoje',
      week: 'Esta semana',
      month: 'Este mês',
      year: 'Este ano',
    };
    return labels[filter.quickRange];
  }
  if (filter.mode === 'month') {
    if (!filter.monthValue) return 'Selecione um mês';
    const [year, month] = filter.monthValue.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} de ${year}`;
  }
  if (filter.mode === 'range') {
    if (!filter.rangeStart && !filter.rangeEnd) return 'Selecione um período';
    const fmt = (s: string) => {
      const d = parseLocalDate(s);
      return d ? d.toLocaleDateString('pt-BR') : '';
    };
    if (filter.rangeStart && filter.rangeEnd) return `${fmt(filter.rangeStart)} até ${fmt(filter.rangeEnd)}`;
    if (filter.rangeStart) return `A partir de ${fmt(filter.rangeStart)}`;
    return `Até ${fmt(filter.rangeEnd)}`;
  }
  return '';
}
