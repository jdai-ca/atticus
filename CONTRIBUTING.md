# Contributing to Atticus

Thank you for your interest in contributing to Atticus! This document provides guidelines for contributing to the project.

## Dual License Model

Atticus uses a dual-license model:

- **Apache License 2.0** for open source use
- **Commercial License** for proprietary use

By contributing to Atticus, you agree that your contributions will be licensed under the same dual-license model.

## Contributor License Agreement (CLA)

Before we can accept your contributions, you must sign our Contributor License Agreement (CLA). This protects both you and us, and ensures that:

1. You grant us the right to use your contribution under both licenses
2. You retain copyright to your contributions
3. You confirm you have the right to make the contribution
4. You grant patent licenses for your contributions

**To sign the CLA:**

1. Fork the repository
2. Submit your pull request
3. A bot will comment with CLA signing instructions
4. Sign electronically (takes 2 minutes)
5. Your PR will be reviewed

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:

- Age, body size, disability, ethnicity, gender identity and expression
- Level of experience, education, socio-economic status
- Nationality, personal appearance, race, religion
- Sexual identity and orientation

### Our Standards

**Positive behaviors:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behaviors:**

- Trolling, insulting/derogatory comments, personal attacks
- Public or private harassment
- Publishing others' private information
- Conduct that could be considered inappropriate in a professional setting

### Enforcement

Violations can be reported to info@jdai.ca. All complaints will be reviewed and investigated.

## How to Contribute

### Reporting Bugs

**Before submitting a bug report:**

1. Check existing issues to avoid duplicates
2. Update to the latest version
3. Verify it's actually a bug (not a feature request or usage question)

**When submitting a bug report, include:**

- Clear, descriptive title
- Exact steps to reproduce
- Expected behavior vs actual behavior
- Screenshots/videos if applicable
- Environment details:
  - OS and version
  - Electron version
  - Node.js version
  - Atticus version
  - AI provider being used

**Example:**

```markdown
## Bug: Chat window freezes when sending long prompts

**Steps to reproduce:**

1. Open Atticus
2. Type a prompt longer than 5000 characters
3. Click Send
4. UI freezes for 30+ seconds

**Expected:** Should send smoothly or show loading indicator

**Actual:** UI completely freezes, no feedback

**Environment:**

- OS: Windows 11 Pro 23H2
- Atticus: v1.0.0
- AI Provider: OpenAI GPT-4 Turbo
- Node: v20.10.0
```

### Suggesting Features

**Before suggesting a feature:**

1. Check existing feature requests
2. Ensure it aligns with project goals
3. Consider if it benefits multiple users

**When suggesting a feature, include:**

- Clear use case / problem it solves
- Proposed solution
- Alternative solutions considered
- Mockups or examples if applicable
- Which practice areas it benefits

**Example:**

```markdown
## Feature: Document Templates for Estate Planning

**Problem:** Users repeatedly draft similar estate planning documents

**Proposed Solution:**

- Add template library for wills, trusts, POAs
- Allow users to save custom templates
- Support variable substitution (client name, dates, etc.)

**Benefits:**

- Saves time for estate planning attorneys
- Ensures consistency
- Reduces errors

**Practice Areas:** Estate Law, General Practice
```

### Pull Requests

**Before submitting a PR:**

1. Discuss major changes via issue first
2. Follow coding standards (below)
3. Write/update tests
4. Update documentation
5. Sign the CLA

**PR Requirements:**

- ✅ Descriptive title and description
- ✅ References related issue(s)
- ✅ Passes all tests (`npm test`)
- ✅ Follows code style (`npm run lint`)
- ✅ Includes tests for new features
- ✅ Updates documentation
- ✅ CLA signed

**PR Template:**

```markdown
## Description

Brief description of what this PR does

## Related Issue

Fixes #123

## Changes Made

- Added feature X
- Fixed bug Y
- Updated documentation Z

## Testing

- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Screenshots (if applicable)

[Add screenshots here]

## Checklist

- [ ] CLA signed
- [ ] Code follows style guide
- [ ] Tests passing
- [ ] Documentation updated
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- Windows, macOS, or Linux

### Setup Steps

```bash
# 1. Fork and clone
git clone https://github.com/YOUR-USERNAME/atticus.git
cd atticus

# 2. Install dependencies
npm install

# 3. Configure AI provider (at least one)
# Copy your API key to Settings → AI Providers

# 4. Start development server
npm run electron:dev

# 5. Make changes and test
# Edit code in src/
# App hot-reloads automatically

# 6. Run tests
npm test

