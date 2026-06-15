import os
import re
import json
import sys
import subprocess

# Reconfigure stdout to use UTF-8 on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
else:
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())

# Auto-install pyyaml if not available
try:
    import yaml
except ImportError:
    print("Installing PyYAML for validation...")
    subprocess.run([sys.executable, "-m", "pip", "install", "pyyaml"], capture_output=True)
    try:
        import yaml
    except ImportError:
        print("Warning: Could not install PyYAML. YAML validation will be basic.")
        yaml = None

DOCS_DIR = "docs"
REQUIREMENTS_FILE = ".kiro/specs/aws-well-architected-docs/requirements.md"

# 18 Requirements list to verify coverage
EXPECTED_REQUIREMENTS = [f"Requirement {i}" for i in range(1, 19)]

# Setup safe YAML loader for CloudFormation templates
if yaml:
    class SafeCFNLoader(yaml.SafeLoader):
        pass

    def cfn_constructor(loader, node):
        if isinstance(node, yaml.ScalarNode):
            return loader.construct_scalar(node)
        elif isinstance(node, yaml.SequenceNode):
            return loader.construct_sequence(node)
        elif isinstance(node, yaml.MappingNode):
            return loader.construct_mapping(node)
        return str(node)

    # Register CloudFormation tags
    cfn_tags = [
        'Ref', 'Sub', 'GetAtt', 'Join', 'Select', 'Split', 
        'FindInMap', 'ImportValue', 'Equals', 'If', 'Not', 
        'And', 'Or', 'Base64', 'Cidr', 'GetAZs'
    ]
    for tag in cfn_tags:
        SafeCFNLoader.add_constructor(f'!{tag}', cfn_constructor)
        SafeCFNLoader.add_multi_constructor(f'!{tag}', lambda loader, suffix, node: cfn_constructor(loader, node))

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text

