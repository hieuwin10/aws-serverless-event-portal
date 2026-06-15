"""
Finalize Well-Architected docs for tasks 32-34:
- YAML front matter
- Fix breadcrumb anchors
- Standardize Vietnamese headings
- Ensure Bước tiếp theo + Tài liệu liên quan sections
- Normalize metadata blocks
"""
import os
import re

LAST_UPDATED = "2026-06-12"

DOCS = {
    "docs/security/how-to/security-hardening.md": {
        "title": "Hướng Dẫn Hardening Bảo Mật Toàn Diện cho AWS Serverless",
        "category": "How-To", "domain": "Security", "difficulty": "Trung bình",
        "reading_time": "2 giờ", "tags": ["security", "iam", "s3", "cloudfront", "hardening"],
        "requirements": ["Requirement 3", "Requirement 16", "Requirement 17", "Requirement 18"],
        "breadcrumb_suffix": "How-To",
        "next_steps": [
            ("Triển khai WAF cho API Gateway", "waf-configuration.md"),
            ("Bật MFA và Cognito nâng cao", "cognito-advanced.md"),
            ("Kiểm tra bảo mật với OWASP ZAP", "../../testing/how-to/security-testing.md"),
        ],
        "related": [
            ("IAM Policies Reference", "../reference/iam-policies.md"),
            ("WAF Configuration", "waf-configuration.md"),
            ("Well-Architected Assessment", "../../well-architected-assessment.md"),
        ],
    },
    "docs/security/how-to/waf-configuration.md": {
        "title": "Cấu Hình AWS WAF cho API Gateway",
        "category": "How-To", "domain": "Security", "difficulty": "Trung bình",
        "reading_time": "1.5 giờ", "tags": ["waf", "api-gateway", "security", "ddos"],
        "requirements": ["Requirement 3", "Requirement 16", "Requirement 18"],
        "breadcrumb_suffix": "How-To",
        "next_steps": [
            ("Hardening bảo mật tổng thể", "security-hardening.md"),
            ("Deploy WAF template", "../../infrastructure/reference/cloudformation-templates.md"),
            ("Penetration testing API", "../../testing/how-to/security-testing.md"),
        ],
        "related": [
            ("Security Hardening", "security-hardening.md"),
            ("CloudFormation Templates", "../../infrastructure/reference/cloudformation-templates.md"),
            ("Monitoring & Alerting", "../../operations/how-to/monitoring-alerting.md"),
        ],
    },
    "docs/security/how-to/cognito-advanced.md": {
        "title": "Cấu Hình Cognito Nâng Cao",
        "category": "How-To", "domain": "Security", "difficulty": "Trung bình",
        "reading_time": "1.5 giờ", "tags": ["cognito", "mfa", "authentication", "security"],
        "requirements": ["Requirement 3", "Requirement 16", "Requirement 17"],
        "breadcrumb_suffix": "How-To",
        "next_steps": [
            ("Security hardening IAM", "security-hardening.md"),
            ("Runbook Cognito failures", "../../operations/reference/runbooks.md"),
        ],
        "related": [
            ("IAM Policies", "../reference/iam-policies.md"),
            ("Security Testing", "../../testing/how-to/security-testing.md"),
            ("Architecture Decisions (Cognito ADR)", "../../architecture/reference/architecture-decisions.md"),
        ],
    },
    "docs/security/reference/iam-policies.md": {
        "title": "IAM Policies Reference",
        "category": "Reference", "domain": "Security", "difficulty": "Trung bình",
        "reading_time": "1 giờ", "tags": ["iam", "policies", "least-privilege", "lambda"],
        "requirements": ["Requirement 3", "Requirement 16", "Requirement 17"],
        "breadcrumb_suffix": "Reference",
        "next_steps": [
            ("Áp dụng policies vào hệ thống", "../how-to/security-hardening.md"),
            ("Test IAM policies", "../../testing/how-to/security-testing.md"),
        ],
        "related": [
            ("Security Hardening Guide", "../how-to/security-hardening.md"),
            ("Security Testing", "../../testing/how-to/security-testing.md"),
        ],
    },
    "docs/operations/how-to/monitoring-alerting.md": {
        "title": "Monitoring & Alerting với CloudWatch",
        "category": "How-To", "domain": "Operations", "difficulty": "Trung bình",
        "reading_time": "1.5 giờ", "tags": ["cloudwatch", "monitoring", "alarms", "sns"],
        "requirements": ["Requirement 6", "Requirement 16", "Requirement 17", "Requirement 18"],
        "breadcrumb_suffix": "How-To",
        "next_steps": [
            ("Thiết lập runbooks cho incidents", "../reference/runbooks.md"),
            ("Tối ưu chi phí monitoring", "cost-optimization.md"),
        ],
        "related": [
            ("Runbooks", "../reference/runbooks.md"),
            ("Cost Optimization", "cost-optimization.md"),
            ("CloudFormation Templates", "../../infrastructure/reference/cloudformation-templates.md"),
        ],
    },
    "docs/operations/how-to/backup-recovery.md": {
        "title": "Backup & Recovery",
        "category": "How-To", "domain": "Operations", "difficulty": "Trung bình",
        "reading_time": "1 giờ", "tags": ["backup", "pitr", "dynamodb", "s3", "disaster-recovery"],
        "requirements": ["Requirement 8", "Requirement 16", "Requirement 17"],
        "breadcrumb_suffix": "How-To",
        "next_steps": [
            ("Thiết lập monitoring sau recovery", "monitoring-alerting.md"),
            ("Chaos test resilience", "../../testing/how-to/chaos-engineering.md"),
        ],
        "related": [
            ("Runbooks", "../reference/runbooks.md"),
            ("CloudFormation Templates", "../../infrastructure/reference/cloudformation-templates.md"),
        ],
    },
    "docs/operations/how-to/cost-optimization.md": {
        "title": "Cost Optimization",
        "category": "How-To", "domain": "Operations", "difficulty": "Dễ",
        "reading_time": "45 phút", "tags": ["cost", "free-tier", "billing", "optimization"],
        "requirements": ["Requirement 5", "Requirement 16", "Requirement 18"],
        "breadcrumb_suffix": "How-To",
        "next_steps": [
            ("Right-size Lambda/DynamoDB", "../../architecture/explanation/scalability-design.md"),
            ("Thiết lập billing alarms", "monitoring-alerting.md"),
        ],
        "related": [
            ("Monitoring & Alerting", "monitoring-alerting.md"),
            ("Scalability Design", "../../architecture/explanation/scalability-design.md"),
            ("Well-Architected Assessment", "../../well-architected-assessment.md"),
        ],
    },
    "docs/operations/reference/runbooks.md": {
        "title": "Operations Runbooks",
        "category": "Reference", "domain": "Operations", "difficulty": "Trung bình",
        "reading_time": "2 giờ", "tags": ["runbooks", "incident", "troubleshooting", "operations"],
        "requirements": ["Requirement 7", "Requirement 16", "Requirement 17"],
        "breadcrumb_suffix": "Reference",
        "next_steps": [
            ("Thiết lập CloudWatch alarms", "../how-to/monitoring-alerting.md"),
            ("Chaos engineering để test runbooks", "../../testing/how-to/chaos-engineering.md"),
        ],
        "related": [
            ("Monitoring & Alerting", "../how-to/monitoring-alerting.md"),
            ("Backup & Recovery", "../how-to/backup-recovery.md"),
            ("Scalability Design", "../../architecture/explanation/scalability-design.md"),
        ],
    },
    "docs/architecture/explanation/scalability-design.md": {
        "title": "Scalability Design cho Serverless",
        "category": "Explanation", "domain": "Architecture", "difficulty": "Trung bình",
        "reading_time": "1 giờ", "tags": ["scalability", "dynamodb", "lambda", "api-gateway"],
        "requirements": ["Requirement 4", "Requirement 16", "Requirement 18"],
        "breadcrumb_suffix": "Explanation",
        "next_steps": [
            ("Deploy auto-scaling templates", "../../infrastructure/reference/cloudformation-templates.md"),
            ("Load test sau khi scale", "../../testing/how-to/load-testing.md"),
        ],
        "related": [
            ("Architecture Decisions", "../reference/architecture-decisions.md"),
            ("CloudFormation Templates", "../../infrastructure/reference/cloudformation-templates.md"),
            ("Runbooks (DynamoDB throttling)", "../../operations/reference/runbooks.md"),
        ],
    },
    "docs/architecture/reference/architecture-decisions.md": {
        "title": "Architecture Decision Records (ADR)",
        "category": "Reference", "domain": "Architecture", "difficulty": "Dễ",
        "reading_time": "45 phút", "tags": ["adr", "architecture", "decisions"],
        "requirements": ["Requirement 14", "Requirement 16"],
        "breadcrumb_suffix": "Reference",
        "next_steps": [
            ("Hiểu scalability patterns", "../explanation/scalability-design.md"),
            ("Deploy theo ADR với SAM", "../../infrastructure/reference/cloudformation-templates.md"),
        ],
        "related": [
            ("Scalability Design", "../explanation/scalability-design.md"),
            ("CloudFormation Templates", "../../infrastructure/reference/cloudformation-templates.md"),
            ("Well-Architected Assessment", "../../well-architected-assessment.md"),
        ],
    },
    "docs/infrastructure/how-to/cicd-pipeline.md": {
        "title": "CI/CD Pipeline với GitHub Actions",
        "category": "How-To", "domain": "Infrastructure", "difficulty": "Khó",
        "reading_time": "2.5 giờ", "tags": ["cicd", "github-actions", "deployment", "devops"],
        "requirements": ["Requirement 10", "Requirement 16", "Requirement 17"],
        "breadcrumb_suffix": "How-To",
        "next_steps": [
            ("Security testing trong pipeline", "../../testing/how-to/security-testing.md"),
            ("Load test sau deploy", "../../testing/how-to/load-testing.md"),
        ],
        "related": [
            ("CloudFormation Templates", "../reference/cloudformation-templates.md"),
            ("Security Testing", "../../testing/how-to/security-testing.md"),
        ],
    },
    "docs/infrastructure/reference/cloudformation-templates.md": {
        "title": "CloudFormation/SAM Templates Reference",
        "category": "Reference", "domain": "Infrastructure", "difficulty": "Khó",
        "reading_time": "2 giờ", "tags": ["cloudformation", "sam", "iac", "templates"],
        "requirements": ["Requirement 9", "Requirement 16", "Requirement 17", "Requirement 18"],
        "breadcrumb_suffix": "Reference",
        "next_steps": [
            ("Tích hợp templates vào CI/CD", "../how-to/cicd-pipeline.md"),
            ("Validate với chaos engineering", "../../testing/how-to/chaos-engineering.md"),
        ],
        "related": [
            ("CI/CD Pipeline", "../how-to/cicd-pipeline.md"),
            ("Scalability Design", "../../architecture/explanation/scalability-design.md"),
            ("WAF Configuration", "../../security/how-to/waf-configuration.md"),
        ],
    },
    "docs/testing/how-to/load-testing.md": {
        "title": "Kiểm Thử Tải với Artillery và k6",
        "category": "How-To", "domain": "Testing", "difficulty": "Trung bình",
        "reading_time": "1.5 giờ", "tags": ["load-testing", "artillery", "k6", "performance"],
        "requirements": ["Requirement 11", "Requirement 16", "Requirement 18"],
        "breadcrumb_suffix": "How-To",
        "next_steps": [
            ("Chaos test sau load test", "chaos-engineering.md"),
            ("Tối ưu scale dựa trên kết quả", "../../architecture/explanation/scalability-design.md"),
        ],
        "related": [
            ("Scalability Design", "../../architecture/explanation/scalability-design.md"),
            ("Monitoring & Alerting", "../../operations/how-to/monitoring-alerting.md"),
            ("Chaos Engineering", "chaos-engineering.md"),
        ],
    },
    "docs/testing/how-to/security-testing.md": {
        "title": "Security Testing",
        "category": "How-To", "domain": "Testing", "difficulty": "Khó",
        "reading_time": "2.5 giờ", "tags": ["security-testing", "owasp", "penetration", "iam"],
        "requirements": ["Requirement 12", "Requirement 16", "Requirement 17"],
        "breadcrumb_suffix": "How-To",
        "next_steps": [
            ("Fix issues với security hardening", "../../security/how-to/security-hardening.md"),
            ("Tích hợp scan vào CI/CD", "../../infrastructure/how-to/cicd-pipeline.md"),
        ],
        "related": [
            ("Security Hardening", "../../security/how-to/security-hardening.md"),
            ("WAF Configuration", "../../security/how-to/waf-configuration.md"),
            ("IAM Policies", "../../security/reference/iam-policies.md"),
        ],
    },
    "docs/testing/how-to/chaos-engineering.md": {
        "title": "Chaos Engineering với AWS FIS",
        "category": "How-To", "domain": "Testing", "difficulty": "Khó",
        "reading_time": "2 giờ", "tags": ["chaos-engineering", "fis", "resilience", "testing"],
        "requirements": ["Requirement 13", "Requirement 16", "Requirement 17", "Requirement 18"],
        "breadcrumb_suffix": "How-To",
        "next_steps": [
            ("Cập nhật runbooks từ kết quả chaos test", "../../operations/reference/runbooks.md"),
            ("Thiết lập monitoring cho failures", "../../operations/how-to/monitoring-alerting.md"),
        ],
        "related": [
            ("Runbooks", "../../operations/reference/runbooks.md"),
            ("Load Testing", "load-testing.md"),
            ("Backup & Recovery", "../../operations/how-to/backup-recovery.md"),
        ],
    },
    "docs/architecture/tutorials/deploy-serverless-stack.md": {
        "title": "Tutorial: Deploy Serverless Stack với AWS SAM",
        "category": "Tutorial", "domain": "Architecture", "difficulty": "Trung bình",
        "reading_time": "1 giờ", "tags": ["tutorial", "sam", "deploy", "getting-started"],
        "requirements": ["Requirement 1", "Requirement 9", "Requirement 16"],
        "breadcrumb_suffix": "Tutorial",
        "next_steps": [
            ("Security hardening sau deploy", "../../security/how-to/security-hardening.md"),
            ("Thiết lập monitoring", "../../operations/how-to/monitoring-alerting.md"),
            ("CI/CD tự động hóa", "../../infrastructure/how-to/cicd-pipeline.md"),
        ],
        "related": [
            ("CloudFormation Templates", "../../infrastructure/reference/cloudformation-templates.md"),
            ("Development Guide (legacy)", "../../development-guide.md"),
            ("Well-Architected Assessment", "../../well-architected-assessment.md"),
        ],
    },
}

