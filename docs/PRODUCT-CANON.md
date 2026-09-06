# Arboreal Planet Product Canon

This file captures implementation rules that should not drift during future frontend/backend work.

## Public product structure

Primary public spaces:

1. Animal Database
2. Snake Stocks
3. Marketplace
4. Community
5. The Hatchery
6. Profile / Account

Do not reintroduce **Market Pulse** as a second public market-intelligence product. Public branding is **Snake Stocks**.

Do not split **Available Animals**, **Classifieds**, and **Seller Platforms** into competing public products. They belong under **Marketplace**.

## Snake Stocks

Snake Stocks is reptile market intelligence, not a securities product.

### Evidence hierarchy

1. **Active Asking Index** — current listing asking price.
2. **Sold-Listing Price Index** — last displayed price on a listing marked sold.
3. **Confirmed Sales Index** — final transaction amount only when explicitly known.
4. **Combined Market Index** — only with disclosed methodology and weighting.

Never call a sold-card displayed price a confirmed sale price.

Median is the primary public statistic. Mean is supporting context. Show sample size, sellers, sources, range and confidence when available.

Never fabricate a trend line to fill sparse history. Sparse history should remain sparse.

### Snapshot rules

- Scheduled ingestion should write immutable historical observations/snapshots rather than overwrite prior values.
- Public charting should use qualified dated snapshots.
- `observation_date` is not automatically `sold_date`.
- A screen-recording capture date must not be assigned as the sale date of every sold listing visible in that recording.

### Current Green Tree Python evidence inventory

Working extraction captured September 5, 2026:

- Current USA-cleaned single-animal asking-price evidence: **131 eligible records**.
- Sold-listing evidence: **340 readable USA observations**.
- Sold observations are not all dated September 2026; exact sold dates remain unknown unless independently recovered.

These counts are provenance/evidence inventory, not market prices.

## Origin normalization

Public origin categories are only:

1. **CAPTIVE BRED**
2. **IMPORT**

Internal `UNKNOWN` is permitted when origin cannot be determined and should be excluded from origin-specific public pricing until reviewed.

### Captive Bred aliases

Normalize unambiguous terms including:

- Captive Bred / Captive-Bred / Captivebred
- CB / C.B. / C/B
- CBB / C.B.B.
- Captive Produced
- US Captive Bred / U.S. Captive Bred / USA Captive Bred
- USCBB / US CBB / U.S.C.B.B. / US-CBB
- Captive Born

### Import aliases

Normalize to public **Import** while preserving internal subtype:

- Import / Imported
- Farm Bred / Farm-Bred / FB
- Farm Raised / FR
- Farmed
- Ranched / Ranch Bred / Ranch Raised
- Wild Caught / WC / W.C. / W/C
- Wild Collected
- Field Collected
- Fresh Import
- Recent Import
- Established Import
- LTC / L.T.C. / Long Term Captive / Long-Term Captive
- Established LTC / LTC Import / Long Term Captive Import

**LTC is always in the public Import category.**

Ambiguous terms such as CH / Captive Hatched / F1 / F2 or unfamiliar abbreviations should be preserved for review rather than guessed.

## Green Tree Python market grouping

Use this as the Arboreal Planet market grouping, not as a claim of universal taxonomic consensus.

- **Morelia azurea azurea** — Biak, Numfor
- **Morelia azurea pulcher** — Timika, Sorong, Manokwari, Kofiau; Batanta is currently flagged for review
- **Morelia azurea utaraensis** — Jayapura, Cyclops, Wamena, Lereh / Highland
- **Morelia viridis** — Aru, Merauke
- **Designer / hybrid / line projects** — designers, crosses, blue lines, calico and other project categories
- **Unspecified** — only where grouping cannot be determined

Locality categories through Morelia viridis may support **Captive Bred vs Import** comparisons when evidence exists.

Designer / line-project categories should **not** display an Import graph by default because those are captive-produced project markets.

## GTP chart dimensions

Do not hardcode universal price multipliers.

Relevant intersections include:

`Locality × Neonate Color × Sex × Age × Origin`

Comparable-market expectations can inform QA but do not replace evidence:

- Wamena generally ranks above Lereh/Cyclops, which generally rank above Jayapura in like-for-like comparisons.
- Red neonates generally command more than comparable yellow neonates.
- Females generally command more than comparable males.
- These factors interact, so a rarer-locality red male may overlap with a yellow female from another locality.

Recommended focused graphs include:

- Wamena males vs females
- Wamena red vs yellow neonates
- Wamena age classes
- Wamena red-neonate males vs females
- Wamena yellow-neonate males vs females
- locality comparison under the same active filters

## The Hatchery

The Hatchery is an educational game area, separate from real market data.

First game: **Chondro Breeder**.

Core loop:

1. Select/receive two virtual Green Tree Pythons.
2. Build a pairing.
3. Complete a simple breeding/incubation challenge.
4. Hatch individual virtual offspring.
5. Explain why outcomes occurred.
6. Keep offspring in My Hatchery.
7. Preserve virtual lineage over generations.

Always label game animals **VIRTUAL**.

Virtual rarity (`Common`, `Uncommon`, `Rare`, `Epic`, `Legendary`) is a game mechanic only and must not imply biological rarity or real market value.

No paid randomized packs, loot boxes, betting, cash-out or real-money breeding outcomes.

Do not treat all Green Tree Python designer traits as simple Mendelian genetics. Educational categories can include:

- Simple Genetic
- Polygenic / Selective
- Line-Bred
- Locality / Population
- Unknown / Incompletely Understood

## Security and profiles

Profile customization should support avatar, banner, accent color, bio, location (optional), social links and seller/breeder information.

Roles include user, moderator, admin and owner.

Admin/owner controls must be enforced **server-side**. Do not rely on CSS hiding or client-only authorization.

## Data integrity

- Never ship fake production market numbers.
- Empty states should say insufficient data rather than imply measured zero trend.
- Keep raw source terminology and raw observations so normalization can be audited/reprocessed.
- Detect duplicates before market calculation.
- Keep current asking and sold-listing evidence visually and analytically separate.
- Public copy should say **sold-listing observations** unless actual final transaction amounts are verified.
