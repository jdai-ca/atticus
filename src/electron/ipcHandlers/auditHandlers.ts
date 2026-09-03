import { app, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createLogger } from '../../services/debugLogger';

const logger = createLogger('AuditHandlers');
export const MAX_AUDIT_REPLACE_BYTES = 25 * 1024 * 1024;

function getAuditDir(): string {
  return path.join(app.getPath('userData'), 'audit');
}

function getAuditFilePath(conversationId: string): string {
  // Sanitize to prevent path traversal
  const safe = conversationId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getAuditDir(), `${safe}.jsonl`);
}

async function ensureAuditDir(): Promise<void> {
  await fs.promises.mkdir(getAuditDir(), { recursive: true });
}

export function registerAuditHandlers(): void {
  ipcMain.handle('audit-log-append', async (_event, conversationId: string, entryJson: string) => {
    try {
      await ensureAuditDir();
      const filePath = getAuditFilePath(conversationId);
      await fs.promises.appendFile(filePath, entryJson + '\n', 'utf-8');
      return { success: true };
    } catch (error) {
      logger.error('Failed to append audit log entry', { error, conversationId });
      return { success: false, error: { code: 'AUDIT_APPEND_FAILED', message: String(error) } };
    }
  });

  ipcMain.handle(
    'audit-log-replace',
    async (_event, conversationId: string, entriesJsonl: string) => {
      try {
        const payloadSize = Buffer.byteLength(entriesJsonl, 'utf-8');
        if (payloadSize > MAX_AUDIT_REPLACE_BYTES) {
          logger.warn('Audit log replace payload too large', {
            conversationId,
            payloadSize,
            maxBytes: MAX_AUDIT_REPLACE_BYTES,
          });
          return {
            success: false,
            error: {
              code: 'AUDIT_REPLACE_TOO_LARGE',
              message: `Audit log payload exceeds ${MAX_AUDIT_REPLACE_BYTES} bytes`,
            },
          };
        }

        await ensureAuditDir();
        const filePath = getAuditFilePath(conversationId);
        const normalized = entriesJsonl.length > 0 ? `${entriesJsonl}\n` : '';
        await fs.promises.writeFile(filePath, normalized, 'utf-8');
        return { success: true };
      } catch (error) {
        logger.error('Failed to replace audit log entries', { error, conversationId });
        return { success: false, error: { code: 'AUDIT_REPLACE_FAILED', message: String(error) } };
      }
    }
  );

  ipcMain.handle('audit-log-read', async (_event, conversationId: string) => {
    try {
      const filePath = getAuditFilePath(conversationId);
      try {
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        const lines = raw.split('\n').filter((l): boolean => l.trim().length > 0);
        return { success: true, lines };
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          return { success: true, lines: [] };
        }
        throw err;
      }
    } catch (error) {
      logger.error('Failed to read audit log', { error, conversationId });
      return {
        success: false,
        lines: [],
        error: { code: 'AUDIT_READ_FAILED', message: String(error) },
      };
    }
  });

  ipcMain.handle('audit-log-list', async () => {
    try {
      await ensureAuditDir();
      const files = await fs.promises.readdir(getAuditDir());
      const conversationIds = files
        .filter((f): boolean => f.endsWith('.jsonl'))
        .map((f): string => f.slice(0, -6)); // strip ".jsonl"
      return { success: true, conversationIds };
    } catch (error) {
      logger.error('Failed to list audit logs', { error });
      return {
        success: false,
        conversationIds: [],
        error: { code: 'AUDIT_LIST_FAILED', message: String(error) },
      };
    }
  });

  ipcMain.handle('audit-log-delete', async (_event, conversationId: string) => {
    try {
      const filePath = getAuditFilePath(conversationId);
      await fs.promises.unlink(filePath).catch((err: unknown) => {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete audit log', { error, conversationId });
      return { success: false, error: { code: 'AUDIT_DELETE_FAILED', message: String(error) } };
    }
  });
}
