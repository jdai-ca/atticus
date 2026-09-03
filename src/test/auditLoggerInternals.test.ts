import { beforeEach, describe, it, expect, vi } from 'vitest';

const loggerSpies = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../services/debugLogger', () => ({
  createLogger: () => ({
    debug: loggerSpies.debug,
    info: loggerSpies.info,
    warn: loggerSpies.warn,
    error: loggerSpies.error,
  }),
}));

import { AuditEventType, AuditLogger, AuditSeverity } from '../services/auditLogger';

type InternalAuditLogger = {
  initialize: () => Promise<void>;
  logEvent: (
    eventType: AuditEventType,
    severity: AuditSeverity,
    actor: 'USER' | 'SYSTEM' | 'API_PROVIDER',
    action: string,
    details: Record<string, unknown>,
    conversationId?: string,
    messageId?: string
  ) => Promise<string>;
  logPIIScan: (
    conversationId: string,
    messageId: string,
    scanResult: {
      hasFindings: boolean;
      findingsCount: number;
      riskLevel: string;
      detectedTypes: string[];
      jurisdictions?: string[];
    },
    messagePreview: string,
    userDecision?: 'proceed' | 'cancel' | 'anonymize'
  ) => Promise<string>;
  logAPIRequest: (
    conversationId: string,
    messageId: string,
    requestDetails: {
      provider: string;
      providerDisplayName: string;
      model: string;
      endpoint: string;
      messageCount: number;
      systemPromptPresent: boolean;
      initiatedAt: string;
    }
  ) => Promise<string>;
  logAPIResponse: (
    conversationId: string,
    messageId: string,
    responseDetails: {
      provider: string;
      model: string;
      responseReceived: boolean;
      error?: {
        code: string;
        message: string;
        isProviderError: boolean;
        isUserError: boolean;
        isNetworkError: boolean;
      };
    }
  ) => Promise<string>;
  getConversationAuditLog: (
    conversationId: string
  ) => Promise<Array<{ id: string; timestamp: string }>>;
  getAllAuditLogs: () => Promise<Map<string, Array<{ id: string; timestamp: string }>>>;
  exportForEDiscovery: (conversationId?: string) => Promise<string>;
  clearAuditLog: (conversationId: string, reason: string) => Promise<void>;
  shouldLogMalformedLineWarning: (skippedLines: number) => boolean;
  shouldAttemptRepair: (conversationId: string, now: number) => boolean;
  resetRepairStateForConversation: (conversationId: string) => void;
  readEntriesFromFile: (conversationId: string) => Promise<Array<{ id: string }>>;
  storeEvent: (
    entry: {
      id: string;
      timestamp: string;
      eventType: AuditEventType;
      severity: AuditSeverity;
      actor: 'USER' | 'SYSTEM' | 'API_PROVIDER';
      action: string;
      details: Record<string, unknown>;
    },
    conversationId?: string
  ) => Promise<void>;
  chainCache: Map<string, { lastEventId?: string; lastHash?: string; sequenceNumber: number }>;
  cacheLoaded: Set<string>;
  repairInProgress: Set<string>;
  lastRepairAttemptAt: Map<string, number>;
};

type AuditStorageScenario = {
  auditLogRead: unknown;
  auditLogReplace: unknown;
};

type MixedRewriteFixture = {
  lines: string[];
  expectedIds: string[];
  expectedRewriteJsonl: string;
};

type SingleMalformedFixture = {
  lines: string[];
  expectedIds: string[];
};

const flushAsync = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

const flushAuditRepair = async (): Promise<void> => {
  await flushAsync();
};

const MALFORMED_WARNING_LIMIT = 5;
const MALFORMED_SUPPRESSION_TEST_LINE_COUNT = MALFORMED_WARNING_LIMIT + 2;
const PRIMARY_CONVERSATION_ID = 'conv-1';
const COOLDOWN_CONVERSATION_ID = 'conv-cooldown';
const REPLACE_FAILURE_CONVERSATION_ID = 'conv-failure';
const WARN_CAP_CONVERSATION_ID = 'conv-warn-cap';
const READ_FAILURE_CONVERSATION_ID = 'conv-read-fail';
const EMPTY_CONVERSATION_ID = 'conv-empty';

const APP_LOGGER_INITIALIZED_MESSAGE = 'AppLogger initialized';

const jsonLine = (id: string): string => JSON.stringify({ id });
const malformedLine = (label: string): string => `{ malformed-${label}`;

const createStandardValidAuditLines = () => ({
  goodLineA: jsonLine('a'),
  goodLineB: jsonLine('b'),
});

const createSingleMalformedReadLines = (malformedLabel: string): string[] => {
  const { goodLineA } = createStandardValidAuditLines();
  return [goodLineA, malformedLine(malformedLabel)];
};

const createMixedRewriteFixture = (malformedLabel: string): MixedRewriteFixture => {
  const { goodLineA, goodLineB } = createStandardValidAuditLines();
  return {
    lines: [goodLineA, malformedLine(malformedLabel), goodLineB],
    expectedIds: ['a', 'b'],
    expectedRewriteJsonl: `${goodLineA}\n${goodLineB}`,
  };
};

const createSingleMalformedFixture = (malformedLabel: string): SingleMalformedFixture => ({
  lines: createSingleMalformedReadLines(malformedLabel),
  expectedIds: ['a'],
});

const createMixedMalformedSeriesFixture = (malformedCount: number): MixedRewriteFixture => {
  const { goodLineA, goodLineB } = createStandardValidAuditLines();
  const malformedLines = createMalformedLineSeries(malformedCount);
  return {
    lines: [goodLineA, ...malformedLines, goodLineB],
    expectedIds: ['a', 'b'],
    expectedRewriteJsonl: `${goodLineA}\n${goodLineB}`,
  };
};

const createMalformedLineSeries = (totalLines: number): string[] =>
  Array.from({ length: totalLines }, (_, index) => malformedLine(String(index + 1)));

const createSuccessfulAuditRead = (lines: string[]) =>
  vi.fn().mockResolvedValue({ success: true, lines });

const createSuccessfulAuditReadSequence = (readLineSets: string[][]) => {
  const auditReadMock = vi.fn();
  readLineSets.forEach(lines => {
    auditReadMock.mockResolvedValueOnce({ success: true, lines });
  });
  return auditReadMock;
};

const createFailedAuditRead = () => vi.fn().mockResolvedValue({ success: false, lines: [] });

const createSuccessfulAuditReplace = () => vi.fn().mockResolvedValue({ success: true });

const createFailedAuditReplace = () =>
  vi.fn().mockResolvedValue({
    success: false,
    error: { code: 'AUDIT_REPLACE_FAILED', message: 'replace failed' },
  });

const createSingleReadScenario = (
  lines: string[],
  options: { replaceShouldFail?: boolean } = {}
): AuditStorageScenario => ({
  auditLogRead: createSuccessfulAuditRead(lines),
  auditLogReplace: options.replaceShouldFail
    ? createFailedAuditReplace()
    : createSuccessfulAuditReplace(),
});

const createDoubleReadScenario = (readLineSets: string[][]): AuditStorageScenario => ({
  auditLogRead: createSuccessfulAuditReadSequence(readLineSets),
  auditLogReplace: createSuccessfulAuditReplace(),
});

const createFailedReadScenario = (): AuditStorageScenario => ({
  auditLogRead: createFailedAuditRead(),
  auditLogReplace: createSuccessfulAuditReplace(),
});

const getMalformedLineWarnings = (): unknown[] =>
  loggerSpies.warn.mock.calls
    .filter(([message]) => message === '[AppLogger] Skipping malformed audit log line')
    .map(([, payload]) => payload);

