# Arboreal Keeper locality sprite intake

This branch prepares the game to use locality-specific Green Tree Python sprites without changing production deployment.

## Runtime rules

- Hatchling and Neonate share the same juvenile sprite.
- Subadult reuses the corresponding adult sprite, rendered smaller.
- Adult uses the full-size adult sprite.
- Locality-specific art takes priority over the old subspecies-wide base art.
- Missing locality art falls back to the existing subspecies art.
- Numfor temporarily uses Biak red juvenile/adult art and Biak yellow juvenile art.
- Numfor yellow adult remains intentionally pending.
- Hybrid juvenile art is selected from ancestry plus neonate color.
- A+ and Designer assets are reserved as special phenotype assets rather than normal locality defaults.

## Uploaded assets mapped in the registry

### Lereh
- Red Hatchling/Neonate -> `/hatchery/snakes/localities/lereh/red-neonate.png`
- Yellow Hatchling/Neonate -> `/hatchery/snakes/localities/lereh/yellow-neonate.png`

### Wamena
- Red Hatchling/Neonate -> `/hatchery/snakes/localities/wamena/red-neonate.jpg`
- Yellow Hatchling/Neonate -> `/hatchery/snakes/localities/wamena/yellow-neonate.jpg`
- Red Adult/Subadult -> `/hatchery/snakes/localities/wamena/red-adult.png`
- Yellow Adult/Subadult -> `/hatchery/snakes/localities/wamena/yellow-adult.png`

### Manokwari
- Red Hatchling/Neonate -> `/hatchery/snakes/localities/manokwari/red-neonate.png`
- Yellow Hatchling/Neonate -> `/hatchery/snakes/localities/manokwari/yellow-neonate.png`
- Red Adult/Subadult -> `/hatchery/snakes/localities/manokwari/red-adult.png`
- Yellow Adult/Subadult -> `/hatchery/snakes/localities/manokwari/yellow-adult.png`

### Sorong
- Yellow Hatchling/Neonate -> `/hatchery/snakes/localities/sorong/yellow-neonate.png`

### Biak
- Red Hatchling/Neonate -> `/hatchery/snakes/localities/biak/red-neonate.png`
- Yellow Hatchling/Neonate -> `/hatchery/snakes/localities/biak/yellow-neonate.png`
- Red Adult/Subadult -> `/hatchery/snakes/localities/biak/red-adult.png`
- Yellow Adult/Subadult -> `/hatchery/snakes/localities/biak/yellow-adult.png`

### Numfor temporary mapping
- Red Hatchling/Neonate -> Biak red juvenile
- Yellow Hatchling/Neonate -> Biak yellow juvenile
- Red Adult/Subadult -> Biak red adult
- Yellow Adult/Subadult -> pending dedicated Numfor art

### Aru
- Adult/Subadult -> `/hatchery/snakes/localities/aru/adult.png`

### Merauke
- Adult/Subadult -> `/hatchery/snakes/localities/merauke/adult.png`

### Pulcher x Utaraensis hybrid
- Red Hatchling/Neonate -> `/hatchery/snakes/hybrids/pulcher-utaraensis/red-neonate.png`
- Yellow Hatchling/Neonate -> `/hatchery/snakes/hybrids/pulcher-utaraensis/yellow-neonate.png`

## Reserved special assets

- Manokwari Red Adult A+ phenotype
- Sorong Yellow Adult A+ phenotype
- Designer Variant 01
- Designer Red Neonate Variant 1

The special assets are tracked but are not normal default locality art.
