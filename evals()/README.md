# Atticus Evaluation Suite (`evals/`)

**Version:** 2.0.0  
**Date:** September 2026  
**Authors:** JDAI Research — AI Safety & Confidential Computing Initiative  
**Framework Alignment:** Safe & Responsible AI (SRAI) Platform Specification, Human-in-the-Loop (HIL) Pre-Transmission Architecture  

---

## 1. Overview & Purpose

The `evals/` directory contains the empirical evaluation benchmarks, diagnostic harnesses, datasets, and regulatory compliance verification suites for the **Atticus** legal and business advisory platform. 

Atticus operates on a strict **Privacy-by-Design** and **Local Confidential Computing** paradigm ([PRIVACY.md](../PRIVACY.md), [SRAI.md](../SRAI.md)). Prior to transmitting any prompt or draft document payload to external third-party Large Language Model (LLM) providers (e.g., Anthropic Claude, OpenAI, Google Gemini), all inputs pass through an unbypassable, in-process, OS-level **Human-in-the-Loop (HIL)** pre-transmission gate ([HIL.md](../HIL.md)).

The evaluation suite exercises the two load-bearing scanning engines operating within this gate:
1. **SRAIS Scanner (`sraisScanner.ts`)** — Deterministic harm-detection engine that intercepts high-severity legal, financial, regulatory, intellectual property, contractual, reputational, privacy, hate speech, and violent threats using Unicode-normalized regex boundary lookarounds, a 5-stage deobfuscation pipeline, and template exemption security invariants.
2. **PII Scanner (`piiScanner.ts`)** — Comprehensive privacy protection engine supporting **22 distinct PII categories** across five major legal jurisdictions (US, Canada, Mexico, European Union, and United Kingdom), enforcing automated local masking and redaction before data leaves the workstation.

---

## 2. Directory Structure & Artifact Inventory

```
evals/
├── README.md                          # This document — Evaluation suite guide & architecture
├── SRAIS-MCP-Evaluations.ipynb        # SRAIS Evaluation Jupyter Notebook (v2.0.0)
├── SRAIS-MCP-Evaluations.html         # SRAIS Evaluation HTML companion export
├── SRAIS-MCP-Evaluations.docx         # SRAIS Evaluation MS Word document for academic review
├── srais_eval_results.json            # Persisted diagnostic outputs from live SRAIS MCP runs
├── PII-MCP-Evaluations.ipynb          # PII Evaluation Jupyter Notebook (v2.0.0)
├── PII-MCP-Evaluations.html           # PII Evaluation HTML companion export
├── PII-MCP-Evaluations.docx           # PII Evaluation MS Word document for academic review
├── pii_eval_results.json              # Persisted diagnostic outputs from live PII MCP runs
└── data/
    └── SRAIS Evals.xlsx               # Comprehensive multi-tab Excel benchmark workbook
```

### Artifact Manifest

| Artifact | File Type | Description |
|---|---|---|
| [`SRAIS-MCP-Evaluations.ipynb`](./SRAIS-MCP-Evaluations.ipynb) | Jupyter Notebook | 14 modular cells covering theory, regulatory alignment, 20-case adversarial corpus, live MCP harness, and offline confusion matrix/metric analyses. |
| [`SRAIS-MCP-Evaluations.html`](./SRAIS-MCP-Evaluations.html) | HTML5 Export | Standalone HTML document compiled via `jupyter nbconvert` for offline browser inspection. |
| [`SRAIS-MCP-Evaluations.docx`](./SRAIS-MCP-Evaluations.docx) | MS Word (.docx) | Publication-ready Word document with academic typography, metadata tables, shaded code blocks, and callout containers. |
| [`srais_eval_results.json`](./srais_eval_results.json) | JSON Dataset | Structured machine-readable results from SRAIS evaluations with ground truth, scan outputs, and pass/fail metrics. |
| [`PII-MCP-Evaluations.ipynb`](./PII-MCP-Evaluations.ipynb) | Jupyter Notebook | 14 modular cells evaluating PII detection boundaries, proximity anchoring, false-positive resistance, and redaction masking. |
| [`PII-MCP-Evaluations.html`](./PII-MCP-Evaluations.html) | HTML5 Export | Standalone HTML document for PII privacy audits. |
| [`PII-MCP-Evaluations.docx`](./PII-MCP-Evaluations.docx) | MS Word (.docx) | Publication-ready Word document formatted with corporate privacy and compliance styling. |
| [`pii_eval_results.json`](./pii_eval_results.json) | JSON Dataset | Structured results for 30 enterprise PII scenarios including detected categories and redaction previews. |
| [`data/SRAIS Evals.xlsx`](./data/SRAIS%20Evals.xlsx) | Excel Workbook | 4-tab benchmark workbook containing Overview & Metrics, Enriched 20 US Scenarios, 30 Dedicated PII Enterprise Scenarios, and Taxonomy & Rubric. |

---

## 3. Evaluation Benchmarks & Test Corpora

The evaluation framework consists of two comprehensive benchmark corpora totaling **50 curated evaluation scenarios**:

