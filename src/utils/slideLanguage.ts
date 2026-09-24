/**
 * Utility to reliably detect whether an academic slide's primary content is Arabic or English.
 */
export function getSlideLanguage(slide?: {
  title?: string;
  topic?: string;
  content?: string[];
  keyPoints?: string[];
  rawText?: string;
}): 'ar' | 'en' {
  if (!slide) return 'ar';
  const fullText = [
    slide.title || '',
    slide.topic || '',
    (slide.content || []).join(' '),
    (slide.keyPoints || []).join(' '),
    slide.rawText || ''
  ].join(' ').trim();

  const arabicChars = (fullText.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (fullText.match(/[a-zA-Z]/g) || []).length;

  if (arabicChars === 0 && latinChars === 0) {
    return 'ar';
  }

  return arabicChars > latinChars ? 'ar' : 'en';
}
