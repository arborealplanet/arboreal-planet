import fs from "node:fs";

const file = "src/components/ChondroBreederGameV3.tsx";
let source = fs.readFileSync(file, "utf8");

const importLine = 'import { ChondroPairingLab } from "@/components/ChondroPairingLab";';
if (!source.includes(importLine)) {
  const anchor = 'import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";';
  if (!source.includes(anchor)) throw new Error("Pairing Lab installer could not find ChondroSnakeIcon import.");
  source = source.replace(anchor, `${anchor}\n${importLine}`);
}

const labMarkup = '{dam && sire ? <ChondroPairingLab dam={dam} sire={sire} /> : null}';
if (!source.includes(labMarkup)) {
  const anchor = '          ) : null}\n          <div className="mt-4 flex flex-wrap items-center gap-2">';
  if (!source.includes(anchor)) throw new Error("Pairing Lab installer could not find breeding-room preview anchor.");
  source = source.replace(anchor, `          ) : null}\n          ${labMarkup}\n          <div className="mt-4 flex flex-wrap items-center gap-2">`);
}

fs.writeFileSync(file, source);
console.log("Installed Chondro Pairing Lab into the breeding room.");