# 7. Build for production
npm run build
```

### Project Structure

```
atticus/
├── src/
│   ├── components/         # React components
│   │   ├── ChatWindow.tsx  # Main chat interface
│   │   ├── Settings.tsx    # Settings modal
│   │   └── Sidebar.tsx     # Conversation history
│   ├── modules/
│   │   └── practiceArea/   # Practice area system
│   │       ├── definitions.ts   # All 23+ practice areas
│   │       ├── detector.ts      # Auto-detection logic
│   │       └── PracticeAreaManager.ts
│   ├── services/
│   │   └── api.ts          # AI provider integrations
│   ├── store/
│   │   └── index.ts        # Zustand state management
│   ├── types/
│   │   └── index.ts        # TypeScript interfaces
│   └── utils/
│       └── pdfExport.ts    # PDF generation
├── electron/
│   ├── main.ts             # Electron main process
│   └── preload.ts          # Preload script
├── docs/                   # Documentation
└── tests/                  # Test files
```

## Coding Standards

### TypeScript

```typescript
// ✅ Good
interface UserPreferences {
  theme: "light" | "dark";
  fontSize: number;
}

function getUserPreferences(userId: string): UserPreferences {
  // Implementation
}

// ❌ Bad
function getPrefs(id: any) {
  // No types, unclear name
}
```

### React Components

```tsx
// ✅ Good
interface ChatMessageProps {
  message: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export function ChatMessage({ message, sender, timestamp }: ChatMessageProps) {
  return <div className="chat-message">{/* Component JSX */}</div>;
}

// ❌ Bad
export function ChatMessage(props) {
  return <div>{props.msg}</div>; // No types, poor structure
}
```

### Naming Conventions

- **Components:** PascalCase (`ChatWindow`, `Settings`)
- **Functions:** camelCase (`detectPracticeArea`, `exportToPDF`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_PRACTICE_AREAS`, `API_TIMEOUT`)
- **Interfaces/Types:** PascalCase (`LegalPracticeArea`, `ProviderConfig`)
- **Files:**
  - Components: PascalCase (`ChatWindow.tsx`)
  - Utilities: camelCase (`pdfExport.ts`)
  - Types: camelCase (`index.ts`)

### Code Style

```typescript
// ✅ Use const/let, not var
const apiKey = process.env.OPENAI_API_KEY;
let retryCount = 0;

// ✅ Prefer async/await over promises
async function fetchData() {
  const response = await fetch(url);
  return response.json();
}

// ✅ Use optional chaining
const userName = user?.profile?.name;

// ✅ Use nullish coalescing
const port = config.port ?? 3000;

// ✅ Destructure props
function Component({ title, description, onClose }: Props) {
  // ...
}

// ✅ Use arrow functions for callbacks
items.map((item) => item.id);

// ✅ Add JSDoc for complex functions
/**
 * Detects the practice area from user input text
 * @param text - The user's question or input
 * @returns The detected practice area with confidence score
 */
function detectPracticeArea(text: string): DetectionResult {
  // ...
}
```

### Testing

```typescript
// Unit test example
import { detectPracticeArea } from "../modules/practiceArea";

describe("Practice Area Detection", () => {
  it("should detect Criminal Law from keywords", () => {
    const result = detectPracticeArea("I was arrested for DUI");
    expect(result.area.id).toBe("criminal");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("should default to General Practice for unclear input", () => {
    const result = detectPracticeArea("hello");
    expect(result.area.id).toBe("general");
  });
});
```

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, no logic change)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding/updating tests
- `chore:` Build process, dependencies, etc.

**Examples:**

```
feat(practice-areas): add Personal Injury Law practice area

- Added 170+ keywords for PI detection
- Comprehensive system prompt covering negligence, torts, damages
- Includes motor vehicle, premises liability, medical malpractice

Closes #42

---

fix(chat): prevent UI freeze on long prompts

The chat window would freeze when sending prompts over 5000 characters.
Added debouncing and chunking to handle large inputs smoothly.

Fixes #156

---

docs(readme): update installation instructions for Node 20

---

chore(deps): upgrade Electron to v28.3.3
```

## Code Review Process

1. **Automated Checks:**

   - CI runs tests and linting
   - Code coverage must not decrease
   - TypeScript must compile without errors

2. **Manual Review:**

   - At least one maintainer approval required
   - Review focuses on:
     - Code quality and style
     - Test coverage
     - Documentation
     - Performance implications
     - Security concerns

3. **Feedback:**

   - Reviewers provide constructive feedback
   - Contributors address feedback
   - Re-review if significant changes made

4. **Merge:**
   - Squash and merge (clean history)
   - Delete branch after merge
   - Close related issues

## Release Process

**Only maintainers can create releases.**

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag (`v1.2.0`)
4. Push tag to trigger release workflow
5. GitHub Actions builds and publishes
6. Release notes auto-generated

## Questions?

- **General questions:** info@jdai.ca
- **Technical help:** info@jdai.ca
- **Security issues:** info@jdai.ca (DO NOT file public issue)
- **GitHub Discussions:** https://github.com/jdai-ca/atticus

## Recognition

Contributors are recognized in:

- `CONTRIBUTORS.md` file
- Release notes
- Project README
- Annual contributor highlights

Thank you for contributing to Atticus! 🎉
