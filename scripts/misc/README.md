# Utility Scripts

This folder contains utility scripts for development, testing, and configuration management.

## Scripts

### Configuration Validation

#### `validate-config.js`

Validates provider configuration YAML files against JSON schema.

**Usage**:

```bash
node scripts/validate-config.js
```

**Purpose**:

- Validates `public/config/providers.yaml` structure
- Checks for required fields
- Ensures semantic versioning format
- Validates date-time formats
- Checks URL formats

**When to Use**:

- Before uploading provider configurations
- After editing providers.yaml
- During CI/CD validation

---

#### `check-duplicates.js`

Checks for duplicate provider or model IDs in configuration files.

**Usage**:

```bash
node scripts/check-duplicates.js
```

**Purpose**:

- Detects duplicate provider IDs
- Detects duplicate model IDs within providers
- Prevents configuration conflicts

**When to Use**:

- Before deploying configuration updates
- When adding new providers or models
- During code review

---

### Data Extraction

#### `extract-practice-areas.js`

Extracts practice area definitions from TypeScript to YAML format.

**Usage**:

```bash
node scripts/extract-practice-areas.js
```

**Output**: `public/config/practices.yaml`

**Purpose**:

- Converts TypeScript practice area definitions to YAML
- Generates external configuration file
- Preserves all keywords and system prompts

**When to Use**:

- One-time migration (already completed)
- Re-generating practices.yaml from source
- Updating practice areas from definitions

**Note**: This was used for the Phase 4 migration and may not need to be run again unless regenerating from source.

---

### Testing

#### `test-config-loader.mjs`

Tests the configuration loader functionality.

**Usage**:

```bash
node scripts/test-config-loader.mjs
```

**Purpose**:

- Tests provider configuration loading
- Validates three-tier fallback (remote → cache → bundled)
- Checks error handling

**When to Use**:

- Testing configuration system changes
- Debugging loader issues
- Verifying remote URL accessibility

---

## Subdirectories

### `/docs`

Documentation for provider configuration management:

- **PROVIDER_CONFIG_README.md** - Provider configuration guide
- **PROVIDER_CONFIG_CHANGELOG.md** - Configuration changelog template
- **PROVIDER_UPDATE_WORKFLOW.md** - Detailed update workflow documentation

### `/templates`

Template files for CI/CD and configuration:

- **github-workflow-template.yml** - GitHub Actions workflow template
- **PROVIDER_CONFIG_PACKAGE.json** - Example package.json for provider repository

---

## Quick Reference

### Validate Before Deploy

```bash
# Check configuration is valid
node scripts/validate-config.js

# Check for duplicates
node scripts/check-duplicates.js
```

### Test Configuration Loading

```bash
# Test the loader
node scripts/test-config-loader.mjs
```

### Extract Practice Areas

```bash
# Re-generate practices.yaml (if needed)
node scripts/extract-practice-areas.js
```

---

## Dependencies

All scripts use Node.js built-in modules or project dependencies:

- **fs** - File system operations
- **path** - Path manipulation
- **yaml** (from dependencies) - YAML parsing
- **ajv** (from dependencies) - JSON Schema validation

No additional installations needed if you've run `npm install`.

---

## Adding New Scripts

When adding new utility scripts:

1. Place executable scripts in `/scripts` root
2. Place documentation in `/scripts/docs/`
3. Place templates in `/scripts/templates/`
4. Update this README with:
   - Script name and purpose
   - Usage instructions
   - When to use it

---

## Related Documentation

- **Configuration System**: See `/docs/DEPLOYMENT_SUMMARY.md`
- **Remote Updates**: See `/docs/REMOTE_CONFIG_TESTING.md`
- **Practice Areas**: See `/docs/PRACTICE_AREA_QUICK_REF.md`

---

**Last Updated**: October 10, 2025  
**Total Scripts**: 4 executable files  
**Documentation Files**: 3 (in `/docs`)  
**Template Files**: 2 (in `/templates`)