const getMalformedSummaryWarnings = (): unknown[] =>
  loggerSpies.warn.mock.calls
    .filter(([message]) => message === '[AppLogger] Malformed audit log lines were skipped')
    .map(([, payload]) => payload);

const expectMalformedSummaryPayload = (
  payload: unknown,
  summary: {
    conversationId: string;
    skippedLines: number;
    totalLines: number;
    suppressedMalformedWarnings: number;
  }
): void => {
  expect(payload).toEqual(
    expect.objectContaining({
      conversationId: summary.conversationId,
      skippedLines: summary.skippedLines,
      totalLines: summary.totalLines,
      warningLimit: MALFORMED_WARNING_LIMIT,
      suppressedMalformedWarnings: summary.suppressedMalformedWarnings,
    })
  );
};

const expectSingleMalformedSummary = (summary: {
  conversationId: string;
  skippedLines: number;
  totalLines: number;
  suppressedMalformedWarnings: number;
}): void => {
  const malformedSummaries = getMalformedSummaryWarnings();
  expect(malformedSummaries).toHaveLength(1);
  expectMalformedSummaryPayload(malformedSummaries[0], summary);
};

const expectEntryIds = (entries: Array<{ id: string }>, expectedIds: string[]): void => {
  expect(entries.map(entry => entry.id)).toEqual(expectedIds);
};

const expectNoEntries = (entries: Array<{ id: string }>): void => {
  expect(entries).toEqual([]);
};

const expectSingleReplaceCall = (
  auditLogReplace: unknown,
  expectedCall?: [string, string]
): void => {
  const replaceMock = auditLogReplace as ReturnType<typeof vi.fn>;
  expect(replaceMock).toHaveBeenCalledTimes(1);
  if (expectedCall) {
    expect(replaceMock).toHaveBeenCalledWith(...expectedCall);
  }
};

