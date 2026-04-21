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

export async function generateRiddle() {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const seed = Math.floor(Math.random() * 10000);

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    temperature: 1.0,
    messages: [
      {
        role: 'user',
        content: `Generate a clever riddle about: ${category}

Random seed for variety: ${seed}

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

  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON if wrapped in markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse riddle response');
  }
}
