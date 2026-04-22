import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const CATEGORIES = [
  { name: 'Motor Vehicles', examples: ['BMW', 'Toyota', 'Ferrari', 'Tesla', 'Harley Davidson'] },
  { name: 'Fast Food Chains', examples: ['McDonalds', 'KFC', 'Subway', 'Taco Bell', 'Pizza Hut'] },
  { name: 'Sports', examples: ['Soccer', 'Basketball', 'Tennis', 'Golf', 'Swimming'] },
  { name: 'Countries', examples: ['Japan', 'Brazil', 'Australia', 'Canada', 'Egypt'] },
  { name: 'Movies', examples: ['Titanic', 'Avatar', 'Jaws', 'The Godfather', 'Frozen'] },
  { name: 'Animals', examples: ['Elephant', 'Penguin', 'Kangaroo', 'Tiger', 'Dolphin'] },
  { name: 'Musical Instruments', examples: ['Piano', 'Guitar', 'Drums', 'Violin', 'Saxophone'] },
  { name: 'Fruits', examples: ['Mango', 'Strawberry', 'Pineapple', 'Watermelon', 'Banana'] },
  { name: 'Professions', examples: ['Doctor', 'Teacher', 'Pilot', 'Chef', 'Firefighter'] },
  { name: 'TV Shows', examples: ['Friends', 'The Office', 'Breaking Bad', 'Stranger Things', 'Game of Thrones'] },
  { name: 'Clothing Items', examples: ['Jeans', 'Sneakers', 'Hoodie', 'Dress', 'Sunglasses'] },
  { name: 'Drinks', examples: ['Coffee', 'Orange Juice', 'Coca-Cola', 'Milkshake', 'Beer'] },
  { name: 'Social Media Apps', examples: ['Instagram', 'TikTok', 'Twitter', 'Snapchat', 'LinkedIn'] },
  { name: 'Superheroes', examples: ['Spider-Man', 'Batman', 'Wonder Woman', 'Iron Man', 'Superman'] },
  { name: 'Board Games', examples: ['Monopoly', 'Chess', 'Scrabble', 'Uno', 'Clue'] },
];

export async function generateImposterRound(usedWords = []) {
  // Pick a random category
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  // Filter out used words from this category's examples
  const availableWords = category.examples.filter(w => !usedWords.includes(w.toLowerCase()));

  // If we've used all words in this category, try to generate a new one via AI
  if (availableWords.length === 0) {
    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        temperature: 1.0,
        messages: [{
          role: 'user',
          content: `Give me ONE word that fits the category "${category.name}" that is NOT any of these: ${category.examples.join(', ')}. Reply with just the word, nothing else.`
        }]
      });
      const newWord = message.content[0].text.trim();
      return { category: category.name, secretWord: newWord };
    } catch (e) {
      // Fallback: pick from any category
      const otherCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const word = otherCategory.examples[Math.floor(Math.random() * otherCategory.examples.length)];
      return { category: otherCategory.name, secretWord: word };
    }
  }

  // Pick a random word from available words
  const secretWord = availableWords[Math.floor(Math.random() * availableWords.length)];

  return { category: category.name, secretWord };
}

export function selectImposter(playerIds) {
  if (playerIds.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * playerIds.length);
  return playerIds[randomIndex];
}