def parse_markdown(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    headers = []
    for line in content.split("\n"):
        match = re.match(r'^(#{1,6})\s+(.*)$', line)
        if match:
            headers.append(slugify(match.group(2)))
    for html_id in re.findall(r'<a id="([^"]+)"></a>', content):
        headers.append(html_id)

    code_blocks = []
    pattern = re.compile(r'```(\w*)\n(.*?)```', re.DOTALL)
    for match in pattern.finditer(content):
        lang = match.group(1).lower()
        code = match.group(2)
        code_blocks.append((lang, code, content.count('\n', 0, match.start()) + 1))

    links = []
    link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
    for match in link_pattern.finditer(content):
        label = match.group(1)
        url = match.group(2).strip()
        links.append((label, url, content.count('\n', 0, match.start()) + 1))

    return content, headers, code_blocks, links

def check_ts_syntax(code):
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    in_string = False
    string_char = None
    escaped = False
    
    for i, char in enumerate(code):
        if escaped:
            escaped = False
            continue
        if char == '\\':
            escaped = True
            continue
        if char in ['"', "'", '`']:
            if not in_string:
                in_string = True
                string_char = char
            elif string_char == char:
                in_string = False
                string_char = None
            continue
        if in_string:
            continue
            
        if char in pairs.values():
            stack.append(char)
        elif char in pairs.keys():
            if not stack or stack[-1] != pairs[char]:
                return False, f"Mismatched bracket at index {i}: expected matching for {char}"
            stack.pop()
            
    if stack:
        return False, f"Unclosed brackets: {stack}"
    return True, "OK"

def check_json_syntax(code):
    # Strip comments safely: strip // only if not preceded by : or :\s (URLs)
    lines = []
    for line in code.split('\n'):
        clean_line = line
        if '//' in line:
            parts = re.split(r'(?<!:)(?<!:\s)\/\/', line, maxsplit=1)
            clean_line = parts[0]
        lines.append(clean_line)
    code_clean = '\n'.join(lines)
    
    # Strip multi-line comments
    code_clean = re.compile(r'/\*.*?\*/', re.DOTALL).sub('', code_clean)
    code_clean = code_clean.strip()
    
    # Handle ellipsis (...) placeholders to validate structure safely without changing ellipses in strings
    code_clean = re.sub(r'\{\s*\.\.\.\s*\}', '{"omitted": true}', code_clean)
    code_clean = re.sub(r'\[\s*\.\.\.\s*\]', '[null]', code_clean)
    code_clean = re.sub(r',\s*\.\.\.', ', "omitted": true', code_clean)
    code_clean = re.sub(r'(?<=[\s,\[\{])\.\.\.(?=[\s\]\}]|$)', '"omitted": true', code_clean)
    
    if not code_clean:
        return True, "Empty"
        
    try:
        json.loads(code_clean)
        return True, "OK"
    except Exception as e1:
        # If it looks like a key-value fragment, try wrapping in {}
        if code_clean.startswith('"') and ":" in code_clean:
            try:
                json.loads("{" + code_clean + "}")
                return True, "OK"
            except Exception:
                pass
        
        # Try finding and validating curly brace objects
        braces = []
        depth = 0
        start = -1
        for i, char in enumerate(code_clean):
            if char == '{':
                if depth == 0:
                    start = i
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0 and start != -1:
                    braces.append(code_clean[start:i+1])
                    
        if braces:
            all_valid = True
            for b in braces:
                try:
                    json.loads(b)
                except Exception:
                    all_valid = False
                    break
            if all_valid:
                return True, "OK"
                
        return False, str(e1)

def main():
    if not os.path.exists(DOCS_DIR):
        print(f"Error: Directory {DOCS_DIR} not found.")
        sys.exit(1)

    all_md_files = []
    for root, dirs, files in os.walk(DOCS_DIR):
        for file in files:
            if file.endswith(".md"):
                all_md_files.append(os.path.join(root, file))

    print(f"Found {len(all_md_files)} markdown files in {DOCS_DIR}.\n")

    errors = []
    warnings = []
    req_coverage = {req: [] for req in EXPECTED_REQUIREMENTS}

    file_registry = {}
    for filepath in all_md_files:
        normalized_path = os.path.normpath(filepath).replace("\\", "/")
        content, headers, code_blocks, links = parse_markdown(filepath)
        file_registry[normalized_path] = {
            "headers": headers,
            "code_blocks": code_blocks,
            "links": links,
            "content": content
        }

    for filepath, data in file_registry.items():
        print(f"Validating {filepath}...")
        content = data["content"]
        code_blocks = data["code_blocks"]
        links = data["links"]

        # Check requirements references
        for req in EXPECTED_REQUIREMENTS:
            req_num = req.split(" ")[1]
            pattern1 = rf"\bRequirements?\s*:\s*(?:[\d.,\s]*\b)?{req_num}\b"
            pattern2 = rf"\bReq(?:uirement)?s?\s+{req_num}\b"
            if re.search(pattern1, content, re.IGNORECASE) or re.search(pattern2, content, re.IGNORECASE):
                req_coverage[req].append(filepath)

        # 1. Validate Code Blocks
        for lang, code, line_num in code_blocks:
            if lang in ["json"]:
                valid, msg = check_json_syntax(code)
                if not valid:
                    errors.append(f"[{filepath}:{line_num}] Invalid JSON syntax: {msg}")
            elif lang in ["yaml", "yml"]:
                if yaml:
                    try:
                        yaml.load(code, Loader=SafeCFNLoader)
                    except Exception as e:
                        errors.append(f"[{filepath}:{line_num}] Invalid YAML syntax: {e}")
                else:
                    if "\t" in code:
                        errors.append(f"[{filepath}:{line_num}] YAML warning: Contains tab characters which are invalid in YAML.")
            elif lang in ["typescript", "ts"]:
                valid, msg = check_ts_syntax(code)
                if not valid:
                    warnings.append(f"[{filepath}:{line_num}] Potential TypeScript syntax issue: {msg}")
                
                has_dep = "npm" in code or "install" in code or "package" in code or "import" in code
                has_deploy = "deploy" in content.lower() or "sam" in content.lower() or "run" in content.lower()
                if not has_dep:
                    warnings.append(f"[{filepath}:{line_num}] TypeScript block might lack explicit dependencies instructions.")
                if not has_deploy:
                    warnings.append(f"[{filepath}:{line_num}] TypeScript block might lack explicit deployment instructions.")
            elif lang in ["cloudformation", "sam"]:
                if code.strip().startswith("{"):
                    valid, msg = check_json_syntax(code)
                    if not valid:
                        errors.append(f"[{filepath}:{line_num}] Invalid JSON CloudFormation syntax: {msg}")
                else:
                    if yaml:
                        try:
                            yaml.load(code, Loader=SafeCFNLoader)
                        except Exception as e:
                            errors.append(f"[{filepath}:{line_num}] Invalid YAML CloudFormation syntax: {e}")

        # 2. Validate Links
        for label, url, line_num in links:
            if url.startswith(("http://", "https://", "mailto:", "javascript:")):
                continue
            
            base_dir = os.path.dirname(filepath)
            
            if "#" in url:
                rel_path, anchor = url.split("#", 1)
            else:
                rel_path, anchor = url, None

            if not rel_path:
                target_path = filepath
            else:
                target_path = os.path.normpath(os.path.join(base_dir, rel_path)).replace("\\", "/")

            if not os.path.exists(target_path):
                errors.append(f"[{filepath}:{line_num}] Broken link: target file '{target_path}' (from link '{url}') does not exist.")
            elif anchor:
                target_data = file_registry.get(target_path)
                if target_data:
                    slugified_anchor = slugify(anchor)
                    if slugified_anchor not in target_data["headers"] and anchor not in target_data["headers"]:
                        warnings.append(f"[{filepath}:{line_num}] Anchor warning: heading '{anchor}' not found in '{target_path}'. Available headers: {target_data['headers']}")

        # 3. Free Tier Warnings Validation
        has_non_free = False
        non_free_kw = []
        if "waf" in filepath.lower() or "waf" in content.lower():
            has_non_free = True
            non_free_kw.append("WAF")
        if "chaos-engineering" in filepath.lower() or "fis" in content.lower():
            has_non_free = True
            non_free_kw.append("FIS")
        if "provisioned" in content.lower():
            has_non_free = True
            non_free_kw.append("Provisioned Capacity/Concurrency")
            
        if has_non_free:
            has_warning = "warning" in content.lower() or "cảnh báo" in content.lower() or "lưu ý" in content.lower()
            has_cost = "cost" in content.lower() or "chi phí" in content.lower() or "$" in content.lower()
            has_alt = "alternative" in content.lower() or "thay thế" in content.lower() or "free tier" in content.lower()
            
            if not has_warning:
                warnings.append(f"[{filepath}] Non-Free Tier services {non_free_kw} mentioned but no 'Cảnh báo/Warning' found.")
            if not has_cost:
                warnings.append(f"[{filepath}] Non-Free Tier services {non_free_kw} mentioned but no cost estimation found.")
            if not has_alt:
                warnings.append(f"[{filepath}] Non-Free Tier services {non_free_kw} mentioned but no Free Tier alternative found.")

    # Requirements Coverage Matrix Report
    print("\n" + "="*50)
    print("REQUIREMENTS COVERAGE MATRIX")
    print("="*50)
    covered_count = 0
    for req in EXPECTED_REQUIREMENTS:
        files = req_coverage[req]
        if files:
            covered_count += 1
            print(f"[OK] {req}: Covered in {len(files)} files")
            for f in files:
                print(f"  - {f}")
        else:
            print(f"[FAIL] {req}: NOT COVERED")
    print(f"Coverage: {covered_count}/{len(EXPECTED_REQUIREMENTS)} requirements ({covered_count/len(EXPECTED_REQUIREMENTS)*100:.1f}%)\n")

    # Print validation summary
    print("="*50)
    print("VALIDATION SUMMARY")
    print("="*50)
    print(f"Errors found: {len(errors)}")
    for err in errors:
        print(f"[ERROR] {err}")
    print(f"\nWarnings found: {len(warnings)}")
    for wrn in warnings:
        print(f"[WARN] {wrn}")

    if errors:
        print("\nValidation FAILED.")
        sys.exit(1)
    else:
        print("\nValidation PASSED successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()
