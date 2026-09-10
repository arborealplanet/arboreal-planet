import fs from "node:fs";
import path from "node:path";

const replacementsByFile = {
  "src/components/ChondroBreederGameV3.tsx": [
    ["Start Your Dream Sweepstakes", "Chondro Breeder"],
    ["You won {money(STARTING_CASH)}.", "Starting budget: {money(STARTING_CASH)}."],
    [
      "Build a trait program, a pure locality program, or both. Most snakes now begin with little or no expression, high percentages are genuinely rare, and each subspecies has traits it is naturally more likely to express.",
      "Build a trait-focused program, a pure-locality program, or combine both approaches. Starting animals usually show low trait expression, while high-expression animals remain uncommon.",
    ],
    ["How the new genetics work", "Genetics and trait probabilities"],
    ["Most are ordinary. The special ones matter.", "Daily inventory"],
    [
      "Buy by eye, phenotype grade, or tested genetics. The market no longer hands out high-expression animals constantly.",
      "Compare phenotype, locality, condition and tested genetics. High-expression animals are intentionally uncommon.",
    ],
    ["Select the direction of your line.", "Select a breeding pair."],
  ],
  "src/components/ChondroBreederExpandedShop.tsx": [
    ["Most are ordinary. The special ones matter.", "Daily inventory"],
    ["Special A++ Morelia azurea utaraensis phenotype shop animal.", "High-expression Morelia azurea utaraensis shop animal."],
  ],
};

let changedFiles = 0;
for (const [relativePath, replacements] of Object.entries(replacementsByFile)) {
  const file = path.join(process.cwd(), relativePath);
  let source = fs.readFileSync(file, "utf8");
  const original = source;
  for (const [from, to] of replacements) source = source.split(from).join(to);
  if (source !== original) {
    fs.writeFileSync(file, source);
    changedFiles += 1;
  }
}

console.log(`Product copy cleanup complete. Updated ${changedFiles} file${changedFiles === 1 ? "" : "s"}.`);
