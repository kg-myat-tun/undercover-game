export type WordPair = {
  civilian: string;
  undercover: string;
};

export type WordPack = {
  id: string;
  name: string;
  locale: string;
  category: string;
  pairs: WordPair[];
};

export const wordPacks: WordPack[] = [
  {
    id: "classic",
    name: "Classic",
    locale: "en",
    category: "General",
    pairs: [
      { civilian: "Coffee", undercover: "Tea" },
      { civilian: "Beach", undercover: "Desert" },
      { civilian: "Laptop", undercover: "Tablet" },
      { civilian: "Pizza", undercover: "Burger" },
      { civilian: "Thunder", undercover: "Lightning" },
      { civilian: "Forest", undercover: "Jungle" }
    ]
  },
  {
    id: "city-life",
    name: "City Life",
    locale: "en",
    category: "Lifestyle",
    pairs: [
      { civilian: "Taxi", undercover: "Subway" },
      { civilian: "Balcony", undercover: "Rooftop" },
      { civilian: "Cinema", undercover: "Theater" },
      { civilian: "Backpack", undercover: "Briefcase" },
      { civilian: "Market", undercover: "Mall" },
      { civilian: "Crosswalk", undercover: "Intersection" }
    ]
  }
];

export function getWordPack(packId?: string): WordPack {
  if (!packId) {
    return wordPacks[0];
  }

  return wordPacks.find((pack) => pack.id === packId) ?? wordPacks[0];
}
