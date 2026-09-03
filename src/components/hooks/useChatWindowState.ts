import { useRef, useState } from 'react';
import { APITrace, AttachmentMeta, FileUploadResult } from '../../types';
import { PIIScanResult } from '../../services/piiScanner';
import { SRAISScanResult } from '../../services/sraisScanner';
import type { SecurityAnalysisResult } from '../../services/fileSecurityPipeline';

export function useChatWindowState() {
  const [input, setInput] = useState('');
  const attachmentDataRef = useRef(new Map<string, string>());
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [fileSecurityReports, setFileSecurityReports] = useState<
    Map<string, SecurityAnalysisResult>
  >(new Map());
  const [showFileSecurityWarning, setShowFileSecurityWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<FileUploadResult | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<'practice' | 'advisory' | undefined>(
    undefined
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastJumpedMessageId = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  const [piiScanResult, setPiiScanResult] = useState<PIIScanResult | null>(null);
  const [showHarmWarning, setShowHarmWarning] = useState(false);
  const [sraisScanResult, setSraisScanResult] = useState<SRAISScanResult | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showCostLedger, setShowCostLedger] = useState(false);
  const [inspectedApiTrace, setInspectedApiTrace] = useState<APITrace | null>(null);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagDialogClusterStart, setTagDialogClusterStart] = useState<number>(0);
  const [tagDialogClusterEnd, setTagDialogClusterEnd] = useState<number>(0);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [inlineTagMessageId, setInlineTagMessageId] = useState<string | null>(null);
  const [inlineTagInput, setInlineTagInput] = useState<string>('');
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisClusterStart, setAnalysisClusterStart] = useState<number>(0);
  const [analysisClusterEnd, setAnalysisClusterEnd] = useState<number>(0);
  const [selectedAnalysisModel, setSelectedAnalysisModel] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  type UseChatWindowStateResult = {
    input: string;
    setInput: typeof setInput;
    attachmentDataRef: typeof attachmentDataRef;
    attachments: typeof attachments;
    setAttachments: typeof setAttachments;
    fileSecurityReports: typeof fileSecurityReports;
    setFileSecurityReports: typeof setFileSecurityReports;
    showFileSecurityWarning: boolean;
    setShowFileSecurityWarning: typeof setShowFileSecurityWarning;
    pendingFile: typeof pendingFile;
    setPendingFile: typeof setPendingFile;
    showConfigDialog: boolean;
    setShowConfigDialog: typeof setShowConfigDialog;
    currentDomain: typeof currentDomain;
    setCurrentDomain: typeof setCurrentDomain;
    messagesEndRef: typeof messagesEndRef;
    messagesContainerRef: typeof messagesContainerRef;
    lastJumpedMessageId: typeof lastJumpedMessageId;
    textareaRef: typeof textareaRef;
    showPrivacyWarning: boolean;
    setShowPrivacyWarning: typeof setShowPrivacyWarning;
    piiScanResult: typeof piiScanResult;
    setPiiScanResult: typeof setPiiScanResult;
    showHarmWarning: boolean;
    setShowHarmWarning: typeof setShowHarmWarning;
    sraisScanResult: typeof sraisScanResult;
    setSraisScanResult: typeof setSraisScanResult;
    pendingMessage: string;
    setPendingMessage: typeof setPendingMessage;
    showAuditLog: boolean;
    setShowAuditLog: typeof setShowAuditLog;
    showCostLedger: boolean;
    setShowCostLedger: typeof setShowCostLedger;
    inspectedApiTrace: typeof inspectedApiTrace;
    setInspectedApiTrace: typeof setInspectedApiTrace;
    showTagDialog: boolean;
    setShowTagDialog: typeof setShowTagDialog;
    tagDialogClusterStart: number;
    setTagDialogClusterStart: typeof setTagDialogClusterStart;
    tagDialogClusterEnd: number;
    setTagDialogClusterEnd: typeof setTagDialogClusterEnd;
    newTagInput: string;
    setNewTagInput: typeof setNewTagInput;
    inlineTagMessageId: typeof inlineTagMessageId;
    setInlineTagMessageId: typeof setInlineTagMessageId;
    inlineTagInput: string;
    setInlineTagInput: typeof setInlineTagInput;
    showAnalysisDialog: boolean;
    setShowAnalysisDialog: typeof setShowAnalysisDialog;
    analysisClusterStart: number;
    setAnalysisClusterStart: typeof setAnalysisClusterStart;
    analysisClusterEnd: number;
    setAnalysisClusterEnd: typeof setAnalysisClusterEnd;
    selectedAnalysisModel: typeof selectedAnalysisModel;
    setSelectedAnalysisModel: typeof setSelectedAnalysisModel;
    isAnalyzing: boolean;
    setIsAnalyzing: typeof setIsAnalyzing;
  };

  return {
    input,
    setInput,
    attachmentDataRef,
    attachments,
    setAttachments,
    fileSecurityReports,
    setFileSecurityReports,
    showFileSecurityWarning,
    setShowFileSecurityWarning,
    pendingFile,
    setPendingFile,
    showConfigDialog,
    setShowConfigDialog,
    currentDomain,
    setCurrentDomain,
    messagesEndRef,
    messagesContainerRef,
    lastJumpedMessageId,
    textareaRef,
    showPrivacyWarning,
    setShowPrivacyWarning,
    piiScanResult,
    setPiiScanResult,
    showHarmWarning,
    setShowHarmWarning,
    sraisScanResult,
    setSraisScanResult,
    pendingMessage,
    setPendingMessage,
    showAuditLog,
    setShowAuditLog,
    showCostLedger,
    setShowCostLedger,
    inspectedApiTrace,
    setInspectedApiTrace,
    showTagDialog,
    setShowTagDialog,
    tagDialogClusterStart,
    setTagDialogClusterStart,
    tagDialogClusterEnd,
    setTagDialogClusterEnd,
    newTagInput,
    setNewTagInput,
    inlineTagMessageId,
    setInlineTagMessageId,
    inlineTagInput,
    setInlineTagInput,
    showAnalysisDialog,
    setShowAnalysisDialog,
    analysisClusterStart,
    setAnalysisClusterStart,
    analysisClusterEnd,
    setAnalysisClusterEnd,
    selectedAnalysisModel,
    setSelectedAnalysisModel,
    isAnalyzing,
    setIsAnalyzing,
  } satisfies UseChatWindowStateResult;
}
