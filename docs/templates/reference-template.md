# [Tiêu đề Reference]

## Mô tả

[Mô tả ngắn gọn về API, service, configuration, hoặc component này. Giải thích mục đích và khi nào nên sử dụng.]

[Nếu có thuật ngữ kỹ thuật tiếng Anh, giữ nguyên và cung cấp định nghĩa ngắn gọn trong ngoặc đơn lần đầu tiên xuất hiện.]

## Cú pháp

```[language]
// Syntax tổng quát của API, function, hoặc configuration
// Sử dụng placeholders rõ ràng cho các tham số

functionName(param1, param2, options)

// Hoặc cho configuration
{
  "property1": "value",
  "property2": {
    "nestedProperty": "value"
  }
}
```

**Format**: [Mô tả format: JSON, YAML, TypeScript, etc.]

**Version**: [Phiên bản API hoặc service nếu có]

## Tham số

| Tham số | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---------|------|----------|----------|-------|
| `param1` | `string` | Có | - | [Mô tả chi tiết tham số, ý nghĩa, và các giá trị hợp lệ] |
| `param2` | `number` | Không | `100` | [Mô tả tham số với giá trị mặc định] |
| `param3` | `boolean` | Không | `false` | [Mô tả tham số boolean] |
| `options` | `object` | Không | `{}` | [Mô tả object options với các properties con] |
| `options.prop1` | `string` | Không | `'default'` | [Mô tả property con của options] |
| `options.prop2` | `array` | Không | `[]` | [Mô tả array property] |

### Giá trị trả về

**Type**: `[return type]`

[Mô tả giá trị trả về, cấu trúc dữ liệu, và ý nghĩa]

```[language]
// Ví dụ về return value structure
{
  "status": "success",
  "data": {
    // Structure của data trả về
  }
}
```

## Ví dụ

### Ví dụ 1: [Mô tả use case cơ bản]

[Giải thích ngắn gọn về use case này]

```[language]
// Code example hoàn chỉnh có thể chạy được ngay
// Bao gồm imports, setup, và execution

import { ServiceName } from 'aws-sdk';

const example = async () => {
  // Implementation
  const result = await functionName(
    'param1Value',
    100,
    {
      prop1: 'customValue',
      prop2: ['item1', 'item2']
    }
  );
  
  console.log(result);
};
```

**Output**:
```
[Kết quả mong đợi khi chạy example này]
```

**Giải thích**:
- [Giải thích các tham số được sử dụng]
- [Giải thích cách hoạt động]
- [Lưu ý đặc biệt nếu có]

---

### Ví dụ 2: [Mô tả use case nâng cao]

[Giải thích use case phức tạp hơn hoặc scenario đặc biệt]

```[language]
// Code example cho use case nâng cao
// Có thể bao gồm error handling, edge cases, etc.

try {
  const result = await functionName(
    'param1Value',
    200,
    {
      prop1: 'advancedValue',
      prop2: ['item1', 'item2', 'item3']
    }
  );
  
  // Process result
  if (result.status === 'success') {
    // Handle success
  }
} catch (error) {
  // Error handling
  console.error('Error:', error.message);
}
```

**Output**:
```
[Kết quả mong đợi]
```

**Giải thích**:
[Giải thích điểm khác biệt so với ví dụ cơ bản và lý do sử dụng]

---

### Ví dụ 3: [Mô tả use case với AWS Free Tier]

[Giải thích cách sử dụng trong Free Tier limits]

```[language]
// Code example được optimize cho Free Tier
// Includes cost-saving configurations

const freeTierConfig = {
  // Configuration parameters
  memory: 128, // Minimum memory to stay in Free Tier
  timeout: 3,  // Short timeout
  // Other cost-optimized settings
};
```

**Lưu ý về chi phí**:
- ✅ **Free Tier Compatible**: [Có/Không]
- 💰 **Estimated Cost**: [Miễn phí trong Free Tier / $X.XX beyond Free Tier]
- ⚠️ **Warning**: [Cảnh báo nếu có thể vượt Free Tier]

---

## Lưu ý

### Lưu ý quan trọng

- ⚠️ [Lưu ý quan trọng về security, performance, hoặc limitations]
- ⚠️ [Lưu ý về các ràng buộc hoặc prerequisites]
- ⚠️ [Lưu ý về version compatibility]

### Best Practices

1. **[Best practice 1]**: [Giải thích tại sao nên làm như vậy]
2. **[Best practice 2]**: [Giải thích benefit]
3. **[Best practice 3]**: [Giải thích risk nếu không follow]

### Anti-patterns

❌ **Tránh**: [Mô tả anti-pattern]
```[language]
// Ví dụ về cách KHÔNG nên làm
```

✅ **Nên làm**: [Mô tả cách đúng]
```[language]
// Ví dụ về cách đúng
```

### Giới hạn (Limits)

| Giới hạn | Giá trị | Mô tả |
|----------|---------|-------|
| [Limit name 1] | [Value] | [Giải thích ý nghĩa của limit này] |
| [Limit name 2] | [Value] | [Giải thích] |
| AWS Free Tier | [Limit] | [Specific Free Tier limits for this service] |

### Lỗi thường gặp

#### Error 1: `[Error code or message]`

**Nguyên nhân**: [Tại sao error này xảy ra]

**Giải pháp**:
```[language]
// Code để fix hoặc workaround
```

#### Error 2: `[Error code or message]`

**Nguyên nhân**: [Giải thích]

**Giải pháp**:
[Hướng dẫn fix]

## Cấu hình nâng cao

### [Advanced Configuration 1]

[Mô tả cấu hình nâng cao và khi nào cần sử dụng]

```[language]
// Configuration template
{
  "advancedOption1": "value",
  "advancedOption2": {
    // Nested configuration
  }
}
```

**Use cases**: [Khi nào nên sử dụng cấu hình này]

### [Advanced Configuration 2]

[Mô tả và examples khác]

## Xem thêm

### Tài liệu liên quan

- **[Related reference 1]**: [Mô tả ngắn gọn và link]
- **[Related reference 2]**: [Mô tả ngắn gọn và link]
- **[Related API/Service]**: [Mô tả mối liên hệ]

### Tutorials

- [Link đến tutorial sử dụng reference này]: [Mô tả tutorial]

### How-To Guides

- [Link đến how-to guide]: [Mô tả guide]

### Explanation Documents

- [Link đến explanation document]: [Mô tả để hiểu sâu hơn về concepts]

### External Resources

- [AWS Documentation]: [Link official docs]
- [GitHub Repository]: [Link nếu có]
- [Community Resources]: [Link useful resources]

## Changelog

### Version [X.Y.Z] - [Date]

- [Change 1]: [Mô tả thay đổi]
- [Change 2]: [Mô tả thay đổi]
- [Breaking change]: [Nếu có breaking changes]

### Version [X.Y.Z-1] - [Date]

- [Previous changes]

---

**Metadata**:
- **Category**: Reference
- **Domain**: [architecture/security/operations/infrastructure/testing]
- **Service/Component**: [AWS service name hoặc component name]
- **Tags**: [tag1, tag2, tag3]
- **Free Tier Compatible**: [Yes/No/Partial]
- **Estimated Cost**: [Miễn phí / $X.XX per month / Usage-based]
- **Difficulty Level**: [Beginner/Intermediate/Advanced]
- **Last Updated**: [Date]
- **Related Requirements**: [Requirement IDs nếu có]

