import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  const electron = {
    app: {
      getPath: vi.fn(() => 'C:/mock-user-data'),
    },
    ipcMain: {
      handle: vi.fn((channel: string, callback: (...args: unknown[]) => unknown) => {
        handlers.set(channel, callback);
      }),
    },
  };

  const fsPromises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    appendFile: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(''),
    readdir: vi.fn().mockResolvedValue([]),
    unlink: vi.fn().mockResolvedValue(undefined),
  };

  const logger = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  return {
    handlers,
    electron,
    fsPromises,
    logger,
  };
});

vi.mock('electron', () => hoisted.electron);

vi.mock('node:fs', () => ({
  default: {
    promises: hoisted.fsPromises,
  },
}));

vi.mock('../services/debugLogger', () => ({
  createLogger: () => hoisted.logger,
}));

import {
  registerAuditHandlers,
  MAX_AUDIT_REPLACE_BYTES,
} from '../electron/ipcHandlers/auditHandlers';

type ReplaceHandler = (
  event: unknown,
  conversationId: string,
  entriesJsonl: string
) => Promise<{ success: boolean; error?: { code: string; message: string } }>;

type ReadHandler = (
  event: unknown,
  conversationId: string
) => Promise<{ success: boolean; lines: string[]; error?: { code: string; message: string } }>;

type ListHandler = (
  event: unknown
) => Promise<{
  success: boolean;
  conversationIds: string[];
  error?: { code: string; message: string };
}>;

type DeleteHandler = (
  event: unknown,
  conversationId: string
) => Promise<{ success: boolean; error?: { code: string; message: string } }>;

type AppendHandler = (
  event: unknown,
  conversationId: string,
  entryJson: string
) => Promise<{ success: boolean; error?: { code: string; message: string } }>;

type FailureResult = { success: boolean; error?: { code: string; message: string } };
type SuccessResult = { success: boolean };
type LinesResult = { success: boolean; lines: string[] };
type ConversationIdsResult = { success: boolean; conversationIds: string[] };
type SanitizationCase = { rawConversationId: string; expectedSanitizedStem: string };
type AuditChannel =
  | 'audit-log-append'
  | 'audit-log-replace'
  | 'audit-log-read'
  | 'audit-log-list'
  | 'audit-log-delete';

const EXPECTED_AUDIT_CHANNELS = [
  'audit-log-append',
  'audit-log-replace',
  'audit-log-read',
  'audit-log-list',
  'audit-log-delete',
];

const SANITIZATION_CASES: SanitizationCase[] = [
  {
    rawConversationId: '../conv:unsafe',
    expectedSanitizedStem: '___conv_unsafe',
  },
  {
    rawConversationId: 'space and/slash',
    expectedSanitizedStem: 'space_and_slash',
  },
  {
    rawConversationId: 'unicode-你好?*',
    expectedSanitizedStem: 'unicode-____',
  },
];

const resetAndRegisterHandlers = (): void => {
  hoisted.handlers.clear();

  hoisted.electron.app.getPath.mockClear();
  hoisted.electron.ipcMain.handle.mockClear();

  hoisted.fsPromises.mkdir.mockClear();
  hoisted.fsPromises.appendFile.mockClear();
  hoisted.fsPromises.writeFile.mockClear();
  hoisted.fsPromises.readFile.mockClear();
  hoisted.fsPromises.readdir.mockClear();
  hoisted.fsPromises.unlink.mockClear();

  hoisted.logger.warn.mockClear();
  hoisted.logger.error.mockClear();
  hoisted.logger.info.mockClear();
  hoisted.logger.debug.mockClear();

  registerAuditHandlers();
};

const getHandler = <THandler>(channel: AuditChannel): THandler => {
  const handler = hoisted.handlers.get(channel);
  expect(handler).toBeDefined();
  return handler as THandler;
};

const getRegisteredChannels = (): string[] =>
  hoisted.electron.ipcMain.handle.mock.calls.map(([channel]) => channel as string);

const expectFailureCode = (result: FailureResult, expectedCode: string): void => {
  expect(result.success).toBe(false);
  expect(result.error?.code).toBe(expectedCode);
};

