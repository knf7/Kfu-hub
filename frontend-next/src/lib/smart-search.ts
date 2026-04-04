type SearchValue = string | number | null | undefined;

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EXT_ARABIC_INDIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const toEnglishDigit = (char: string) => {
  const idxArabic = ARABIC_INDIC_DIGITS.indexOf(char);
  if (idxArabic >= 0) return String(idxArabic);
  const idxExtArabic = EXT_ARABIC_INDIC_DIGITS.indexOf(char);
  if (idxExtArabic >= 0) return String(idxExtArabic);
  return char;
};

export const normalizeSearchText = (value: SearchValue): string => {
  if (value === null || value === undefined) return '';
  const withEnglishDigits = String(value).replace(/[٠-٩۰-۹]/g, toEnglishDigit);
  return withEnglishDigits
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const scoreField = (normalizedField: string, normalizedQuery: string, queryTokens: string[]) => {
  if (!normalizedField) return 0;

  if (normalizedField === normalizedQuery) return 120;
  if (normalizedField.startsWith(normalizedQuery)) return 90;
  if (normalizedField.includes(normalizedQuery)) return 70;

  if (queryTokens.length > 1 && queryTokens.every((token) => normalizedField.includes(token))) {
    return 50;
  }

  return 0;
};

export const smartFilterAndSort = <T>(
  items: T[],
  query: string,
  getFields: (item: T) => SearchValue[]
): T[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  const ranked = items
    .map((item, index) => {
      const fields = getFields(item).map(normalizeSearchText).filter(Boolean);
      let bestScore = 0;
      for (const field of fields) {
        const score = scoreField(field, normalizedQuery, queryTokens);
        if (score > bestScore) bestScore = score;
      }
      return { item, index, score: bestScore };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });

  return ranked.map((entry) => entry.item);
};
