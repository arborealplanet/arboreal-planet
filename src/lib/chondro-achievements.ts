export type AchievementSnake = {
  id: string;
  generation?: number;
  classification?: string;
  geneticsTested?: boolean;
  highBlack?: number;
  highWhite?: number;
  blueStripe?: number;
  yellowRetention?: number;
  blotches?: number;
  locality?: string;
};

export type AchievementSave = {
  colony?: AchievementSnake[];
  clutchHistory?: Array<{ offspring?: AchievementSnake[] }>;
  sales?: Array<{ value?: number }>;
  season?: number;
  favoriteIds?: string[];
};

export type ChondroAchievement = {
  id: string;
  name: string;
  description: string;
  reputation: number;
  title?: string;
  test: (save: AchievementSave) => boolean;
};

const allProduced = (save: AchievementSave) =>
  (save.clutchHistory ?? []).flatMap((clutch) => clutch.offspring ?? []);

const allKnown = (save: AchievementSave) => [...(save.colony ?? []), ...allProduced(save)];
const totalSales = (save: AchievementSave) => (save.sales ?? []).reduce((sum, sale) => sum + Number(sale.value ?? 0), 0);
const maxTrait = (snake: AchievementSnake) => Math.max(
  Number(snake.highBlack ?? 0),
  Number(snake.highWhite ?? 0),
  Number(snake.blueStripe ?? 0),
  Number(snake.yellowRetention ?? 0),
  Number(snake.blotches ?? 0),
);

export const CHONDRO_ACHIEVEMENTS: ChondroAchievement[] = [
  { id: "first-clutch", name: "First Clutch", description: "Hatch your first clutch.", reputation: 25, title: "Breeder", test: (s) => (s.clutchHistory?.length ?? 0) >= 1 },
  { id: "ten-produced", name: "Getting Established", description: "Produce 10 chondros.", reputation: 50, test: (s) => allProduced(s).length >= 10 },
  { id: "fifty-produced", name: "Serious Program", description: "Produce 50 chondros.", reputation: 150, title: "Program Builder", test: (s) => allProduced(s).length >= 50 },
  { id: "hundred-produced", name: "Century Breeder", description: "Produce 100 chondros.", reputation: 300, title: "Century Breeder", test: (s) => allProduced(s).length >= 100 },
  { id: "trait-85", name: "Selective Pressure", description: "Produce or own an 85%+ trait animal.", reputation: 40, test: (s) => allKnown(s).some((a) => maxTrait(a) >= 85) },
  { id: "trait-95", name: "Elite Expression", description: "Produce or own a 95%+ trait animal.", reputation: 120, title: "Trait Specialist", test: (s) => allKnown(s).some((a) => maxTrait(a) >= 95) },
  { id: "trait-100", name: "Maximum Expression", description: "Produce or own a 100% trait animal.", reputation: 250, title: "Master Selector", test: (s) => allKnown(s).some((a) => maxTrait(a) >= 100) },
  { id: "generation-3", name: "Line Breeder", description: "Reach generation 3 in a breeding project.", reputation: 100, title: "Line Breeder", test: (s) => allKnown(s).some((a) => Number(a.generation ?? 0) >= 3) },
  { id: "generation-5", name: "Deep Pedigree", description: "Reach generation 5.", reputation: 250, title: "Legacy Breeder", test: (s) => allKnown(s).some((a) => Number(a.generation ?? 0) >= 5) },
  { id: "designer", name: "Designer Project", description: "Produce or own a Designer-class animal.", reputation: 60, title: "Designer Breeder", test: (s) => allKnown(s).some((a) => a.classification === "Designer") },
  { id: "hybrid", name: "Hybrid Project", description: "Produce or own a Hybrid-class animal.", reputation: 60, test: (s) => allKnown(s).some((a) => a.classification === "Hybrid") },
  { id: "tested-ten", name: "Know Your Stock", description: "Have 10 genetically tested animals in your records.", reputation: 50, test: (s) => allKnown(s).filter((a) => a.geneticsTested).length >= 10 },
  { id: "sales-10k", name: "First $10K", description: "Reach $10,000 in lifetime recorded sales.", reputation: 50, test: (s) => totalSales(s) >= 10_000 },
  { id: "sales-100k", name: "Six-Figure Breeder", description: "Reach $100,000 in lifetime recorded sales.", reputation: 200, title: "Six-Figure Breeder", test: (s) => totalSales(s) >= 100_000 },
  { id: "sales-1m", name: "Million-Dollar Program", description: "Reach $1,000,000 in lifetime recorded sales.", reputation: 750, title: "Million-Dollar Breeder", test: (s) => totalSales(s) >= 1_000_000 },
  { id: "ten-seasons", name: "Ten Seasons", description: "Reach season 10.", reputation: 150, title: "Veteran Breeder", test: (s) => Number(s.season ?? 0) >= 10 },
  { id: "favorites-five", name: "Core Keepers", description: "Mark five animals as favorites.", reputation: 25, test: (s) => (s.favoriteIds?.length ?? 0) >= 5 },
];

export function completedAchievements(save: AchievementSave) {
  return CHONDRO_ACHIEVEMENTS.filter((achievement) => achievement.test(save));
}

export function achievementReputation(save: AchievementSave) {
  return completedAchievements(save).reduce((sum, achievement) => sum + achievement.reputation, 0);
}

export function unlockedTitles(save: AchievementSave) {
  return completedAchievements(save).flatMap((achievement) => achievement.title ? [achievement.title] : []);
}
