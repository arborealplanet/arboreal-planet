# Chondro trait asset status

## Adult trait matrix — COVERAGE COMPLETE / QUALITY REBUILD REQUIRED

All four Chondro Breeder subspecies have file coverage for the full high-expression adult trait matrix:

- Morelia azurea azurea
- Morelia azurea pulcher
- Morelia azurea utaraensis
- Morelia viridis

Each subspecies includes:

- High Black — 70 / 85 / 95 / 100
- High White — 70 / 85 / 95 / 100
- Blue — 70 / 85 / 95 / 100
- Yellow Retention — 70 / 85 / 95 / 100
- Blotches — 70 / 85 / 95 / 100

### Quality audit — 2026-09-10

The existing adult trait portraits in `public/hatchery/snakes/traits` are legacy small WebP assets (many are only around 20–25 KB). These files were overriding sharper base portraits at 70%+ expression and causing visibly blurry snakes in the game.

Until the trait matrix is rebuilt at native/high resolution, `ChondroSnakeIcon` deliberately keeps all adults on their sharper base portraits. Trait percentages, inheritance, rarity, scoring, testing, and gameplay remain active; only the low-resolution visual swap is disabled.

Re-enable each trait set only after its replacement artwork is verified at appropriate resolution and quality. Prefer consistent native-resolution source art rather than upscaling the legacy WebPs.

## Neonate status

The component already expects these eight base neonate assets:

- `public/hatchery/snakes/neonates/azurea-red.webp`
- `public/hatchery/snakes/neonates/azurea-yellow.webp`
- `public/hatchery/snakes/neonates/pulcher-red.webp`
- `public/hatchery/snakes/neonates/pulcher-yellow.webp`
- `public/hatchery/snakes/neonates/utaraensis-red.webp`
- `public/hatchery/snakes/neonates/utaraensis-yellow.webp`
- `public/hatchery/snakes/neonates/viridis-red.webp`
- `public/hatchery/snakes/neonates/viridis-yellow.webp`

That directory/assets are not currently present on `main`, so the image error fallback currently sends those animals to their adult portrait instead.

## Next asset phases

1. Rebuild adult trait portrait sets at native/high resolution, preserving the established body shape and changing only the intended trait expression.
2. Add the eight base neonate portraits.
3. Designer morph/project art.
4. Hybrid art.
5. Rare/breakthrough-result art.
