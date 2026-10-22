-- Plant cultivation data, 2026-10-22.
-- Fills the reviewed cultivation fields (light, temperature, humidity, watering,
-- substrate, feeding, notes) for the nine live REFERENCE collections in
-- public.plant_collections. Until now every plant detail page showed all six
-- cultivation fields as "Pending" because cultivation_data was empty.
-- Idempotent: plain UPDATEs keyed on slug, safe to re-run.
-- Guidance is standard horticultural care for each species, adapted for
-- arboreal reptile enclosures (mounted/bark mixes, misting, perch clearance).

update public.plant_collections
set cultivation_data = jsonb_build_object(
  'light', 'Bright indirect light, with a few hours of gentle morning sun. Too little light means no pitchers; harsh midday sun scorches leaves.',
  'temperature', 'Warm days 75-85F, nights no lower than 60F for lowland types. Highland types prefer cooler nights (55-65F) - know which type you have before placing it near a heat source.',
  'humidity', '60-80% or higher. Mist regularly; dry air stops pitcher formation and crisps the tendrils.',
  'watering', 'Keep media damp, never waterlogged. Use rain, distilled, or reverse-osmosis water only - minerals in tap water burn roots and kill pitchers.',
  'substrate', 'Open, airy, low-nutrient mix: long-fiber sphagnum with perlite and orchid bark. Never standard potting soil or fertilizer-rich mixes.',
  'feeding', 'No fertilizer needed. If grown without insects, one tiny dilute orchid feed per month at most. Never feed it meat or fertilize pitchers directly.',
  'notes', 'Pitchers are the plant''s stomachs - do not cut them off unless fully brown and dry. New pitchers form at tendril tips; if tendrils dry out, humidity or water quality is the usual cause. Keep pitchers clear of direct heat-lamp blast.',
  'source_notes', 'Standard horticultural care parameters for Nepenthes spp., adapted for arboreal reptile enclosures.'
)
where slug = 'nepenthes';

update public.plant_collections
set cultivation_data = jsonb_build_object(
  'light', 'Low to bright indirect light; tolerates the dim corners of a reptile room. Variegation fades in very low light.',
  'temperature', '65-85F; keep above 55F. Standard reptile-room temperatures are fine.',
  'humidity', '40-70%. Unbothered by normal household humidity and thrives in humid enclosures.',
  'watering', 'Let the top inch dry between waterings; soggy soil rots roots. Forgiving of a missed week.',
  'substrate', 'Any loose, well-draining potting mix; a bark and perlite blend in enclosures.',
  'feeding', 'Light feeder - dilute balanced liquid feed monthly in the growing season, or skip entirely in enclosures.',
  'notes', 'Trailing vines root at nodes; snip cuttings and root them in water or damp substrate to multiply. Keep leaves out of standing water dishes to avoid rot. Sap can irritate if chewed - no concern for snakes, but keep away from herbivorous or omnivorous lizards.',
  'source_notes', 'Standard horticultural care parameters for Epipremnum aureum, adapted for arboreal reptile enclosures.'
)
where slug = 'pothos';

update public.plant_collections
set cultivation_data = jsonb_build_object(
  'light', 'Bright indirect light. Direct sun bleaches the red bracts.',
  'temperature', '65-80F; avoid cold drafts below 55F.',
  'humidity', '50-70%. Mist the rosette cup regularly.',
  'watering', 'Keep the central cup filled with fresh water and flush it weekly so it does not stagnate. Keep the media barely moist, never soggy.',
  'substrate', 'Mount on cork or bark, or plant in a very loose orchid bark mix. Roots are anchors, not feeders.',
  'feeding', 'Very light - dilute bromeliad or orchid feed in the cup once a month at most. Overfeeding rots the cup.',
  'notes', 'The mother rosette dies after blooming but produces pups at the base. Leave pups attached until they are about a third of the mother''s size, then separate. The water cup is a real micro-habitat; flush it weekly in enclosures so it does not foul.',
  'source_notes', 'Standard horticultural care parameters for Guzmania lingulata, adapted for arboreal reptile enclosures.'
)
where slug = 'bromeliad';

update public.plant_collections
set cultivation_data = jsonb_build_object(
  'light', 'Low to bright indirect light; tolerates dim rooms and grows faster with more light.',
  'temperature', '60-85F; keep above 50F.',
  'humidity', '30-60%. Dry air is fine; no misting needed.',
  'watering', 'Drought-tolerant; water only when the soil is fully dry. Overwatering is the one reliable way to kill it.',
  'substrate', 'Very well-draining cactus or succulent mix with extra perlite.',
  'feeding', 'Rarely - dilute feed once or twice in the growing season, or not at all.',
  'notes', 'Anchor well or use a heavy pot: a large snake can topple a top-heavy plant. Slow grower; new leaves emerge from the base.',
  'source_notes', 'Standard horticultural care parameters for Sansevieria trifasciata, adapted for arboreal reptile enclosures.'
)
where slug = 'snake-plant';

