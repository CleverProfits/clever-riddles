import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function generateRiddle() {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Generate a clever riddle. Return JSON only with no markdown formatting:
{"question": "the riddle question", "answer": "the answer", "hint": "a subtle hint"}

Requirements:
- Family-friendly
- Medium difficulty
- Creative and fun
- Answer should be a single word or short phrase`
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
