import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EventReport } from '../types';
import logoImg from '../assets/images/sgt_armas_logo_pdf.jpg';
import { formatDate } from './formatDate';

// Re-exportado para manter compatibilidade com quem ainda importa de pdfGenerator
export { formatDate };

// Helper to load logo image asynchronously for jsPDF
function loadLogoImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load logo image'));
    img.src = logoImg;
  });
}

// Generate PDF for a single report
export async function generateSingleReportPDF(report: EventReport) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Load logo image
  let logoElement: HTMLImageElement | null = null;
  try {
    logoElement = await loadLogoImage();
  } catch (err) {
    console.error('Logo image could not be loaded for PDF', err);
  }

  // Primary palette
  const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const secondaryColor: [number, number, number] = [71, 85, 105]; // Slate 600
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50
  const accentColor: [number, number, number] = [79, 70, 229]; // Indigo 600

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Add logo to Header Banner if loaded
  if (logoElement) {
    doc.addImage(logoElement, 'JPEG', pageWidth - margin - 25, 7.5, 25, 25);
  }

  // Title inside Banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RELATÓRIO SGT ARMAS CMD XXIX - IMC', margin, 18);

  // Subtitle/Logo text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('SISTEMA DE REGISTRO E GESTÃO DE RELATÓRIOS', margin, 25);

  // Date of PDF Generation in header
  const genDateStr = new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Emitido em: ${genDateStr}`, margin, 31);

  let currentY = 52;

  // 2. Event Title Block
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  
  // Wrap event title if too long
  const eventTitleLines = doc.splitTextToSize(report.evento.toUpperCase(), pageWidth - (margin * 2));
  doc.text(eventTitleLines, margin, currentY);
  currentY += (eventTitleLines.length * 7) + 3;

  // Decorative divider line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // 3. Metadata Grid (Key info fields)
  // We'll create a structured table for the basic fields using autoTable for perfect layout
  const metaData: any[][] = [
    [
      { content: 'Data do Evento:', styles: { fontStyle: 'bold', textColor: secondaryColor } },
      formatDate(report.data),
      { content: 'Horário:', styles: { fontStyle: 'bold', textColor: secondaryColor } },
      report.hora
    ],
    [
      { content: 'Local:', styles: { fontStyle: 'bold', textColor: secondaryColor } },
      report.local,
      { content: 'Responsável:', styles: { fontStyle: 'bold', textColor: secondaryColor } },
      report.responsavel
    ],
    [
      { content: 'Conferido por:', styles: { fontStyle: 'bold', textColor: secondaryColor } },
      report.conferidoPor || 'Não informado',
      '',
      ''
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: metaData,
    theme: 'plain',
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 10,
      cellPadding: 3,
      textColor: [15, 23, 42], // Slate 900
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 55 }
    },
    didDrawPage: (data) => {
      currentY = data.cursor ? data.cursor.y : currentY;
    }
  });

  currentY += 12;

  // 4. Participants Section
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PARTICIPANTES', margin, currentY);
  currentY += 4;

  const participantsLines = doc.splitTextToSize(report.participantes || 'Nenhum participante informado.', pageWidth - (margin * 2));
  const participantsHeight = (participantsLines.length * 5) + 6;

  // Draw light container for participants
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(241, 245, 249);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), participantsHeight, 1.5, 1.5, 'FD');
  
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(participantsLines, margin + 4, currentY + 6);

  currentY += participantsHeight + 10;

  // 5. Detailed Description Section
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DESCRIÇÃO DETALHADA', margin, currentY);
  currentY += 5;

  const descLines = doc.splitTextToSize(report.descricao || 'Nenhuma descrição detalhada informada.', pageWidth - (margin * 2));
  
  // Print detailed description text
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Calculate if it fits on this page, otherwise autoTable / manual page breaks would be needed
  // We can write it line by line or use splitTextToSize and loop over lines
  const lineHeight = 5.5;
  for (let i = 0; i < descLines.length; i++) {
    if (currentY + lineHeight > pageHeight - margin - 15) {
      // Add page and reset Y
      doc.addPage();
      currentY = margin + 10;
      
      // Page background banner on next page (smaller)
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 15, 'F');
      
      if (logoElement) {
        doc.addImage(logoElement, 'JPEG', pageWidth - margin - 10, 2.5, 10, 10);
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Relatório: ${report.evento.toUpperCase()}`, margin, 10);
      currentY = 25;
      
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }
    doc.text(descLines[i], margin, currentY);
    currentY += lineHeight;
  }

  // Footer decoration on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Gerado via Sistema de Relatórios de Eventos', margin, pageHeight - 10);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
  }

  // Save the PDF
  const filename = `relatorio_${report.evento.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${report.data}.pdf`;
  doc.save(filename);
  return doc;
}

// Generate a consolidated PDF table of multiple reports
export async function generateConsolidatedReportsPDF(reports: EventReport[]) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Load logo image
  let logoElement: HTMLImageElement | null = null;
  try {
    logoElement = await loadLogoImage();
  } catch (err) {
    console.error('Logo image could not be loaded for PDF', err);
  }

  const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const accentColor: [number, number, number] = [79, 70, 229]; // Indigo 600

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Add logo to Header Banner if loaded
  if (logoElement) {
    doc.addImage(logoElement, 'JPEG', pageWidth - margin - 22, 6.5, 22, 22);
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CONSOLIDADO DE RELATÓRIOS SGT ARMAS CMD XXIX', margin, 18);

  // Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const genDateStr = new Date().toLocaleDateString('pt-BR');
  doc.text(`Total de relatórios listados: ${reports.length}   |   Data de Emissão: ${genDateStr}`, margin, 26);

  // 2. Prepare Data Table
  const tableHeaders = [['Evento', 'Data / Hora', 'Local', 'Responsável', 'Conferido por', 'Resumo da Descrição']];
  
  const tableBody = reports.map(report => {
    // Truncate description for the table
    let descSummary = report.descricao || '';
    if (descSummary.length > 100) {
      descSummary = descSummary.substring(0, 97) + '...';
    }
    
    return [
      report.evento,
      `${formatDate(report.data)} às ${report.hora}`,
      report.local,
      report.responsavel,
      report.conferidoPor || 'Não informado',
      descSummary
    ];
  });

  // Render Table
  autoTable(doc, {
    startY: 45,
    head: tableHeaders,
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      valign: 'middle',
    },
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 35 },
      2: { cellWidth: 40 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
      5: { cellWidth: 75 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate 50
    },
    didDrawPage: (data) => {
      // Add footer to each page
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.text('Relatório Sgt Armas CMD XXIX - IMC', margin, pageHeight - 10);
      doc.text(`Página ${data.pageNumber}`, pageWidth - margin - 15, pageHeight - 10);
    }
  });

  // Save the PDF
  doc.save(`consolidado_relatorios_${new Date().toISOString().split('T')[0]}.pdf`);
  return doc;
}
