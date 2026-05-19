# Batch: messageBuilders (Edge/Extended) Coverage (2026-05-14)

## Scope
- Added/expanded edge/extended tests for messageBuilders:
  - buildSystemPrompt (empty/minimal advisory), createUserMessage (empty attachments/general advisory), createAssistantMessages (null/undefined responses)
- All tests in src/test/messageBuilders.extended.test.ts
- Validated with npx tsc --noEmit and npx vitest run (all 3 tests passing)

## Validation
- Typecheck: PASSED (no errors in helper or test)
- All tests: PASSED (3/3)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: modelHelpers (Edge/Extended) Coverage (2026-05-14)

## Scope
- Added/expanded edge/extended tests for modelHelpers:
  - getAllAvailableModels (empty, domain filter, missing template)
- All tests in src/test/modelHelpers.extended.test.ts
- Validated with npx tsc --noEmit and npx vitest run (all 3 tests passing)

## Validation
- Typecheck: PASSED (no errors in helper or test)
- All tests: PASSED (3/3)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: pdfExport Helpers (Edge/Extended) Coverage (2026-05-14)

## Scope
- Added/expanded edge/extended tests for pdfExport helpers:
  - sanitizeTextForPDF, stripMarkdown, parseMarkdownToPDFSegments, formatFileSize (empty, emoji, nested markdown, code, bullets, byte edge cases)
- All tests in src/test/pdfExport.extended.test.ts
- Validated with npx tsc --noEmit and npx vitest run (all 4 tests passing)

## Validation
- Typecheck: PASSED (no errors in helper or test)
- All tests: PASSED (4/4)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: exportConversationCostLedgerPdf (Edge/Extended) Coverage (2026-05-14)

## Scope
- Added/expanded edge/extended tests for exportConversationCostLedgerPdf:
  - Extremely large numbers (tokens/costs)
  - Invalid/missing fields (throws as expected)
  - Unusual characters in conversationTitle
  - Very long costEntries arrays
  - Non-string IDs/roles
- All tests in src/test/exportConversationCostLedgerPdf.extended.test.ts
- Validated with npx tsc --noEmit and npx vitest run src/test/exportConversationCostLedgerPdf.extended.test.ts (all 7 tests passing)

## Validation
- Typecheck: PASSED (no errors in helper or test)
- All tests: PASSED (7/7)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: dateUtils (Extended) Coverage (2026-05-14)

## Scope
- Added/expanded direct unit tests for dateUtils.ts helpers:
  - isValidDate, toISOString, getRelativeTime, ensureISOString, migrateDateFields
- All tests in src/test/dateUtils.extended.test.ts
- Validated with npx tsc --noEmit and npx vitest run (all 5 tests passing)

## Validation
- Typecheck: PASSED (no errors in helper or test)
- All tests: PASSED (5/5)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: formatting Helpers (Extended) Coverage (2026-05-14)

## Scope
- Added/expanded direct unit tests for formatting.ts helpers:
  - formatCurrency, formatCompactNumber, formatRelativeTime, formatPercentage, formatBytes, pluralize, formatDuration, formatList
- All tests in src/test/formatting.extended.test.ts
- Validated with npx tsc --noEmit and npx vitest run (all 8 tests passing)

## Validation
- Typecheck: PASSED (no errors in helper or test)
- All tests: PASSED (8/8)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: responseSizePresets Helper Coverage (2026-05-14)

## Scope
- Added/expanded direct unit tests for responseSizePresets.ts helpers:
  - getPresetById, getPresetByTokens, constrainMaxTokens, getRecommendedPreset, getAvailablePresets
- All tests in src/test/responseSizePresetsHelpers.test.ts
- Validated with npx tsc --noEmit and npx vitest run (all 5 tests passing)

## Validation
- Typecheck: PASSED (no errors in helper or test)
- All tests: PASSED (5/5)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: configMigration Helpers (Edge/Extended) Coverage (2026-05-14)

## Scope
- Added/expanded grouped edge/extended tests for configMigration helpers:
  - migrateAllProviders: array handling, empty, all-missing, all-valid, mixed, template missing
  - migrateProviderConfig: invalid types, missing fields, empty strings, duplicate providers, null/undefined input (throws)
- All tests in src/test/configMigration.test.ts
- Validated with npx tsc --noEmit and npx vitest run src/test/configMigration.test.ts (all 13 tests passing)

## Validation
- Typecheck: PASSED (no errors in helper or test)
- All tests: PASSED (13/13)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: costCalculator Helpers (Edge/Extended) Coverage (2026-05-14)

