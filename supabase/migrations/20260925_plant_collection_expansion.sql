-- Plant collection expansion, 2026-09-25.
-- Adds eight reptile-enclosure staples to public.plant_collections alongside
-- the existing Nepenthes reference. Art ships in the app bundle at
-- public/images/plants/<slug>.webp; Nepenthes keeps its inline SVG art.
-- Idempotent: safe to re-run (WHERE NOT EXISTS per row).
-- NOTE: run this against the live database; the repo does not currently hold the full schema.

insert into public.plant_collections
  (id, slug, name, scientific_name, plant_group, description, tags, status, display_order)
select
  gen_random_uuid(),
  'pothos',
  'Golden Pothos',
  'Epipremnum aureum',
  'Trailing',
  'The undisputed workhorse of reptile enclosures. Golden pothos tolerates low light, shrugs off missed waterings, and trails fast enough to give arboreal snakes cover within weeks. Root cuttings in water or damp substrate with near-total success, so one mother plant stocks every tub you own. Keep leaves out of standing water dishes to avoid rot.',
  array['Trailing','Beginner','Fast grower','Enclosure staple'],
  'REFERENCE',
  10
where not exists (select 1 from public.plant_collections where slug = 'pothos');

insert into public.plant_collections
  (id, slug, name, scientific_name, plant_group, description, tags, status, display_order)
select
  gen_random_uuid(),
  'bromeliad',
  'Scarlet Star Bromeliad',
  'Guzmania lingulata',
  'Epiphytes',
  'A classic arboreal-vivarium plant. The stiff rosette forms a central cup that holds water, exactly the kind of micro-pool small reptiles and amphibians use in the wild. Mount it on cork or perch frames rather than planting it in substrate, mist the cup regularly, and give it bright indirect light to keep the red bracts vivid.',
  array['Epiphytic','Arboreal setups','Water cups','Showpiece'],
  'REFERENCE',
  20
where not exists (select 1 from public.plant_collections where slug = 'bromeliad');

insert into public.plant_collections
  (id, slug, name, scientific_name, plant_group, description, tags, status, display_order)
select
  gen_random_uuid(),
  'snake-plant',
  'Snake Plant',
  'Sansevieria trifasciata',
  'Upright',
  'Nearly indestructible vertical structure for enclosure backgrounds. The stiff, upright leaves give shy species something to hide behind and break up sightlines, while the plant itself tolerates the low light and irregular watering of a busy keeper''s reptile room. Use sturdy pots or anchor well, as a large snake can topple a top-heavy specimen.',
  array['Upright','Beginner','Drought tolerant','Background'],
  'REFERENCE',
  30
where not exists (select 1 from public.plant_collections where slug = 'snake-plant');

insert into public.plant_collections
  (id, slug, name, scientific_name, plant_group, description, tags, status, display_order)
select
  gen_random_uuid(),
  'birds-nest-fern',
  'Bird''s Nest Fern',
  'Asplenium nidus',
  'Epiphytes',
  'A broad-fronded epiphyte that looks like it was designed for green tree python enclosures. The wavy rosette catches mist, holds humidity around itself, and gives perched snakes dappled cover without blocking airflow. Mount on branches or grow in a loose bark mix; it wants consistent moisture but rots if the crown sits wet.',
  array['Epiphytic','Humidity lover','Chondro setups','Lush'],
  'REFERENCE',
  40
where not exists (select 1 from public.plant_collections where slug = 'birds-nest-fern');

insert into public.plant_collections
  (id, slug, name, scientific_name, plant_group, description, tags, status, display_order)
select
  gen_random_uuid(),
  'philodendron',
  'Heartleaf Philodendron',
  'Philodendron hederaceum',
  'Trailing',
  'Pothos''s close cousin and just as useful. Glossy heart-shaped leaves on fast trailing vines make excellent living curtains along enclosure walls and backgrounds. Propagates from cuttings as easily as pothos, tolerates the warm humid air of tropical setups, and bounces back quickly from pruning when a vine wanders into a water dish.',
  array['Trailing','Beginner','Fast grower','Background cover'],
  'REFERENCE',
  50
where not exists (select 1 from public.plant_collections where slug = 'philodendron');

insert into public.plant_collections
  (id, slug, name, scientific_name, plant_group, description, tags, status, display_order)
select
  gen_random_uuid(),
  'dracaena',
  'Song of India Dracaena',
  'Dracaena reflexa',
  'Upright',
  'An upright cane plant whose cream-and-green striped whorls add a bright, structured accent to larger enclosures. Slow-growing and tolerant of indoor light, it works well as a long-term background specimen that won''t outgrow its space in a season. Let the top inch of soil dry between waterings and wipe leaves to keep them dust-free under enclosure lighting.',
  array['Upright','Slow grower','Variegated','Background'],
  'REFERENCE',
  60
where not exists (select 1 from public.plant_collections where slug = 'dracaena');

insert into public.plant_collections
  (id, slug, name, scientific_name, plant_group, description, tags, status, display_order)
select
  gen_random_uuid(),
  'orchid',
  'Moth Orchid',
  'Phalaenopsis amabilis',
  'Epiphytes',
  'The showpiece epiphyte. Moth orchids mount beautifully on cork bark in humid arboreal enclosures, where their arching flower spikes last for months. They want bright indirect light, warm temperatures, and a wet-dry cycle on their roots, never soggy media. Position blooms where they won''t be crushed by a heavy-bodied snake cruising the branches.',
  array['Epiphytic','Showpiece','Mount on cork','Blooms for months'],
  'REFERENCE',
  70
where not exists (select 1 from public.plant_collections where slug = 'orchid');

insert into public.plant_collections
  (id, slug, name, scientific_name, plant_group, description, tags, status, display_order)
select
  gen_random_uuid(),
  'ficus',
  'Weeping Fig',
  'Ficus benjamina',
  'Upright',
  'A dense, bushy tree that creates the closest thing to a real canopy in a large enclosure. Weeping figs respond well to pruning, so you can shape them around perches and lights, and their thick foliage gives arboreal snakes genuine hiding spots. They dislike being moved once settled and will drop leaves in protest; pick a spot and commit.',
  array['Upright','Canopy','Prunable','Large enclosures'],
  'REFERENCE',
  80
where not exists (select 1 from public.plant_collections where slug = 'ficus');