const expectLoggerError = (message: string, detailsMatcher: unknown): void => {
  expect(hoisted.logger.error).toHaveBeenCalledWith(message, detailsMatcher);
};

const expectLoggerErrorWithConversation = (message: string, conversationId: string): void => {
  expectLoggerError(message, expect.objectContaining({ conversationId }));
};

const expectNoLoggerErrors = (): void => {
  expect(hoisted.logger.error).not.toHaveBeenCalled();
};

const expectSuccess = (result: SuccessResult): void => {
  expect(result.success).toBe(true);
};

const expectAuditPathWrite = (writeMock: unknown, fileSuffix: string, content: string): void => {
  expect(writeMock as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
    expect.stringMatching(new RegExp(String.raw`[\\/]audit[\\/]${fileSuffix}$`)),
    content,
    'utf-8'
  );
};

const expectAuditPathCall = (pathMock: unknown, fileSuffix: string): void => {
  expect(pathMock as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
    expect.stringMatching(new RegExp(String.raw`[\\/]audit[\\/]${fileSuffix}$`)),
    expect.anything()
  );
};

const expectEnsureAuditDirCalls = (expectedCount: number): void => {
  expect(hoisted.fsPromises.mkdir).toHaveBeenCalledTimes(expectedCount);
  if (expectedCount > 0) {
    expect(hoisted.fsPromises.mkdir).toHaveBeenCalledWith(expect.stringMatching(/[\\/]audit$/), {
      recursive: true,
    });
  }
};

const expectLinesResult = (result: LinesResult, expectedLines: string[]): void => {
  expectSuccess(result);
  expect(result.lines).toEqual(expectedLines);
};

const expectConversationIdsResult = (
  result: ConversationIdsResult,
  expectedConversationIds: string[]
): void => {
  expectSuccess(result);
  expect(result.conversationIds).toEqual(expectedConversationIds);
};

const invokeHandler = async <T>(
  handler: (event: unknown, ...args: any[]) => Promise<T>,
  ...args: any[]
): Promise<T> => handler({}, ...args);

const invokeReplace = (conversationId: string, entriesJsonl: string) =>
  invokeHandler(getHandler<ReplaceHandler>('audit-log-replace'), conversationId, entriesJsonl);

const invokeRead = (conversationId: string) =>
  invokeHandler(getHandler<ReadHandler>('audit-log-read'), conversationId);

const invokeList = () => invokeHandler(getHandler<ListHandler>('audit-log-list'));

const invokeDelete = (conversationId: string) =>
  invokeHandler(getHandler<DeleteHandler>('audit-log-delete'), conversationId);

const invokeAppend = (conversationId: string, entryJson: string) =>
  invokeHandler(getHandler<AppendHandler>('audit-log-append'), conversationId, entryJson);

const createErrnoError = (message: string, code: string): NodeJS.ErrnoException =>
  Object.assign(new Error(message), { code });

const createEnoentError = (message = 'missing'): NodeJS.ErrnoException =>
  createErrnoError(message, 'ENOENT');

const createFailureError = (message: string): Error => new Error(message);

describe('auditHandlers registration', () => {
  beforeEach(() => {
    resetAndRegisterHandlers();
  });

  it('registers the expected audit IPC channels with no extras', () => {
    const channels = getRegisteredChannels();

    expect(channels).toHaveLength(EXPECTED_AUDIT_CHANNELS.length);
    expect(new Set(channels)).toEqual(new Set(EXPECTED_AUDIT_CHANNELS));
  });

  it('exposes all expected channel handlers after registration', () => {
    EXPECTED_AUDIT_CHANNELS.forEach(channel => {
      expect(hoisted.handlers.has(channel)).toBe(true);
    });
  });
});

