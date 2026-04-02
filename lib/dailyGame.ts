const ANAGRAM_WORDS = [
  "PLANET", "BRIDGE", "GARDEN", "MARKET", "SILVER", "WINTER", "BOTTLE", "CASTLE",
  "PILLOW", "BUTTER", "MIRROR", "ROCKET", "ANCHOR", "BASKET", "CANDLE", "COPPER",
  "FLOWER", "JUNGLE", "MUFFIN", "OYSTER", "PARROT", "RABBIT", "SADDLE", "TEMPLE",
  "VELVET", "WALNUT", "BANANA", "CAMERA", "DRAGON", "ENGINE", "FALCON", "GOBLIN",
  "HORNET", "ISLAND", "JACKET", "KETTLE", "MAGNET", "NAPKIN", "ORANGE", "PEBBLE",
  "RIBBON", "SUNSET", "VIOLIN", "WISDOM", "ZIPPER", "ALMOND", "BEAVER", "BRANCH",
  "CACTUS", "FIGURE", "HAMMER", "INSECT", "LAGOON", "MORTAR", "NOODLE", "OUTFIT",
  "PATROL", "RIDDLE", "TICKET", "TUNNEL", "VENDOR", "WIZARD", "COBALT", "DAGGER",
  "GRAVEL", "HANGER", "JESTER", "KITTEN", "LIZARD", "MELLOW", "NEPHEW", "PEPPER",
  "RUBBER", "SALMON", "TIMBER", "VORTEX", "LOCKET", "BREEZE", "QUARRY", "SPHINX",
  "FENDER", "GIBBON", "IMPACT", "OBLONG", "QUIVER", "TUNDRA", "YELLOW", "ZOMBIE",
  "PURPLE", "FOREST", "SUMMER", "DESERT", "BAMBOO", "BUTTER", "CANOPY", "DAGGER",
];

const HANGMAN_WORDS = [
  "WHISPER", "ECLIPSE", "JOURNEY", "BALANCE", "CAPTURE", "DIAMOND", "ELEMENT",
  "FANTASY", "GLAMOUR", "HOLIDAY", "IMAGINE", "JUSTICE", "KITCHEN", "LANTERN",
  "MYSTERY", "NATURAL", "OPINION", "PACKAGE", "QUARTER", "REFLECT", "SHALLOW",
  "TRADING", "WARNING", "EXAMPLE", "FREEDOM", "HARVEST", "INSTALL", "KNOWING",
  "LIBRARY", "MORNING", "NETWORK", "OUTSIDE", "PREMIUM", "QUALITY", "READING",
  "SCIENCE", "TEACHER", "UPGRADE", "VILLAGE", "WEDDING", "CONNECT", "PROBLEM",
  "PROGRAM", "PROTECT", "SURFACE", "THOUGHT", "CHAPTER", "COMFORT", "COUNTRY",
  "COURAGE", "CRYSTAL", "CULTURE", "DISTANT", "FASHION", "FORWARD", "HISTORY",
  "HORIZON", "INSPIRE", "LOYALTY", "MAGICAL", "PASSION", "PATTERN", "PERFECT",
  "PICTURE", "POPULAR", "PROMISE", "PURSUIT", "REALITY", "RESPECT", "RUNNING",
  "SEASONS", "SILENCE", "SOLDIER", "STRANGE", "STUDENT", "SUPPORT", "TRIUMPH",
  "TROUBLE", "UNUSUAL", "VILLAGE", "MYSTERY", "CAPTAIN", "LANTERN", "COMPASS",
];

function getDayIndex(): number {
  return Math.floor(Date.now() / 86400000);
}

export function getDailyAnagramWord(): string {
  return ANAGRAM_WORDS[getDayIndex() % ANAGRAM_WORDS.length];
}

export function getDailyHangmanWord(): string {
  const offset = Math.floor(HANGMAN_WORDS.length / 2);
  return HANGMAN_WORDS[(getDayIndex() + offset) % HANGMAN_WORDS.length];
}

// Seeded Fisher-Yates shuffle — same result for everyone on the same day
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed | 0;
  for (let i = result.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), 1 | s);
    s ^= s + Math.imul(s ^ (s >>> 7), 61 | s);
    s = (s ^ (s >>> 14)) >>> 0;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getScrambledLetters(word: string): string[] {
  const day = getDayIndex();
  let scrambled: string[];
  let attempt = 0;
  do {
    scrambled = seededShuffle(word.split(""), day + attempt);
    attempt++;
  } while (scrambled.join("") === word && attempt < 20);
  return scrambled;
}

export function todayKey(game: string): string {
  return `logoff_game_${game}_${new Date().toDateString()}`;
}
