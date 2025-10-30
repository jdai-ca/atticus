import jsPDF from 'jspdf';
import { Conversation, Message } from '../types';
import { DateUtils } from './dateUtils';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function addPDFHeader(pdf: jsPDF, conversation: Conversation, margin: number, pageWidth: number): number {
  let yPosition = margin;

  // Header with background
  pdf.setFillColor(245, 248, 255);
  pdf.rect(0, 0, pageWidth, 50, 'F');

  // Title
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 60, 120);
  pdf.text('Atticus - In-House AI Counsel', margin, yPosition);
  yPosition += 12;

  // Conversation title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(conversation.title, margin, yPosition);
  yPosition += 10;

  // Metadata section
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);

  const dateStr = DateUtils.formatDateTime(conversation.createdAt);
  pdf.text(`Created: ${dateStr}`, margin, yPosition);
  yPosition += 5;

  if (conversation.practiceArea) {
    pdf.text(`Practice Area: ${conversation.practiceArea}`, margin, yPosition);
    yPosition += 5;
  }

  // Show AI models used
  if (conversation.selectedModels && conversation.selectedModels.length > 0) {
    const models = conversation.selectedModels
      .map(m => `${m.providerId}/${m.modelId}`)
      .join(', ');
    pdf.text(`AI Models: ${models}`, margin, yPosition);
    yPosition += 5;
  } else if (conversation.provider) {
    const modelInfo = conversation.model ? ` (${conversation.model})` : '';
    pdf.text(`Provider: ${conversation.provider}${modelInfo}`, margin, yPosition);
    yPosition += 5;
  }

  // Show jurisdictions if specified
  if (conversation.selectedJurisdictions && conversation.selectedJurisdictions.length > 0) {
    pdf.text(`Jurisdictions: ${conversation.selectedJurisdictions.join(', ')}`, margin, yPosition);
    yPosition += 5;
  }

  pdf.setTextColor(0, 0, 0);
  yPosition += 6;
  return yPosition;
}

function addMessageAttachments(pdf: jsPDF, attachments: Array<{ name: string; size: number }>, margin: number, pageHeight: number, yPosition: number): number {
  let y = yPosition + 3;
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);

  for (const attachment of attachments) {
    if (y > pageHeight - 20) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(`📎 ${attachment.name} (${formatFileSize(attachment.size)})`, margin + 5, y);
    y += 5;
  }

  pdf.setTextColor(0, 0, 0);
  return y;
}

interface MessagePDFOptions {
  pdf: jsPDF;
  message: Message;
  margin: number;
  maxWidth: number;
  pageWidth: number;
  pageHeight: number;
  yPosition: number;
  prevModelInfo?: Message['modelInfo'];
}