## Scope
- Added/expanded grouped edge/extended tests for costCalculator helpers:
  - calculateCost: NaN/undefined/negative tokens, missing pricing fields, large/small values, all optional fields missing, all zero/negative/NaN pricing
  - formatCost/formatTokens: negative, NaN, undefined, very large/small numbers
  - getCostTier: edge thresholds, NaN, negative, undefined
  - validateCostBreakdown: NaN, undefined, negative, missing fields, extreme floating-point errors
- All tests in src/test/costCalculator.test.ts
- Validated with npx tsc --noEmit and npx vitest run src/test/costCalculator.test.ts (all 42 tests passing)

## Validation
- Typecheck: PASSED (no errors in helper or test)
- All tests: PASSED (42/42)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: exportConversationCostLedgerPdf Helper Coverage (2026-05-14)

## Scope
- Added smoke test for exportConversationCostLedgerPdf utility:
  - Ensures function runs without error for valid input
- All new test in src/test/exportConversationCostLedgerPdf.test.ts
- Validated with npx tsc --noEmit and npx vitest run (test passes)

## Validation
- Typecheck: PASSED (no errors in helper or test)
- Test: PASSED (1/1, smoke test)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: pdfExport Helper Coverage (2026-05-14)

## Scope
- Added direct unit tests for pdfExport.ts helpers:
  - sanitizeTextForPDF (unicode/control char removal)
  - stripMarkdown (markdown formatting removal)
  - parseMarkdownToPDFSegments (headings, bullets, code, text)
  - formatFileSize (bytes, KB, MB)
- All new tests in src/test/pdfExportHelpers.test.ts
- Validated with npx tsc --noEmit and npx vitest run (all 4 tests passing)

## Validation
- Typecheck: PASSED (no errors in helpers or tests)
- All tests: PASSED (4/4)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: Utility Helper Coverage (responseSizePresets, devMode, costLedgerData, configLanguage) (2026-05-14)

## Scope
- Added direct unit tests for:
  - responseSizePresets.ts (preset structure, tokens, use cases)
  - devMode.ts (development/production detection logic)
  - costLedgerData.ts (cost tier logic)
  - configLanguage.ts (filename localization/fallback logic)
- All new tests in src/test/ for consistency
- Validated with npx tsc --noEmit and npx vitest run (all 13 tests passing)

## Validation
- Typecheck: PASSED (minor unused import warnings only)
- All tests: PASSED (13/13)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: messageBuilders Helper Coverage (2026-05-14)

## Scope
- Added direct unit tests for messageBuilders.ts:
  - buildSystemPrompt (advisory/jurisdiction logic)
  - createUserMessage (attachments, advisory edge cases)
  - createAssistantMessages (multi-response, null filtering)
- All new tests in src/test/messageBuilders.test.ts
- Validated with npx tsc --noEmit and npx vitest run src/test/messageBuilders.test.ts (all 5 tests passing)

## Validation
- Typecheck: PASSED (minor unused import warnings only)
- All tests: PASSED (5/5)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: Locale/Model/Context/Cost Helper Coverage (2026-05-14)

## Scope
- Added/expanded unit tests for:
  - formatting.ts (locale-aware date/time/number helpers)
  - modelHelpers.ts (model/domain selection/filtering)
  - dateUtils.ts (date/time utilities)
  - contextWindowManager.ts (token/context window management)
  - costCalculator.ts (cost calculation/formatting)
- Ensured edge/boundary cases are covered (locale, empty/invalid input, token/cost boundaries)
- All new/expanded tests in src/test/ for consistency
- Fixed all type and assertion issues found during validation
- Validated with npx tsc --noEmit and npx vitest run (all 209 tests passing)

## Validation
- Typecheck: PASSED
- All tests: PASSED (209/209)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Batch: PDF/ConfigMigration/DebugLogger Helper Coverage & Refactor (2026-05-14)

## Scope
- Extracted and exported pure helpers from pdfExport.ts (sanitizeTextForPDF, stripMarkdown, parseMarkdownToPDFSegments, formatFileSize)
- Added comprehensive unit tests for these helpers in src/test/pdfExport.test.ts
- Added/expanded tests for migrateProviderConfig in src/test/configMigration.test.ts, using full ProviderTemplate shape
- Added/expanded tests for debugLogger (singleton and context loggers) in src/test/debugLogger.test.ts
- Moved all new/updated tests to src/test/ for type safety and consistency
- Fixed all type errors and assertion mismatches; ensured all test objects match real types
- Validated with npx tsc --noEmit and npx vitest run (all 199 tests passing)

## Validation
- Typecheck: PASSED
- All tests: PASSED (199/199)
- No errors in edited files

## Next Steps
- Continue with next high-value, low-risk batch (adjacent helpers, edge cases, or ergonomic refactors)
# Atticus — Technical Debt Remediation Work Order

> **Prepared:** 2026-05-06 | **Repo:** `jdai-ca/atticus` v0.9.21

## Priority Legend