describe('auditHandlers replace IPC', () => {
  beforeEach(() => {
    resetAndRegisterHandlers();
  });

  it('rejects replace payloads larger than 25MB and avoids write', async () => {
    const tooLargePayload = 'a'.repeat(MAX_AUDIT_REPLACE_BYTES + 1);

    const result = await invokeReplace('conv-too-large', tooLargePayload);

    expectFailureCode(result, 'AUDIT_REPLACE_TOO_LARGE');
    expect(result.error?.message).toContain(String(MAX_AUDIT_REPLACE_BYTES));
    expect(hoisted.fsPromises.writeFile).not.toHaveBeenCalled();
    expectEnsureAuditDirCalls(0);
    expect(hoisted.logger.warn).toHaveBeenCalledWith(
      'Audit log replace payload too large',
      expect.objectContaining({
        conversationId: 'conv-too-large',
        maxBytes: MAX_AUDIT_REPLACE_BYTES,
      })
    );
  });

  it('allows payloads at byte limit (UTF-8 boundary) and writes normalized newline', async () => {
    const atLimitPayload = `${'a'.repeat(MAX_AUDIT_REPLACE_BYTES - 2)}é`;
    expect(Buffer.byteLength(atLimitPayload, 'utf-8')).toBe(MAX_AUDIT_REPLACE_BYTES);

    const result = await invokeReplace('conv-byte-limit-ok', atLimitPayload);

    expectSuccess(result);
    expectAuditPathWrite(
      hoisted.fsPromises.writeFile,
      'conv-byte-limit-ok\\.jsonl',
      `${atLimitPayload}\n`
    );
    expectEnsureAuditDirCalls(1);
  });

  it('rejects payloads exceeding byte limit due to UTF-8 encoding', async () => {
    const overLimitPayload = `${'a'.repeat(MAX_AUDIT_REPLACE_BYTES - 1)}é`;
    expect(Buffer.byteLength(overLimitPayload, 'utf-8')).toBe(MAX_AUDIT_REPLACE_BYTES + 1);

    const result = await invokeReplace('conv-byte-limit-fail', overLimitPayload);

    expectFailureCode(result, 'AUDIT_REPLACE_TOO_LARGE');
    expect(hoisted.fsPromises.writeFile).not.toHaveBeenCalled();
    expectEnsureAuditDirCalls(0);
  });

  it('writes normalized trailing newline for non-empty replace payload', async () => {
    const result = await invokeReplace('../conv:1', '{"id":"a"}');

    expectSuccess(result);
    expectAuditPathWrite(hoisted.fsPromises.writeFile, '___conv_1\.jsonl', '{"id":"a"}\n');
  });

  it('writes empty string for empty replace payload', async () => {
    const result = await invokeReplace('conv-empty-replace', '');

    expectSuccess(result);
    expectAuditPathWrite(hoisted.fsPromises.writeFile, 'conv-empty-replace\.jsonl', '');
  });

  it('returns AUDIT_REPLACE_FAILED when write fails', async () => {
    hoisted.fsPromises.writeFile.mockRejectedValueOnce(createFailureError('disk full'));

    const result = await invokeReplace('conv-write-fail', '{"id":"a"}');

    expectFailureCode(result, 'AUDIT_REPLACE_FAILED');
    expectLoggerErrorWithConversation('Failed to replace audit log entries', 'conv-write-fail');
  });

  it('returns AUDIT_REPLACE_FAILED when audit directory creation fails', async () => {
    hoisted.fsPromises.mkdir.mockRejectedValueOnce(createFailureError('mkdir replace fail'));

    const result = await invokeReplace('conv-mkdir-replace-fail', '{"id":"a"}');

    expectFailureCode(result, 'AUDIT_REPLACE_FAILED');
    expect(hoisted.fsPromises.writeFile).not.toHaveBeenCalled();
    expectLoggerErrorWithConversation(
      'Failed to replace audit log entries',
      'conv-mkdir-replace-fail'
    );
  });

  it.each(SANITIZATION_CASES)(
    'sanitizes conversation id for replace path: $rawConversationId',
    async ({ rawConversationId, expectedSanitizedStem }) => {
      const result = await invokeReplace(rawConversationId, '{"id":"a"}');

      expectSuccess(result);
      expectAuditPathWrite(
        hoisted.fsPromises.writeFile,
        `${expectedSanitizedStem}\\.jsonl`,
        '{"id":"a"}\n'
      );
    }
  );
});