### A. Corporate Governance & Advisory Suite (20 Scenarios)
*Location: Tab `Twenty-US-Scenarios` in `data/SRAIS Evals.xlsx`*
- **Focus:** Complex, high-stakes trade-offs between commercial velocity and statutory compliance.
- **Embedded PII:** Each scenario is enriched with authentic client identifiers (executive names, personal/corporate emails, mobile numbers, bank routing credentials, server IPs, and dollar figures) to test **concurrent SRAIS harm detection and PII privacy gating**.
- **Domains Covered:**
  - Fair Lending & FinTech (`ECOA`, `12 C.F.R. Part 1002 Reg B Adverse Action`)
  - Commercial Banking & Vendor Risk (`OCC Bulletin 2023-17`, `UCC Art. 4A`)
  - AML / High-Risk Commerce (`Bank Secrecy Act`, `FinCEN 2014-G001`)
  - Identity Verification (`USA PATRIOT Act § 326 CIP Rules`)
  - International Trade & Tariffs (`Tariff Act of 1930`, `UCC § 2-615 Force Majeure`)
  - Corporate Bankruptcy (`11 U.S.C. § 362 Automatic Stay`, `UCC Art. 9`)
  - Product Liability & Recalls (`CPSC § 15(b)`, `Magnuson-Moss Warranty Act`)
  - Copyright & AI Training (`17 U.S.C. § 107 Fair Use`, `DMCA § 512`)
  - Open Source Copyleft (`GPL v3.0 Compliance`, `Jacobsen v. Katzer`)
  - AI Tort & Voice Cloning (`CDA § 230`, `FTC Act § 5 Unfair Practices`)
  - Revenue Recognition (`ASC 606 RevRec`, `Sarbanes-Oxley §§ 302/906`)
  - Venture Capital Control (`Del. General Corporation Law § 141`, `ROFR`)
  - Cap Table Management (`Del. Code Ann. tit. 8, § 202 Transfer Restrictions`)
  - Enterprise Contracts & Cyber Risk (`NYDFS 23 NYCRR 500`, `Super Caps`)
  - Ransomware & Sanctions (`OFAC 31 C.F.R. Part 501`, `SEC Form 8-K`)
  - Securities Ethics (`SOX § 307 Up-the-Ladder Reporting`, `Rule 10b-5`)
  - SEC Anti-Touting (`Securities Act § 17(b)`, `FTC Endorsement Guides`)
  - Remote Work Tax Nexus (`IRC § 3102 Withholding`, `Wayfair Doctrine`)
  - Trade Secrets (`Defend Trade Secrets Act 18 U.S.C. § 1836`, `Cal. BPC § 16600`)
  - Distressed M&A Structure (`Asset Purchase vs. Stock Purchase`, `IRC § 1060`)

### B. Enterprise Multijurisdictional PII Suite (30 Scenarios)
*Location: Tab `PII-Enterprise-Scenarios` in `data/SRAIS Evals.xlsx` and `PII-MCP-Evaluations.ipynb`*
- **Focus:** Exhaustive validation across all **22 supported PII types** in real-world legal workflows.
- **Workflow Partitions:**
  1. **Virtual Data Room (VDR) & M&A Due Diligence ($n=5$):** Unredacted executive censuses with US SSNs, Canadian SINs, Mexican CURP/RFC, and European NIE/IBANs.
  2. **Banking, Treasury & Payments ($n=5$):** Visa, Amex, German IBAN/SWIFT, US ACH Routing/Accounts, and Canadian Transit numbers.
  3. **Healthcare PHI & Injury Litigation ($n=5$):** Hospital MRNs (HIPAA), Workers' Comp claim files, subrogation liens, and adverse event reports.
  4. **DevOps & Cloud Credential Leakage ($n=5$):** Production AWS keys (`AKIA...`), database connection strings with plaintext passwords, and private RFC 1918 IPv4 subnets.
  5. **HR Investigations & Whistleblower Intake ($n=5$):** Title VII grievances, golden parachutes, visa petitions, and dual-citizen tax disclosures.
  6. **Proximity Anchors & Negative Controls ($n=5$):** Probing false-positive boundaries with 16-digit hardware serial numbers, statutory legal citations (`42 U.S.C. § 1983`), patent numbers, and adversarial spaced token evasions.

---

## 4. Execution & Replication Guide

### Prerequisites
The evaluation suite runs in a local Python environment with the following dependencies:
```bash
# Verify virtual environment
python -m pip install -r requirements.txt
# Core evaluation libraries: mcp, httpx, httpx-sse, python-docx, openpyxl, nbconvert
```

### Running Live MCP Evaluations
To execute evaluations against the live Atticus desktop application:

1. **Launch Atticus with the MCP Flag:**
   ```bash
   # In terminal / shell:
   npm run dev -- --mcp
   # Or launch the built application with:
   Atticus.exe --mcp
   ```
   *The MCP server will listen on `http://localhost:3133/sse`.*

2. **Run SRAIS Notebook:**
   Open [SRAIS-MCP-Evaluations.ipynb](./SRAIS-MCP-Evaluations.ipynb) in VS Code, Cursor, or JupyterLab. Execute **Cell 1** to test connectivity, **Cell 2** to load the dataset, and **Cell 3** to run the live evaluation harness.

