import jsPDF from 'jspdf';
import { Conversation, Message } from '../types';
import { DateUtils } from './dateUtils';

// Helper to strip markdown and format text for PDF
interface FormattedTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  indent?: number;
  isBullet?: boolean;
  isNumbered?: boolean;
  isCode?: boolean;
  isHeading?: number; // 1-6 for heading level
}

// Helper function to strip markdown formatting from text
function stripMarkdown(text: string): string {
  let cleanText = text;

  // Remove ALL backticks first (they render as %ı in PDF)
  // Handle triple backticks with or without language/text
  cleanText = cleanText.replace(/```[^`]*```/g, ''); // Remove ```code blocks```
  cleanText = cleanText.replace(/```[a-z]*\s*/gi, ''); // Remove ```language
  cleanText = cleanText.replace(/```/g, ''); // Remove any remaining ```

  // Remove inline code backticks but keep text
  cleanText = cleanText.replace(/`([^`]*)`/g, '$1');

  // Remove any remaining single backticks
  cleanText = cleanText.replace(/`/g, '');

  // Remove bold/italic markers - use multiple passes to handle all cases
  let previousText = '';
  let iterations = 0;
  const maxIterations = 10; // Prevent infinite loops

  while (cleanText !== previousText && iterations < maxIterations) {
    previousText = cleanText;
    iterations++;

    // Triple asterisks (bold+italic)
    cleanText = cleanText.replace(/\*\*\*(.*?)\*\*\*/g, '$1');
    // Double asterisks (bold)
    cleanText = cleanText.replace(/\*\*(.*?)\*\*\*/g, '$1');
    // Triple underscores
    cleanText = cleanText.replace(/___(.*?)___/g, '$1');
    // Double underscores (bold)
    cleanText = cleanText.replace(/__(.*?)__/g, '$1');
    // Single asterisks (italic)
    cleanText = cleanText.replace(/\*(.*?)\*/g, '$1');
    // Single underscores (italic)
    cleanText = cleanText.replace(/_(.*?)_/g, '$1');
  }

  // Final cleanup: remove any remaining markdown characters
  cleanText = cleanText.replace(/[*_`]/g, '');

  // Remove links but keep text
  cleanText = cleanText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  return cleanText;
}

function parseMarkdownToPDFSegments(markdown: string): FormattedTextSegment[] {
  const segments: FormattedTextSegment[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  let listCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      segments.push({ text: line, isCode: true, indent: 1 });
      continue;
    }

    // Handle headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      segments.push({
        text: stripMarkdown(headingMatch[2]), // Clean markdown from heading text
        isHeading: level,
        bold: true,
        fontSize: 16 - level
      });
      continue;
    }

    // Handle bullet points
    if (line.match(/^\s*[-*+]\s+/)) {
      const text = line.replace(/^\s*[-*+]\s+/, '');
      const indent = Math.floor(line.search(/[-*+]/) / 2);
      segments.push({
        text: stripMarkdown(text), // Clean markdown from bullet text
        isBullet: true,
        indent: indent
      });
      continue;
    }

    // Handle numbered lists
    if (line.match(/^\s*\d+\.\s+/)) {
      const text = line.replace(/^\s*\d+\.\s+/, '');
      const indent = Math.floor(line.search(/\d/) / 2);
      listCounter++;
      segments.push({
        text: stripMarkdown(text), // Clean markdown from numbered list text
        isNumbered: true,
        indent: indent
      });
      continue;
    }

    // Reset list counter on non-list lines
    if (!line.match(/^\s*\d+\.\s+/)) {
      listCounter = 0;
    }

    // Handle inline formatting (bold, italic, code)
    // Process the line for inline styles
    if (line.trim()) {
      segments.push({ text: stripMarkdown(line) });
    } else {
      // Empty line for spacing
      segments.push({ text: '' });
    }
  }

  return segments;
}

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
    pdf.text(`--- Response from ${message.modelInfo.providerName} (${message.modelInfo.modelName}) ---`, margin, y + 8);
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
  pdf.setFont('times', 'bold');
  const role = message.role === 'user' ? 'You' : 'Assistant';
  const timestamp = DateUtils.formatTime(message.timestamp);

  // Header background
  pdf.rect(margin - 3, y - 4, maxWidth + 6, 8, 'F');

  // Role and timestamp
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${role}`, margin, y);

  // Timestamp on the right
  pdf.setFont('times', 'normal');
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

  // Parse markdown content into formatted segments
  const segments = parseMarkdownToPDFSegments(message.content);

  // Render each segment with appropriate formatting
  for (const segment of segments) {
    // Check if we need a new page
    if (y > pageHeight - 20) {
      pdf.addPage();
      y = margin;
    }

    // Empty lines for spacing
    if (!segment.text.trim()) {
      y += 3;
      continue;
    }

    // Set font based on segment type
    if (segment.isHeading) {
      pdf.setFontSize(segment.fontSize || 12);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 0, 80);
      const lines = pdf.splitTextToSize(segment.text, maxWidth - 6);
      for (const line of lines) {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin + 3, y);
        y += (segment.fontSize || 12) * 0.5;
      }
      y += 3; // Extra spacing after headings
      pdf.setTextColor(0, 0, 0);
      continue;
    }

    // Code blocks
    if (segment.isCode) {
      pdf.setFontSize(9);
      pdf.setFont('courier', 'normal');
      pdf.setFillColor(240, 240, 240);
      const codeIndent = margin + (segment.indent || 0) * 10 + 3;

      // Background for code
      const textWidth = pdf.getTextWidth(segment.text);
      pdf.rect(codeIndent - 2, y - 4, Math.min(textWidth + 4, maxWidth - 6), 6, 'F');

      pdf.setTextColor(0, 100, 0);
      pdf.text(segment.text, codeIndent, y);
      pdf.setTextColor(0, 0, 0);
      y += 5.5;
      continue;
    }

    // Bullet points
    if (segment.isBullet) {
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      const bulletIndent = margin + (segment.indent || 0) * 10 + 3;

      // Draw bullet
      pdf.setFontSize(12);
      pdf.text('•', bulletIndent, y);

      // Wrap bullet text
      pdf.setFontSize(10);
      const bulletLines = pdf.splitTextToSize(segment.text, maxWidth - 20 - (segment.indent || 0) * 10);
      for (let i = 0; i < bulletLines.length; i++) {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(bulletLines[i], bulletIndent + 6, y);
        if (i < bulletLines.length - 1) {
          y += 5.5;
        }
      }
      y += 5.5;
      continue;
    }

    // Numbered lists
    if (segment.isNumbered) {
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      const numberIndent = margin + (segment.indent || 0) * 10 + 3;

      // We'd need to track numbering - for now just use bullets
      pdf.text('•', numberIndent, y);

      // Wrap numbered text
      const numberLines = pdf.splitTextToSize(segment.text, maxWidth - 20 - (segment.indent || 0) * 10);
      for (let i = 0; i < numberLines.length; i++) {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(numberLines[i], numberIndent + 6, y);
        if (i < numberLines.length - 1) {
          y += 5.5;
        }
      }
      y += 5.5;
      continue;
    }

    // Regular text paragraphs
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    const lines = pdf.splitTextToSize(segment.text, maxWidth - 6);

    for (const line of lines) {
      if (y > pageHeight - 20) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin + 3, y);
      y += 5.5;
    }
  }

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('times', 'normal');

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
    // Use conversation ID with transcript type and timestamp
    const filename = `atticus-${conversation.id}-transcript-${Date.now()}.pdf`;

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

