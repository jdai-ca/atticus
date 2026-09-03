"""
Synchronize PII-MCP-Evaluations.ipynb with the expanded 30-case enterprise dataset,
run the offline analysis, and export HTML and Word documents.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
import docx

NOTEBOOK_PATH = r"c:\JDAI\GitHub\atticus\evals()\PII-MCP-Evaluations.ipynb"
DOCX_PATH = r"c:\JDAI\GitHub\atticus\evals()\PII-MCP-Evaluations.docx"
HTML_PATH = r"c:\JDAI\GitHub\atticus\evals()\PII-MCP-Evaluations.html"
RESULTS_FILE = r"c:\JDAI\GitHub\atticus\evals()\pii_eval_results.json"

sys.path.insert(0, os.path.dirname(__file__))
from build_comprehensive_eval_suite import PII_ENTERPRISE_SCENARIOS

def update_notebook():
    print(f"Reading notebook from: {NOTEBOOK_PATH}")
    with open(NOTEBOOK_PATH, "r", encoding="utf-8") as f:
        nb = json.load(f)

    # Format the 30-case dataset as clean Python code for Cell 5 (index 4 in notebook)
    dataset_code_lines = [
        "# =============================================================================\n",
        "# Cell 2: Evaluation Dataset Definition (30 Curated Enterprise Scenarios)\n",
        "# =============================================================================\n",
        "#\n",
        "# PURPOSE:\n",
        "#   Defines an empirical benchmark corpus of 30 test inputs spanning 6\n",
        "#   real-world enterprise workflows: M&A Diligence, Banking & Payments,\n",
        "#   Healthcare Litigation, DevOps Security, HR Investigations, and\n",
        "#   Proximity Anchors / Boundary Value Negative Controls.\n",
        "# =============================================================================\n",
        "\n",
        "eval_inputs = [\n"
    ]

    for item in PII_ENTERPRISE_SCENARIOS:
        dataset_code_lines.append("    {\n")
        dataset_code_lines.append(f'        "id": "{item["id"]}",\n')
        dataset_code_lines.append(f'        "workflow": "{item["workflow"]}",\n')
        dataset_code_lines.append(f'        "category": "{item["workflow"]} – {item["title"]}",\n')
        dataset_code_lines.append(f'        "text": {json.dumps(item["prompt"])},\n')
        dataset_code_lines.append(f'        "expected_findings": {item["expected_findings"]},\n')
        dataset_code_lines.append(f'        "expected_categories": {json.dumps(item["pii_types"])},\n')
        dataset_code_lines.append(f'        "jurisdiction": "{item["jurisdiction"]}",\n')
        dataset_code_lines.append(f'        "risk_level": "{item["risk_level"]}",\n')
        dataset_code_lines.append(f'        "rationale": {json.dumps(item["anchor_context"])}\n')
        dataset_code_lines.append("    },\n")

    dataset_code_lines.append("]\n\n")
    dataset_code_lines.append("# ---------------------------------------------------------------------------\n")
    dataset_code_lines.append("# Dataset Descriptive Statistics\n")
    dataset_code_lines.append("# ---------------------------------------------------------------------------\n")
    dataset_code_lines.append("total_cases = len(eval_inputs)\n")
    dataset_code_lines.append("positive_cases = sum(1 for t in eval_inputs if t['expected_findings'])\n")
    dataset_code_lines.append("negative_cases = total_cases - positive_cases\n\n")
    dataset_code_lines.append("print('=' * 72)\n")
    dataset_code_lines.append("print('  📋 EXPANDED PII ENTERPRISE BENCHMARK DATASET (30 SCENARIOS)')\n")
    dataset_code_lines.append("print('=' * 72)\n")
    dataset_code_lines.append("print(f'  Total Test Cases:             {total_cases}')\n")
    dataset_code_lines.append("print(f'  Positive Tests (Contain PII): {positive_cases} ({positive_cases/total_cases*100:.1f}%)')\n")
    dataset_code_lines.append("print(f'  Negative Controls (Clean):    {negative_cases} ({negative_cases/total_cases*100:.1f}%)')\n\n")
    dataset_code_lines.append("print('\\n  Breakdown by Enterprise Workflow:')\n")
    dataset_code_lines.append("wf_counts = {}\n")
    dataset_code_lines.append("for t in eval_inputs:\n")
    dataset_code_lines.append("    wf = t['workflow']\n")
    dataset_code_lines.append("    wf_counts[wf] = wf_counts.get(wf, 0) + 1\n")
    dataset_code_lines.append("for wf, cnt in sorted(wf_counts.items()):\n")
    dataset_code_lines.append("    print(f'    • {wf:<28s} : {cnt:2d} case(s)')\n")

    # Find and update Cell 5 (the dataset cell)
    updated = False
    for cell in nb["cells"]:
        if cell.get("id") == "05-pii-evaluation-dataset" or "Cell 2: Evaluation Dataset Definition" in "".join(cell.get("source", [])):
            cell["source"] = dataset_code_lines
            updated = True
            print("[SUCCESS] Updated evaluation dataset cell in notebook with 30 cases.")
            break

    if not updated:
        print("[WARNING] Could not find exact dataset cell by ID, replacing index 4...")
        nb["cells"][4]["source"] = dataset_code_lines

    with open(NOTEBOOK_PATH, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1)
    print(f"[SUCCESS] Saved updated notebook to: {NOTEBOOK_PATH}")


if __name__ == "__main__":
    update_notebook()
