/**
 * Takeaways Agent
 * 
 * Specialized AI Agent dedicated to analyzing academic slides, extracting 
 * hierarchical mental models, core definitions, and exam-critical takeaways via LLM.
 */

export interface SlideTakeawayInput {
  slideTitle: string;
  slideText: string;
  topic?: string;
  courseSubject?: string;
  language?: string;
}

export interface TakeawayResult {
  coreTakeaways: string[];
  suggestedFocusFormula?: string;
  examRelevanceScore: number; // 1-5
}

export async function runTakeawaysAgent(input: SlideTakeawayInput): Promise<TakeawayResult> {
  try {
    const res = await fetch('/api/coach/takeaways', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.coreTakeaways) && data.coreTakeaways.length > 0) {
        return {
          coreTakeaways: data.coreTakeaways,
          suggestedFocusFormula: data.suggestedFocusFormula,
          examRelevanceScore: data.examRelevanceScore || 4
        };
      }
    }
  } catch (err) {
    console.warn('[TakeawaysAgent] Server LLM fetch error, falling back:', err);
  }

  // Smart client fallback
  const isAr = input.language === 'ar' || /[\u0600-\u06FF]/.test(input.slideText + input.slideTitle);
  const rawBullets = input.slideText
    .split(/\n|[●•·]\s*/)
    .map(s => s.replace(/^[0-9]+[\.\-\)]\s*/, '').replace(/^[●•·\-\*]\s*/, '').trim())
    .filter(s => s.length > 15 && !s.toLowerCase().includes('visual presentation') && !s.toLowerCase().includes('takeaways'));

  const coreTakeaways = rawBullets.slice(0, 3).length > 0
    ? rawBullets.slice(0, 3)
    : [
        isAr ? `فهم المفهوم الأساسي في: ${input.slideTitle}` : `Master the primary concept in: ${input.slideTitle}`,
        isAr ? `استيعاب العلاقات والمخرجات الرئيسية للشريحة` : `Understand key mechanisms and constraints outlined in the slide`
      ];

  return {
    coreTakeaways,
    examRelevanceScore: 4
  };
}
