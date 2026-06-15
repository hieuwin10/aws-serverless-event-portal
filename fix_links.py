import os

# Delete redundant README-well-architected.md
redundant_readme = "docs/README-well-architected.md"
if os.path.exists(redundant_readme):
    os.remove(redundant_readme)
    print(f"Deleted redundant file: {redundant_readme}")

# 1. Fix docs/architecture/explanation/scalability-design.md
file1 = "docs/architecture/explanation/scalability-design.md"
if os.path.exists(file1):
    with open(file1, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = content.replace("../../operations/how-to/dynamodb-autoscaling.md", "../../operations/how-to/cost-optimization.md")
    content = content.replace("../../operations/how-to/lambda-optimization.md", "../../operations/how-to/cost-optimization.md")
    
    with open(file1, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Patched links in {file1}")

# 2. Fix docs/security/how-to/cognito-advanced.md
file2 = "docs/security/how-to/cognito-advanced.md"
if os.path.exists(file2):
    with open(file2, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if the specific wrong link exists
    content = content.replace("../operations/how-to/cost-optimization.md", "../../operations/how-to/cost-optimization.md")
    
    with open(file2, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Patched links in {file2}")

# 3. Fix docs/security/reference/iam-policies.md
file3 = "docs/security/reference/iam-policies.md"
if os.path.exists(file3):
    with open(file3, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = content.replace("../how-to/iam-policy-testing.md", "../../testing/how-to/security-testing.md")
    
    with open(file3, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Patched links in {file3}")
