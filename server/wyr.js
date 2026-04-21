import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const THEMES = [
  'food and eating',
  'gross but harmless',
  'superpowers and abilities',
  'awkward social situations',
  'travel and adventure',
  'silly physical challenges',
  'hypothetical scenarios',
  'minor inconveniences',
  'animal encounters',
  'funny embarrassments',
];

export async function generateWYR(excludeQuestions = [], maxRetries = 3) {
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  const seed = Math.floor(Math.random() * 10000);

  const excludeText = excludeQuestions.length > 0
    ? `\n\nDo NOT use these (already used): ${excludeQuestions.slice(-10).join(' | ')}`
    : '';

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    temperature: 1.0,
    messages: [
      {
        role: 'user',
        content: `Generate a "Would You Rather" question about: ${theme}

Seed: ${seed}
${excludeText}

Return JSON only, no markdown:
{"optionA": "first option", "optionB": "second option"}

Rules:
- Family-friendly (no violence, sex, drugs)
- Can be gross/disgusting (eating bugs, smelly things) - that's fun!
- Can be silly, embarrassing, or absurd
- Both options should be roughly equal in difficulty
- Keep each option under 15 words
- Be creative and unexpected`
      }
    ]
  });

  const text = message.content[0].text.trim();

  let wyr;
  try {
    wyr = JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      wyr = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse WYR response');
    }
  }

  // Check for duplicates
  const questionKey = `${wyr.optionA}|${wyr.optionB}`.toLowerCase();
  if (excludeQuestions.some(q => q.toLowerCase() === questionKey) && maxRetries > 0) {
    return generateWYR(excludeQuestions, maxRetries - 1);
  }

  return wyr;
}