DOMAIN_ANCHOR = {
    "Security": "security",
    "Operations": "operations",
    "Architecture": "architecture",
    "Infrastructure": "infrastructure",
    "Testing": "testing",
}

HEADING_FIXES = [
    (r"## Vấn Đề\b", "## Vấn đề"),
    (r"## Giải Pháp\b", "## Giải pháp"),
    (r"## Điều Kiện Tiên Quyết\b", "## Điều kiện tiên quyết"),
    (r"## Tài Liệu Liên Quan\b", "## Tài liệu liên quan"),
    (r"## Lưu Ý\b", "## Lưu ý"),
    (r"## Xem thêm\b", "## Tài liệu liên quan"),
]


def depth_prefix(filepath):
    norm = filepath.replace("\\", "/")
    parts = [p for p in norm.split("/") if p]
    # docs/domain/type/file.md -> 2 levels below docs/
    levels = max(len(parts) - 2, 0)
    return "../" * levels


def make_breadcrumb(info, filepath):
    depth = depth_prefix(filepath)
    anchor = DOMAIN_ANCHOR[info["domain"]]
    return (
        f"[Trang chủ Well-Architected]({depth}README.md) > "
        f"[Chỉ mục]({depth}index.md) > "
        f"[{info['domain']}]({depth}index.md#{anchor}) > "
        f"{info['breadcrumb_suffix']}"
    )


