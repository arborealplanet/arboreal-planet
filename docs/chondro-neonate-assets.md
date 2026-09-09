# Chondro Breeder neonate asset contract

## Phase 1 — base neonates

The first neonate art pass is intentionally small and controlled: one red and one yellow base neonate for each Chondro Breeder subspecies.

Required files:

- `public/hatchery/snakes/neonates/azurea-red.webp`
- `public/hatchery/snakes/neonates/azurea-yellow.webp`
- `public/hatchery/snakes/neonates/pulcher-red.webp`
- `public/hatchery/snakes/neonates/pulcher-yellow.webp`
- `public/hatchery/snakes/neonates/utaraensis-red.webp`
- `public/hatchery/snakes/neonates/utaraensis-yellow.webp`
- `public/hatchery/snakes/neonates/viridis-red.webp`
- `public/hatchery/snakes/neonates/viridis-yellow.webp`

## Art rules

- Keep a consistent locked body/pose within each approved subspecies reference set.
- Neonate color (`Red` or `Yellow`) is a visual/life-stage state, not a separate genetic trait.
- Preserve the visual identity of the correct subspecies instead of recoloring one universal snake into all four taxa.
- Do not generate every trait/tier combination yet. Approve the eight base neonates first.
- The game UI must fall back safely to the current adult/trait/base portrait when a neonate file is not present.
- Existing adult percentage artwork must not be regenerated as part of this phase.

## Runtime behavior

`ChondroSnakeIcon` accepts optional `lifeStage` and `neonateColor` props. For `Hatchling` or `Neonate` animals with a red/yellow neonate color, it first requests the matching file above. If that file is missing, it falls back to the adult trait portrait and then the base subspecies portrait.

## Future phase — only after base approval

If later gameplay benefits from illustrated high-expression neonates, use the naming pattern:

`{subspecies}-{red|yellow}-{trait}-{tier}.webp`

Example:

`utaraensis-red-high-white-95.webp`

Do not begin that larger matrix until the eight base neonate images are visually approved in-game.
