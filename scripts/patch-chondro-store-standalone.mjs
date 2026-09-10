import fs from "node:fs";

const file = "src/components/ChondroBreederExpandedShop.tsx";
let source = fs.readFileSync(file, "utf8");

if (!source.includes("createPortal")) {
  console.log("Chondro store already renders directly.");
  process.exit(0);
}

source = source.replace('import { createPortal } from "react-dom";\n', "");
source = source.replace('  const [mount, setMount] = useState<HTMLElement | null>(null);\n', "");

source = source.replace(/\n  useEffect\(\(\) => \{\n    const timer = window\.setTimeout\(\(\) => \{[\s\S]*?\n  \}, \[\]\);\n\n  useEffect\(\(\) => \{\n    const stored = Number\(window\.localStorage\.getItem\(SHOP_SEED_KEY\) \|\| "1"\);/, '\n  useEffect(() => {\n    const stored = Number(window.localStorage.getItem(SHOP_SEED_KEY) || "1");');

source = source.replace(
  '  if (!mount || !save) return null;\n\n  return createPortal(\n    <div className="rounded-[24px]',
  '  if (!save) return <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6"><div className="rounded-[24px] border border-white/[.06] bg-white/[.02] p-5 text-sm text-white/40">Loading snake store…</div></div>;\n\n  return (\n    <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">\n    <div className="rounded-[24px]',
);

source = source.replace(
  '    </div>,\n    mount,\n  );\n}',
  '    </div>\n    </div>\n  );\n}',
);

fs.writeFileSync(file, source);
console.log("Converted Chondro expanded shop from DOM portal injection to direct app rendering.");
