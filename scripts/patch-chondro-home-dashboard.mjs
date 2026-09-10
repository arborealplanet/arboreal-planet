import fs from "node:fs";

const file = "src/components/ChondroBreederWorkspace.tsx";
let source = fs.readFileSync(file, "utf8");

if (!source.includes('import { ChondroBreederHomeStatus } from "@/components/ChondroBreederHomeStatus";')) {
  source = source.replace(
    'import { ChondroPatternBanner } from "@/components/ChondroPatternBanner";\n',
    'import { ChondroPatternBanner } from "@/components/ChondroPatternBanner";\nimport { ChondroBreederHomeStatus } from "@/components/ChondroBreederHomeStatus";\n',
  );
}

if (!source.includes('import { ChondroGameNotifications } from "@/components/ChondroGameNotifications";')) {
  source = source.replace(
    'import { ChondroBreederHomeStatus } from "@/components/ChondroBreederHomeStatus";\n',
    'import { ChondroBreederHomeStatus } from "@/components/ChondroBreederHomeStatus";\nimport { ChondroGameNotifications } from "@/components/ChondroGameNotifications";\n',
  );
}

source = source.replace(
  '{ id: "colony", label: "Colony", detail: "Animals and breeder records", icon: "◎" },',
  '{ id: "colony", label: "Colony", navLabel: "Snakes", detail: "Animals and breeder records", icon: "◎" },',
);

source = source.replace(
  'lg:max-w-[720px]',
  'lg:max-w-[760px]',
);

const bannerNeedle = '          <ChondroPatternBanner compact />\n\n          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">';
if (source.includes(bannerNeedle) && !source.includes('<ChondroBreederHomeStatus')) {
  source = source.replace(
    bannerNeedle,
    '          <ChondroPatternBanner compact />\n          <ChondroBreederHomeStatus onOpen={(next) => onOpen(next)} />\n\n          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">',
  );
}

if (!source.includes('<ChondroGameNotifications />')) {
  source = source.replace(
    '      <nav\n        className="fixed inset-x-0 bottom-0',
    '      <ChondroGameNotifications />\n\n      <nav\n        className="fixed inset-x-0 bottom-0',
  );
}

source = source.replace(
  'The four main game systems stay one tap away in the dock. Career, projects, conservation, breeder network and reference tools live here when you need them.',
  'Your next recommended move stays at the top. The dock handles the main game loop while career, projects, conservation, breeder network and reference tools stay here when you need them.',
);

fs.writeFileSync(file, source);
console.log("Applied guided Chondro Breeder home dashboard, activity notifications and dock refinements.");
