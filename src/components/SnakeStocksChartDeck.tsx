"use client";

import { useState } from "react";
import { MarketChartFrame } from "@/components/MarketChartFrame";

type Slide = {
  short: string;
  title: string;
  subtitle: string;
  localities?: string[];
  legends: string[];
  note?: string;
};

const localitySlides: Slide[] = [
  {
    short: "azurea",
    title: "Morelia azurea azurea",
    subtitle: "Biak and Numfor stay together in the azurea market grouping.",
    localities: ["Biak", "Numfor"],
    legends: ["Biak", "Numfor"],
  },
  {
    short: "pulcher",
    title: "Morelia azurea pulcher",
    subtitle: "Timika, Sorong, Manokwari and Kofiau are grouped together. Batanta stays visibly review-flagged until we lock that classification.",
    localities: ["Timika", "Sorong", "Manokwari", "Kofiau", "Batanta · review"],
    legends: ["Timika", "Sorong", "Manokwari", "Kofiau"],
    note: "Batanta is not plotted as a permanent locality line until the grouping review is resolved.",
  },
  {
    short: "utaraensis",
    title: "Morelia azurea utaraensis",
    subtitle: "Wamena, Lereh / Highland, Cyclops and Jayapura share the utaraensis market deck.",
    localities: ["Wamena", "Lereh / Highland", "Cyclops", "Jayapura"],
    legends: ["Wamena", "Lereh", "Cyclops", "Jayapura"],
  },
  {
    short: "viridis",
    title: "Morelia viridis",
    subtitle: "Aru and Merauke stay together in the viridis market grouping.",
    localities: ["Aru", "Merauke"],
    legends: ["Aru", "Merauke"],
  },
];

const wamenaSlides: Slide[] = [
  {
    short: "sex",
    title: "Wamena · Males vs females",
    subtitle: "Compare sex while holding age and neonate color constant.",
    legends: ["Female", "Male"],
  },
  {
    short: "neo color",
    title: "Wamena · Red vs yellow neonates",
    subtitle: "Compare hatch color without flattening sex or age differences.",
    legends: ["Red neo", "Yellow neo"],
  },
  {
    short: "age",
    title: "Wamena · Age classes",
    subtitle: "Neonate, juvenile, subadult and adult stay separate when samples support them.",
    legends: ["Neo", "Juvenile", "Subadult", "Adult"],
  },
  {
    short: "red by sex",
    title: "Wamena · Red neonates by sex",
    subtitle: "Female vs male inside the same red-neonate segment.",
    legends: ["Female", "Male"],
  },
  {
    short: "yellow by sex",
    title: "Wamena · Yellow neonates by sex",
    subtitle: "Female vs male inside the same yellow-neonate segment.",
    legends: ["Female", "Male"],
  },
  {
    short: "peer localities",
    title: "Utaraensis locality comparison",
    subtitle: "Wamena, Lereh, Cyclops and Jayapura under the same filters.",
    legends: ["Wamena", "Lereh", "Cyclops", "Jayapura"],
  },
];

function CarouselControls({ slides, active, setActive }: { slides: Slide[]; active: number; setActive: (index: number) => void }) {
  const previous = () => setActive((active - 1 + slides.length) % slides.length);
  const next = () => setActive((active + 1) % slides.length);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={previous} aria-label="Previous chart slide" className="grid h-9 w-9 place-items-center rounded-full border border-white/[.08] bg-white/[.025] text-white/55 transition hover:bg-white/[.06] hover:text-white">←</button>
      <div className="hide-scrollbar flex max-w-full gap-1.5 overflow-x-auto">
        {slides.map((slide, index) => (
          <button
            key={slide.short}
            onClick={() => setActive(index)}
            className={`whitespace-nowrap rounded-full border px-3 py-2 text-[9px] font-bold uppercase tracking-[.12em] transition ${active === index ? "border-emerald-300/30 bg-emerald-300/[.1] text-emerald-100" : "border-white/[.07] text-white/30 hover:text-white/55"}`}
          >
            {slide.short}
          </button>
        ))}
      </div>
      <button onClick={next} aria-label="Next chart slide" className="grid h-9 w-9 place-items-center rounded-full border border-white/[.08] bg-white/[.025] text-white/55 transition hover:bg-white/[.06] hover:text-white">→</button>
    </div>
  );
}

function PairedOriginCharts({ slide }: { slide: Slide }) {
  const emptyStatus = "Layout locked. Waiting for the replacement Green Tree Python dataset before plotting any values.";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[.16em] text-emerald-300/65">Captive Bred</div>
        <MarketChartFrame
          compact
          title={`${slide.title} · Captive Bred`}
          subtitle={slide.subtitle}
          legends={slide.legends}
          status={emptyStatus}
        />
      </div>
      <div>
        <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[.16em] text-cyan-300/65">Import</div>
        <MarketChartFrame
          compact
          title={`${slide.title} · Import`}
          subtitle={slide.subtitle}
          legends={slide.legends}
          status={emptyStatus}
        />
      </div>
    </div>
  );
}

export function LocalitySubspeciesCarousel() {
  const [active, setActive] = useState(0);
  const slide = localitySlides[active];

  return (
    <div className="panel overflow-hidden rounded-3xl">
      <div className="border-b border-white/[.06] p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="section-kicker">Subspecies locality deck</div>
            <h2 className="mt-2 text-2xl font-semibold">Localities stay inside the correct market grouping.</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-white/34">Each slide uses the same layout: Captive Bred on the left, Import on the right. Swipe through the taxonomic market groups instead of stacking every graph down the page.</p>
          </div>
          <CarouselControls slides={localitySlides} active={active} setActive={setActive} />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-white/28">Slide {active + 1} of {localitySlides.length}</div>
            <h3 className="mt-1.5 text-xl font-semibold italic text-white/82">{slide.title}</h3>
          </div>
          {slide.localities ? (
            <div className="flex max-w-2xl flex-wrap gap-2">
              {slide.localities.map((locality) => (
                <span key={locality} className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold ${locality.includes("review") ? "border-amber-300/15 bg-amber-300/[.04] text-amber-100/55" : "border-white/[.07] bg-black/10 text-white/40"}`}>{locality}</span>
              ))}
            </div>
          ) : null}
        </div>

        <PairedOriginCharts slide={slide} />

        {slide.note ? <div className="mt-4 rounded-2xl border border-amber-300/10 bg-amber-300/[.03] px-4 py-3 text-[10px] leading-5 text-amber-100/50">{slide.note}</div> : null}
      </div>
    </div>
  );
}

export function WamenaAnalysisCarousel() {
  const [active, setActive] = useState(0);
  const slide = wamenaSlides[active];

  return (
    <div className="panel overflow-hidden rounded-3xl">
      <div className="border-b border-white/[.06] p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="section-kicker">Wamena analysis deck</div>
            <h2 className="mt-2 text-2xl font-semibold">One comparison at a time.</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-white/34">The detailed Wamena views now live in a carousel too. Every slide keeps Captive Bred left and Import right so the origin comparison never changes position.</p>
          </div>
          <CarouselControls slides={wamenaSlides} active={active} setActive={setActive} />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-white/28">Slide {active + 1} of {wamenaSlides.length} · {slide.title}</div>
        <PairedOriginCharts slide={slide} />
      </div>
    </div>
  );
}