| Priority | Meaning | SLA |
|----------|---------|-----|
| 🔴 P0 | Security risk / data loss | Sprint 1 |
| 🟠 P1 | Major maintainability blocker | Sprint 1–2 |
| 🟡 P2 | Moderate debt, impedes velocity | Sprint 2–3 |
| 🟢 P3 | Quality-of-life improvement | Backlog |

---

## 1. Security & Data Integrity

### 1.1 🔴 API Keys Stored in Plaintext JSON

**Files:** [main.ts:1504-1536](file:///c:/JDAI/GitHub/atticus/src/electron/main.ts#L1504-L1536), [Settings.tsx:574](file:///c:/JDAI/GitHub/atticus/src/components/Settings.tsx#L574)

**Current behavior:** When a user saves an API key in Settings, it is written as `_tempApiKey` inside `user-config.json` in plaintext. The `loadProviderWithApiKey()` function reads this field directly at line 1524. The `delete-api-key` IPC handler (line 1836) is a no-op placeholder that returns `{ success: true }` without doing anything.

**Evidence:**
```typescript
// main.ts:1524 — Key read from plaintext config
if (provider._tempApiKey) {
  return { ...provider, apiKey: provider._tempApiKey };
}
```

**Risk:** Any process with filesystem access can read all API keys. Config file is JSON with no encryption.

**Remediation:**
1. Use Electron's `safeStorage.encryptString()` / `decryptString()` to encrypt keys before writing
2. Store encrypted keys in a separate `api-keys.enc` file, not inside the config JSON
3. Remove `_tempApiKey` from the `ProviderConfig` type after migration
4. Implement `delete-api-key` handler to actually delete the key entry
5. Add a one-time migration in `app.whenReady()` to convert existing plaintext keys

---

### 1.2 🟠 Untyped `electronAPI` Access Everywhere

**Files:** 15 files use `(globalThis as any).electronAPI` or `globalThis.window.electronAPI`

**Current behavior:** The `ElectronAPI` interface in `types/index.ts` declares only a subset of IPC methods. Missing methods include: `fetchFactoryConfig`, `saveBundledConfig`, `deleteApiKey`, `deleteConversation`, `convertTiffToImages`, `convertHeicToImages`, `convertEmailToImages`, `convertEpubToImages`. Code bypasses the interface with `as any` casts.

**Evidence (from grep across src/):**
- `ChatWindow.tsx`: 12 occurrences of `globalThis.window.electronAPI.*`
- `Settings.tsx`: 8 occurrences
- `store/index.ts`: 6 occurrences with `(globalThis as any).electronAPI`

**Risk:** No compile-time checking for IPC contract changes. A renamed or removed IPC handler causes silent runtime failures.

**Remediation:**
1. Add all IPC methods to the `ElectronAPI` interface in `types/index.ts`
2. Add matching declarations in `preload.ts`
3. Replace all `(globalThis as any).electronAPI` with typed `window.electronAPI`

---

### 1.3 🟠 EPUB/Email Content Injected Without Sanitization

**File:** [main.ts:1122-1146](file:///c:/JDAI/GitHub/atticus/src/electron/main.ts#L1122-L1146)

**Current behavior:** `convertEpubToImagesElectron()` extracts raw XHTML from EPUB ZIP files and injects it directly into an HTML template via `${content}`. EPUB files are user-uploaded and can contain `<script>` tags or event handlers.

**Evidence:**
```typescript
// main.ts:1143 — Raw content injection
<body>${content}</body>
```

Similarly, `convertEmailToImagesElectron()` at line 1054 injects `parsed.text || parsed.html` after escaping only `<` and `>` in the text path, but the `parsed.html` path is used raw.

**Risk:** XSS in offscreen BrowserWindow. While `nodeIntegration: false`, scripts can still exfiltrate data via `fetch()`.

**Remediation:**
1. Sanitize with DOMPurify before injection: `DOMPurify.sanitize(content, { ALLOW_UNKNOWN_PROTOCOLS: false })`
2. Apply same treatment to email HTML content
3. Add `sandbox` attribute to BrowserWindow webPreferences

---

### 1.4 🟠 Duplicate `Jurisdiction` Type Definitions

**Files:** [types/index.ts:256](file:///c:/JDAI/GitHub/atticus/src/types/index.ts#L256), [piiScanner.ts:18](file:///c:/JDAI/GitHub/atticus/src/services/piiScanner.ts#L18)

**Current behavior:** `types/index.ts` defines `Jurisdiction = 'CA' | 'US' | 'MX' | 'EU'`. `piiScanner.ts` independently defines `Jurisdiction = 'CA' | 'US' | 'MX' | 'EU' | 'UK'`. The PII scanner has UK-specific patterns (NINO, NHS numbers) but the app-wide type won't allow selecting `'UK'`.

**Remediation:** Consolidate to single type in `types/index.ts` including `'UK'`. Delete duplicate in `piiScanner.ts`.

---

## 2. God Components & Decomposition

### 2.1 🟠 `ChatWindow.tsx` — 4,532 Lines / 180 KB

**File:** [ChatWindow.tsx](file:///c:/JDAI/GitHub/atticus/src/components/ChatWindow.tsx)

**Current behavior:** This single component contains ~35 `useState` calls managing: message rendering, file upload + security scan pipeline (lines 1218-1786), PDF/Word/Excel/EPUB conversion orchestration (lines 1019-1216), PII scanning flow (lines 1814-1867), model selection UI (lines 856-909), jurisdiction toggling (lines 911-925), analysis workflow (lines 470-660), tag management dialog (lines 3824-3944), cost ledger viewing, and the full chat input form. The JSX render alone spans ~1,800 lines with 6 modal dialogs inlined.

**Specific pain points:**
- File type detection is duplicated: once in `convertDocumentToImages()` (line 1038-1205) using extension checks, and again in `handleFileUpload()` (lines 1705-1727) using regex matches on filename — for generating capability notes
- PII decision handlers (`handlePrivacyProceed`, `handlePrivacyCancel`, `handlePrivacyAnonymize`) at lines 2468-2607 are 140 lines of near-identical audit logging differing only in the `userDecision` string
- The `sendToProvider()` helper (lines 1912-2192) is 280 lines of API orchestration including context window management, cost calculation, and audit logging

**Decomposition plan:**

| New File | Extract From | Lines Saved |
|---|---|---|
| `hooks/useChatActions.ts` | `sendMessage`, `sendToProvider`, `handleSend`, PII handlers | ~600 |
| `hooks/useFileUpload.ts` | `handleFileUpload`, `convertDocumentToImages`, security flow | ~500 |
| `hooks/useModelSelection.ts` | Model/jurisdiction state and helpers | ~200 |
| `components/FileSecurityDialog.tsx` | File processing/security modal JSX (lines 3946-4364) | ~400 |
| `components/AnalysisDialog.tsx` | Analysis workflow modal (lines 4366-4528) | ~160 |
| `components/TagDialog.tsx` | Tag management modal (lines 3824-3944) | ~120 |
| `components/ChatInput.tsx` | Input area, attachment preview, send button | ~200 |

---

### 2.2 🟠 `Settings.tsx` — 2,362 Lines / 109 KB

**File:** [Settings.tsx](file:///c:/JDAI/GitHub/atticus/src/components/Settings.tsx)

**Current behavior:** Contains 6 tab panels all rendered inline: Providers (lines 710-1084), Practice Areas (1086-1195), Advisory Areas (1197-1350), Analysis Config, Privacy, and About. The YAML editor logic and the practice/advisory area card rendering are duplicated between tabs.

**Decomposition plan:**

| New File | Responsibility |
|---|---|
| `settings/ProviderTab.tsx` | Provider cards, API key management, model enable/disable |
| `settings/PracticeAreaTab.tsx` | Practice area listing and keyword expansion |
| `settings/AdvisoryAreaTab.tsx` | Advisory area listing |
| `settings/YamlEditorDialog.tsx` | Shared YAML edit/save/reset modal |
| `settings/AnalysisTab.tsx` | Analysis prompt configuration |

---

### 2.3 🟡 `electron/main.ts` — 1,856 Lines / 58 KB

**File:** [main.ts](file:///c:/JDAI/GitHub/atticus/src/electron/main.ts)

**Current behavior:** Contains 12 document conversion functions (Word, Excel, CSV, PPT, RTF, TIFF, HEIC, Email, EPUB, Markdown, Text, PDF), plus all IPC handler registrations, window lifecycle, and config file I/O. The `createConversionHandler` helper at line 1728 is good but only used for registration — the conversion functions themselves still contain heavy duplication (see §3.1).

**Decomposition plan:**
```
src/electron/
  main.ts              (~100 lines: lifecycle + imports)
  ipcHandlers.ts       (~300 lines: all ipcMain.handle registrations)
  converters/
    shared.ts          (renderHtmlToImage, createRenderWindow)
    pdf.ts, word.ts, excel.ts, ...
  config.ts            (load/save config, load/save bundled config)
```

---

## 3. Code Duplication

### 3.1 🟠 BrowserWindow Boilerplate Repeated 8×

**File:** [main.ts:670-1176](file:///c:/JDAI/GitHub/atticus/src/electron/main.ts#L670-L1176)

**Current behavior:** A helper `renderHtmlToImage()` (line 82) already exists and is used by Word, Excel, Markdown, and CSV converters. But Text (line 670), PPT (line 835), RTF (line 908), Email (line 1070), and EPUB (line 1152) each manually create their own `BrowserWindow`, write temp HTML, load, wait with `setTimeout`, capture, close, and cleanup.

**Example of the repeated pattern (RTF converter, lines 904-921):**
```typescript
const tmpHtmlPath = path.join(tmpDir, `atticus-rtf-${Date.now()}.html`);
await fs.promises.writeFile(tmpHtmlPath, htmlContent, 'utf-8');
const rtfWindow = new BrowserWindow({ width: 960, height: 1400, show: false, ... });
await rtfWindow.loadFile(tmpHtmlPath);
await new Promise(resolve => setTimeout(resolve, 800));
const image = await rtfWindow.webContents.capturePage();
rtfWindow.close();
await fs.promises.unlink(tmpHtmlPath).catch(() => {});
```

This exact pattern appears verbatim in 5 other converters. ~300 lines can be eliminated.

**Remediation:** Refactor all converters to call `renderHtmlToImage(htmlContent, width, height)`.

---

### 3.2 🟡 Near-Identical Multimodal Formatters

**File:** [multimodalFormatter.ts](file:///c:/JDAI/GitHub/atticus/src/services/multimodalFormatter.ts) — 1,153 lines / 49 KB

**Current behavior:** `formatForOpenAI()` (line 495), `formatForXAI()` (line 618), and `formatForAnthropic()` (line 740) share ~80% identical logic: iterate messages, check if attachment is image/PDF/Word, convert, format. `formatForXAI` is a near-exact copy of `formatForOpenAI`. Only the output shape differs (OpenAI uses `image_url`, Anthropic uses `source`).

**Remediation:** Extract a generic `processAttachments(messages, converter, formatImage)` function. Each provider supplies only its output shape adapter.

---

### 3.3 🟡 `augmentMessageWithDocuments` Called Identically 6×

**File:** [api.ts](file:///c:/JDAI/GitHub/atticus/src/services/api.ts)

**Current behavior:** The pattern `await Promise.all(messages.map(msg => augmentMessageWithDocuments(msg)))` is copy-pasted in `sendAnthropicMessage` (line 105), `sendGoogleMessage`, `sendAzureOpenAIMessage`, `sendCustomMessage`, `sendMistralMessage`, and `sendCohereMessage`. But `sendOpenAIMessage` and `sendXAIMessage` use `buildOpenAIRequestBody` which handles it differently.

**Remediation:** Lift document augmentation into `sendChatMessage()` before the provider switch. Each provider receives pre-augmented messages.

---

### 3.4 🟡 Store Update Pattern Duplicated 4×

**File:** [store/index.ts:349-439](file:///c:/JDAI/GitHub/atticus/src/store/index.ts#L349-L439)

**Current behavior:** `setConversationModel`, `setConversationSelectedModels`, `setConversationJurisdictions`, `setConversationMaxTokens` are four functions with identical structure: `conversations.map(c => c.id === id ? {...c, [field]: value} : c)`.

**Remediation:** Create `updateConversationField<K>(id, field: K, value)` generic action.

---

## 4. State Management & Architecture

### 4.1 🟡 Audit/PII Logs in localStorage — Storage Limit Risk

Status (2026-05-12): Partially remediated. Audit logging is now file-backed via IPC (`auditLogger.ts`), legacy `appLogger.ts` was replaced by a compatibility re-export shim, retention rotation now uses a dedicated overwrite IPC path (`audit-log-replace`) to avoid delete+append duplication/race patterns, overwrite payload size is guarded in IPC for fail-fast safety, malformed JSONL lines are skipped (with capped/summarized diagnostics) instead of failing entire audit-log reads, best-effort self-repair rewrites cleaned JSONL after malformed-line detection with per-conversation cooldown/rate-limiting, repair state is reset when logs are cleared, and the per-conversation retention cap is runtime-configurable via `__ATTICUS_AUDIT_MAX_ENTRIES__`.

**Files:** [appLogger.ts:652-670](file:///c:/JDAI/GitHub/atticus/src/services/appLogger.ts#L652-L670), [logger.ts:154-169](file:///c:/JDAI/GitHub/atticus/src/services/logger.ts#L154-L169), [piiScanner.ts](file:///c:/JDAI/GitHub/atticus/src/services/piiScanner.ts)

**Current behavior:** Three separate systems write to `localStorage`:
- `AuditLogger` stores signed/hashed entries with `maxEntriesPerConversation = 10000` (each ~1-2 KB = up to 20 MB per conversation)
- `Logger` stores debug logs up to `maxStoredLogs = 1000`, serializing entire history on every single log call (line 165)
- `piiScanner` stores scan history with `getTotalScanCount()` iterating all localStorage keys

`localStorage` has a 5-10 MB limit per origin. A single active conversation can blow this limit.

**Remediation:**
1. Move audit logs to IPC-backed file storage (`userData/audit/{conversationId}.jsonl`)
2. Remove localStorage persistence from `Logger` — use in-memory only, or write to file via IPC
3. Add storage quota monitoring and automatic rotation

---

### 4.2 🟡 Crypto Signing Keys in localStorage

**File:** [appLogger.ts:182-230](file:///c:/JDAI/GitHub/atticus/src/services/appLogger.ts#L182-L230)

**Current behavior:** ECDSA P-256 private signing keys are stored as exported JWK in `localStorage` under key `auditSigningKeyPair`. Anyone with filesystem access can extract the key and re-sign tampered audit logs, defeating the tamper-evident chain.

**Remediation:**
1. Generate keys with `extractable: false` so they cannot be exported
2. Or store keys in main process using `safeStorage` and sign entries via IPC
3. Consider using a per-session ephemeral key (accept that cross-session verification requires a different approach)

---

### 4.3 🟡 No React Error Boundaries

**File:** [App.tsx](file:///c:/JDAI/GitHub/atticus/src/App.tsx)

**Current behavior:** No `ErrorBoundary` component wraps `ChatWindow` or `Settings`. A rendering exception (e.g., `undefined.map()` on malformed message data) crashes the entire app with a white screen. The user must force-quit and restart.

**Remediation:** Add `<ErrorBoundary fallback={<RecoveryUI />}>` around main content. Recovery UI should offer "Reload App" and "Clear Current Conversation" options.

---

### 4.4 🟡 Shared `isLoading` Boolean for Multiple Async Ops

**File:** [store/index.ts:86-139](file:///c:/JDAI/GitHub/atticus/src/store/index.ts#L86-L139)

**Current behavior:** `loadProviderTemplates`, `loadPracticeAreas`, and `loadAdvisoryAreas` all set the same `isLoading` boolean. In `App.tsx`, they run in `Promise.all`. The first to complete sets `isLoading: false` while others may still be loading, causing the UI to render with incomplete data.

**Remediation:** Use per-resource loading flags or a loading counter (`pendingLoads++` on start, `pendingLoads--` on finish, `isLoading = pendingLoads > 0`).

---

### 4.5 🟡 File Extension Checks Duplicated Across Layers

**Files:** ChatWindow.tsx (lines 1038-1114, 1705-1727), main.ts upload handler (line 1353), multimodalFormatter.ts (lines 47-91)

**Current behavior:** Supported file extension lists are hardcoded in at least 4 different locations with slightly different sets. The upload handler allows `.pdf, .txt, .doc, .docx, .md, .jpg, .jpeg, .png, .gif, .webp` but the document converter also handles `.xls, .xlsx, .csv, .ppt, .rtf, .tiff, .heic, .eml, .epub` — meaning these formats would fail at upload validation.

**Remediation:** Create a shared `SUPPORTED_EXTENSIONS` constant in `types/` or `utils/` and reference it from all locations.

---

## 5. Type Safety & Code Quality

### 5.1 🟡 Excessive `any` Usage — 15 Files Affected

**Prevalence:** `as any` casts found in 15 source files.

**Key examples with line references:**
| File | Example | Line |
|---|---|---|
| `api.ts` | `messages: any[]` on all provider functions | 73, 99, 166, ... |
| `api.ts` | `(message.usage as any).cache_creation_input_tokens` | 148 |
| `ChatWindow.tsx` | `(result.error as any)?.status` | 2027 |
| `ChatWindow.tsx` | `buffer: buffer as any` in file security scan | 1334, 1376 |
| `multimodalFormatter.ts` | `formatForAnthropic` returns `Promise<any[]>` | 740 |
| `main.ts` | `loadProviderWithApiKey` returns `Promise<any>` | 1505 |
| `Settings.tsx` | `parsedAreas` typed as `any[]` | multiple |

**Remediation:** Replace with proper types: `messages: Message[]`, create `AnthropicUsage` extension type, type provider config returns.

---

### 5.2 🟢 Dead Code: `convertPDFToImagesElectron`

**File:** [main.ts:172-179](file:///c:/JDAI/GitHub/atticus/src/electron/main.ts#L172-L179)

**Current behavior:** Function immediately throws `new Error('NOT USED...')` but is registered as IPC handler at line 1752 via `createConversionHandler`. Any renderer call to `convert-pdf-to-images` will always error. PDF conversion actually happens in the renderer via `multimodalFormatter.ts`.

**Remediation:** Remove the dead function and its IPC handler registration at line 1752-1756.

---

### 5.3 🟢 `Date.now()` Used for Entity IDs — 46 Occurrences

**Files:** Found 46 uses of `Date.now()` for generating IDs across the codebase.

**Key collision-prone examples:**
- `store/index.ts:187` — `conv-${Date.now()}` for conversation IDs
- `ChatWindow.tsx:1901` — `msg-${Date.now()}` for user message IDs
- `ChatWindow.tsx:2211` — `msg-${Date.now()}-resp-${index}` for assistant messages (when multi-model responses arrive in the same millisecond)
- `Settings.tsx:574` — `${template.id}-${Date.now()}` for provider IDs

**Risk:** Multi-model parallel queries fire `sendToProvider()` concurrently. Two responses can get the same `Date.now()` value, causing ID collisions and message overwrites.

**Remediation:** Replace with `crypto.randomUUID()` for all entity identifiers. Keep `Date.now()` only for timestamps and temp file names.

---

## 6. Performance

### 6.1 🟡 O(n) Conversation List Scan on Every Message

**File:** [store/index.ts:261-266](file:///c:/JDAI/GitHub/atticus/src/store/index.ts#L261-L266)

**Current behavior:** `addMessage()` calls `conversations.map(c => c.id === id ? {...c, messages: [...c.messages, msg]} : c)`. Every message addition scans the full conversation array and shallow-copies every conversation object. With 100 conversations, each message triggers 100 object allocations.

**Remediation:** Use `Map<string, Conversation>` for O(1) lookup, or use Zustand's `immer` middleware for structural sharing.

---

### 6.2 🟡 Base64 File Data Held in React State

**File:** [ChatWindow.tsx](file:///c:/JDAI/GitHub/atticus/src/components/ChatWindow.tsx) — `attachments` state

**Current behavior:** Uploaded files (up to 10 MB base64 = ~13 MB string per file) are stored in `useState`. Multi-page PDF conversions create one base64 string per page. Every re-render (keystroke in the input field, timer tick, etc.) processes these large strings through React's reconciliation.

**Remediation:** Store file data in a `useRef`-backed `Map<string, string>` outside React's render cycle. Keep only metadata (id, name, size, extension) in state.

---

### 6.3 🟡 Logger Serializes Entire History on Every Log Call

**File:** [logger.ts:162-169](file:///c:/JDAI/GitHub/atticus/src/services/logger.ts#L162-L169)

**Current behavior:** Every single `logger.info()` / `logger.debug()` call triggers `localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logHistory))`, serializing up to 1000 log entries. In a typical chat flow, this can fire 20+ times per message send.

**Remediation:** Debounce localStorage writes (e.g., flush every 5 seconds or on `beforeunload`). Or remove localStorage persistence entirely and keep logs in-memory only.

---

## 7. Testing & Tooling

### 7.1 🟡 Zero Automated Tests

Status (2026-05-12): In progress. Baseline Vitest coverage now includes utility suites plus targeted audit logger internal behavior tests for malformed-line warning caps (including suppression-summary assertions, per-line warning payload contract assertions, totalLines summary-field assertions across mixed and malformed-only inputs, below-cap suppressedMalformedWarnings=0 assertions, and mixed-path warningLimit assertions), self-repair cooldown gating, repair-state reset behavior (including reset-then-repair path), mocked malformed-read/repair-trigger flow, cooldown-based repair suppression, cooldown-warning diagnostic payload assertions, absence-of-cooldown-warning assertions for allowed repair paths, duplicate-repair suppression while repair is already in progress, mixed valid+malformed summary-count assertions (including totalLines/skipped/suppressed math), interleaved malformed-line warning lineIndex fidelity assertions, repair-attempt timestamp assertions when malformed-line repair is scheduled, malformed-only rewrite payload assertions (empty payload rewrite), graceful replace-failure handling, self-repair completion/failure/throw-path logger assertions, repair-in-progress cleanup assertions after failure/throw paths, read-failure/no-repair behavior, empty-successful-read/no-malformed-summary behavior, storeEvent append/rotation/error-path coverage (append path when below cap, replace-rotation when cached sequence reaches cap, store-failure logger assertions for unsuccessful append, no-op behavior without conversation id, append-throw failure logging, rotation-replace failure logging, and rotation fallback rewrite when rotation read yields no entries), constructor/runtime max-entry resolution coverage (default fallback, runtime-config adoption, floor + min clamp behavior, and explicit-option precedence over runtime configuration), initialization memoization coverage (concurrent initialize reuses a single keygen promise), initialization-failure diagnostics coverage for key-generation rejection, logEvent fallback/degraded-mode coverage (AUDIT_FAILED id on runtime exception and successful event emission without signing key after keygen failure), high-level event/severity routing coverage for logPIIScan/logAPIRequest/logAPIResponse (decision-to-event mapping, findings-based severity elevation, API error/provider-error severity differentiation, and success-path API response routing), lifecycle retrieval/export/clear coverage for getConversationAuditLog/getAllAuditLogs/exportForEDiscovery/clearAuditLog (timestamp sorting, tamper-diagnostic logging, conversation-read failure fallback, list-failure empty-map behavior, list-throw empty-map + diagnostics, multi-conversation aggregation, scoped-conversation export path, eDiscovery metadata/production-number formatting, export-failure empty-string fallback + diagnostics, cache+repair-state cleanup on clear success, and clear failure logging), and crypto-helper failure-path coverage for signEntry/verifySignature/computeHash (missing-key warning paths, sign/verify exception handling, and HASH_FAILED fallback behavior).

**Current state:** No test framework. No `test` script in `package.json`. No `*.test.ts` or `*.spec.ts` files. Validation scripts (`validate-practices.js`, etc.) are schema validators, not unit tests.

**Remediation:**
1. Install Vitest: `npm i -D vitest @testing-library/react`
2. Add `"test": "vitest"` to package.json scripts
3. Priority test targets (pure functions, easy to test):
   - `costCalculator.ts` — `calculateCost()`, `formatCost()`, `validateCostBreakdown()`
   - `piiScanner.ts` — `scan()`, `anonymize()` with various jurisdiction configs
   - `apiHelpers.ts` — `validateOpenAIResponse()`, `validateEndpoint()`, `extractUsage()`
   - `contextWindowManager.ts` — `truncateToContextWindow()`
   - `multimodalFormatter.ts` — `isImageFile()`, `isPDFFile()`, `getMimeType()`

---

### 7.2 🟢 No Linter or Formatter

**Current state:** No `.eslintrc`, `.prettierrc`, or equivalent. Inconsistent code style (semicolons, trailing commas, quote style vary).

**Remediation:** Add ESLint + Prettier + `lint-staged` + `husky` pre-commit hook.

---

### 7.3 🟢 Two Logger Systems Without Clear Separation

Status (2026-05-12): In progress. The runtime duplicate implementation was removed by turning `appLogger.ts` into a compatibility shim that re-exports from `auditLogger.ts`. Remaining debt is naming/docs cleanup for clearer separation between compliance audit logging and debug logging.

**Files:** [logger.ts](file:///c:/JDAI/GitHub/atticus/src/services/logger.ts) (286 lines), [appLogger.ts](file:///c:/JDAI/GitHub/atticus/src/services/appLogger.ts) (785 lines)

**Current behavior:** `logger.ts` provides `createLogger()` for console debug logging. `appLogger.ts` provides `AuditLogger` for compliance-grade audit trails with hash chains and ECDSA signatures. Both are used throughout the codebase. `appLogger.ts` imports from `logger.ts` internally. No documentation explains when to use which.

**Remediation:** Rename for clarity: `logger.ts` → `debugLogger.ts`, `appLogger.ts` → `auditLogger.ts`. Add JSDoc headers explaining the distinction.

---

## Summary Matrix

| Category | P0 | P1 | P2 | P3 | Total |
|----------|----|----|----|----|-------|
| Security | 1 | 3 | 0 | 0 | **4** |
| God Components | 0 | 2 | 1 | 0 | **3** |
| Code Duplication | 0 | 1 | 3 | 0 | **4** |
| State/Architecture | 0 | 0 | 5 | 0 | **5** |
| Type Safety | 0 | 0 | 1 | 2 | **3** |
| Performance | 0 | 0 | 3 | 0 | **3** |
| Testing/Tooling | 0 | 0 | 1 | 2 | **3** |
| **Total** | **1** | **6** | **14** | **4** | **25** |

---

## Sprint Plan

### Sprint 1 — Security & Foundation
- 🔴 1.1 Migrate API keys to `safeStorage`
- 🟠 1.2 Type `electronAPI` interface
- 🟠 1.3 Sanitize EPUB/email HTML
- 🟠 1.4 Consolidate `Jurisdiction` type
- 🟠 3.1 Refactor converters to use `renderHtmlToImage`
- 🟠 2.1 Begin ChatWindow decomposition (extract hooks)

### Sprint 2 — Modularization
- 🟠 2.2 Decompose Settings.tsx
- 🟡 2.3 Extract electron/main.ts modules
- 🟡 4.1 Move audit logs off localStorage
- 🟡 4.3 Add React error boundaries
- 🟡 7.1 Set up Vitest, write first test suite

### Sprint 3 — Quality & Performance
- 🟡 3.2-3.4 Deduplicate formatters, API augmentation, store
- 🟡 5.1 Systematic `any` elimination
- 🟡 6.1-6.3 Performance fixes (Map store, file data refs, logger debounce)
- 🟡 4.4-4.5 Fix loading states, consolidate extension lists

### Backlog
- 🟢 5.2 Remove dead PDF converter code
- 🟢 5.3 Replace `Date.now()` IDs with `crypto.randomUUID()`
- 🟢 7.2 Add ESLint + Prettier
- 🟢 7.3 Rename logger files
