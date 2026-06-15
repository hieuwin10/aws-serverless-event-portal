import os
import re

mapping = {
    "docs/security/how-to/security-hardening.md": {
        "category": "How-To", "domain": "Security", "difficulty": "Trung bình", "time": "2 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Security](../../index.md#security) > How-To"
    },
    "docs/security/how-to/waf-configuration.md": {
        "category": "How-To", "domain": "Security", "difficulty": "Trung bình", "time": "1.5 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Security](../../index.md#security) > How-To"
    },
    "docs/security/how-to/cognito-advanced.md": {
        "category": "How-To", "domain": "Security", "difficulty": "Trung bình", "time": "1.5 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Security](../../index.md#security) > How-To"
    },
    "docs/security/reference/iam-policies.md": {
        "category": "Reference", "domain": "Security", "difficulty": "Trung bình", "time": "1 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Security](../../index.md#security) > Reference"
    },
    "docs/operations/how-to/monitoring-alerting.md": {
        "category": "How-To", "domain": "Operations", "difficulty": "Trung bình", "time": "1.5 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Operations](../../index.md#operations) > How-To"
    },
    "docs/operations/how-to/backup-recovery.md": {
        "category": "How-To", "domain": "Operations", "difficulty": "Trung bình", "time": "1 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Operations](../../index.md#operations) > How-To"
    },
    "docs/operations/how-to/cost-optimization.md": {
        "category": "How-To", "domain": "Operations", "difficulty": "Dễ", "time": "45 phút",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Operations](../../index.md#operations) > How-To"
    },
    "docs/operations/reference/runbooks.md": {
        "category": "Reference", "domain": "Operations", "difficulty": "Trung bình", "time": "2 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Operations](../../index.md#operations) > Reference"
    },
    "docs/architecture/explanation/scalability-design.md": {
        "category": "Explanation", "domain": "Architecture", "difficulty": "Trung bình", "time": "1 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Architecture](../../index.md#architecture) > Explanation"
    },
    "docs/architecture/reference/architecture-decisions.md": {
        "category": "Reference", "domain": "Architecture", "difficulty": "Dễ", "time": "45 phút",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Architecture](../../index.md#architecture) > Reference"
    },
    "docs/infrastructure/how-to/cicd-pipeline.md": {
        "category": "How-To", "domain": "Infrastructure", "difficulty": "Khó", "time": "2.5 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Infrastructure](../../index.md#infrastructure) > How-To"
    },
    "docs/infrastructure/reference/cloudformation-templates.md": {
        "category": "Reference", "domain": "Infrastructure", "difficulty": "Khó", "time": "2 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Infrastructure](../../index.md#infrastructure) > Reference"
    },
    "docs/testing/how-to/load-testing.md": {
        "category": "How-To", "domain": "Testing", "difficulty": "Trung bình", "time": "1.5 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Testing](../../index.md#testing) > How-To"
    },
    "docs/testing/how-to/security-testing.md": {
        "category": "How-To", "domain": "Testing", "difficulty": "Khó", "time": "2.5 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Testing](../../index.md#testing) > How-To"
    },
    "docs/testing/how-to/chaos-engineering.md": {
        "category": "How-To", "domain": "Testing", "difficulty": "Khó", "time": "2 giờ",
        "breadcrumb": "[Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Testing](../../index.md#testing) > How-To"
    }
}

for rel_path, info in mapping.items():
    filepath = os.path.normpath(rel_path)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Inject Breadcrumbs at the top if not present
    breadcrumb_marker = "Trang chủ Well-Architected"
    if breadcrumb_marker not in content:
        # Prepend breadcrumbs at the very beginning of content
        breadcrumbs_text = f"***\n*Breadcrumbs: {info['breadcrumb']}*\n***\n\n"
        content = breadcrumbs_text + content
        print(f"Injected breadcrumbs to {filepath}")
    else:
        print(f"Breadcrumbs already present in {filepath}")

    # 2. Update Metadata section at the bottom
    # We look for a line starting with "- **Category**:" or similar to update, or replace the entire metadata block.
    # Let's inspect content and update key fields.
    metadata_match = re.search(r'\*\*Metadata\*\*:', content)
    if metadata_match:
        pos = metadata_match.end()
        # Find all bullet items under metadata block until the end or next heading
        block_end = content.find("\n\n##", pos)
        if block_end == -1:
            block_end = len(content)
            
        metadata_block = content[pos:block_end]
        
        # Check if fields exist and replace them, otherwise append
        fields = {
            "Category": info["category"],
            "Domain": info["domain"],
            "Difficulty": info["difficulty"],
            "Estimated Reading/Implementation Time": info["time"],
            "Last Updated": "2026-06-12"
        }
        
        new_block = metadata_block
        for name, value in fields.items():
            pattern = rf'-\s+\*\*{name}\*\*:\s*.*'
            replacement = f'- **{name}**: {value}'
            if re.search(pattern, new_block):
                new_block = re.sub(pattern, replacement, new_block)
            else:
                # Append if not present in the block
                new_block = new_block.rstrip() + f"\n- **{name}**: {value}\n"
                
        content = content[:pos] + new_block + content[block_end:]
        print(f"Updated metadata fields in {filepath}")
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Polishing process completed successfully!")