def make_front_matter(info):
    tags = ", ".join(info["tags"])
    reqs = ", ".join(info["requirements"])
    return (
        "---\n"
        f"title: \"{info['title']}\"\n"
        f"category: {info['category']}\n"
        f"domain: {info['domain']}\n"
        f"difficulty: {info['difficulty']}\n"
        f"reading_time: {info['reading_time']}\n"
        f"last_updated: {LAST_UPDATED}\n"
        f"tags: [{tags}]\n"
        f"requirements: [{reqs}]\n"
        "---\n"
    )


def strip_front_matter(content):
    if content.startswith("---\n"):
        end = content.find("\n---\n", 4)
        if end != -1:
            return content[end + 5 :]
    return content


def strip_breadcrumbs(content):
    pattern = r"\*{3}\s*\n\*Breadcrumbs:[^\n]*\n\*{3}\s*\n?"
    while re.search(pattern, content):
        content = re.sub(pattern, "", content)
    return content


def build_section(name, items):
    lines = [f"## {name}", ""]
    for label, link in items:
        lines.append(f"- [{label}]({link})")
    lines.append("")
    return "\n".join(lines)


def remove_nav_sections(content):
    for name in ["Bước tiếp theo", "Tài liệu liên quan"]:
        pattern = rf"\n## {re.escape(name)}\s*\n.*?(?=\n## |\n---\n\n\*\*Metadata\*\*:|\n\*\*Metadata\*\*:|\Z)"
        content = re.sub(pattern, "", content, flags=re.DOTALL)
    return content.rstrip()


