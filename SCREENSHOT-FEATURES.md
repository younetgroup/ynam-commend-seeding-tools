# Screenshot Verification Features

## Multi-Line Text Matching

**Problem**: Comments spanning multiple lines in screenshots were not being matched correctly.

**Solution**: Enhanced text normalization to convert all newlines and carriage returns to spaces before comparison.

**Example**:
```
Comment in sheet:
"trc tui nghĩ chỉ có nữ mới hpv chứ, ủa nam cũng có thể bị nhiễm hpv luôn,
xem video của tvc hữu ích thật chắc phải dự phòng sớm"

Text in screenshot (multi-line):
trc tui nghĩ chỉ có nữ mới hpv chứ, ủa nam
cũng có thể bị nhiễm hpv luôn, xem video
của tvc hữu ích thật chắc phải dự phòng sớm

Result: ✅ MATCH (newlines normalized to spaces)
```

## Merged Row Detection & Screenshot Caching

**Problem**: Multiple rows often share the same screenshot (merged cells in Excel). This caused:
- Re-downloading the same image multiple times
- Re-processing with OCR/AI unnecessarily
- Slower verification

**Solution**:
1. **Merged Row Detection**: When Column O (screenshot URL) is empty, the tool automatically looks back at previous rows to find the screenshot URL
2. **Smart Caching**: The most recent screenshot is cached with its extracted text
3. **Cache Reuse**: If the next row uses the same screenshot URL, cached text is reused

**How It Works**:

```
Row 10: Comment A | Link A | https://gyazo.com/abc123 | 1 | 1
Row 11: Comment B | Link B | [EMPTY]                  | 1 | ? ← Uses screenshot from row 10
Row 12: Comment C | Link C | [EMPTY]                  | 1 | ? ← Uses screenshot from row 10
Row 13: Comment D | Link D | https://gyazo.com/xyz789 | 1 | 1 ← New screenshot
```

**Process**:
1. **Row 10**: Download & process screenshot from `https://gyazo.com/abc123`, cache the extracted text
2. **Row 11**: Column O is empty → Look back → Find row 10's URL → Check cache → ✅ HIT! Reuse cached text
3. **Row 12**: Column O is empty → Look back → Find row 10's URL → Check cache → ✅ HIT! Reuse cached text
4. **Row 13**: New screenshot URL → Download & process new image → Update cache

**Performance Impact**:
- **Before**: 3 screenshots × (download + OCR) = ~15-30 seconds
- **After**: 1 download + 1 OCR + 2 cache hits = ~5-10 seconds
- **Savings**: ~50-60% faster for merged rows

## Cache Details

**What is cached**:
- Screenshot URL (direct image URL after conversion)
- Extracted text from OCR or AI
- Timestamp of extraction

**Cache size**:
- Only 1 most recent screenshot (sufficient for sequential processing)

**Cache invalidation**:
- Automatically replaced when a new screenshot URL is encountered
- Cache is cleared when verification session ends

## Technical Implementation

### Text Normalization (src/utils/text-matcher.ts)
```typescript
normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[\r\n]+/g, ' ')        // ← NEW: Handle newlines
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

### Merged Row Detection (src/commands/verify.ts)
```typescript
findScreenshotUrlForMergedRow(records, currentIndex) {
  // Look back at previous rows
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (records[i].screenshotUrl) {
      return records[i].screenshotUrl;
    }
  }
  return null;
}
```

### Caching Logic (src/commands/verify.ts)
```typescript
// Check cache first
if (this.screenshotCache && this.screenshotCache.url === directImageUrl) {
  extractedText = this.screenshotCache.extractedText; // ✅ Cache hit
} else {
  // Download and process image
  // ...
  // Cache the result
  this.screenshotCache = {
    url: directImageUrl,
    extractedText: extractedText,
    timestamp: Date.now()
  };
}
```

## Benefits

1. ✅ **Better Accuracy**: Multi-line comments now match correctly
2. ✅ **Faster Processing**: Merged rows reuse cached screenshots
3. ✅ **Lower Costs**: Fewer API calls to Gemini AI (if using AI fallback)
4. ✅ **Reduced Bandwidth**: Same image not downloaded multiple times
5. ✅ **Automatic Detection**: No manual configuration needed for merged cells

## Testing

Test with your screenshot:
```bash
npm start verify
```

Expected behavior:
- Row with `https://gyazo.com/b029bec480b28f399db655e5f23c8b16` should now verify correctly
- Rows with empty Column O will automatically use previous row's screenshot
- You'll see debug messages indicating cache hits (use `--verbose` flag)
