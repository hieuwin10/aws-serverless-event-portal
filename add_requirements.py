import os
import re

mapping = {
    "docs/security/how-to/security-hardening.md": ["Requirement 3", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/security/reference/iam-policies.md": ["Requirement 3", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/security/how-to/waf-configuration.md": ["Requirement 3", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/security/how-to/cognito-advanced.md": ["Requirement 3", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/operations/how-to/monitoring-alerting.md": ["Requirement 6", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/operations/how-to/backup-recovery.md": ["Requirement 8", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/operations/how-to/cost-optimization.md": ["Requirement 5", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/operations/reference/runbooks.md": ["Requirement 7", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/architecture/explanation/scalability-design.md": ["Requirement 4", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/architecture/reference/architecture-decisions.md": ["Requirement 14", "Requirement 16"],
    "docs/infrastructure/how-to/cicd-pipeline.md": ["Requirement 10", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/infrastructure/reference/cloudformation-templates.md": ["Requirement 9", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/testing/how-to/load-testing.md": ["Requirement 11", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/testing/how-to/security-testing.md": ["Requirement 12", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/testing/how-to/chaos-engineering.md": ["Requirement 13", "Requirement 16", "Requirement 17", "Requirement 18"],
    "docs/README.md": ["Requirement 1", "Requirement 15", "Requirement 16"],
    "docs/index.md": ["Requirement 1", "Requirement 15", "Requirement 16"],
    "docs/well-architected-assessment.md": ["Requirement 2", "Requirement 16"]
}

for rel_path, reqs in mapping.items():
    filepath = os.path.normpath(rel_path)
    if not os.path.exists(filepath):
        print(f"Skipping (not found): {filepath}")
        continue
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    reqs_str = ", ".join(reqs)
    
    # Check if **Requirements** or Requirements: is already in the file to avoid duplicates
    if "Requirements:" in content or "**Requirements**:" in content or "**Requirements Covered**:" in content:
        print(f"Already contains requirements: {filepath}")
        continue
        
    # Search for Metadata block
    metadata_match = re.search(r'\*\*Metadata\*\*:', content)
    if metadata_match:
        # Insert requirements as first item under metadata
        pos = metadata_match.end()
        # Find the next newline and insert there
        newline_pos = content.find("\n", pos)
        if newline_pos != -1:
            insertion = f"\n- **Requirements**: {reqs_str}"
            content = content[:newline_pos] + insertion + content[newline_pos:]
            print(f"Added requirements metadata to {filepath}")
    else:
        # Append metadata section at the end
        content += f"\n\n---\n\n**Metadata**:\n- **Requirements**: {reqs_str}\n"
        print(f"Appended requirements metadata to {filepath}")
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