def insert_nav_sections(content, info):
    block = build_section("Bước tiếp theo", info["next_steps"])
    block += "\n" + build_section("Tài liệu liên quan", info["related"])
    meta_marker = content.rfind("\n---\n\n**Metadata**:")
    if meta_marker == -1:
        meta_marker = content.rfind("\n**Metadata**:")
    if meta_marker != -1:
        return content[:meta_marker] + "\n\n" + block + content[meta_marker:]
    return content + "\n\n" + block


def normalize_metadata(content, info):
    meta_start = content.rfind("**Metadata**:")
    if meta_start == -1:
        block = (
            "\n---\n\n**Metadata**:\n"
            f"- **Requirements**: {', '.join(info['requirements'])}\n"
            f"- **Category**: {info['category']}\n"
            f"- **Domain**: {info['domain']}\n"
            f"- **Difficulty**: {info['difficulty']}\n"
            f"- **Estimated Reading/Implementation Time**: {info['reading_time']}\n"
            f"- **Last Updated**: {LAST_UPDATED}\n"
        )
        return content.rstrip() + block

    tail = content[meta_start:]
    remove_keys = ["Complexity", "Estimated Implementation Time", "Estimated Cost"]
    for key in remove_keys:
        tail = re.sub(rf"- \*\*{re.escape(key)}\*\*:.*\n", "", tail)

    fields = {
        "Category": info["category"],
        "Domain": info["domain"],
        "Difficulty": info["difficulty"],
        "Estimated Reading/Implementation Time": info["reading_time"],
        "Last Updated": LAST_UPDATED,
    }
    for name, value in fields.items():
        pattern = rf"-\s+\*\*{re.escape(name)}\*\*:\s*.*"
        replacement = f"- **{name}**: {value}"
        if re.search(pattern, tail):
            tail = re.sub(pattern, replacement, tail)
        else:
            tail = tail.rstrip() + f"\n- **{name}**: {value}"

    return content[:meta_start] + tail