update public.plant_collections
set cultivation_data = jsonb_build_object(
  'light', 'Medium to bright indirect light. No direct sun - fronds scorch.',
  'temperature', '60-80F; keep above 55F.',
  'humidity', '60-80%. Mist the fronds, not the crown.',
  'watering', 'Keep media consistently moist but never waterlogged. Never let the crown sit wet or it rots.',
  'substrate', 'Loose bark and peat mix, or mounted on branches with sphagnum.',
  'feeding', 'Light - dilute balanced feed monthly in the growing season.',
  'notes', 'New fronds unfurl from the center crown - never pour water into the crown. The rosette shape catches mist and holds humidity around itself, which is why it suits chondro enclosures.',
  'source_notes', 'Standard horticultural care parameters for Asplenium nidus, adapted for arboreal reptile enclosures.'
)
where slug = 'birds-nest-fern';

update public.plant_collections
set cultivation_data = jsonb_build_object(
  'light', 'Low to bright indirect light; tolerates dim corners.',
  'temperature', '65-85F; keep above 55F.',
  'humidity', '40-70%. Appreciates humidity but does not demand it.',
  'watering', 'Let the top inch dry between waterings; do not keep soggy.',
  'substrate', 'Loose potting mix with bark and perlite.',
  'feeding', 'Dilute balanced feed monthly in the growing season.',
  'notes', 'Vines root at nodes - cuttings root in water within weeks. Prune wandering vines out of water dishes. Like pothos, sap can irritate if chewed; fine for snakes, not for plant-eating lizards.',
  'source_notes', 'Standard horticultural care parameters for Philodendron hederaceum, adapted for arboreal reptile enclosures.'
)
where slug = 'philodendron';

update public.plant_collections
set cultivation_data = jsonb_build_object(
  'light', 'Bright indirect light. Variegation fades in low light; direct sun scorches leaf edges.',
  'temperature', '65-80F; keep above 55F.',
  'humidity', '40-60%. Tolerates average humidity; brown leaf tips usually mean dry air or fluoride in tap water.',
  'watering', 'Let the top inch dry between waterings; sensitive to overwatering.',
  'substrate', 'Well-draining potting mix with perlite.',
  'feeding', 'Dilute balanced feed monthly in the growing season.',
  'notes', 'Use filtered or distilled water if leaf tips brown - dracaenas are sensitive to fluoride. Slow grower; prune cane tops to branch it out.',
  'source_notes', 'Standard horticultural care parameters for Dracaena reflexa, adapted for arboreal reptile enclosures.'
)
where slug = 'dracaena';

update public.plant_collections
set cultivation_data = jsonb_build_object(
  'light', 'Bright indirect light, such as an east window or shaded south light. Direct sun burns leaves.',
  'temperature', '65-85F days, with nights 5-10F cooler to trigger reblooming.',
  'humidity', '50-70%. Mist the roots, not the blooms.',
  'watering', 'Wet-dry cycle: water when roots turn silvery, then drain fully. Never let it sit in water.',
  'substrate', 'Bark chips or sphagnum in a slotted pot; mounted on cork in humid enclosures.',
  'feeding', 'Weakly weekly - quarter-strength orchid fertilizer during growth.',
  'notes', 'Flower spikes last for months. After blooms drop, cut the spike above a node for a possible rebloom, or at the base to let the plant rest. Position blooms where a heavy-bodied snake will not crush them.',
  'source_notes', 'Standard horticultural care parameters for Phalaenopsis amabilis, adapted for arboreal reptile enclosures.'
)
where slug = 'orchid';

update public.plant_collections
set cultivation_data = jsonb_build_object(
  'light', 'Bright indirect light to a few hours of direct sun. Needs good light to hold its leaves.',
  'temperature', '65-85F; keep above 55F and away from cold drafts.',
  'humidity', '40-70%.',
  'watering', 'Let the top 1-2 inches dry, then water thoroughly and drain fully. Hates wet feet.',
  'substrate', 'Well-draining potting mix with bark and perlite.',
  'feeding', 'Dilute balanced feed monthly in the growing season.',
  'notes', 'Drops leaves when moved, repotted, or hit with a draft - pick a spot and commit, and it will regrow. Prunes well; shape it around perches and lights. Sap is a mild irritant; fine for snakes.',
  'source_notes', 'Standard horticultural care parameters for Ficus benjamina, adapted for arboreal reptile enclosures.'
)
where slug = 'ficus';
