import jsPDF from 'jspdf';
import packageJson from '../../package.json';
import { formatCost, formatTokens } from './costCalculator';
import {
  CostLedgerEntry,
  CostLedgerTier,
  CostLedgerTotals,
  getCostLedgerTier,
} from './costLedgerData';
import { DateUtils } from './dateUtils';

interface ExportConversationCostLedgerPdfParams {
  conversationId: string;
  conversationTitle: string;
  costEntries: CostLedgerEntry[];
  totals: CostLedgerTotals;
  totalTier: CostLedgerTier;
}

export function exportConversationCostLedgerPdf({
  conversationId,
  conversationTitle,
  costEntries,
  totals,
  totalTier,
}: ExportConversationCostLedgerPdfParams) {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  const margin = 20;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = margin;

  const drawTableHeader = () => {
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);

    const colX = {
      timestamp: margin + 2,
      provider: margin + 35,
      input: margin + 90,
      output: margin + 125,
      total: margin + 160,
      duration: margin + 190,
      rate: margin + 215,
      cost: margin + 245,
    };

    pdf.text('Timestamp', colX.timestamp, yPosition + 5);
    pdf.text('Provider / Model', colX.provider, yPosition + 5);
    pdf.text('Input', colX.input, yPosition + 5);
    pdf.text('Output', colX.output, yPosition + 5);
    pdf.text('Total', colX.total, yPosition + 5);
    pdf.text('Duration', colX.duration, yPosition + 5);
    pdf.text('Tok/s', colX.rate, yPosition + 5);
    pdf.text('Cost', colX.cost, yPosition + 5);

    yPosition += 10;
    return colX;
  };

  const checkPageBreak = (requiredSpace: number, inTableRows = false) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      if (inTableRows) {
        drawTableHeader();
      }
      return true;
    }
    return false;
  };

  pdf.setFillColor(34, 197, 94);
  pdf.rect(0, 0, pageWidth, 45, 'F');

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Cost Ledger Report', margin, yPosition + 5);
  yPosition += 15;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Conversation: ${conversationTitle}`, margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(9);
  pdf.text(`Generated: ${DateUtils.formatDateTime(DateUtils.now())}`, margin, yPosition);
  yPosition += 8;

  pdf.text(`Total API Calls: ${costEntries.length}`, margin, yPosition);
  yPosition = 55;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary', margin, yPosition);
  yPosition += 10;

  pdf.setFillColor(249, 250, 251);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 45, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 45);

  yPosition += 8;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  let totalColor: [number, number, number];
  if (totalTier === 'low') {
    totalColor = [34, 197, 94];
  } else if (totalTier === 'medium') {
    totalColor = [251, 191, 36];
  } else {
    totalColor = [239, 68, 68];
  }

  pdf.text(`Total Cost:`, margin + 5, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(totalColor[0], totalColor[1], totalColor[2]);
  pdf.text(formatCost(totals.cost), margin + 50, yPosition);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');

  yPosition += 7;
  pdf.text(`Total Tokens:`, margin + 5, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${formatTokens(totals.totalTokens)} tokens`, margin + 50, yPosition);
  pdf.setFont('helvetica', 'normal');

  yPosition += 7;
  pdf.text(`Input Tokens:`, margin + 5, yPosition);
  pdf.text(
    `${formatTokens(totals.inputTokens)} (${formatCost(totals.inputCost)})`,
    margin + 50,
    yPosition
  );

  yPosition += 7;
  pdf.text(`Output Tokens:`, margin + 5, yPosition);
  pdf.text(
    `${formatTokens(totals.outputTokens)} (${formatCost(totals.outputCost)})`,
    margin + 50,
    yPosition
  );

  yPosition += 20;

  checkPageBreak(20);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Detailed Breakdown', margin, yPosition);
  yPosition += 10;

  const colX = drawTableHeader();

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  for (const entry of costEntries) {
    checkPageBreak(12, true);

    if (costEntries.indexOf(entry) % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 10, 'F');
    }

    pdf.text(DateUtils.formatMessageTimestamp(entry.timestamp), colX.timestamp, yPosition + 3);

    const providerText = `${entry.provider || 'Unknown'}`;
    const modelText = `${entry.model || 'Unknown'}`;
    pdf.text(providerText, colX.provider, yPosition + 2);
    pdf.setFontSize(6);
    pdf.setTextColor(100, 100, 100);
    pdf.text(modelText, colX.provider, yPosition + 5);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(7);

    pdf.text(`${formatTokens(entry.inputTokens)}`, colX.input, yPosition + 2);
    pdf.setFontSize(6);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`(${formatCost(entry.inputCost)})`, colX.input, yPosition + 5);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(7);

    pdf.text(`${formatTokens(entry.outputTokens)}`, colX.output, yPosition + 2);
    pdf.setFontSize(6);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`(${formatCost(entry.outputCost)})`, colX.output, yPosition + 5);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(7);

    pdf.text(`${formatTokens(entry.totalTokens)}`, colX.total, yPosition + 3);
    pdf.text(`${(entry.durationMs / 1000).toFixed(2)}s`, colX.duration, yPosition + 3);
    pdf.text(entry.tokensPerSecond.toFixed(0), colX.rate, yPosition + 3);

    const entryCost = entry.cost;
    const entryTier = getCostLedgerTier(entryCost);
    let entryColor: [number, number, number];
    if (entryTier === 'low') {
      entryColor = [34, 197, 94];
    } else if (entryTier === 'medium') {
      entryColor = [251, 191, 36];
    } else {
      entryColor = [239, 68, 68];
    }
    pdf.setTextColor(entryColor[0], entryColor[1], entryColor[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCost(entryCost), colX.cost, yPosition + 3);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');

    yPosition += 10;
  }

  checkPageBreak(15);
  yPosition += 5;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('TOTAL', colX.timestamp, yPosition);
  pdf.text(`${formatTokens(totals.inputTokens)}`, colX.input, yPosition);
  pdf.text(`${formatTokens(totals.outputTokens)}`, colX.output, yPosition);
  pdf.text(`${formatTokens(totals.totalTokens)}`, colX.total, yPosition);
  pdf.text('-', colX.duration, yPosition);
  pdf.text('-', colX.rate, yPosition);
  pdf.setTextColor(totalColor[0], totalColor[1], totalColor[2]);
  pdf.setFontSize(10);
  pdf.text(formatCost(totals.cost), colX.cost, yPosition);

  yPosition += 15;
  checkPageBreak(20);
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  const disclaimer =
    'Note: Costs are calculated based on provider pricing and token usage. Actual costs may vary due to tiered pricing or estimation methods.';
  const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - 2 * margin);
  pdf.text(disclaimerLines, margin, yPosition);

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, {
      align: 'center',
    });
    pdf.text(
      `Generated by Atticus - In-House AI Counsel v${packageJson.version}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  pdf.save(`atticus-${conversationId}-costledger-${Date.now()}.pdf`);
}
