# Provider Update Workflow Guide

This guide provides step-by-step instructions for updating the Atticus provider configuration.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Adding a New Model](#adding-a-new-model)
3. [Adding a New Provider](#adding-a-new-provider)
4. [Updating Model Details](#updating-model-details)
5. [Deprecating a Model](#deprecating-a-model)
6. [Emergency Procedures](#emergency-procedures)
7. [Testing Checklist](#testing-checklist)

---

## Quick Reference

### Version Bumping Rules

| Change Type                    | Version Increment | Example       |
| ------------------------------ | ----------------- | ------------- |
| New model to existing provider | Patch             | 1.0.0 → 1.0.1 |
| New provider                   | Minor             | 1.0.0 → 1.1.0 |
| Breaking schema change         | Major             | 1.0.0 → 2.0.0 |
| Bug fix or documentation       | Patch             | 1.0.0 → 1.0.1 |

### Workflow Summary

```
1. Fork repository
2. Create feature branch
3. Edit providers.yaml
4. Update version + lastUpdated
5. Validate locally
6. Commit and push
7. Create Pull Request
8. CI validation passes
9. Get review
10. Merge to main
11. Auto-release created
12. Users receive update
```

---

## Adding a New Model

**Use Case**: OpenAI just released GPT-5

### Step 1: Prepare Environment

```bash
# Fork the repository on GitHub first
git clone https://github.com/YOUR-USERNAME/provider-config.git
cd provider-config
git checkout -b add-gpt5
```

### Step 2: Edit Configuration

Open `providers.yaml` and find the provider:

```yaml
providers:
  - id: openai
    name: OpenAI
    displayName: OpenAI
    description: Advanced AI models from OpenAI, including GPT-4 and GPT-3.5 Turbo series
    endpoint: https://api.openai.com/v1/chat/completions
    defaultModel: gpt-4-turbo-preview
    models:
      - id: gpt-4-turbo-preview
        name: GPT-4 Turbo
        description: Most capable GPT-4 model with 128k context
        enabled: true
      - id: gpt-4
        name: GPT-4
        description: Large multimodal model with broad general knowledge
        enabled: true
      - id: gpt-3.5-turbo
        name: GPT-3.5 Turbo
        description: Fast and cost-effective model for most tasks
        enabled: true
      # ADD NEW MODEL HERE ↓
      - id: gpt-5
        name: GPT-5
        description: Next-generation model with enhanced reasoning
        enabled: true
```

### Step 3: Update Metadata

Update the version and timestamp at the top of `providers.yaml`:

```yaml
version: "1.0.1" # Increment patch version
minAppVersion: "0.9.0"
lastUpdated: "2025-10-15T14:30:00Z" # Current UTC time
updateUrl: "https://raw.githubusercontent.com/atticus-ai/provider-config/main/providers.yaml"
```

### Step 4: Validate Locally

```bash
# Install dependencies (first time only)
npm install

# Run validation
npm test

# Expected output:
# ✅ YAML syntax valid
# ✅ Schema validation passed
# ✅ No duplicate IDs found
# ✨ All validation checks passed!
```

### Step 5: Commit and Push

```bash
git add providers.yaml
git commit -m "Add GPT-5 model to OpenAI provider

- Added gpt-5 model with id 'gpt-5'
- Updated version to 1.0.1
- Updated lastUpdated timestamp"

git push origin add-gpt5
```

### Step 6: Create Pull Request

1. Go to GitHub: `https://github.com/atticus-ai/provider-config`
2. Click "Pull Requests" → "New Pull Request"
3. Select your fork and branch
4. Fill in PR details:

```markdown
## Add GPT-5 Model

### Changes

- Added GPT-5 model to OpenAI provider
- Model ID: `gpt-5`
- Description: Next-generation model with enhanced reasoning

### Version

- Version: 1.0.0 → 1.0.1 (patch)
- Timestamp: 2025-10-15T14:30:00Z

### Testing

- [x] Local validation passed
- [x] No duplicate IDs
- [x] Schema compliant
- [x] Version bumped correctly

### Rollout Plan

Users will receive this update on next Atticus app restart (typically within 5-10 minutes of merge).
```

5. Click "Create Pull Request"

### Step 7: Wait for CI Validation

GitHub Actions will automatically run validation checks:

- ✅ YAML syntax
- ✅ Schema compliance
- ✅ Duplicate detection
- ✅ Version format
- ✅ Timestamp validity

**If CI fails**: Check the error messages and fix issues, then push again.

### Step 8: Merge

Once CI passes and a maintainer approves:

1. Maintainer clicks "Merge Pull Request"
2. GitHub Actions automatically:
   - Tags the release (`v1.0.1`)
   - Creates GitHub release
   - Attaches `providers.yaml` to release

### Step 9: Verify Deployment

Check that the release was created:

```
https://github.com/atticus-ai/provider-config/releases/tag/v1.0.1
```

Verify the config is accessible:

```bash
curl https://raw.githubusercontent.com/atticus-ai/provider-config/main/providers.yaml
```

### Step 10: Monitor

Users will receive the update automatically:

- **CDN Cache**: ~5 minutes
- **User Update**: Next app restart
- **Total Time**: 5-10 minutes after merge

---

## Adding a New Provider

**Use Case**: Integrate Cohere Command R7B as a new provider

### Step 1: Research Provider

Gather required information:

- API endpoint URL
- Authentication method (API key format)
- Available models
- Capabilities (multimodal, RAG, etc.)
- API key signup URL
- Icon emoji

### Step 2: Add Provider Configuration

Add to end of `providers` array in `providers.yaml`:

```yaml
providers:
  # ... existing providers ...

  - id: cohere-r7b
    name: CohereR7B
    displayName: Cohere Command R7B
    description: Cohere's latest Command R7B model for enterprise applications
    endpoint: https://api.cohere.ai/v1/chat
    defaultModel: command-r7b
    models:
      - id: command-r7b
        name: Command R7B
        description: 7B parameter model optimized for enterprise tasks
        enabled: true
      - id: command-r7b-plus
        name: Command R7B Plus
        description: Enhanced version with extended context
        enabled: true
    capabilities:
      supportsMultimodal: false
      supportsRAG: true
    authentication:
      apiKeyFormat: "co-..."
      apiKeyLabel: "Cohere API Key"
      getApiKeyUrl: "https://dashboard.cohere.ai/api-keys"
    ui:
      icon: "🔵"
      order: 11
```

### Step 3: Update Metadata

```yaml
version: "1.1.0" # Increment MINOR version (new provider)
minAppVersion: "0.9.0"
lastUpdated: "2025-10-15T15:00:00Z"
updateUrl: "https://raw.githubusercontent.com/atticus-ai/provider-config/main/providers.yaml"
```

### Step 4: Validate and Deploy

Follow Steps 4-10 from "Adding a New Model" section.

**Note**: Use minor version increment (1.0.0 → 1.1.0) for new providers.

---

## Updating Model Details

**Use Case**: Fix incorrect model description or endpoint

### Changes Allowed

- Model descriptions
- Provider descriptions
- Endpoint URLs
- Default model selection
- Model enabled status
- UI icons or ordering
- Capability flags

### Example: Update Model Description

```yaml
models:
  - id: gpt-4-turbo-preview
    name: GPT-4 Turbo
    description: Most capable GPT-4 model with 128k context and vision # Updated
    enabled: true
```

### Version Bump

**Patch version** for documentation/description updates:

```yaml
version: "1.0.2" # 1.0.1 → 1.0.2
```

Follow standard workflow (Steps 4-10 from "Adding a New Model").

---

## Deprecating a Model

**Use Case**: OpenAI is retiring GPT-3.5 Turbo

### Step 1: Disable Model

```yaml
models:
  - id: gpt-3.5-turbo
    name: GPT-3.5 Turbo
    description: Fast and cost-effective model (DEPRECATED - use GPT-4 Turbo)
    enabled: false # Changed from true to false
```

### Step 2: Update Version

```yaml
version: "1.0.3" # Patch version
```

### Step 3: Add Changelog Entry

Update `CHANGELOG.md`:

```markdown
## [1.0.3] - 2025-10-20

### Deprecated

- OpenAI GPT-3.5 Turbo (use GPT-4 Turbo instead)

### Changed

- Disabled gpt-3.5-turbo model
- Updated description to indicate deprecation
```

### Step 4: Deploy

Follow standard workflow.

**Note**: Disabled models won't appear in Atticus UI but config remains backward compatible.

---

## Emergency Procedures

### Emergency Rollback

**Use Case**: Bad config was deployed and breaking production

#### Option 1: Git Revert (Recommended)

```bash
# Identify bad commit
git log --oneline

# Revert the commit
git revert <commit-hash>
git push origin main

# Wait ~5 minutes for CDN cache to clear
```

#### Option 2: Force Push Previous Version

```bash
# Reset to last good commit
git reset --hard <good-commit-hash>
git push --force origin main

# Wait ~5 minutes for CDN cache to clear
```

#### Option 3: Hotfix Release

```bash
# Create hotfix branch from last good release
git checkout -b hotfix-1.0.4 v1.0.3

# Fix the issue
# ... edit providers.yaml ...

# Bump version
version: "1.0.4"

# Commit and push
git commit -am "Hotfix: Revert bad model configuration"
git push origin hotfix-1.0.4

# Create PR and merge immediately
```

### Emergency Contact

If unable to fix:

1. **Slack**:
2. **Email**: info@jdai.ca
3. **GitHub**: Open critical issue

---

## Testing Checklist

### Pre-Merge Validation

- [ ] Local validation passed (`npm test`)
- [ ] No duplicate provider IDs
- [ ] No duplicate model IDs within providers
- [ ] Version incremented correctly
- [ ] `lastUpdated` timestamp is current UTC time
- [ ] `minAppVersion` unchanged (unless breaking change)
- [ ] CHANGELOG.md updated
- [ ] Commit message follows convention
- [ ] PR description includes testing notes

### Post-Merge Verification

- [ ] GitHub Actions CI passed
- [ ] Release tag created (`v1.x.x`)
- [ ] GitHub release published
- [ ] `providers.yaml` accessible via raw URL
- [ ] CDN cache cleared (~5 minutes)
- [ ] Tested in Atticus app (manual verification)

### Manual App Testing

1. **Clear cache**:

   ```javascript
   // In Atticus DevTools console
   localStorage.clear();
   ```

2. **Restart app**

3. **Verify new provider/model appears**:

   - Open Settings
   - Check provider list
   - Verify new model is available
   - Test model selection

4. **Test conversation**:
   - Create new conversation
   - Select new model
   - Send test message
   - Verify response

---

## Common Issues

### Issue: CI Validation Failed

**Error**: `Schema validation failed`

**Fix**: Check error message for specific field. Common issues:

- Missing required field (`id`, `name`, `description`)
- Invalid endpoint URL format
- Incorrect version format (must be `X.Y.Z`)

### Issue: Duplicate ID Detected

**Error**: `Duplicate provider ID found: openai`

**Fix**: Each provider and model must have unique ID within scope:

- Provider IDs: globally unique
- Model IDs: unique within provider only

### Issue: Version Not Updated

**Error**: `Version must be incremented`

**Fix**: Update `version` field in `providers.yaml`:

- Patch: `1.0.0` → `1.0.1`
- Minor: `1.0.0` → `1.1.0`
- Major: `1.0.0` → `2.0.0`

### Issue: Update Not Appearing

**Symptom**: Users not seeing new model after merge

**Debugging**:

1. Check release was created on GitHub
2. Verify CDN URL returns latest config:
   ```bash
   curl -H "Cache-Control: no-cache" https://raw.githubusercontent.com/atticus-ai/provider-config/main/providers.yaml
   ```
3. Wait 5-10 minutes for CDN cache
4. Check Atticus console logs for update errors
5. Verify `minAppVersion` compatibility

---

## Best Practices

### Commit Messages

Use conventional commit format:

```
feat: Add GPT-5 model to OpenAI provider
fix: Correct Anthropic endpoint URL
docs: Update provider descriptions
chore: Bump version to 1.0.1
```

### PR Descriptions

Include:

- **What**: What changed
- **Why**: Reason for change
- **Version**: Version bump type and number
- **Testing**: Validation results
- **Impact**: User-facing changes

### Model IDs

Use kebab-case:

- ✅ `gpt-4-turbo-preview`
- ✅ `claude-3-opus`
- ❌ `GPT4TurboPreview`
- ❌ `claude_3_opus`

### Descriptions

Be concise and user-focused:

- ✅ "Most capable GPT-4 model with 128k context"
- ❌ "This is OpenAI's latest model released in 2024 with..."

---

## Quick Commands

### Validate Config

```bash
npm test
```

### Check Version

```bash
npm run version-check
```

### Format YAML

```bash
# Use IDE formatter or yamllint
yamllint providers.yaml
```

### View Diff

```bash
git diff HEAD~1 providers.yaml
```

---

## Support

- **Documentation**: [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/atticus-ai/provider-config/issues)
- **Discussions**: [GitHub Discussions](https://github.com/atticus-ai/provider-config/discussions)

---

**Last Updated**: October 9, 2025  
**Repository**: [atticus-ai/provider-config](https://github.com/atticus-ai/provider-config)
