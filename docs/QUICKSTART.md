# Quick Start Guide - Atticus

**Your AI-Powered Legal & Business Advisory Assistant**

Get up and running with Atticus in 5 minutes. This guide covers installation, configuration, and essential features to help you get the most out of your AI counsel.

---

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Run the Application

```bash
npm run electron:dev
```

The application will launch and automatically open the Settings dialog on first run.

---

## ⚙️ Step 3: Configure Your First AI Provider

Atticus supports **9 AI providers**. Choose one to get started (you can add more later).

### 🔷 Option A: OpenAI (Recommended for Beginners)

1. **Get API Key**: Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click the **Providers** tab in Settings
3. Find **OpenAI** in the list
4. Paste your API key in the input field
5. Click **Activate**
6. Select a default model: **GPT-4 Turbo** (recommended) or **GPT-3.5 Turbo** (faster/cheaper)
7. Click **Set as Active Provider**

**Cost**: ~$0.03 per complex message (GPT-4), ~$0.001 per message (GPT-3.5)

### 🔶 Option B: Anthropic Claude (Best for Legal Analysis)

1. **Get API Key**: Visit [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. In Settings → Providers tab
3. Find **Anthropic** in the list
4. Paste your API key
5. Click **Activate**
6. Select **Claude 3.5 Sonnet** or **Claude 3 Opus**
7. Click **Set as Active Provider**

**Cost**: ~$0.015 per message (Sonnet), ~$0.075 per message (Opus)

### 🔷 Option C: Google Gemini (Best for Context)

1. **Get API Key**: Visit [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. In Settings → Providers tab
3. Find **Google** in the list
4. Paste your API key
5. Click **Activate**
6. Select **Gemini 1.5 Pro** (128k context window)
7. Click **Set as Active Provider**

**Cost**: ~$0.0005 per message (very affordable)

### ⚡ Other Providers Available

- **Groq** - Ultra-fast inference (500+ tokens/sec) - Free tier available
- **Mistral AI** - EU-based, privacy-focused
- **xAI** - Real-time knowledge with Grok
- **Perplexity** - Web search with citations
- **Cohere** - Enterprise RAG-optimized
- **Azure OpenAI** - Enterprise deployment

---

## 💬 Step 4: Start Your First Conversation

1. Click the **➕ New Conversation** button in the sidebar
2. Type your question in the message box
3. Press **Enter** to send

### Example First Questions:

**Legal:**

```
What are the key elements of a valid contract?
Explain vesting schedules for startup founders.
What's required for a Delaware C-Corp incorporation?
```

**Business Advisory:**

```
How do I create a go-to-market strategy for a SaaS startup?
What's a good equity split for 3 co-founders?
Explain the SR&ED tax credit application process in Canada.
```

### ✨ Automatic Detection

Atticus automatically detects:

- 🏛️ **Practice Area** (26 legal specializations)
- 💼 **Advisory Area** (11 business domains)
- 🌍 **Jurisdiction** (if you mention Canada, US, or EU)

The AI will apply specialized prompts and expertise automatically!

---

## 🎯 Explore the Settings (4 Tabs)

### Tab 1: 🔌 Providers

- Configure all 9 AI providers
- Set default models
- Enable/disable specific models to reduce clutter
- Set active provider for new conversations

### Tab 2: ⚖️ Practice Areas

- View all **26 legal practice areas**
- Click **"+X more"** to expand full keyword lists
- Understand what triggers each area
- Legal domains include:
  - Corporate Law, Litigation, IP, Real Estate, Employment, Tax
  - Startup & Entrepreneurship Law (founder agreements, vesting, SAFE notes)
  - Venture Capital & Startup Finance (term sheets, Series A-C)
  - Cross-Border Startup Operations (multi-jurisdiction compliance)

### Tab 3: 💼 Advisory Areas

- View all **11 business advisory areas**
- Expandable keyword lists for each area
- Business domains include:
  - Strategic Planning, Financial Advisory, Marketing Strategy
  - Operations Management, Digital Transformation, Risk Management
  - Government Grants & Innovation Funding (SR&ED, SBIR, Horizon Europe)
  - Product Development & Legal Compliance

### Tab 4: ℹ️ About

- Mission and coverage statistics
- Geographic coverage: 🇨🇦 80% Canada, 🇺🇸 92% US, 🇪🇺 75% EU
- Privacy guarantees and legal disclaimers
- System statistics (37 specialized domains, 3,200+ keywords)

---

## 🔥 Essential Features

### 🔍 Search Conversations

1. Click the **🔍 Search** button in the sidebar header
2. Type keywords to filter by:
   - Conversation title
   - Message content
   - Practice area or advisory area
3. Click any result to open that conversation
4. Press **Escape** to close

### ✏️ Rename Conversations

1. Hover over any conversation in the sidebar
2. Click the **Edit** (✏️) icon in the bottom-right
3. Type a new descriptive title
4. Press **Enter** to save or **Escape** to cancel

**Why?** Default titles are just the first message. Give conversations meaningful names like:

- "Startup Founder Agreement - Acme Inc"
- "Series A Term Sheet Analysis"
- "GDPR Compliance for SaaS Product"

### 📄 Export to PDF

1. Hover over any conversation
2. Click the **Document** (📄) icon in the bottom-right
3. Choose save location
4. PDF includes all messages with formatting

### 🔀 Multi-Model Queries (Advanced)

Query multiple AI models simultaneously to cross-validate answers:

1. In any conversation, click the **model selector** dropdown
2. Check multiple models (e.g., GPT-4 + Claude 3.5 + Gemini)
3. Send your message
4. See responses from all models with attribution badges
5. Compare answers to identify consensus or unique insights

**Best For**: Important legal analysis, complex business decisions, reducing hallucinations

### 🌍 Multi-Jurisdictional Analysis

Mention jurisdictions in your questions for specialized analysis:

```
How does GDPR compliance differ from CCPA? (🇪🇺 EU vs 🇺🇸 US)
Compare employment law in Ontario and California.
What are the startup grant programs in Canada and the UK?
```

Atticus will provide jurisdiction-specific guidance or comparative analysis.

### 📎 Upload Documents (Multimodal Models)

1. Click the **paperclip** (📎) icon
2. Select files: PDF, Word, TXT, MD, images
3. Ask questions about the document:
   - "Review this contract and identify risks"
   - "Summarize this legal brief"
   - "What are the key terms in this NDA?"

**Supported Models**: GPT-4 Turbo, Claude 3.5 Sonnet, Gemini 1.5 Pro

---

## 📋 Example Prompts by Domain

### 🚀 Startup & Entrepreneurship

```
Draft a founder vesting agreement with a 4-year schedule and 1-year cliff.
Explain 83(b) elections and the 30-day deadline.
What should be in a startup founder agreement?
Review this SAFE note and explain the terms.
How do I create an employee stock option pool?
```

### 💰 Venture Capital & Fundraising

```
Explain liquidation preferences in a term sheet.
What's the difference between participating and non-participating preferred stock?
Review this Series A term sheet for red flags.
What are market-standard protective provisions?
How does anti-dilution protection work?
```

### 🌍 Cross-Border Operations

```
How do I hire employees in Canada as a US company?
What are the GDPR requirements for a SaaS product?
Explain permanent establishment and tax nexus.
What's required for a flip from Canadian to Delaware incorporation?
```

### 🏛️ Government Grants

```
Am I eligible for SR&ED tax credits in Canada?
How do I apply for an SBIR grant?
What's the process for Horizon Europe funding?
Compare non-dilutive funding options for cleantech startups.
```

### 📊 Strategic Planning

```
Create a SWOT analysis framework for my SaaS startup.
How do I develop a business model canvas?
What's a good go-to-market strategy for B2B software?
Explain the Jobs-to-be-Done framework.
```

### 💵 Financial Advisory

```
What valuation methods should I use for a pre-revenue startup?
How do I create financial projections for a pitch deck?
Explain the difference between pre-money and post-money valuation.
What are typical metrics for SaaS companies?
```

### 🎨 Marketing & Growth

```
How do I calculate customer acquisition cost (CAC)?
What's a good CAC:LTV ratio for SaaS?
Explain the pirate metrics framework (AARRR).
Create a content marketing strategy for B2B.
```

---

## 🎯 Pro Tips & Best Practices

### 1. 🎭 Use Multi-Model for Important Decisions

For critical legal or business decisions:

- Select 2-3 models (e.g., GPT-4 + Claude 3.5 + Gemini)
- Compare their responses
- Look for consensus on key points
- Investigate areas where models disagree

### 2. 📝 Give Conversations Descriptive Titles

Rename conversations immediately after starting:

- ❌ Bad: "What are the key elements of a valid contract?"
- ✅ Good: "Contract Law Basics - Client Onboarding"
- ✅ Good: "Acme Inc - Series A Term Sheet Review"

### 3. 🔍 Use Search to Find Past Analysis

Before asking a similar question, search your conversation history:

- You might have already researched it
- Saves API costs
- Maintains consistency

### 4. 📚 Upload Reference Documents

For contract reviews, legal analysis, or document summaries:

- Upload the PDF or Word document
- Ask specific questions
- Request redline suggestions
- Get clause-by-clause analysis

### 5. 🌍 Be Specific About Jurisdiction

Always mention your jurisdiction for legal questions:

- "What are the employment laws in Ontario, Canada?"
- "How does GDPR apply to my US-based SaaS company?"
- "Explain California LLC vs Delaware C-Corp for startups"

### 6. 💡 Explore Keywords in Settings

Click **"+X more"** in Practice/Advisory tabs to see all trigger keywords:

- Understand what activates each specialization
- Use specific terminology to trigger expert prompts
- Discover related concepts you might not have considered

### 7. 💰 Monitor Your API Costs

Check your usage regularly:

- **OpenAI**: [platform.openai.com/usage](https://platform.openai.com/usage)
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com)
- **Google**: [console.cloud.google.com](https://console.cloud.google.com)

**Cost-Saving Tips**:

- Use GPT-3.5 or Gemini for simple questions
- Reserve GPT-4/Claude Opus for complex analysis
- Use single model for research, multi-model for decisions

### 8. ⌨️ Learn the Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message
- **Escape**: Close search dialog or cancel editing
- **Click + or 🔍**: Quick access from sidebar header

---

## 🔧 Build for Production

Create a standalone desktop application:

```bash
npm run electron:build
```

Built applications appear in the `release/` folder:

- **Windows**: `atticus-1.0.0-setup.exe`
- **Mac**: `Atticus-1.0.0.dmg`
- **Linux**: `Atticus-1.0.0.AppImage`

---

## 💰 Cost Management & API Pricing

### Estimated Costs (October 2025)

| Provider      | Model             | Cost per Message\* |
| ------------- | ----------------- | ------------------ |
| **OpenAI**    | GPT-4 Turbo       | ~$0.02-0.05        |
| **OpenAI**    | GPT-4             | ~$0.03-0.08        |
| **OpenAI**    | GPT-3.5 Turbo     | ~$0.001-0.002      |
| **Anthropic** | Claude 3 Opus     | ~$0.05-0.10        |
| **Anthropic** | Claude 3.5 Sonnet | ~$0.01-0.03        |
| **Anthropic** | Claude 3 Haiku    | ~$0.001-0.003      |
| **Google**    | Gemini 1.5 Pro    | ~$0.002-0.005      |
| **Google**    | Gemini 1.5 Flash  | ~$0.0001-0.0005    |
| **Groq**      | Llama 3.1 70B     | ~$0.0005-0.001     |

\*Costs vary based on message length, context, and usage patterns. Check provider websites for current pricing.

### Budget-Friendly Strategy

1. **Start with**: Gemini 1.5 Flash or GPT-3.5 Turbo
2. **Use for complex**: GPT-4 Turbo or Claude 3.5 Sonnet
3. **Multi-model when**: Critical decisions need validation
4. **Set limits**: Use provider dashboard billing alerts

---

## 🆘 Troubleshooting

### "No active provider configured"

**Solution**:

1. Click Settings (⚙️)
2. Go to Providers tab
3. Add and activate at least one provider
4. Click "Set as Active Provider"

### "API request failed" or 401/403 errors

**Solutions**:

- ✅ Verify API key is correct (no extra spaces)
- ✅ Check you have billing/credits set up with the provider
- ✅ Confirm your internet connection
- ✅ Check provider status page for outages
- ✅ For Azure: Verify endpoint URL is correct

### "Rate limit exceeded"

**Solutions**:

- Wait a few minutes and try again
- Upgrade your provider tier
- Switch to a different provider temporarily
- Check your provider dashboard for rate limits

### Conversations not saving

**Solutions**:

- Check disk space (conversations saved to `%APPDATA%/atticus/`)
- Verify write permissions
- Try exporting to PDF as backup

### App won't start

**Solutions**:

1. Verify Node.js version: `node --version` (need 18+)
2. Delete `node_modules` and reinstall: `npm install`
3. Try running dev server first: `npm run dev`
4. Check console for specific error messages

### "Cannot find module" errors

**Solutions**:

```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Try again
npm run electron:dev
```

### Multimodal/document upload not working

**Solutions**:

- Verify the model supports multimodal (check Settings)
- Ensure file size is under provider limits (usually 20MB)
- Try a different file format
- Check file isn't corrupted

---

## 🔒 Privacy & Security Best Practices

### ✅ Your Data is Safe

- **Local Storage**: All conversations stored on your machine (`%APPDATA%/atticus/`)
- **Direct API Calls**: No intermediaries between you and AI providers
- **No Cloud Sync**: Your data never leaves your device
- **Encrypted Keys**: API keys stored securely in local config

### ⚠️ Important Reminders

- **Don't share API keys**: They're linked to your billing account
- **Review sensitive info**: Before uploading client documents, ensure you have permission
- **No attorney-client privilege**: AI conversations aren't protected
- **Export important work**: Regularly export key conversations to PDF
- **Monitor usage**: Check provider dashboards for unexpected activity

---

## 📚 Next Steps

### Learn More

- **[Full Documentation](README.md)** - Complete feature reference
- **[Advisory Capabilities](ADVISORY_CAPABILITIES.md)** - Business advisory guide
- **[Practice Areas](PRACTICE_AREA_QUICK_REF.md)** - Legal specializations
- **[Architecture](ARCHITECTURE.md)** - Technical design

### Explore Features

1. ✅ Configure multiple AI providers
2. ✅ Try multi-model queries for complex questions
3. ✅ Upload a contract for review
4. ✅ Organize conversations with descriptive titles
5. ✅ Use search to find past analysis
6. ✅ Export important conversations to PDF
7. ✅ Explore all 37 specialized domains in Settings

### Get Help

- **Main README**: Check troubleshooting section
- **Settings → About Tab**: Coverage information
- **Console Logs**: Check for detailed error messages
- **Provider Status Pages**: Verify service availability

---

## ⚖️ Legal Disclaimer

**🚨 IMPORTANT: Atticus is NOT a substitute for professional legal advice.**

- ✅ **Use for**: Research, drafting assistance, brainstorming, learning
- ❌ **Don't use for**: Final legal decisions without attorney review
- ⚠️ **Always**: Verify information with current laws and licensed professionals
- 🔒 **Remember**: No attorney-client privilege applies to AI conversations

AI can make mistakes, miss important details, or provide outdated information. Always consult with a qualified attorney for legal matters affecting your business or rights.

---

**Ready to accelerate your legal and business workflows? Start asking questions! ⚖️🚀**

_Last Updated: October 12, 2025 | Version 1.0.0_