describe('auditHandlers read IPC', () => {
  beforeEach(() => {
    resetAndRegisterHandlers();
  });

  it('returns parsed non-empty lines from existing audit file', async () => {
    hoisted.fsPromises.readFile.mockResolvedValueOnce('{"id":"a"}\n\n{"id":"b"}\n');

    const result = await invokeRead('conv-read-ok');

    expectLinesResult(result, ['{"id":"a"}', '{"id":"b"}']);
    expectEnsureAuditDirCalls(0);
  });

  it('returns empty lines for missing file (ENOENT)', async () => {
    const enoent = createEnoentError();
    hoisted.fsPromises.readFile.mockRejectedValueOnce(enoent);

    const result = await invokeRead('conv-missing');

    expectLinesResult(result, []);
    expectEnsureAuditDirCalls(0);
    expectNoLoggerErrors();
  });

  it('returns AUDIT_READ_FAILED when read throws non-ENOENT', async () => {
    hoisted.fsPromises.readFile.mockRejectedValueOnce(createFailureError('permission denied'));

    const result = await invokeRead('conv-read-fail');

    expectFailureCode(result, 'AUDIT_READ_FAILED');
    expect(result.lines).toEqual([]);
    expectLoggerErrorWithConversation('Failed to read audit log', 'conv-read-fail');
    expectEnsureAuditDirCalls(0);
  });

  it('drops whitespace-only lines while preserving non-empty lines', async () => {
    hoisted.fsPromises.readFile.mockResolvedValueOnce('   \n\t\n{"id":"a"}\n  \n{"id":"b"}\n');

    const result = await invokeRead('conv-read-whitespace');

    expectLinesResult(result, ['{"id":"a"}', '{"id":"b"}']);
  });

  it('preserves meaningful surrounding whitespace in non-empty lines', async () => {
    hoisted.fsPromises.readFile.mockResolvedValueOnce('  {"id":"a"}  \n');

    const result = await invokeRead('conv-read-preserve-space');

    expectLinesResult(result, ['  {"id":"a"}  ']);
  });

  it.each(SANITIZATION_CASES)(
    'sanitizes conversation id for read path: $rawConversationId',
    async ({ rawConversationId, expectedSanitizedStem }) => {
      await invokeRead(rawConversationId);

      expectAuditPathCall(hoisted.fsPromises.readFile, `${expectedSanitizedStem}\\.jsonl`);
    }
  );
});

describe('auditHandlers list IPC', () => {
  beforeEach(() => {
    resetAndRegisterHandlers();
  });

  it('lists only jsonl files and strips extension', async () => {
    hoisted.fsPromises.readdir.mockResolvedValueOnce([
      'conv-a.jsonl',
      'conv-b.jsonl',
      'ignore.txt',
    ]);

    const result = await invokeList();

    expectConversationIdsResult(result, ['conv-a', 'conv-b']);
    expectEnsureAuditDirCalls(1);
  });

  it('filters list results by strict lowercase .jsonl suffix only', async () => {
    hoisted.fsPromises.readdir.mockResolvedValueOnce([
      'keep-a.jsonl',
      'skip-upper.JSONL',
      'skip-suffix.jsonl.tmp',
      'keep-b.jsonl',
    ]);

    const result = await invokeList();

    expectConversationIdsResult(result, ['keep-a', 'keep-b']);
  });

  it('returns AUDIT_LIST_FAILED when directory read fails', async () => {
    hoisted.fsPromises.readdir.mockRejectedValueOnce(createFailureError('cannot list'));

    const result = await invokeList();

    expectFailureCode(result, 'AUDIT_LIST_FAILED');
    expect(result.conversationIds).toEqual([]);
    expectLoggerError('Failed to list audit logs', expect.any(Object));
    expectEnsureAuditDirCalls(1);
  });

  it('returns AUDIT_LIST_FAILED when audit directory creation fails', async () => {
    hoisted.fsPromises.mkdir.mockRejectedValueOnce(createFailureError('mkdir list fail'));

    const result = await invokeList();

    expectFailureCode(result, 'AUDIT_LIST_FAILED');
    expect(result.conversationIds).toEqual([]);
    expect(hoisted.fsPromises.readdir).not.toHaveBeenCalled();
    expectLoggerError('Failed to list audit logs', expect.any(Object));
    expectEnsureAuditDirCalls(1);
  });
});