function addPDFMessage(options: MessagePDFOptions): number {
  const { pdf, message, margin, maxWidth, pageWidth, pageHeight, yPosition, prevModelInfo } = options;
  let y = yPosition;

  // Check if this is a new model responding (for multi-model conversations)
  const isNewModel = message.modelInfo && prevModelInfo &&
    (message.modelInfo.providerId !== prevModelInfo.providerId ||
      message.modelInfo.modelId !== prevModelInfo.modelId);

  // Add page break before new model responses (except first message)
  if (isNewModel && prevModelInfo && message.modelInfo) {
    pdf.addPage();
    y = margin;

    // Add a visual separator for new model
    pdf.setFillColor(240, 240, 250);
    pdf.rect(margin - 5, y, maxWidth + 10, 12, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(70, 70, 150);
    pdf.text(`━━━ Response from ${message.modelInfo.providerName} (${message.modelInfo.modelName}) ━━━`, margin, y + 8);
    pdf.setTextColor(0, 0, 0);
    y += 18;
  }

  // Check if we need a new page
  if (y > pageHeight - 40) {
    pdf.addPage();
    y = margin;
  }

  return addMessageContent(pdf, message, margin, maxWidth, pageWidth, pageHeight, y);
}

function addMessageContent(pdf: jsPDF, message: Message, margin: number, maxWidth: number, pageWidth: number, pageHeight: number, startY: number): number {
  let y = startY;
  const messageStartY = y;
  const isUser = message.role === 'user';

  // Draw subtle border around message
  const borderColor = isUser ? [220, 230, 255] : [245, 245, 245];
  pdf.setFillColor(borderColor[0], borderColor[1], borderColor[2]);

  // Message header with background
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  const role = message.role === 'user' ? 'You' : 'Assistant';
  const timestamp = DateUtils.formatTime(message.timestamp);

  // Header background
  pdf.rect(margin - 3, y - 4, maxWidth + 6, 8, 'F');

  // Role and timestamp
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${role}`, margin, y);

  // Timestamp on the right
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  const timestampWidth = pdf.getTextWidth(timestamp);
  pdf.text(timestamp, pageWidth - margin - timestampWidth, y);
  y += 8;

  // Model info for assistant messages
  if (message.role === 'assistant' && message.modelInfo) {
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 120);
    const modelText = `${message.modelInfo.providerName} - ${message.modelInfo.modelName}`;
    pdf.text(modelText, margin, y);
    y += 6;
  }

  // Practice/Advisory area if present
  if (message.practiceArea || message.advisoryArea) {
    pdf.setFontSize(8);
    pdf.setTextColor(120, 80, 80);
    const areaText = message.practiceArea
      ? `Practice Area: ${message.practiceArea}`
      : `Advisory Area: ${message.advisoryArea}`;
    pdf.text(areaText, margin, y);
    y += 6;
  }

  pdf.setTextColor(0, 0, 0);
  y += 2;

  // Message content with better line spacing
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const lines = pdf.splitTextToSize(message.content, maxWidth - 6);

  for (const line of lines) {
    if (y > pageHeight - 20) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin + 3, y);
    y += 5.5; // Better line spacing
  }

  // Attachments
  if (message.attachments && message.attachments.length > 0) {
    y = addMessageAttachments(pdf, message.attachments, margin, pageHeight, y);
  }

  // Draw border around entire message
  const messageHeight = y - messageStartY;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.rect(margin - 3, messageStartY - 4, maxWidth + 6, messageHeight + 4);

  return y + 12; // Increased spacing between messages
}

function addPDFFooters(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    pdf.text(
      'Generated by Atticus - In-House AI Counsel',
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }
}

export async function exportConversationToPDF(conversation: Conversation): Promise<string> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);

  // Add header
  let yPosition = addPDFHeader(pdf, conversation, margin, pageWidth);

  // Divider
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Add messages with model tracking
  let prevModelInfo: Message['modelInfo'] | undefined;
  for (const message of conversation.messages) {
    yPosition = addPDFMessage({
      pdf,
      message,
      margin,
      maxWidth,
      pageWidth,
      pageHeight,
      yPosition,
      prevModelInfo
    });
    if (message.role === 'assistant' && message.modelInfo) {
      prevModelInfo = message.modelInfo;
    }
  }

  // Add footers
  addPDFFooters(pdf, pageWidth, pageHeight);

  // Return as base64
  return pdf.output('datauristring').split(',')[1];
}

export async function downloadPDF(conversation: Conversation): Promise<void> {
  try {
    const pdfData = await exportConversationToPDF(conversation);
    // Sanitize filename by replacing all non-alphanumeric characters with hyphens
    const filename = `atticus-${conversation.title.split('').map(char => /[a-z0-9]/i.test(char) ? char : '-').join('').toLowerCase()}-${Date.now()}.pdf`;

    const result = await (globalThis as any).electronAPI.savePDF({
      filename,
      data: pdfData,
    });

    if (result.success && result.data) {
      console.log('PDF saved:', result.data.filepath);
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}