/**
 * Export a single message to PDF
 */
export async function exportMessageToPDF(
  message: Message,
  conversationTitle: string
): Promise<string> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);

  // Add simple header
  pdf.setFontSize(16);
  pdf.setFont('times', 'bold');
  pdf.setTextColor(30, 58, 138);
  pdf.text('Atticus AI', margin, 15);

  pdf.setFontSize(10);
  pdf.setFont('times', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`From: ${conversationTitle}`, margin, 22);
  pdf.text(DateUtils.formatDate(new Date().toISOString()), pageWidth - margin - 30, 22);

  // Divider
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, 28, pageWidth - margin, 28);

  let yPosition = 35;

  // Add the single message
  addMessageContent(pdf, message, margin, maxWidth, pageWidth, pageHeight, yPosition);

  // Add footers
  addPDFFooters(pdf, pageWidth, pageHeight);

  // Return as base64
  return pdf.output('datauristring').split(',')[1];
}

/**
 * Download a single message as PDF
 */
export async function downloadMessagePDF(
  message: Message,
  conversationTitle: string,
  conversationId: string
): Promise<void> {
  try {
    const pdfData = await exportMessageToPDF(message, conversationTitle);
    const role = message.role === 'user' ? 'user' : 'assistant';
    const filename = `atticus-${conversationId}-message-${role}-${Date.now()}.pdf`;

    const result = await (globalThis as any).electronAPI.savePDF({
      filename,
      data: pdfData,
    });

    if (result.success && result.data) {
      console.log('Message PDF saved:', result.data.filepath);
    }
  } catch (error) {
    console.error('Error downloading message PDF:', error);
    throw error;
  }
}

/**
 * Export a cluster of messages (query + responses) to PDF
 */
export async function downloadClusterPDF(
  messages: Message[],
  conversationTitle: string,
  conversationId: string,
  type: 'cluster' | 'analysis' = 'cluster'
): Promise<void> {
  try {
    const pdfData = await exportClusterToPDF(messages, conversationTitle);
    const filename = `atticus-${conversationId}-${type}-${Date.now()}.pdf`;

    const result = await (globalThis as any).electronAPI.savePDF({
      filename,
      data: pdfData,
    });

    if (result.success && result.data) {
      console.log('Cluster PDF saved:', result.data.filepath);
    }
  } catch (error) {
    console.error('Error downloading cluster PDF:', error);
    throw error;
  }
}

/**
 * Export a cluster of messages to PDF format
 */
export async function exportClusterToPDF(
  messages: Message[],
  conversationTitle: string
): Promise<string> {
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
  pdf.setFontSize(16);
  pdf.setFont('times', 'bold');
  pdf.setTextColor(30, 58, 138);
  pdf.text('Atticus AI - Query & Response Cluster', margin, 15);

  pdf.setFontSize(10);
  pdf.setFont('times', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`From: ${conversationTitle}`, margin, 22);
  pdf.text(DateUtils.formatDate(new Date().toISOString()), pageWidth - margin - 30, 22);

  // Divider
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, 28, pageWidth - margin, 28);

  let yPosition = 35;

  // Add all messages in the cluster
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // Add spacing between messages
    if (i > 0) {
      yPosition += 5;
    }

    yPosition = addMessageContent(pdf, message, margin, maxWidth, pageWidth, pageHeight, yPosition);

    // Check if we need a new page
    if (yPosition > pageHeight - 40 && i < messages.length - 1) {
      pdf.addPage();
      yPosition = margin;
    }
  }

  // Add footers
  addPDFFooters(pdf, pageWidth, pageHeight);

  // Return as base64
  return pdf.output('datauristring').split(',')[1];
}
