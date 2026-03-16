# Changelog

All notable changes to Atticus will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.20] - 2026-03-15

### Added

- **Internationalization Support**: Full i18n implementation with English, Spanish, and French language support
- **Language-Specific Configurations**: Separate YAML config files for advisory areas, legal practices, and analysis templates per language
- **Locale-Aware Formatting**: Utilities for date and number formatting based on selected language
- **Translation System**: Comprehensive translation framework with LanguageProvider and translatable UI strings

### Changed

- **Dependency Updates**: Upgraded jsPDF to v4.2.0, Electron to v41.0.2, and electron-builder to v26.8.1
- **Configuration Loaders**: Refactored advisory, practice, and analysis loaders to support language-specific loading
- **App Architecture**: Integrated language state management and translation system into main App component
- **UI Components**: Updated all user interface components to use translatable strings instead of hardcoded text

### Technical Improvements

- **Modular i18n System**: Clean separation of translation logic with dedicated i18n module
- **Fallback Strategy**: Robust config loading with language-specific fallbacks to English
- **Type Safety**: Enhanced TypeScript support for language and translation types

## [0.9.19] - 2026-01-02

### Added

- **Structured Logging**: Comprehensive logging infrastructure using `createLogger()` utility
- **Type Definitions**: Added `ComplianceViolation` interface for GDPR/HIPAA/CCPA compliance tracking
- **Full Timestamps**: Log Viewer now displays complete date and time (not just time)
- **Better Documentation**: Enhanced README with code quality and technical standards section

### Changed

- **UI Simplification**: Top buttons (Audit Log, Cost Ledger, Settings) now use icons-only for cleaner interface
- **Improved Type Safety**: Replaced `any[]` types with proper interfaces (`LegalPracticeArea[]`, `Attachment[]`)
- **Better Error Handling**: All catch blocks now include explanatory comments instead of being empty
- **Enhanced Imports**: Added missing type imports (`FileUploadResult`, `LegalPracticeArea`)

### Fixed

- **Console.log Cleanup**: Replaced all `console.log/error` calls with structured logger in:
  - Settings component (10 instances)
  - LogViewer component
  - Various service files
- **Empty Catch Blocks**: Fixed silent error swallowing in aiCountermeasureDetector
- **Type Safety**: Fixed type mismatches in ChatWindow state variables
- **Import Issues**: Added missing `Attachment` and `FileUploadResult` imports

### Technical Debt Remediation

- **0 type errors** in core components (tagStore, Settings, piiDetector, aiCountermeasureDetector)
- **Consistent logging** throughout application
- **Improved maintainability** with better code organization
- **Enhanced error visibility** with proper logging infrastructure

### Developer Experience

- Better IDE support with improved type definitions
- Clearer error messages with structured logging
- Easier debugging with comprehensive log context
- Reduced cognitive complexity in key components

## [0.9.17] - Previous Release

### Features

- Multi-provider AI support (OpenAI, Anthropic, xAI, Groq, etc.)
- 67 legal practice areas with automatic detection
- 67 business advisory areas with MBA-level guidance
- Multi-jurisdictional analysis (Canada, US, Mexico, EU)
- Cost ledger and expense tracking
- Privacy audit logging with PII scanner
- File security pipeline with threat detection
- Multi-model selection and parallel querying

---

**Note**: For detailed technical changes and implementation notes, see the `/notes` folder.
