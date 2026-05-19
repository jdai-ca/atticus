/**
 * Backward-compatibility shim.
 *
 * The compliance audit logger now lives in auditLogger.ts and uses file-backed
 * storage via Electron IPC. Re-exporting here preserves existing import paths.
 */

export {
  AuditEventType,
  AuditSeverity,
  type AuditLogEntry,
  type PIIScanAuditDetails,
  type APIRequestAuditDetails,
  type APIResponseAuditDetails,
  type ConversationAuditDetails,
  AuditLogger,
  auditLogger,
  isPIIScanDetails,
  isAPIRequestDetails,
  isAPIResponseDetails,
} from './auditLogger';