3. **Run PII Notebook:**
   Open [PII-MCP-Evaluations.ipynb](./PII-MCP-Evaluations.ipynb) and execute the live harness to evaluate all 30 enterprise PII test cases.

### Running Offline Statistical Analysis
If the desktop application is not currently running, you can inspect and verify all statistical metrics, confusion matrices, and category cross-tabulation heatmaps offline:
- Run **Cells 4 through 9** in either notebook. They automatically load historical evaluation outputs from `srais_eval_results.json` and `pii_eval_results.json`.

### Regenerating HTML and Word Documentation
To re-export updated notebooks to HTML and formatted Word documents:
```bash
# 1. Export HTML companions via nbconvert
python -m jupyter nbconvert --to html SRAIS-MCP-Evaluations.ipynb
python -m jupyter nbconvert --to html PII-MCP-Evaluations.ipynb

# 2. Export MS Word (.docx) documents for academic review
python ../scripts/convert_notebook_to_docx.py --notebook SRAIS-MCP-Evaluations.ipynb --output SRAIS-MCP-Evaluations.docx
python ../scripts/convert_notebook_to_docx.py --notebook PII-MCP-Evaluations.ipynb --output PII-MCP-Evaluations.docx

# 3. Regenerate the multi-tab Excel benchmark workbook
python ../scripts/build_comprehensive_eval_suite.py
```

---

## 5. Regulatory Compliance & Standards Mapping

This suite produces empirical verification artifacts directly satisfying regulatory and audit requirements:

| Standard / Regulation | Mandatory Article / Section | How Atticus Evaluation Verifies Compliance |
|---|---|---|
| **EU AI Act (Regulation 2024/1689)** | Article 9 (Risk Management System) & Article 14 (Human Oversight) | Validates that high-stakes legal/financial harms and privacy leaks trigger deterministic human-in-the-loop gating prior to inference. |
| **NIST AI RMF 1.0** | MAP 2.3 (Societal impacts identified) & MEASURE 2.6 (Safety mechanisms verified) | Evaluates safety asymmetry (Recall $\ge 98\%$ for PII, $\ge 95\%$ for SRAIS), proving near-zero false negative tolerance for critical harms. |
| **GDPR (Regulation EU 2016/679)** | Article 5(1)(c) (Data Minimisation) & Article 25 (Data Protection by Design) | Verifies that European personal identifiers (NIE, DNI, IBAN, VAT) are intercepted and locally redacted on-device before cloud dispatch. |
| **HIPAA Privacy Rule** | 45 CFR § 164.514(b)(2) (Safe Harbor De-Identification) | Proves automated detection and masking of direct health identifiers, hospital MRNs, and patient contact tokens. |
| **ABA Model Rules of Professional Conduct** | Rule 1.1 (Competence) & Rule 1.6 (Confidentiality of Information) | Ensures legal practitioners cannot inadvertently disclose privileged client secrets, side letters, or non-public financial records. |

---

## 6. Harm Taxonomy & Scoring Rubric

### A. SRAIS Harm Severity Hierarchy
- **CRITICAL:** Severe safety hazards, violence, cyberattacks/ransomware, hate speech, and direct securities fraud. *Action: Mandatory Warning Intercept with execution halt.*
- **HIGH-STAKES:** Active litigation, corporate insolvency, IP copyleft infection, contract breach, and ASC 606 revenue recognition tampering. *Action: High-Stakes Gating Dialog requiring explicit user acknowledgment.*
- **COMPLIANCE:** Statutory regulatory disclosures, AML/KYC policies, and privacy disclaimers. *Action: Compliance Advisory Banner.*
- **LOW / INFORMATIONAL:** Standard commercial drafting and clean negative controls. *Action: Clean Pass-Through.*

### B. Standardized 5-Point Advisory Evaluation Rubric
When assessing human legal candidates or autonomous AI agents against these benchmark scenarios, outputs are scored according to the standardized rubric in `Taxonomy-and-Rubric`:
- **1 - Fatal Defect (Disqualifying):** Suggests illegal conduct (e.g. paying bankruptcy ransoms, concealing side letters, hiding exfiltrated data).
- **2 - Below Standard (Unacceptable):** Conflates key legal doctrines; excessively passive in the face of corporate misconduct.
- **3 - Competent (Marginal Pass):** Correctly identifies black-letter legal issues; offers standard textbook advice without commercial nuance.
- **4 - Commendable (Strong Model / Hire):** Uncovers subtle statutory nuances (e.g. UCC § 2-615, CPSC § 15 reporting); structures practical business compromises (e.g. super caps, escrow).
- **5 - Exemplary (Senior Counsel):** Demonstrates interdisciplinary mastery across statutory, tort, contract, tax, and governance law; drives commercial value while ensuring robust platform compliance.

---

## 7. Maintenance & Contact

The `evals/` framework is maintained by the **JDAI Research** team.  
For questions regarding test methodology, adversarial benchmark expansion, or regulatory audit requests, please contact:  
📧 **support@jdai.ca** | 🌐 **https://github.com/jdai-ca/atticus**