const expectNoReplaceCalls = (auditLogReplace: unknown): void => {
  expect(auditLogReplace as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
};

const expectSequentialMalformedLineWarnings = (
  conversationId: string,
  malformedLineWarnings: unknown[]
): void => {
  expect(malformedLineWarnings).toHaveLength(MALFORMED_WARNING_LIMIT);
  malformedLineWarnings.forEach((payload, index) => {
    expect(payload).toEqual(
      expect.objectContaining({
        conversationId,
        lineIndex: index,
        error: expect.any(String),
      })
    );
  });
};

const expectRepairCompletedLog = (conversationId: string, retainedEntries: number): void => {
  expect(loggerSpies.info).toHaveBeenCalledWith(
    '[AppLogger] Audit log self-repair completed',
    expect.objectContaining({
      conversationId,
      retainedEntries,
    })
  );
};

const expectRepairFailedLog = (conversationId: string): void => {
  expect(loggerSpies.warn).toHaveBeenCalledWith(
    '[AppLogger] Audit log self-repair failed',
    expect.objectContaining({
      conversationId,
      error: expect.anything(),
    })
  );
};

const expectRepairThrewLog = (conversationId: string, errorMessage: string): void => {
  expect(loggerSpies.warn).toHaveBeenCalledWith(
    '[AppLogger] Audit log self-repair threw an error',
    expect.objectContaining({
      conversationId,
      error: errorMessage,
    })
  );
};

const getInitializedLogPayloads = (): unknown[] =>
  loggerSpies.info.mock.calls
    .filter(([message]) => message === APP_LOGGER_INITIALIZED_MESSAGE)
    .map(([, payload]) => payload);

const expectLatestInitializedMaxEntries = (expectedMaxEntries: number): void => {
  const initializedPayloads = getInitializedLogPayloads();
  expect(initializedPayloads.length).toBeGreaterThan(0);
  expect(initializedPayloads[initializedPayloads.length - 1]).toEqual(
    expect.objectContaining({
      maxEntriesPerConversation: expectedMaxEntries,
    })
  );
};

const withRuntimeAuditMaxEntries = async <T>(
  runtimeMaxEntries: number | undefined,
  run: () => Promise<T> | T
): Promise<T> => {
  const runtimeConfig = globalThis as typeof globalThis & {
    __ATTICUS_AUDIT_MAX_ENTRIES__?: number;
  };
  const hadPreviousValue = Object.prototype.hasOwnProperty.call(
    runtimeConfig,
    '__ATTICUS_AUDIT_MAX_ENTRIES__'
  );
  const previousValue = runtimeConfig.__ATTICUS_AUDIT_MAX_ENTRIES__;

  if (runtimeMaxEntries === undefined) {
    delete runtimeConfig.__ATTICUS_AUDIT_MAX_ENTRIES__;
  } else {
    runtimeConfig.__ATTICUS_AUDIT_MAX_ENTRIES__ = runtimeMaxEntries;
  }

  try {
    return await run();
  } finally {
    if (hadPreviousValue) {
      runtimeConfig.__ATTICUS_AUDIT_MAX_ENTRIES__ = previousValue;
    } else {
      delete runtimeConfig.__ATTICUS_AUDIT_MAX_ENTRIES__;
    }
  }
};

const expectNoCooldownSkipWarnings = (): void => {
  const cooldownWarnings = loggerSpies.warn.mock.calls.filter(
    ([message]) => message === '[AppLogger] Audit log self-repair skipped due to cooldown'
  );
  expect(cooldownWarnings).toHaveLength(0);
};

const createInternalAuditLogger = (
  options: { maxEntriesPerConversation?: number } = {}
): InternalAuditLogger => new AuditLogger(options) as unknown as InternalAuditLogger;

const withMockElectronAPI = async <T>(
  api: Partial<typeof window.electronAPI>,
  run: () => Promise<T>
): Promise<T> => {
  const previousElectronAPI = window.electronAPI;
  (window as Window & { electronAPI: unknown }).electronAPI = {
    ...api,
  } as unknown as typeof window.electronAPI;

  try {
    return await run();
  } finally {
    (window as Window & { electronAPI: unknown }).electronAPI = previousElectronAPI;
  }
};

const withMockAuditStorage = async <T>(
  auditLogRead: unknown,
  auditLogReplace: unknown,
  run: () => Promise<T>
): Promise<T> =>
  withMockElectronAPI(
    {
      auditLogRead: auditLogRead as typeof window.electronAPI.auditLogRead,
      auditLogReplace: auditLogReplace as typeof window.electronAPI.auditLogReplace,
    },
    run
  );

const withMockStoreEventStorage = async <T>(
  api: {
    auditLogRead: unknown;
    auditLogReplace: unknown;
    auditLogAppend: unknown;
  },
  run: () => Promise<T>
): Promise<T> =>
  withMockElectronAPI(
    {
      auditLogRead: api.auditLogRead as typeof window.electronAPI.auditLogRead,
      auditLogReplace: api.auditLogReplace as typeof window.electronAPI.auditLogReplace,
      auditLogAppend: api.auditLogAppend as typeof window.electronAPI.auditLogAppend,
    },
    run
  );

const createValidPersistedEntry = (id: string, timestamp: string) => ({
  id,
  timestamp,
  eventType: AuditEventType.API_REQUEST_SENT,
  severity: AuditSeverity.INFO,
  actor: 'SYSTEM',
  action: `persisted-${id}`,
  details: { id },
  hash: `hash-${id}`,
});

const createStoredAuditEntry = (id: string) => ({
  id,
  timestamp: '2026-01-01T00:00:00.000Z',
  eventType: AuditEventType.API_REQUEST_SENT,
  severity: AuditSeverity.INFO,
  actor: 'SYSTEM' as const,
  action: `stored-${id}`,
  details: { id },
});

const readEntriesWithMockAuditStorage = async (
  internal: InternalAuditLogger,
  conversationId: string,
  auditLogRead: unknown,
  auditLogReplace: unknown,
  options: { flushRepair?: boolean } = {}
): Promise<Array<{ id: string }>> => {
  let entries: Array<{ id: string }> = [];

  await withMockAuditStorage(auditLogRead, auditLogReplace, async (): Promise<void> => {
    entries = await internal.readEntriesFromFile(conversationId);
    if (options.flushRepair !== false) {
      await flushAuditRepair();
    }
  });

  return entries;
};

const readEntriesTwiceWithMockAuditStorage = async (
  internal: InternalAuditLogger,
  conversationId: string,
  auditLogRead: unknown,
  auditLogReplace: unknown
): Promise<void> => {
  await withMockAuditStorage(auditLogRead, auditLogReplace, async (): Promise<void> => {
    await internal.readEntriesFromFile(conversationId);
    await flushAuditRepair();
    await internal.readEntriesFromFile(conversationId);
    await flushAuditRepair();
  });
};

const executeSingleReadScenario = async (
  conversationId: string,
  scenario: AuditStorageScenario,
  options: { flushRepair?: boolean } = {}
): Promise<{ entries: Array<{ id: string }>; auditLogReplace: unknown }> => {
  const internal = createInternalAuditLogger();
  const entries = await readEntriesWithMockAuditStorage(
    internal,
    conversationId,
    scenario.auditLogRead,
    scenario.auditLogReplace,
    options
  );

  return {
    entries,
    auditLogReplace: scenario.auditLogReplace,
  };
};

const executeDoubleReadScenario = async (
  conversationId: string,
  scenario: AuditStorageScenario
): Promise<{ auditLogReplace: unknown }> => {
  const internal = createInternalAuditLogger();
  await readEntriesTwiceWithMockAuditStorage(
    internal,
    conversationId,
    scenario.auditLogRead,
    scenario.auditLogReplace
  );

  return {
    auditLogReplace: scenario.auditLogReplace,
  };
};

describe('AuditLogger internals', () => {
  beforeEach(() => {
    loggerSpies.debug.mockClear();
    loggerSpies.info.mockClear();
    loggerSpies.warn.mockClear();
    loggerSpies.error.mockClear();
  });

  it('caps malformed-line warning details after threshold', () => {
    const internal = createInternalAuditLogger();

    expect(internal.shouldLogMalformedLineWarning(1)).toBe(true);
    expect(internal.shouldLogMalformedLineWarning(MALFORMED_WARNING_LIMIT)).toBe(true);
    expect(internal.shouldLogMalformedLineWarning(MALFORMED_WARNING_LIMIT + 1)).toBe(false);
  });

  it('uses default max entries when neither options nor runtime config provide a finite value', async () => {
    await withRuntimeAuditMaxEntries(undefined, async (): Promise<void> => {
      createInternalAuditLogger();
      expectLatestInitializedMaxEntries(10_000);
    });
  });

  it('uses runtime max entries when options are omitted', async () => {
    await withRuntimeAuditMaxEntries(4321, async (): Promise<void> => {
      createInternalAuditLogger();
      expectLatestInitializedMaxEntries(4321);
    });
  });

  it('applies floor and min clamp to runtime max entries', async () => {
    await withRuntimeAuditMaxEntries(123.9, async (): Promise<void> => {
      createInternalAuditLogger();
      expectLatestInitializedMaxEntries(123);
    });

    await withRuntimeAuditMaxEntries(42, async (): Promise<void> => {
      createInternalAuditLogger();
      expectLatestInitializedMaxEntries(100);
    });
  });

  it('prefers explicit options over runtime config and applies min clamp', async () => {
    await withRuntimeAuditMaxEntries(9999, async (): Promise<void> => {
      createInternalAuditLogger({ maxEntriesPerConversation: 250 });
      expectLatestInitializedMaxEntries(250);
    });

    await withRuntimeAuditMaxEntries(9999, async (): Promise<void> => {
      createInternalAuditLogger({ maxEntriesPerConversation: 17 });
      expectLatestInitializedMaxEntries(100);
    });
  });

  it('memoizes initialization so concurrent initialize calls generate keys once', async () => {
    const generateKeySpy = vi.spyOn(crypto.subtle, 'generateKey');

    try {
      const internal = createInternalAuditLogger();
      await Promise.all([internal.initialize(), internal.initialize()]);

      expect(generateKeySpy).toHaveBeenCalledTimes(1);
    } finally {
      generateKeySpy.mockRestore();
    }
  });

  it('logs initialization failure when key generation rejects', async () => {
    const generateKeySpy = vi
      .spyOn(crypto.subtle, 'generateKey')
      .mockRejectedValueOnce(new Error('keygen failed'));

    try {
      const internal = createInternalAuditLogger();
      await internal.initialize();

      expect(loggerSpies.error).toHaveBeenCalledWith(
        '[AppLogger] Failed to initialize signing keys',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    } finally {
      generateKeySpy.mockRestore();
    }
  });

  it('returns AUDIT_FAILED id when logEvent encounters a runtime error', async () => {
    const randomUuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('uuid failed');
    });

    try {
      const internal = createInternalAuditLogger();
      const eventId = await internal.logEvent(
        AuditEventType.API_REQUEST_SENT,
        AuditSeverity.INFO,
        'SYSTEM',
        'runtime-failure-test',
        {}
      );

      expect(eventId).toMatch(/^AUDIT_FAILED_/);
      expect(loggerSpies.error).toHaveBeenCalledWith(
        '[AppLogger] Failed to log event',
        expect.objectContaining({
          error: expect.any(Error),
          eventType: AuditEventType.API_REQUEST_SENT,
        })
      );
    } finally {
      randomUuidSpy.mockRestore();
    }
  });

  it('continues logEvent in degraded mode when key generation fails', async () => {
    const generateKeySpy = vi
      .spyOn(crypto.subtle, 'generateKey')
      .mockRejectedValueOnce(new Error('keygen failed'));
    const randomUuidSpy = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('00000000-0000-4000-8000-000000000000');

    try {
      const internal = createInternalAuditLogger();
      const eventId = await internal.logEvent(
        AuditEventType.API_REQUEST_SENT,
        AuditSeverity.INFO,
        'SYSTEM',
        'degraded-mode-test',
        {}
      );

      expect(eventId).toBe('00000000-0000-4000-8000-000000000000');
      expect(loggerSpies.warn).toHaveBeenCalledWith('[AppLogger] No signing key available');
    } finally {
      generateKeySpy.mockRestore();
      randomUuidSpy.mockRestore();
    }
  });

  it('returns undefined from signEntry and warns when signing key is unavailable', async () => {
    const internal = createInternalAuditLogger() as unknown as {
      signEntry: (hash: string) => Promise<string | undefined>;
      signingKey: CryptoKey | null;
    };
    internal.signingKey = null;

    const signature = await internal.signEntry('abc123');

    expect(signature).toBeUndefined();
    expect(loggerSpies.warn).toHaveBeenCalledWith('[AppLogger] No signing key available');
  });

  it('returns undefined from signEntry and logs error when crypto.sign throws', async () => {
    const internal = createInternalAuditLogger() as unknown as {
      initialize: () => Promise<void>;
      signEntry: (hash: string) => Promise<string | undefined>;
      signingKey: CryptoKey | null;
    };
    const generateKeySpy = vi.spyOn(crypto.subtle, 'generateKey');
    const signSpy = vi.spyOn(crypto.subtle, 'sign').mockRejectedValueOnce(new Error('sign failed'));

    try {
      await internal.initialize();
      const signature = await internal.signEntry('abc123');

      expect(signature).toBeUndefined();
      expect(loggerSpies.error).toHaveBeenCalledWith(
        '[AppLogger] Signature generation failed',
        expect.objectContaining({ error: expect.any(Error) })
      );
      expect(generateKeySpy).toHaveBeenCalled();
    } finally {
      signSpy.mockRestore();
      generateKeySpy.mockRestore();
    }
  });

  it('returns false from verifySignature and warns when verifying key is unavailable', async () => {
    const internal = createInternalAuditLogger() as unknown as {
      verifySignature: (hash: string, signatureB64: string) => Promise<boolean>;
      verifyingKey: CryptoKey | null;
    };
    internal.verifyingKey = null;

    const isValid = await internal.verifySignature('abc123', 'AAAA');

    expect(isValid).toBe(false);
    expect(loggerSpies.warn).toHaveBeenCalledWith('[AppLogger] No verifying key available');
  });

  it('returns false from verifySignature and logs error when signature decoding fails', async () => {
    const internal = createInternalAuditLogger() as unknown as {
      initialize: () => Promise<void>;
      verifySignature: (hash: string, signatureB64: string) => Promise<boolean>;
    };

    await internal.initialize();
    const isValid = await internal.verifySignature('abc123', 'not-base64@@');

    expect(isValid).toBe(false);
    expect(loggerSpies.error).toHaveBeenCalledWith(
      '[AppLogger] Signature verification failed',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('returns HASH_FAILED fallback and logs error when digest computation throws', async () => {
    const internal = createInternalAuditLogger() as unknown as {
      computeHash: (entry: Record<string, unknown>) => Promise<string>;
    };
    const digestSpy = vi
      .spyOn(crypto.subtle, 'digest')
      .mockRejectedValueOnce(new Error('digest failed'));

    try {
      const hash = await internal.computeHash({ id: 'hash-failure-entry' });

      expect(hash).toMatch(/^HASH_FAILED_/);
      expect(loggerSpies.error).toHaveBeenCalledWith(
        '[AppLogger] Hash computation failed',
        expect.objectContaining({ error: expect.any(Error) })
      );
    } finally {
      digestSpy.mockRestore();
    }
  });

  it.each([
    { userDecision: undefined, expectedEventType: AuditEventType.PII_SCAN_PERFORMED },
    { userDecision: 'proceed' as const, expectedEventType: AuditEventType.PII_USER_PROCEEDED },
    { userDecision: 'cancel' as const, expectedEventType: AuditEventType.PII_USER_CANCELLED },
    { userDecision: 'anonymize' as const, expectedEventType: AuditEventType.PII_USER_ANONYMIZED },
  ])(
    'maps logPIIScan decision to event type: $expectedEventType',
    async ({ userDecision, expectedEventType }) => {
      const internal = createInternalAuditLogger();
      const logEventSpy = vi.spyOn(internal, 'logEvent').mockResolvedValue('evt-pii-map');

      await internal.logPIIScan(
        PRIMARY_CONVERSATION_ID,
        'msg-1',
        {
          hasFindings: false,
          findingsCount: 0,
          riskLevel: 'low',
          detectedTypes: [],
        },
        'preview',
        userDecision
      );

      expect(logEventSpy).toHaveBeenCalledWith(
        expectedEventType,
        AuditSeverity.INFO,
        'USER',
        expect.any(String),
        expect.objectContaining({
          messagePreview: 'preview',
          userDecision,
        }),
        PRIMARY_CONVERSATION_ID,
        'msg-1'
      );
    }
  );

  it('uses CRITICAL severity for logPIIScan when findings are present', async () => {
    const internal = createInternalAuditLogger();
    const logEventSpy = vi.spyOn(internal, 'logEvent').mockResolvedValue('evt-pii-critical');

    await internal.logPIIScan(
      PRIMARY_CONVERSATION_ID,
      'msg-critical',
      {
        hasFindings: true,
        findingsCount: 2,
        riskLevel: 'high',
        detectedTypes: ['ssn'],
      },
      'critical preview',
      undefined
    );

    expect(logEventSpy).toHaveBeenCalledWith(
      AuditEventType.PII_SCAN_PERFORMED,
      AuditSeverity.CRITICAL,
      'USER',
      expect.any(String),
      expect.any(Object),
      PRIMARY_CONVERSATION_ID,
      'msg-critical'
    );
  });

  it('routes logAPIRequest through API_REQUEST_SENT with INFO severity', async () => {
    const internal = createInternalAuditLogger();
    const logEventSpy = vi.spyOn(internal, 'logEvent').mockResolvedValue('evt-api-request');

    await internal.logAPIRequest(PRIMARY_CONVERSATION_ID, 'msg-api', {
      provider: 'openai',
      providerDisplayName: 'OpenAI',
      model: 'gpt-test',
      endpoint: '/chat/completions',
      messageCount: 1,
      systemPromptPresent: false,
      initiatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(logEventSpy).toHaveBeenCalledWith(
      AuditEventType.API_REQUEST_SENT,
      AuditSeverity.INFO,
      'SYSTEM',
      'API request to openai (gpt-test)',
      expect.objectContaining({
        provider: 'openai',
        model: 'gpt-test',
      }),
      PRIMARY_CONVERSATION_ID,
      'msg-api'
    );
  });

  it.each([
    {
      details: {
        provider: 'openai',
        model: 'gpt-test',
        responseReceived: false,
        error: {
          code: 'provider_error',
          message: 'provider failed',
          isProviderError: true,
          isUserError: false,
          isNetworkError: false,
        },
      },
      expectedEventType: AuditEventType.API_ERROR_OCCURRED,
      expectedSeverity: AuditSeverity.ERROR,
      expectedAction: 'API error from openai: provider failed',
    },
    {
      details: {
        provider: 'openai',
        model: 'gpt-test',
        responseReceived: false,
        error: {
          code: 'user_error',
          message: 'bad input',
          isProviderError: false,
          isUserError: true,
          isNetworkError: false,
        },
      },
      expectedEventType: AuditEventType.API_ERROR_OCCURRED,
      expectedSeverity: AuditSeverity.WARNING,
      expectedAction: 'API error from openai: bad input',
    },
    {
      details: {
        provider: 'openai',
        model: 'gpt-test',
        responseReceived: true,
      },
      expectedEventType: AuditEventType.API_RESPONSE_RECEIVED,
      expectedSeverity: AuditSeverity.INFO,
      expectedAction: 'API response from openai',
    },
  ])(
    'maps logAPIResponse severity/event correctly',
    async ({ details, expectedEventType, expectedSeverity, expectedAction }) => {
      const internal = createInternalAuditLogger();
      const logEventSpy = vi.spyOn(internal, 'logEvent').mockResolvedValue('evt-api-response');

      await internal.logAPIResponse(PRIMARY_CONVERSATION_ID, 'msg-api-resp', details);

      expect(logEventSpy).toHaveBeenCalledWith(
        expectedEventType,
        expectedSeverity,
        'API_PROVIDER',
        expectedAction,
        expect.objectContaining({ provider: 'openai', model: 'gpt-test' }),
        PRIMARY_CONVERSATION_ID,
        'msg-api-resp'
      );
    }
  );

  it('sorts conversation audit log entries by timestamp ascending', async () => {
    const internal = createInternalAuditLogger();
    const verifyChainSpy = vi
      .spyOn(
        internal as unknown as {
          verifyChainIntegrity: (
            entries: unknown[]
          ) => Promise<{ valid: boolean; errors: string[] }>;
        },
        'verifyChainIntegrity'
      )
      .mockResolvedValue({ valid: true, errors: [] });

    const first = createValidPersistedEntry('a', '2026-01-01T00:00:02.000Z');
    const second = createValidPersistedEntry('b', '2026-01-01T00:00:01.000Z');
    const auditLogRead = createSuccessfulAuditRead([JSON.stringify(first), JSON.stringify(second)]);

    try {
      const entries = await withMockElectronAPI(
        {
          auditLogRead: auditLogRead as typeof window.electronAPI.auditLogRead,
        },
        async (): Promise<Array<{ id: string; timestamp: string }>> =>
          internal.getConversationAuditLog(PRIMARY_CONVERSATION_ID)
      );

      expect(entries.map(entry => entry.id)).toEqual(['b', 'a']);
    } finally {
      verifyChainSpy.mockRestore();
    }
  });

  it('logs tampering diagnostics when chain verification fails', async () => {
    const internal = createInternalAuditLogger();
    const verifyChainSpy = vi
      .spyOn(
        internal as unknown as {
          verifyChainIntegrity: (
            entries: unknown[]
          ) => Promise<{ valid: boolean; errors: string[] }>;
        },
        'verifyChainIntegrity'
      )
      .mockResolvedValue({ valid: false, errors: ['hash mismatch'] });
    const auditLogRead = createSuccessfulAuditRead([
      JSON.stringify(createValidPersistedEntry('tampered', '2026-01-01T00:00:00.000Z')),
    ]);

    try {
      await withMockElectronAPI(
        {
          auditLogRead: auditLogRead as typeof window.electronAPI.auditLogRead,
        },
        async (): Promise<void> => {
          await internal.getConversationAuditLog(PRIMARY_CONVERSATION_ID);
        }
      );

      expect(loggerSpies.error).toHaveBeenCalledWith(
        '[AppLogger] TAMPERING DETECTED!',
        expect.objectContaining({ errors: ['hash mismatch'] })
      );
    } finally {
      verifyChainSpy.mockRestore();
    }
  });

  it('returns empty conversation log and logs retrieval failure when read throws', async () => {
    const internal = createInternalAuditLogger();
    const auditLogRead = vi.fn().mockRejectedValueOnce(new Error('read crashed'));

    const entries = await withMockElectronAPI(
      {
        auditLogRead: auditLogRead as typeof window.electronAPI.auditLogRead,
      },
      async (): Promise<Array<{ id: string; timestamp: string }>> =>
        internal.getConversationAuditLog(PRIMARY_CONVERSATION_ID)
    );

    expect(entries).toEqual([]);
    expect(loggerSpies.error).toHaveBeenCalledWith(
      '[AppLogger] Failed to retrieve audit log',
      expect.objectContaining({
        conversationId: PRIMARY_CONVERSATION_ID,
        error: expect.any(Error),
      })
    );
  });

  it('returns empty map from getAllAuditLogs when list call fails', async () => {
    const internal = createInternalAuditLogger();

    const logs = await withMockElectronAPI(
      {
        auditLogList: vi.fn().mockResolvedValue({
          success: false,
          conversationIds: [],
          error: { code: 'AUDIT_LIST_FAILED', message: 'list failed' },
        }) as typeof window.electronAPI.auditLogList,
      },
      async (): Promise<Map<string, Array<{ id: string; timestamp: string }>>> =>
        internal.getAllAuditLogs()
    );

    expect(logs.size).toBe(0);
  });

  it('aggregates logs for all conversation ids returned by list', async () => {
    const internal = createInternalAuditLogger();
    const getConversationSpy = vi.spyOn(internal, 'getConversationAuditLog').mockImplementation(
      async (conversationId: string): Promise<Array<{ id: string; timestamp: string }>> => [
        {
          id: `id-${conversationId}`,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      ]
    );

    try {
      const logs = await withMockElectronAPI(
        {
          auditLogList: vi.fn().mockResolvedValue({
            success: true,
            conversationIds: ['conv-a', 'conv-b'],
          }) as typeof window.electronAPI.auditLogList,
        },
        async (): Promise<Map<string, Array<{ id: string; timestamp: string }>>> =>
          internal.getAllAuditLogs()
      );

      expect(logs.get('conv-a')?.[0].id).toBe('id-conv-a');
      expect(logs.get('conv-b')?.[0].id).toBe('id-conv-b');
      expect(getConversationSpy).toHaveBeenCalledTimes(2);
    } finally {
      getConversationSpy.mockRestore();
    }
  });

  it('logs and returns empty map when getAllAuditLogs list call throws', async () => {
    const internal = createInternalAuditLogger();

    const logs = await withMockElectronAPI(
      {
        auditLogList: vi
          .fn()
          .mockRejectedValueOnce(
            new Error('list exploded')
          ) as typeof window.electronAPI.auditLogList,
      },
      async (): Promise<Map<string, Array<{ id: string; timestamp: string }>>> =>
        internal.getAllAuditLogs()
    );

    expect(logs.size).toBe(0);
    expect(loggerSpies.error).toHaveBeenCalledWith(
      '[AppLogger] Failed to retrieve all audit logs',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('formats exportForEDiscovery with production numbers and export metadata', async () => {
    const internal = createInternalAuditLogger();
    const getAllSpy = vi
      .spyOn(internal, 'getAllAuditLogs')
      .mockResolvedValue(
        new Map([['conv-ed', [{ id: 'entry-1', timestamp: '2026-01-01T00:00:00.000Z' }]]])
      );

    try {
      const exportPayload = await internal.exportForEDiscovery();
      expect(exportPayload).toContain('"productionNumber":"ATTICUS_conv-ed_entry-1"');
      expect(exportPayload).toContain('"exportedBy":"Atticus Audit System"');
      expect(exportPayload).toContain('"exportTimestamp":');
    } finally {
      getAllSpy.mockRestore();
    }
  });

  it('exports only requested conversation when conversationId is provided', async () => {
    const internal = createInternalAuditLogger();
    const getConversationSpy = vi
      .spyOn(internal, 'getConversationAuditLog')
      .mockResolvedValue([{ id: 'entry-scoped', timestamp: '2026-01-01T00:00:00.000Z' }]);
    const getAllSpy = vi.spyOn(internal, 'getAllAuditLogs');

    try {
      const exportPayload = await internal.exportForEDiscovery(PRIMARY_CONVERSATION_ID);
      expect(exportPayload).toContain('"productionNumber":"ATTICUS_conv-1_entry-scoped"');
      expect(getConversationSpy).toHaveBeenCalledWith(PRIMARY_CONVERSATION_ID);
      expect(getAllSpy).not.toHaveBeenCalled();
    } finally {
      getConversationSpy.mockRestore();
      getAllSpy.mockRestore();
    }
  });

  it('returns empty export payload and logs error when export aggregation throws', async () => {
    const internal = createInternalAuditLogger();
    const getAllSpy = vi
      .spyOn(internal, 'getAllAuditLogs')
      .mockRejectedValueOnce(new Error('export exploded'));

    try {
      const exportPayload = await internal.exportForEDiscovery();
      expect(exportPayload).toBe('');
      expect(loggerSpies.error).toHaveBeenCalledWith(
        '[AppLogger] Failed to export for eDiscovery',
        expect.objectContaining({ error: expect.any(Error) })
      );
    } finally {
      getAllSpy.mockRestore();
    }
  });

  it('clears caches and repair state after successful clearAuditLog', async () => {
    const internal = createInternalAuditLogger();
    const logEventSpy = vi.spyOn(internal, 'logEvent').mockResolvedValue('evt-clear');

    internal.chainCache.set(PRIMARY_CONVERSATION_ID, {
      lastEventId: 'tail',
      lastHash: 'hash',
      sequenceNumber: 5,
    });
    internal.cacheLoaded.add(PRIMARY_CONVERSATION_ID);
    internal.repairInProgress.add(PRIMARY_CONVERSATION_ID);
    internal.lastRepairAttemptAt.set(PRIMARY_CONVERSATION_ID, Date.now());

    try {
      await withMockElectronAPI(
        {
          auditLogDelete: vi
            .fn()
            .mockResolvedValue({ success: true }) as typeof window.electronAPI.auditLogDelete,
        },
        async (): Promise<void> => {
          await internal.clearAuditLog(PRIMARY_CONVERSATION_ID, 'user-request');
        }
      );

      expect(logEventSpy).toHaveBeenCalledWith(
        AuditEventType.AUDIT_LOG_CLEARED,
        AuditSeverity.WARNING,
        'USER',
        'Audit log cleared',
        expect.objectContaining({ reason: 'user-request' }),
        PRIMARY_CONVERSATION_ID
      );
      expect(internal.chainCache.has(PRIMARY_CONVERSATION_ID)).toBe(false);
      expect(internal.cacheLoaded.has(PRIMARY_CONVERSATION_ID)).toBe(false);
      expect(internal.repairInProgress.has(PRIMARY_CONVERSATION_ID)).toBe(false);
      expect(internal.lastRepairAttemptAt.has(PRIMARY_CONVERSATION_ID)).toBe(false);
    } finally {
      logEventSpy.mockRestore();
    }
  });

  it('logs clearAuditLog failure when delete operation fails', async () => {
    const internal = createInternalAuditLogger();
    const logEventSpy = vi.spyOn(internal, 'logEvent').mockResolvedValue('evt-clear');

    try {
      await withMockElectronAPI(
        {
          auditLogDelete: vi.fn().mockResolvedValue({
            success: false,
            error: { code: 'AUDIT_DELETE_FAILED', message: 'delete failed' },
          }) as typeof window.electronAPI.auditLogDelete,
        },
        async (): Promise<void> => {
          await internal.clearAuditLog(PRIMARY_CONVERSATION_ID, 'user-request');
        }
      );

      expect(loggerSpies.error).toHaveBeenCalledWith(
        '[AppLogger] Failed to clear audit log',
        expect.objectContaining({
          conversationId: PRIMARY_CONVERSATION_ID,
          error: expect.any(Error),
        })
      );
    } finally {
      logEventSpy.mockRestore();
    }
  });

  it('keeps warning detail disabled for any values above the cap', () => {
    const internal = createInternalAuditLogger();

    expect(internal.shouldLogMalformedLineWarning(20)).toBe(false);
  });

  it('allows repair when no recent attempt exists', () => {
    const internal = createInternalAuditLogger();

    expect(internal.shouldAttemptRepair(PRIMARY_CONVERSATION_ID, Date.now())).toBe(true);
    expectNoCooldownSkipWarnings();
  });

  it('blocks repair attempts during cooldown and re-allows after cooldown', () => {
    const internal = createInternalAuditLogger();

    const now = Date.now();
    internal.lastRepairAttemptAt.set(PRIMARY_CONVERSATION_ID, now - 30_000);
    expect(internal.shouldAttemptRepair(PRIMARY_CONVERSATION_ID, now)).toBe(false);

    internal.lastRepairAttemptAt.set(PRIMARY_CONVERSATION_ID, now - 61_000);
    expect(internal.shouldAttemptRepair(PRIMARY_CONVERSATION_ID, now)).toBe(true);
  });

  it('does not emit cooldown warning when attempt is outside cooldown window', () => {
    const internal = createInternalAuditLogger();

    const now = Date.now();
    internal.lastRepairAttemptAt.set(PRIMARY_CONVERSATION_ID, now - 61_000);

    expect(internal.shouldAttemptRepair(PRIMARY_CONVERSATION_ID, now)).toBe(true);
    expectNoCooldownSkipWarnings();
  });

  it('logs cooldown warning diagnostics when repair is skipped by cooldown', () => {
    const internal = createInternalAuditLogger();

    const now = Date.now();
    const elapsedMs = 30_000;
    internal.lastRepairAttemptAt.set(PRIMARY_CONVERSATION_ID, now - elapsedMs);

    expect(internal.shouldAttemptRepair(PRIMARY_CONVERSATION_ID, now)).toBe(false);
    expect(loggerSpies.warn).toHaveBeenCalledWith(
      '[AppLogger] Audit log self-repair skipped due to cooldown',
      expect.objectContaining({
        conversationId: PRIMARY_CONVERSATION_ID,
        cooldownMs: 60_000,
        elapsedMs,
      })
    );
  });

  it('resets repair lock and cooldown state for a conversation', () => {
    const internal = createInternalAuditLogger();

    internal.repairInProgress.add(PRIMARY_CONVERSATION_ID);
    internal.lastRepairAttemptAt.set(PRIMARY_CONVERSATION_ID, Date.now());

    internal.resetRepairStateForConversation(PRIMARY_CONVERSATION_ID);

    expect(internal.repairInProgress.has(PRIMARY_CONVERSATION_ID)).toBe(false);
    expect(internal.lastRepairAttemptAt.has(PRIMARY_CONVERSATION_ID)).toBe(false);
  });

  it('allows repair after reset even if previous attempt was within cooldown', () => {
    const internal = createInternalAuditLogger();

    const now = Date.now();
    internal.lastRepairAttemptAt.set(PRIMARY_CONVERSATION_ID, now - 10_000);
    expect(internal.shouldAttemptRepair(PRIMARY_CONVERSATION_ID, now)).toBe(false);

    internal.resetRepairStateForConversation(PRIMARY_CONVERSATION_ID);
    expect(internal.shouldAttemptRepair(PRIMARY_CONVERSATION_ID, now)).toBe(true);
  });

  it('skips malformed lines and triggers best-effort repair rewrite', async () => {
    const fixture = createMixedRewriteFixture('primary');
    const { entries, auditLogReplace } = await executeSingleReadScenario(
      PRIMARY_CONVERSATION_ID,
      createSingleReadScenario(fixture.lines)
    );
    expectEntryIds(entries, fixture.expectedIds);

    expectSingleReplaceCall(auditLogReplace, [
      PRIMARY_CONVERSATION_ID,
      fixture.expectedRewriteJsonl,
    ]);

    expectSingleMalformedSummary({
      conversationId: PRIMARY_CONVERSATION_ID,
      skippedLines: 1,
      totalLines: 3,
      suppressedMalformedWarnings: 0,
    });
  });

  it('suppresses repeated repair rewrite during cooldown window', async () => {
    const fixture = createSingleMalformedFixture('cooldown');
    const { auditLogReplace } = await executeDoubleReadScenario(
      COOLDOWN_CONVERSATION_ID,
      createDoubleReadScenario([fixture.lines, fixture.lines])
    );

    expectSingleReplaceCall(auditLogReplace);
  });

  it('handles repair overwrite failure without throwing from read flow', async () => {
    const fixture = createSingleMalformedFixture('replace-fail');
    const { entries, auditLogReplace } = await executeSingleReadScenario(
      REPLACE_FAILURE_CONVERSATION_ID,
      createSingleReadScenario(fixture.lines, { replaceShouldFail: true })
    );
    expectEntryIds(entries, fixture.expectedIds);

    expectSingleReplaceCall(auditLogReplace);
  });

  it('records repair-attempt timestamp when malformed lines schedule self-repair', async () => {
    const internal = createInternalAuditLogger();
    const fixture = createSingleMalformedFixture('timestamped-repair');
    const { auditLogRead, auditLogReplace } = createSingleReadScenario(fixture.lines);

    const entries = await readEntriesWithMockAuditStorage(
      internal,
      PRIMARY_CONVERSATION_ID,
      auditLogRead,
      auditLogReplace
    );

    expectEntryIds(entries, fixture.expectedIds);
    expect(internal.lastRepairAttemptAt.has(PRIMARY_CONVERSATION_ID)).toBe(true);
    expect(typeof internal.lastRepairAttemptAt.get(PRIMARY_CONVERSATION_ID)).toBe('number');
  });

  it('logs self-repair completion details after successful malformed-line cleanup', async () => {
    const fixture = createMixedRewriteFixture('repair-success-log');
    const { entries } = await executeSingleReadScenario(
      PRIMARY_CONVERSATION_ID,
      createSingleReadScenario(fixture.lines)
    );

    expectEntryIds(entries, fixture.expectedIds);
    expectRepairCompletedLog(PRIMARY_CONVERSATION_ID, fixture.expectedIds.length);
  });

  it('logs self-repair failure details when overwrite result is unsuccessful', async () => {
    const fixture = createSingleMalformedFixture('repair-failed-log');
    const { entries } = await executeSingleReadScenario(
      REPLACE_FAILURE_CONVERSATION_ID,
      createSingleReadScenario(fixture.lines, { replaceShouldFail: true })
    );

    expectEntryIds(entries, fixture.expectedIds);
    expectRepairFailedLog(REPLACE_FAILURE_CONVERSATION_ID);
  });

  it('logs self-repair thrown-error details when overwrite throws', async () => {
    const fixture = createSingleMalformedFixture('repair-throws-log');
    const repairThrowMessage = 'replace crashed';
    const auditLogRead = createSuccessfulAuditRead(fixture.lines);
    const auditLogReplace = vi.fn().mockRejectedValueOnce(new Error(repairThrowMessage));

    const entries = await readEntriesWithMockAuditStorage(
      createInternalAuditLogger(),
      PRIMARY_CONVERSATION_ID,
      auditLogRead,
      auditLogReplace
    );

    expectEntryIds(entries, fixture.expectedIds);
    expectRepairThrewLog(PRIMARY_CONVERSATION_ID, repairThrowMessage);
  });

  it('clears repair-in-progress state after unsuccessful replace result', async () => {
    const internal = createInternalAuditLogger();
    const fixture = createSingleMalformedFixture('repair-state-fail-result');
    const { auditLogRead, auditLogReplace } = createSingleReadScenario(fixture.lines, {
      replaceShouldFail: true,
    });

    const entries = await readEntriesWithMockAuditStorage(
      internal,
      REPLACE_FAILURE_CONVERSATION_ID,
      auditLogRead,
      auditLogReplace
    );

    expectEntryIds(entries, fixture.expectedIds);
    expect(internal.repairInProgress.has(REPLACE_FAILURE_CONVERSATION_ID)).toBe(false);
  });

  it('clears repair-in-progress state after thrown replace error', async () => {
    const internal = createInternalAuditLogger();
    const fixture = createSingleMalformedFixture('repair-state-throw');
    const auditLogRead = createSuccessfulAuditRead(fixture.lines);
    const auditLogReplace = vi.fn().mockRejectedValueOnce(new Error('replace exploded'));

    const entries = await readEntriesWithMockAuditStorage(
      internal,
      PRIMARY_CONVERSATION_ID,
      auditLogRead,
      auditLogReplace
    );

    expectEntryIds(entries, fixture.expectedIds);
    expect(internal.repairInProgress.has(PRIMARY_CONVERSATION_ID)).toBe(false);
  });

  it('caps malformed-line warning detail and emits suppression summary', async () => {
    const malformedLines = createMalformedLineSeries(MALFORMED_SUPPRESSION_TEST_LINE_COUNT);
    const suppressedMalformedWarnings = malformedLines.length - MALFORMED_WARNING_LIMIT;
    const { entries, auditLogReplace } = await executeSingleReadScenario(
      WARN_CAP_CONVERSATION_ID,
      createSingleReadScenario(malformedLines)
    );
    expectNoEntries(entries);
    expectSingleReplaceCall(auditLogReplace, [WARN_CAP_CONVERSATION_ID, '']);

    const malformedLineWarnings = getMalformedLineWarnings();
    expectSequentialMalformedLineWarnings(WARN_CAP_CONVERSATION_ID, malformedLineWarnings);

    expectSingleMalformedSummary({
      conversationId: WARN_CAP_CONVERSATION_ID,
      skippedLines: malformedLines.length,
      totalLines: malformedLines.length,
      suppressedMalformedWarnings,
    });
  });

  it('reports mixed malformed-summary counts while retaining valid entries', async () => {
    const fixture = createMixedMalformedSeriesFixture(MALFORMED_WARNING_LIMIT + 1);
    const skippedLines = MALFORMED_WARNING_LIMIT + 1;
    const suppressedMalformedWarnings = skippedLines - MALFORMED_WARNING_LIMIT;
    const { entries } = await executeSingleReadScenario(
      WARN_CAP_CONVERSATION_ID,
      createSingleReadScenario(fixture.lines)
    );

    expectEntryIds(entries, fixture.expectedIds);
    expectSingleMalformedSummary({
      conversationId: WARN_CAP_CONVERSATION_ID,
      skippedLines,
      totalLines: fixture.lines.length,
      suppressedMalformedWarnings,
    });
  });

  it('preserves original line indexes in malformed-line warning payloads for interleaved input', async () => {
    const { goodLineA, goodLineB } = createStandardValidAuditLines();
    const interleavedLines = [goodLineA, malformedLine('x1'), goodLineB, malformedLine('x2')];

    const { entries } = await executeSingleReadScenario(
      PRIMARY_CONVERSATION_ID,
      createSingleReadScenario(interleavedLines)
    );

    expectEntryIds(entries, ['a', 'b']);
    const malformedLineWarnings = getMalformedLineWarnings();
    expect(malformedLineWarnings).toHaveLength(2);
    expect(malformedLineWarnings[0]).toEqual(
      expect.objectContaining({
        conversationId: PRIMARY_CONVERSATION_ID,
        lineIndex: 1,
      })
    );
    expect(malformedLineWarnings[1]).toEqual(
      expect.objectContaining({
        conversationId: PRIMARY_CONVERSATION_ID,
        lineIndex: 3,
      })
    );
  });

  it('does not attempt repair when audit log read fails', async () => {
    const { entries, auditLogReplace } = await executeSingleReadScenario(
      READ_FAILURE_CONVERSATION_ID,
      createFailedReadScenario()
    );
    expectNoEntries(entries);
    expectNoReplaceCalls(auditLogReplace);
  });

  it('does not schedule duplicate repair when repair is already in progress', async () => {
    const internal = createInternalAuditLogger();
    const fixture = createSingleMalformedFixture('in-progress');
    const { auditLogRead, auditLogReplace } = createSingleReadScenario(fixture.lines, {
      replaceShouldFail: true,
    });
    internal.repairInProgress.add(PRIMARY_CONVERSATION_ID);

    const entries = await readEntriesWithMockAuditStorage(
      internal,
      PRIMARY_CONVERSATION_ID,
      auditLogRead,
      auditLogReplace
    );

    expectEntryIds(entries, fixture.expectedIds);
    expectNoReplaceCalls(auditLogReplace);
  });

  it('does not log malformed summary or attempt repair on empty successful read', async () => {
    const { entries, auditLogReplace } = await executeSingleReadScenario(
      EMPTY_CONVERSATION_ID,
      createSingleReadScenario([], {
        replaceShouldFail: true,
      })
    );
    expectNoEntries(entries);

    expectNoReplaceCalls(auditLogReplace);
    expect(getMalformedSummaryWarnings()).toHaveLength(0);
  });

  it('stores event via append when conversation has not reached rotation limit', async () => {
    const internal = createInternalAuditLogger();
    const auditLogRead = createSuccessfulAuditRead([]);
    const auditLogReplace = createSuccessfulAuditReplace();
    const auditLogAppend = vi.fn().mockResolvedValue({ success: true });

    await withMockStoreEventStorage(
      { auditLogRead, auditLogReplace, auditLogAppend },
      async (): Promise<void> => {
        await internal.storeEvent(createStoredAuditEntry('append-entry'), PRIMARY_CONVERSATION_ID);
      }
    );

    expect(auditLogAppend).toHaveBeenCalledTimes(1);
    expect(auditLogAppend).toHaveBeenCalledWith(
      PRIMARY_CONVERSATION_ID,
      JSON.stringify(createStoredAuditEntry('append-entry'))
    );
    expectNoReplaceCalls(auditLogReplace);
  });

  it('rotates via replace when cached sequence reaches max entries', async () => {
    const internal = createInternalAuditLogger({ maxEntriesPerConversation: 100 });
    internal.chainCache.set(PRIMARY_CONVERSATION_ID, {
      lastEventId: 'existing-tail',
      lastHash: 'hash-tail',
      sequenceNumber: 100,
    });

    const oldEntryA = createStoredAuditEntry('old-a');
    const oldEntryB = createStoredAuditEntry('old-b');
    const newEntry = createStoredAuditEntry('new-tail');

    const auditLogRead = createSuccessfulAuditRead([
      JSON.stringify(oldEntryA),
      JSON.stringify(oldEntryB),
    ]);
    const auditLogReplace = createSuccessfulAuditReplace();
    const auditLogAppend = vi.fn().mockResolvedValue({ success: true });

    await withMockStoreEventStorage(
      { auditLogRead, auditLogReplace, auditLogAppend },
      async (): Promise<void> => {
        await internal.storeEvent(newEntry, PRIMARY_CONVERSATION_ID);
      }
    );

    expect(auditLogAppend).not.toHaveBeenCalled();
    expectSingleReplaceCall(auditLogReplace, [
      PRIMARY_CONVERSATION_ID,
      `${JSON.stringify(oldEntryB)}\n${JSON.stringify(newEntry)}`,
    ]);
  });

  it('logs store-event failure when append result is unsuccessful', async () => {
    const internal = createInternalAuditLogger();
    const auditLogRead = createSuccessfulAuditRead([]);
    const auditLogReplace = createSuccessfulAuditReplace();
    const auditLogAppend = vi.fn().mockResolvedValue({
      success: false,
      error: { code: 'AUDIT_APPEND_FAILED', message: 'append failed' },
    });

    await withMockStoreEventStorage(
      { auditLogRead, auditLogReplace, auditLogAppend },
      async (): Promise<void> => {
        await internal.storeEvent(createStoredAuditEntry('append-fail'), PRIMARY_CONVERSATION_ID);
      }
    );

    expect(auditLogAppend).toHaveBeenCalledTimes(1);
    expect(loggerSpies.error).toHaveBeenCalledWith(
      '[AppLogger] Failed to store event',
      expect.objectContaining({
        conversationId: PRIMARY_CONVERSATION_ID,
        error: expect.any(Error),
      })
    );
  });

  it('no-ops storeEvent when conversation id is absent', async () => {
    const internal = createInternalAuditLogger();
    const auditLogRead = createSuccessfulAuditRead([]);
    const auditLogReplace = createSuccessfulAuditReplace();
    const auditLogAppend = vi.fn().mockResolvedValue({ success: true });

    await withMockStoreEventStorage(
      { auditLogRead, auditLogReplace, auditLogAppend },
      async (): Promise<void> => {
        await internal.storeEvent(createStoredAuditEntry('no-conversation'));
      }
    );

    expectNoReplaceCalls(auditLogReplace);
    expect(auditLogAppend).not.toHaveBeenCalled();
  });

  it('logs store-event failure when append throws', async () => {
    const internal = createInternalAuditLogger();
    const auditLogRead = createSuccessfulAuditRead([]);
    const auditLogReplace = createSuccessfulAuditReplace();
    const auditLogAppend = vi.fn().mockRejectedValueOnce(new Error('append exploded'));

    await withMockStoreEventStorage(
      { auditLogRead, auditLogReplace, auditLogAppend },
      async (): Promise<void> => {
        await internal.storeEvent(createStoredAuditEntry('append-throw'), PRIMARY_CONVERSATION_ID);
      }
    );

    expect(loggerSpies.error).toHaveBeenCalledWith(
      '[AppLogger] Failed to store event',
      expect.objectContaining({
        conversationId: PRIMARY_CONVERSATION_ID,
        error: expect.any(Error),
      })
    );
  });

  it('logs store-event failure when rotation replace result is unsuccessful', async () => {
    const internal = createInternalAuditLogger({ maxEntriesPerConversation: 100 });
    internal.chainCache.set(PRIMARY_CONVERSATION_ID, {
      lastEventId: 'existing-tail',
      lastHash: 'hash-tail',
      sequenceNumber: 100,
    });

    const oldEntry = createStoredAuditEntry('old-only');
    const newEntry = createStoredAuditEntry('new-rotation-fail');
    const auditLogRead = createSuccessfulAuditRead([JSON.stringify(oldEntry)]);
    const auditLogReplace = vi.fn().mockResolvedValue({
      success: false,
      error: { code: 'AUDIT_REPLACE_FAILED', message: 'replace failed on rotate' },
    });
    const auditLogAppend = vi.fn().mockResolvedValue({ success: true });

    await withMockStoreEventStorage(
      { auditLogRead, auditLogReplace, auditLogAppend },
      async (): Promise<void> => {
        await internal.storeEvent(newEntry, PRIMARY_CONVERSATION_ID);
      }
    );

    expect(auditLogAppend).not.toHaveBeenCalled();
    expect(loggerSpies.error).toHaveBeenCalledWith(
      '[AppLogger] Failed to store event',
      expect.objectContaining({
        conversationId: PRIMARY_CONVERSATION_ID,
        error: expect.any(Error),
      })
    );
  });

  it('rotates with new entry when rotation read path yields no entries', async () => {
    const internal = createInternalAuditLogger({ maxEntriesPerConversation: 100 });
    internal.chainCache.set(PRIMARY_CONVERSATION_ID, {
      lastEventId: 'existing-tail',
      lastHash: 'hash-tail',
      sequenceNumber: 100,
    });

    const newEntry = createStoredAuditEntry('new-after-empty-read');
    const auditLogRead = createFailedAuditRead();
    const auditLogReplace = createSuccessfulAuditReplace();
    const auditLogAppend = vi.fn().mockResolvedValue({ success: true });

    await withMockStoreEventStorage(
      { auditLogRead, auditLogReplace, auditLogAppend },
      async (): Promise<void> => {
        await internal.storeEvent(newEntry, PRIMARY_CONVERSATION_ID);
      }
    );

    expect(auditLogAppend).not.toHaveBeenCalled();
    expectSingleReplaceCall(auditLogReplace, [PRIMARY_CONVERSATION_ID, JSON.stringify(newEntry)]);
  });
});
