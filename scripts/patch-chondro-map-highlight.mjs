import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "src/components/ChondroConservationPartnerships.tsx");
let source = fs.readFileSync(file, "utf8");

if (source.includes("const mapSpotlight")) {
  console.log("Chondro map spotlight already applied.");
  process.exit(0);
}

const oldBlock = `function OriginMap({ selected, onSelect }: { selected: Subspecies; onSelect: (value: Subspecies) => void }) {
  const active = (value: Subspecies) => selected === value;
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/[.07] bg-[#071510] p-3 sm:p-5">
      <img
        src="/hatchery/chondro-subspecies-map-art.webp"
        alt="Green Tree Python subspecies distribution map showing Morelia azurea azurea, Morelia azurea pulcher, Morelia azurea utaraensis, and Morelia viridis across New Guinea and nearby islands"
        className="block h-auto w-full rounded-[18px] object-contain"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(regionInfo) as Subspecies[]).map((subspecies) => (
          <button
            key={subspecies}
            type="button"
            onClick={() => onSelect(subspecies)}
            className={\`rounded-xl border px-3 py-2 text-left text-xs transition \${active(subspecies) ? "border-emerald-200/30 bg-emerald-200/[.08] text-emerald-50" : "border-white/[.06] bg-black/10 text-white/40 hover:border-white/[.12]"}\`}
          >
            <div className="font-black">{regionInfo[subspecies].short}</div>
            <div className="mt-1 text-[9px] opacity-65">{regionInfo[subspecies].mapLabel}</div>
          </button>
        ))}
      </div>
    </div>
  );
}`;

const newBlock = `const mapSpotlight: Record<Subspecies, { x: number; y: number; radius: number }> = {
  "Morelia azurea azurea": { x: 34, y: 33, radius: 25 },
  "Morelia azurea pulcher": { x: 23, y: 48, radius: 28 },
  "Morelia azurea utaraensis": { x: 58, y: 38, radius: 38 },
  "Morelia viridis": { x: 58, y: 66, radius: 42 },
};

function OriginMap({ selected, onSelect }: { selected: Subspecies; onSelect: (value: Subspecies) => void }) {
  const active = (value: Subspecies) => selected === value;
  const spotlight = mapSpotlight[selected];
  const dimStyle = {
    background: \`radial-gradient(circle at \${spotlight.x}% \${spotlight.y}%, transparent 0%, transparent \${spotlight.radius}%, rgba(0, 0, 0, 0.18) calc(\${spotlight.radius}% + 8%), rgba(0, 0, 0, 0.58) 100%)\`,
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/[.07] bg-[#071510] p-3 sm:p-5">
      <div className="relative overflow-hidden rounded-[18px]">
        <img
          src="/hatchery/chondro-subspecies-map-art.webp"
          alt="Green Tree Python subspecies distribution map showing Morelia azurea azurea, Morelia azurea pulcher, Morelia azurea utaraensis, and Morelia viridis across New Guinea and nearby islands"
          className="block h-auto w-full object-contain"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-[background] duration-300 ease-out"
          style={dimStyle}
        />
        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white/72 backdrop-blur-sm sm:left-4 sm:top-4">
          {regionInfo[selected].short} · {regionInfo[selected].mapLabel}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(regionInfo) as Subspecies[]).map((subspecies) => (
          <button
            key={subspecies}
            type="button"
            onClick={() => onSelect(subspecies)}
            aria-pressed={active(subspecies)}
            className={\`rounded-xl border px-3 py-2 text-left text-xs transition \${active(subspecies) ? "border-white/20 bg-white/[.07] text-white" : "border-white/[.06] bg-black/10 text-white/38 hover:border-white/[.12] hover:text-white/58"}\`}
          >
            <div className="font-black">{regionInfo[subspecies].short}</div>
            <div className="mt-1 text-[9px] opacity-65">{regionInfo[subspecies].mapLabel}</div>
          </button>
        ))}
      </div>
    </div>
  );
}`;

if (!source.includes(oldBlock)) {
  throw new Error("Could not locate OriginMap block for spotlight upgrade.");
}

source = source.replace(oldBlock, newBlock);
fs.writeFileSync(file, source);
console.log("Applied Chondro subspecies map spotlight.");
