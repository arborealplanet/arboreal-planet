-- Original news reporting: first three Arboreal Planet News articles.
-- Verification status as of 2026-09-28:
--   * Show-season dates, venues, and admission details checked against the
--     organizers' own pages (narbc.com, repticon.com) and Zoo Med listings.
--   * USARK black-caiman ESA suit checked against the filed complaint on
--     CourtListener (1:26-cv-00565) plus Bloomberg Law coverage.
--   * Python handling study: details confirmed only through secondary
--     coverage (scienmag.com); the paper itself (doi:10.1002/vms3.71218)
--     could not be retrieved, so its specific figures stay unverified
--     until the DOI source is recovered.
-- Idempotent: re-running updates the articles in place by slug.

INSERT INTO public.journal_articles
(slug, title, excerpt, body, content_type, category, author_display, source_urls, status, published_at)
VALUES (
  'fall-2026-reptile-show-season-preview',
  'Fall 2026 Show Season: Your Keeper''s Guide to Tinley, St. Louis, and the Repticon Circuit',
  'NARBC''s Tinley Park fall show (Oct 10–11) headlines a packed season, with St. Louis (Nov 14–15) and a full Repticon circuit stretching from Houston to Costa Mesa through December.',
  $$Fall is the best season in this hobby, and 2026 is stacked. If you can only hit one show before the holidays, make it count — here's where the animals are.

NARBC Tinley Park — October 10–11, Tinley Park, IL. The fall edition of the show people call the Super Bowl of reptile expos returns to the Tinley Park Convention Center (18451 Convention Center Drive). Expect 150+ vendors. NARBC enforces a captive-bred-only rule with inspections before and during the show — no imports, no venomous for sale. Doors run Saturday 10–5 and Sunday 11–4. Admission is $15 for adults, $10 for kids 6–12, and under-5s get in free; the $55 VIP pass gets you in Friday 2–7 PM during vendor setup plus early entry both days. Buy online and scan at Will Call to skip the line.

NARBC St. Louis — November 14–15, St. Charles, MO. Same organization, same captive-bred-only standard, smaller room. The Saint Charles Convention Center (1 Convention Center Plaza) hosts Saturday 10–5 and Sunday 11–4. Admission mirrors Tinley at $15/$10, with a $50 VIP weekend pass. Vendor registration is still open as of this writing, so the floor map is still filling in — another reason to grab VIP if you're hunting something specific.

The Repticon circuit keeps the rest of the map covered. October: Houston (Oct 3–4), then Charlotte, Denver, and Ft. Walton Beach (Oct 10–11), then Atlanta and Chattanooga (Oct 17–18). November: Orlando and Costa Mesa (Nov 7–8), Tampa (Nov 14–15), Huntsville and Dallas (Nov 21–22), Raleigh (Nov 28–29). December closes it out with Lakeland (Dec 5–6), Charlotte (Dec 12–13), Pembroke Pines and Fayetteville (Dec 19–20), and a Melbourne one-dayer on Dec 27.

A few keeper notes before you go. First, quarantine everything you bring home — show season is also mite season, and a $15 animal isn't worth your whole collection. Second, know the local rules: Colorado restricts which species can be sold at shows — venomous species are off the table, and hognoses were pulled from the allowed list in 2026 — so check Repticon's show-specific guidance before planning your shopping list around a restricted animal. Third, stop by the USARK booth at any NARBC show. The people defending your right to keep these animals are standing right there — memberships and auction donations fund that work.$$,
  'NEWS',
  'INDUSTRY',
  'Arboreal Planet',
  ARRAY['https://www.narbc.com/shows/tinley-park/', 'https://www.narbc.com/shows/st-louis/', 'https://zoomed.com/event/narbc-tinley-park-october-2026/', 'https://zoomed.com/venue/st-charles-convention-center/', 'http://repticon.com/']::text[],
  'PUBLISHED',
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body = EXCLUDED.body,
  category = EXCLUDED.category,
  source_urls = EXCLUDED.source_urls,
  updated_at = now();

INSERT INTO public.journal_articles
(slug, title, excerpt, body, content_type, category, author_display, source_urls, status, published_at)
VALUES (
  'usark-black-caiman-esa-lawsuit-2026',
  'USARK Takes the Feds to Court Over the Black Caiman''s 50-Year Listing',
  'USARK sued the Interior Department in February 2026, arguing the Fish and Wildlife Service has never conducted a single legally required five-year status review for the black caiman since its 1976 endangered listing.',
  $$On February 19, 2026, the United States Association of Reptile Keepers walked into the U.S. District Court for the District of Columbia and sued the federal government over a fifty-year-old listing that has never once been re-examined.

The case — USARK v. Burgum, No. 1:26-cv-00565 — names the Department of the Interior and Secretary Doug Burgum. At issue is the black caiman (Melanosuchus niger), listed as endangered under the Endangered Species Act in 1976. The ESA requires the Fish and Wildlife Service to review each listed species at least once every five years (Section 4(c)(2)) to decide whether the listing still fits the science. USARK's complaint states that in the nearly fifty years since the black caiman was listed, the Service has never conducted a single one of those reviews.

That matters because the listing isn't just a label. It carries hard restrictions on possession, interstate transfer, and captive breeding — restrictions the complaint says are now "unsupported by current biological and conservation data" and impose real economic and operational costs on USARK's members, including keepers, breeders, zoos, veterinarians, and researchers who currently hold black caiman or would work with the species lawfully if they could. The suit doesn't ask the court to delist the caiman outright; it asks for the review the law already demands, so the classification can be revised or removed if the science supports it.

Bloomberg Law covered the filing, noting the agency's alleged half-century of missed deadlines. For keepers who will never own a caiman, the stakes are still direct: this case is about whether ESA listings get revisited on schedule. Every listed herp in the trade pipeline — and every species that might be listed next — depends on that same review process.

It's been a busy year on the regulatory front beyond this case. In Wisconsin, the DNR's Clearinghouse Rule 25-092 — which ends long-term possession of wild-taken native herps, with a grandfather clause and registration for existing animals — passed the Natural Resources Board in February 2026 with only limited changes after testimony from USARK's Phil Goss, the National Animal Interest Alliance's Art Parola, and others. Between federal courts and state rulemakings, 2026 is a reminder that the right to keep reptiles is defended, not granted — and it's defended by the organizations showing up to these fights.$$,
  'NEWS',
  'INDUSTRY',
  'Arboreal Planet',
  ARRAY['https://storage.courtlistener.com/recap/gov.uscourts.dcd.289588/gov.uscourts.dcd.289588.1.0.pdf', 'https://news.bloomberglaw.com/environment-and-energy/black-caimans-endangered-status-needs-review-lawsuit-claims', 'https://usark.org/25wi/']::text[],
  'PUBLISHED',
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body = EXCLUDED.body,
  category = EXCLUDED.category,
  source_urls = EXCLUDED.source_urls,
  updated_at = now();

INSERT INTO public.journal_articles
(slug, title, excerpt, body, content_type, category, author_display, source_urls, status, published_at)
VALUES (
  'handling-stress-study-pythons-2026',
  'Good News for Hands-On Keepers: Study Finds Regular Handling Doesn''t Stress Pythons',
  'A September 2026 University of Adelaide study found that regularly handled, well-housed pythons showed reduced escape-motivated behavior on handling days — evidence that structured handling need not compromise welfare.',
  $$Ask ten keepers whether handling stresses out snakes and you'll get twelve opinions. A study published this month in Veterinary Medicine and Science finally brings data to the argument — and it's good news for hands-on keepers.

Researchers from the University of Adelaide, working at Cleland Wildlife Park in South Australia, studied three snakes — two children's pythons and one woma python, all experienced animals from the park's education program. Each was housed individually in a proper setup: temperature-controlled enclosure, appropriate heating and lighting, hides, branches, and water. Time-lapse cameras outside the enclosures recorded 10-second clips every five minutes for ten hours a day, and the footage was coded against a purpose-built ethogram of sixteen behaviors grouped into four classes: active, inactive, abnormal, and out of sight. Behaviors flagged as potentially stress-related included freezing, window striking, boundary contact, rapid body movement, and tail flicking.

The team compared handling days against non-handling days, and the hours right before a session against the hours right after. The results were clear: after handling, the snakes showed significantly more inactive behavior and significantly less out-of-sight behavior — resting calmly in view, not hiding. And on handling days overall, abnormal behaviors dropped significantly, driven largely by a decrease in boundary contact — the glass-surfing, escape-motivated behavior every keeper recognizes as a stress tell. The authors' read: regular handling by trained staff had little to no negative welfare impact on these habituated pythons, and may even function as mild enrichment.

Now the caveats, because they matter. Three snakes is a tiny sample. Cameras only ran during the day, and pythons are crepuscular to nocturnal — the study may have filmed mostly nap time. There were no physiological stress measures (like corticosterone from shed skin or fecals) to back up the behavioral data. And every animal in the study was a long-term handling veteran; these results say nothing about a fresh import, a defensive individual, or a different taxon — handling has shown measurable harm in tuataras and tortoises, so species and protocol matter enormously.

The practical takeaway for keepers: calm, regular, confident handling of an established animal isn't the welfare problem some online discussions make it out to be. But read the animal in front of you — skip sessions in shed or after feeding, keep it structured, and don't mistake your snake tolerating handling for your snake enjoying a party trick.$$,
  'NEWS',
  'HUSBANDRY',
  'Arboreal Planet',
  ARRAY['https://scienmag.com/zoo-snakes-may-find-regular-human-handling-surprisingly-stress-free/', 'https://doi.org/10.1002/vms3.71218']::text[],
  'PUBLISHED',
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body = EXCLUDED.body,
  category = EXCLUDED.category,
  source_urls = EXCLUDED.source_urls,
  updated_at = now();
