# Atticus Documentation

This folder contains active, user-facing documentation for the Atticus project. Implementation notes, completion reports, and historical development documentation have been moved to the `/notes` folder.

## 📚 Active Documentation

### Getting Started

- **[QUICKSTART.md](QUICKSTART.md)** - Step-by-step guide to get started quickly

### Architecture & Design

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and technical design

### Features & Reference

- **[ADVISORY_CAPABILITIES.md](ADVISORY_CAPABILITIES.md)** - Business advisory and consulting features
- **[ADVISORY_QUICK_REF.md](ADVISORY_QUICK_REF.md)** - Quick reference for advisory areas
- **[PRACTICE_AREA_QUICK_REF.md](PRACTICE_AREA_QUICK_REF.md)** - Quick reference for legal practice areas
- **[THREAD_CONFIG_UI_REFERENCE.md](THREAD_CONFIG_UI_REFERENCE.md)** - Thread configuration UI guide
- **[UNIFIED_CONFIG_DIALOG.md](UNIFIED_CONFIG_DIALOG.md)** - Unified configuration dialog documentation

---

## 📖 Quick Navigation

### For Users

- **New to Atticus?** Start with [Main README](../README.md) → [QUICKSTART.md](QUICKSTART.md)
- **Using practice areas?** Check [PRACTICE_AREA_QUICK_REF.md](PRACTICE_AREA_QUICK_REF.md)
- **Using advisory features?** See [ADVISORY_CAPABILITIES.md](ADVISORY_CAPABILITIES.md)
- **Configuration help?** Review [UNIFIED_CONFIG_DIALOG.md](UNIFIED_CONFIG_DIALOG.md)

### For Developers

- **Understanding the codebase?** Read [ARCHITECTURE.md](ARCHITECTURE.md)
- **Implementation details?** Check the `/notes` folder for completion reports

### For Contributors

- **Architectural changes?** Update [ARCHITECTURE.md](ARCHITECTURE.md)
- **Working on practice areas?** See [PRACTICE_AREA_QUICK_REF.md](PRACTICE_AREA_QUICK_REF.md)
- **Working on advisory areas?** See [ADVISORY_QUICK_REF.md](ADVISORY_QUICK_REF.md)

---

## � Configuration Files

The app uses three main configuration files (YAML format):

### providers.yaml

- **Location**: `public/config/providers.yaml`
- **Remote**: `https://jdai.ca/atticus/providers.yaml`
- **Content**: 9 AI providers with multiple models
- **Updates**: Automatic background updates

### practices.yaml

- **Location**: `public/config/practices.yaml`
- **Remote**: `https://jdai.ca/atticus/practices.yaml`
- **Content**: 26 legal practice areas with 2,000+ keywords
- **Updates**: Automatic background updates

### advisory.yaml

- **Location**: `public/config/advisory.yaml`
- **Remote**: `https://jdai.ca/atticus/advisory.yaml`
- **Content**: 11 business advisory areas with 1,200+ keywords
- **Updates**: Automatic background updates

For deployment procedures and testing, see implementation notes in the `/notes` folder.

---

## 📝 Historical Notes

Development notes, phase summaries, implementation details, deployment reports, and completion documentation have been moved to the `/notes` folder. These provide historical context and implementation details:

---

## 🤝 Contributing to Documentation

When adding new documentation:

1. **User-facing docs** → Place in `docs/` folder
2. **Implementation notes** → Place in `notes/` folder
3. **Update this README** with new user-facing documents
4. **Include proper metadata** (date, version, audience)
5. **Link to related documents**

---

**Last Updated**: October 12, 2025  
**Documentation Version**: 1.0.0
