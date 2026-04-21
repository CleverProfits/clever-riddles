import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const CATEGORIES = [
  'nature (animals, plants, weather)',
  'household objects',
  'food and drinks',
  'time and seasons',
  'body parts',
  'letters and words',
  'numbers and math',
  'light and shadow',
  'music and sound',
  'emotions and feelings',
  'tools and technology',
  'clothing and accessories',
  'sports and games',
  'books and stories',
  'space and astronomy',
];

export async function generateRiddle(excludeAnswers = [], maxRetries = 3) {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const seed = Math.floor(Math.random() * 10000);

  const excludeText = excludeAnswers.length > 0
    ? `\n\nIMPORTANT: Do NOT use any of these answers (already used): ${excludeAnswers.join(', ')}`
    : '';

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    temperature: 1.0,
    messages: [
      {
        role: 'user',
        content: `Generate a clever riddle about: ${category}

Random seed for variety: ${seed}
${excludeText}

Return JSON only with no markdown formatting:
{"question": "the riddle question", "answer": "the answer", "hint": "a subtle hint"}

Requirements:
- Family-friendly
- Medium difficulty
- Creative and surprising - avoid common/overused riddles
- Answer should be a single word or short phrase
- Make it unique and memorable`
      }
    ]
  });

  const text = message.content[0].text.trim();

  let riddle;
  try {
    riddle = JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      riddle = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse riddle response');
    }
  }

  // Check if answer is in exclude list, retry if so
  if (excludeAnswers.includes(riddle.answer?.toLowerCase()) && maxRetries > 0) {
    return generateRiddle(excludeAnswers, maxRetries - 1);
  }

  return riddle;
}
