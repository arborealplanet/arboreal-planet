# Chondro Breeder neonate asset contract

## Phase 1 — base neonates

The first neonate art pass is intentionally small and controlled. Morelia azurea azurea, M. a. pulcher, and M. a. utaraensis each require red and yellow base neonates. Morelia viridis requires a yellow base neonate only; pure M. viridis do not use a red neonate state in the game.

Required files:

- `public/hatchery/snakes/neonates/azurea-red.webp`
- `public/hatchery/snakes/neonates/azurea-yellow.webp`
- `public/hatchery/snakes/neonates/pulcher-red.webp`
- `public/hatchery/snakes/neonates/pulcher-yellow.webp`
- `public/hatchery/snakes/neonates/utaraensis-red.webp`
- `public/hatchery/snakes/neonates/utaraensis-yellow.webp`
- `public/hatchery/snakes/neonates/viridis-yellow.webp`

## Art rules

- Keep a consistent locked body/pose within each approved subspecies reference set.
- Neonate color is a visual/life-stage state, not a separate genetic trait.
- Pure `Morelia viridis` neonates are always yellow in Chondro Breeder.
- Preserve the visual identity of the correct subspecies instead of recoloring one universal snake into all four taxa.
- Do not generate every trait/tier combination yet. Approve the seven base neonates first.
- The game UI must fall back safely to the current adult/trait/base portrait when a neonate file is not present.
- Existing adult percentage artwork must not be regenerated as part of this phase.

## Runtime behavior

`ChondroSnakeIcon` accepts optional `lifeStage` and `neonateColor` props. Hatchling or Neonate animals request the matching base neonate file. Pure M. viridis saves and newly generated pure M. viridis animals are normalized to Yellow. If a neonate file is missing, the component falls back to the adult trait portrait and then the base subspecies portrait.

## Future phase — only after base approval

If later gameplay benefits from illustrated high-expression neonates, use the naming pattern:

`{subspecies}-{red|yellow}-{trait}-{tier}.webp`

For M. viridis, only the yellow branch is valid.

Example:

`utaraensis-red-high-white-95.webp`

Do not begin that larger matrix until the seven base neonate images are visually approved in-game.