describe('auditHandlers delete IPC', () => {
  beforeEach(() => {
    resetAndRegisterHandlers();
  });

  it('returns success when file is deleted', async () => {
    const result = await invokeDelete('conv-delete-ok');

    expectSuccess(result);
    expect(hoisted.fsPromises.unlink).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]audit[\\/]conv-delete-ok\.jsonl$/)
    );
    expectEnsureAuditDirCalls(0);
  });

  it('returns success when file is already missing (ENOENT)', async () => {
    const enoent = createEnoentError('already missing');
    hoisted.fsPromises.unlink.mockRejectedValueOnce(enoent);

    const result = await invokeDelete('conv-delete-missing');

    expectSuccess(result);
    expectEnsureAuditDirCalls(0);
    expectNoLoggerErrors();
  });

  it('returns AUDIT_DELETE_FAILED when unlink fails with non-ENOENT', async () => {
    hoisted.fsPromises.unlink.mockRejectedValueOnce(createFailureError('permission denied'));

    const result = await invokeDelete('conv-delete-fail');

    expectFailureCode(result, 'AUDIT_DELETE_FAILED');
    expectLoggerErrorWithConversation('Failed to delete audit log', 'conv-delete-fail');
    expectEnsureAuditDirCalls(0);
  });

  it.each(SANITIZATION_CASES)(
    'sanitizes conversation id for delete path: $rawConversationId',
    async ({ rawConversationId, expectedSanitizedStem }) => {
      const result = await invokeDelete(rawConversationId);

      expectSuccess(result);
      expect(hoisted.fsPromises.unlink).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(String.raw`[\\/]audit[\\/]${expectedSanitizedStem}\.jsonl$`)
        )
      );
    }
  );
});

describe('auditHandlers append IPC', () => {
  beforeEach(() => {
    resetAndRegisterHandlers();
  });

  it('appends entry with trailing newline to sanitized path', async () => {
    const result = await invokeAppend('../conv:append', '{"id":"a"}');

    expectSuccess(result);
    expectAuditPathWrite(hoisted.fsPromises.appendFile, '___conv_append\.jsonl', '{"id":"a"}\n');
    expectEnsureAuditDirCalls(1);
  });

  it('returns AUDIT_APPEND_FAILED when append throws', async () => {
    hoisted.fsPromises.appendFile.mockRejectedValueOnce(createFailureError('append failed'));

    const result = await invokeAppend('conv-append-fail', '{"id":"a"}');

    expectFailureCode(result, 'AUDIT_APPEND_FAILED');
    expectLoggerErrorWithConversation('Failed to append audit log entry', 'conv-append-fail');
    expectEnsureAuditDirCalls(1);
  });

  it('returns AUDIT_APPEND_FAILED when audit directory creation fails', async () => {
    hoisted.fsPromises.mkdir.mockRejectedValueOnce(createFailureError('mkdir append fail'));

    const result = await invokeAppend('conv-mkdir-append-fail', '{"id":"a"}');

    expectFailureCode(result, 'AUDIT_APPEND_FAILED');
    expect(hoisted.fsPromises.appendFile).not.toHaveBeenCalled();
    expectLoggerErrorWithConversation('Failed to append audit log entry', 'conv-mkdir-append-fail');
    expectEnsureAuditDirCalls(1);
  });

  it.each(SANITIZATION_CASES)(
    'sanitizes conversation id for append path: $rawConversationId',
    async ({ rawConversationId, expectedSanitizedStem }) => {
      const result = await invokeAppend(rawConversationId, '{"id":"a"}');

      expectSuccess(result);
      expectAuditPathWrite(
        hoisted.fsPromises.appendFile,
        `${expectedSanitizedStem}\\.jsonl`,
        '{"id":"a"}\n'
      );
    }
  );
});