def process_file(rel_path, info):
    filepath = os.path.normpath(rel_path)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    content = strip_front_matter(content)
    content = strip_breadcrumbs(content)

    for pattern, replacement in HEADING_FIXES:
        content = re.sub(pattern, replacement, content)

    content = remove_nav_sections(content)
    content = normalize_metadata(content, info)
    content = insert_nav_sections(content, info)

    breadcrumb = make_breadcrumb(info, rel_path)
    front = make_front_matter(info)
    breadcrumb_block = f"***\n*Breadcrumbs: {breadcrumb}*\n***\n\n"
    content = front + breadcrumb_block + content.lstrip("\n")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: {rel_path}")


def fix_index_anchors():
    path = "docs/index.md"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    anchors = [
        ("## 🔒 Security (Bảo Mật)", '<a id="security"></a>\n\n## 🔒 Security (Bảo Mật)'),
        ("## ⚙️ Operations (Vận Hành)", '<a id="operations"></a>\n\n## ⚙️ Operations (Vận Hành)'),
        ("## 🏗️ Architecture (Kiến Trúc)", '<a id="architecture"></a>\n\n## 🏗️ Architecture (Kiến Trúc)'),
        ("## 🔧 Infrastructure (Hạ Tầng)", '<a id="infrastructure"></a>\n\n## 🔧 Infrastructure (Hạ Tầng)'),
        ("## 🧪 Testing (Kiểm Thử)", '<a id="testing"></a>\n\n## 🧪 Testing (Kiểm Thử)'),
    ]
    for old, new in anchors:
        if f'id="{new.split('"')[1]}' not in content:
            content = content.replace(old, new, 1)

    content = content.replace(
        "### Tutorials (Chưa có — placeholder)\n> Chưa có tutorial files. Sẽ được tạo trong phase tiếp theo.",
        "### Tutorials (1 file)\n"
        "1. [architecture/tutorials/deploy-serverless-stack.md](./architecture/tutorials/deploy-serverless-stack.md) — Deploy SAM stack từ đầu",
    )
    content = content.replace(
        "*INDEX này bao gồm 15 tài liệu Well-Architected",
        "*INDEX này bao gồm 16 tài liệu Well-Architected (15 guides + 1 tutorial)",
    )

    if not content.startswith("---\n"):
        front = (
            "---\n"
            "title: INDEX — Chỉ Mục Tài Liệu Well-Architected\n"
            "category: Index\n"
            "domain: Overview\n"
            "difficulty: Dễ\n"
            "reading_time: 10 phút\n"
            f"last_updated: {LAST_UPDATED}\n"
            "tags: [index, navigation, bmad-method]\n"
            "---\n"
        )
        content = front + content

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: docs/index.md")


def main():
    for rel_path, info in DOCS.items():
        filepath = os.path.normpath(rel_path)
        if not os.path.exists(filepath):
            print(f"SKIP (not found): {filepath}")
            continue
        process_file(filepath, info)
    fix_index_anchors()
    print("Finalize completed.")


if __name__ == "__main__":
    main()
