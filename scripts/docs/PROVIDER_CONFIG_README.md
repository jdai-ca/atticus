# Atticus Provider Configuration

This repository contains the external configuration for AI provider integrations in [Atticus](https://github.com/atticus-ai/atticus), the in-house AI counsel application for startups.

## Purpose

This configuration allows Atticus to receive provider and model updates without requiring application redeployment. When new AI models are released (like GPT-5 or Claude 4), they can be made available to users within minutes by updating this repository.

## Current Configuration

- **Version**: 1.0.0
- **Providers**: 9
- **Models**: 30
- **Last Updated**: October 9, 2025

### Supported Providers

1. **OpenAI** - GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
2. **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
3. **Google** - Gemini 1.5 Pro, Gemini 1.5 Flash
4. **Azure OpenAI** - GPT-4 Turbo (Azure), GPT-4 (Azure)
5. **xAI** - Grok Beta, Grok Vision
6. **Mistral AI** - Mistral Large, Medium, Small, Mixtral variants
7. **Cohere** - Command R+, Command R, Command, Command Light
8. **Groq** - Mixtral 8x7B, Llama 2 70B, Llama 2 7B, Gemma 7B
9. **Perplexity AI** - Sonar Large, Medium, Small, Online

## Usage

### For Atticus Users

Your Atticus application automatically checks this repository for updates on startup. No action required!

### For Atticus Developers

To add a new provider or model, follow the [Contributing Guide](#contributing).

## Configuration Structure

```yaml
version: "1.0.0"
minAppVersion: "0.9.0"
lastUpdated: "2025-10-09T00:00:00Z"
updateUrl: "https://raw.githubusercontent.com/atticus-ai/provider-config/main/providers.yaml"

providers:
  - id: provider-id
    name: Provider Name
    displayName: Display Name
    description: Provider description
    endpoint: https://api.provider.com/v1/chat/completions
    defaultModel: default-model-id
    models:
      - id: model-id
        name: Model Name
        description: Model description
        enabled: true
    capabilities:
      supportsMultimodal: true
      supportsRAG: true
    authentication:
      apiKeyFormat: "prefix-..."
      apiKeyLabel: "API Key Label"
      getApiKeyUrl: "https://provider.com/api-keys"
    ui:
      icon: "🤖"
      order: 1
```

## Contributing

### Adding a New Model to Existing Provider

1. **Fork this repository**

2. **Clone your fork**:

   ```bash
   git clone https://github.com/YOUR-USERNAME/provider-config.git
   cd provider-config
   git checkout -b add-model-name
   ```

3. **Edit providers.yaml**:

   ```yaml
   providers:
     - id: openai
       models:
         # Add new model here
         - id: new-model-id
           name: New Model Name
           description: Description of the model
           enabled: true
   ```

4. **Update version** (patch bump for model addition):

   ```yaml
   version: "1.0.1" # Increment patch version
   lastUpdated: "2025-10-09T12:00:00Z" # Current UTC timestamp
   ```

5. **Validate locally**:

   ```bash
   npm install
   node scripts/validate-config.js
   node scripts/check-duplicates.js
   ```

6. **Commit and push**:

   ```bash
   git add providers.yaml
   git commit -m "Add new-model-name to OpenAI provider"
   git push origin add-model-name
   ```

7. **Create Pull Request** on GitHub

8. **Wait for CI validation** - GitHub Actions will automatically validate your changes

9. **Get review and merge** - Maintainers will review and merge

### Adding a New Provider

1. **Follow steps 1-2 above**

2. **Edit providers.yaml** (add at end of providers array):

   ```yaml
   providers:
     # ... existing providers
     - id: new-provider-id
       name: NewProvider
       displayName: New Provider
       description: Description of the provider
       endpoint: https://api.newprovider.com/v1/chat/completions
       defaultModel: default-model-id
       models:
         - id: model-1
           name: Model 1
           description: First model
           enabled: true
       capabilities:
         supportsMultimodal: false
         supportsRAG: true
       authentication:
         apiKeyFormat: "np-..."
         apiKeyLabel: "New Provider API Key"
         getApiKeyUrl: "https://newprovider.com/api-keys"
       ui:
         icon: "🆕"
         order: 10
   ```

3. **Update version** (minor bump for new provider):

   ```yaml
   version: "1.1.0" # Increment minor version
   lastUpdated: "2025-10-09T12:00:00Z"
   ```

4. **Follow steps 5-9 above**

## Version Compatibility

| Config Version | Min Atticus Version | Notes               |
| -------------- | ------------------- | ------------------- |
| 1.0.0          | 0.9.0               | Initial release     |
| 1.x.x          | 0.9.0               | Backward compatible |
| 2.x.x          | 1.0.0               | Breaking changes    |

## Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):

- **Major version** (X.0.0): Breaking changes, requires app update
- **Minor version** (1.X.0): New providers or significant features
- **Patch version** (1.0.X): New models, bug fixes, minor updates

## Validation

All changes are automatically validated by GitHub Actions:

✅ YAML syntax validation  
✅ JSON Schema compliance  
✅ Duplicate ID detection  
✅ Required field verification  
✅ Version format checking  
✅ Timestamp validation

## Update Distribution

Updates are distributed via GitHub's raw content CDN:

- **URL**: `https://raw.githubusercontent.com/atticus-ai/provider-config/main/providers.yaml`
- **Update Check**: On Atticus app startup (non-blocking)
- **Cache**: 5-minute GitHub CDN cache
- **Fallback**: Bundled config in Atticus app

## Emergency Rollback

If a bad configuration is deployed:

1. Revert the commit:

   ```bash
   git revert HEAD
   git push origin main
   ```

2. Wait ~5 minutes for CDN cache to clear

3. Users will receive reverted config on next app restart

## Security

- **No Secrets**: This repository contains NO API keys or secrets
- **Public Access**: Configuration is publicly readable (no sensitive data)
- **Validation**: All changes are validated before deployment
- **Audit Trail**: Full git history of all changes

## Testing

Before submitting a PR:

```bash
# Install dependencies
npm install

# Validate YAML syntax
node -e "require('js-yaml').load(require('fs').readFileSync('providers.yaml', 'utf8'))"

# Validate against schema
node scripts/validate-config.js

# Check for duplicates
node scripts/check-duplicates.js
```

## FAQ

### How quickly do updates reach users?

- **CI/CD**: ~1-2 minutes to merge and deploy
- **CDN Cache**: Up to 5 minutes
- **User Update**: Next app startup
- **Total**: Typically 5-10 minutes after merge

### What if my internet is down?

Atticus always includes a bundled copy of the configuration. If remote updates fail, the app uses the bundled version without errors.

### Can I use a different configuration?

Enterprise users can fork this repository and point their Atticus instance to their own fork for complete control.

### How do I test changes locally?

You can run a local HTTP server and update the `updateUrl` in your local Atticus instance to point to your local config.

## Support

- **Issues**: [GitHub Issues](https://github.com/atticus-ai/provider-config/issues)
- **Discussions**: [GitHub Discussions](https://github.com/atticus-ai/provider-config/discussions)
- **Email**: info@jdai.ca

## License

This configuration data is licensed under the [MIT License](LICENSE).

## Maintainers

- JDAI Development Team
- Community Contributors

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

**Last Updated**: October 9, 2025  
**Repository**: [atticus-ai/provider-config](https://github.com/atticus-ai/provider-config)  
**Atticus App**: [atticus-ai/atticus](https://github.com/atticus-ai/atticus)
