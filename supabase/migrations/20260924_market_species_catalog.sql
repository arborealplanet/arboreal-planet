-- Expand the animal catalog for the marketplace species filter.
-- Arboreal-first groups (Arboreal Pythons, Arboreal Boas) plus a small
-- Terrestrial Boas segment for rainbow boas, sand boas and rosy boas.
-- No ball pythons, per owner request. Idempotent: safe to re-run.
-- NOTE: run this against the live database; the repo does not currently hold the full schema.

-- Re-home the Green Tree Python under its market group.
update public.species
set animal_group = 'Arboreal Pythons'
where slug = 'green-tree-python';

insert into public.species
  (slug, common_name, scientific_name, animal_group, description, tags, published, market_group_note)
values
  ('carpet-python', 'Carpet Python', 'Morelia spilota complex', 'Arboreal Pythons',
   'Semi-arboreal Morelia of the spilota complex — jungles, coastals, diamonds and Irian Jayas. A long-running MorphMarket staple and a natural fit for arboreal setups.',
   array['Arboreal', 'Python', 'Semi-arboreal'], true,
   'Arboreal Planet market grouping; not presented as universally accepted scientific classification.'),
  ('reticulated-python', 'Reticulated Python', 'Malayopython reticulatus', 'Arboreal Pythons',
   'The world''s longest snake, including super dwarf and dwarf localities. Juveniles climb readily; a semi-arboreal giant for experienced keepers.',
   array['Semi-arboreal', 'Python', 'Super dwarf'], true,
   'Arboreal Planet market grouping; not presented as universally accepted scientific classification.'),
  ('emerald-tree-boa', 'Emerald Tree Boa', 'Corallus caninus', 'Arboreal Boas',
   'The Amazon''s iconic arboreal boa. A display species for advanced keepers with tall, planted enclosures.',
   array['Arboreal', 'Boa', 'Display'], true,
   'Arboreal Planet market grouping; not presented as universally accepted scientific classification.'),
  ('amazon-tree-boa', 'Amazon Tree Boa', 'Corallus hortulana', 'Arboreal Boas',
   'A variable, hardy arboreal boa from the Amazon basin — popular with keepers moving beyond beginner species.',
   array['Arboreal', 'Boa'], true,
   'Arboreal Planet market grouping; not presented as universally accepted scientific classification.'),
  ('brazilian-rainbow-boa', 'Brazilian Rainbow Boa', 'Epicrates cenchria', 'Terrestrial Boas',
   'Iridescent terrestrial boa of the Amazon basin. A humid ground-dweller headlining the terrestrial corner.',
   array['Terrestrial', 'Boa'], true,
   'Arboreal Planet market grouping; not presented as universally accepted scientific classification.'),
  ('kenyan-sand-boa', 'Kenyan Sand Boa', 'Eryx colubrinus', 'Terrestrial Boas',
   'A small, fossorial boa from East Africa and a favorite first boa — the terrestrial shelf''s resident burrower.',
   array['Terrestrial', 'Boa', 'Fossorial'], true,
   'Arboreal Planet market grouping; not presented as universally accepted scientific classification.'),
  ('rosy-boa', 'Rosy Boa', 'Lichanura trivirgata', 'Terrestrial Boas',
   'A gentle, small-bodied North American boa. Slow-moving and handleable, rounding out the terrestrial trio.',
   array['Terrestrial', 'Boa'], true,
   'Arboreal Planet market grouping; not presented as universally accepted scientific classification.')
on conflict (slug) do update set
  common_name = excluded.common_name,
  scientific_name = excluded.scientific_name,
  animal_group = excluded.animal_group,
  description = excluded.description,
  tags = excluded.tags,
  published = excluded.published,
  market_group_note = excluded.market_group_note;
