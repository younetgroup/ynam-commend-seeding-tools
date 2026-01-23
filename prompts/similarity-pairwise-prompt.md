# Comment Similarity Analysis (Pairwise)

Compare the following two Vietnamese comments and determine their semantic similarity.

## Similarity Criteria

Consider these factors:
1. **Narrative Framework**: Do they follow the same story structure?
2. **Main Ideas**: Do they convey the same core message?
3. **Paraphrasing**: Are they saying the same thing in different words?
4. **Tone and Style**: Do they have similar emotional tone?

## Ignore These Differences
- Minor wording changes
- Punctuation differences
- Emoji usage
- Capitalization

## Comments to Compare

Comment 1:
{{COMMENT_1}}

Comment 2:
{{COMMENT_2}}

## Output Format

Return ONLY a number from 0 to 100:
- 0-30: Completely different comments
- 31-60: Some similarities but different main ideas
- 61-80: Similar ideas with different expression
- 81-95: Very similar with minor variations
- 96-100: Nearly identical

Return only the number, no explanation.
