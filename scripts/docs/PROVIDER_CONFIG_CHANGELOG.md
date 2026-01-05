# Changelog

All notable changes to the Atticus Provider Configuration will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial repository setup
- CI/CD validation pipeline

## [1.0.0] - 2025-10-09

### Added

- Initial provider configuration release
- 9 AI providers configured
- 30 models available
- Providers:
  - OpenAI (3 models)
  - Anthropic (4 models)
  - Google (2 models)
  - Azure OpenAI (2 models)
  - xAI (2 models)
  - Mistral AI (5 models)
  - Cohere (4 models)
  - Groq (4 models)
  - Perplexity AI (4 models)
- Automated validation scripts
- JSON Schema validation
- Duplicate detection
- GitHub Actions CI/CD workflow

### Documentation

- Comprehensive README with contribution guide
- Update workflow documentation
- Versioning strategy
- Emergency rollback procedures

### Infrastructure

- GitHub raw content distribution (CDN)
- Version compatibility checking
- Automatic release tagging
- Update URL configuration

---

## Version History Format

### Version Types

- **Major (X.0.0)**: Breaking changes, requires Atticus app update
- **Minor (1.X.0)**: New providers, significant features (backward compatible)
- **Patch (1.0.X)**: New models, bug fixes, documentation updates

### Change Categories

- **Added**: New providers, models, or features
- **Changed**: Updates to existing configurations
- **Deprecated**: Features being phased out
- **Removed**: Deleted providers or models
- **Fixed**: Bug fixes or corrections
- **Security**: Security-related changes

### Examples

```markdown
## [1.1.0] - 2025-10-15

### Added

- New provider: Cohere Command R7B
- OpenAI GPT-4 Turbo Vision model

### Changed

- Updated Anthropic pricing information
- Improved model descriptions

### Fixed

- Corrected Google Gemini endpoint URL
```

---

## Future Updates

When adding new versions, follow this template:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New items

### Changed

- Modified items

### Deprecated

- Items to be removed

### Removed

- Deleted items

### Fixed

- Bug fixes

### Security

- Security updates
```

---

[Unreleased]: https://github.com/atticus-ai/provider-config/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/atticus-ai/provider-config/releases/tag/v1.0.0
