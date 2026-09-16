/**
 * Takeaways Agent
 * 
 * Specialized AI Agent dedicated to analyzing academic slides, extracting 
 * hierarchical mental models, core definitions, and exam-critical takeaways.
 */

export interface SlideTakeawayInput {
  slideTitle: string;
  slideText: string;
  topic?: string;
  courseSubject?: string;
}

export interface TakeawayResult {
  coreTakeaways: string[];
  suggestedFocusFormula?: string;
  examRelevanceScore: number; // 1-5
}

export async function runTakeawaysAgent(input: SlideTakeawayInput): Promise<TakeawayResult> {
  // If a server-side Gemini/Custom LLM agent route is configured:
  try {
    const res = await fetch('/api/coach/takeaways', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to client heuristics
  }

  // Baseline extraction logic
  const lines = input.slideText
    .split(/\n|\.\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  const coreTakeaways = lines.slice(0, 4).length > 0
    ? lines.slice(0, 4)
    : [
        `Master the primary definitions in ${input.slideTitle}`,
        `Understand the relationship between input factors and outcomes`,
        `Review the core diagrams and algorithmic steps presented`
      ];

  return {
    coreTakeaways,
    examRelevanceScore: 4
  };
}
