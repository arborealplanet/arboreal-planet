import fs from "node:fs";

const file = "src/components/ChondroBreederGameV3.tsx";
let source = fs.readFileSync(file, "utf8");

const pairingImport = 'import { ChondroPairingLab } from "@/components/ChondroPairingLab";';
if (!source.includes(pairingImport)) {
  const anchor = 'import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";';
  if (!source.includes(anchor)) throw new Error("Pairing Lab installer could not find ChondroSnakeIcon import.");
  source = source.replace(anchor, `${anchor}\n${pairingImport}`);
}

const clutchImport = 'import { ChondroClutchEvaluation } from "@/components/ChondroClutchEvaluation";';
if (!source.includes(clutchImport)) {
  if (!source.includes(pairingImport)) throw new Error("Clutch Evaluation installer could not find Pairing Lab import.");
  source = source.replace(pairingImport, `${pairingImport}\n${clutchImport}`);
}

const labMarkup = '{dam && sire ? <ChondroPairingLab dam={dam} sire={sire} /> : null}';
if (!source.includes(labMarkup)) {
  const anchor = '          ) : null}\n          <div className="mt-4 flex flex-wrap items-center gap-2">';
  if (!source.includes(anchor)) throw new Error("Pairing Lab installer could not find breeding-room preview anchor.");
  source = source.replace(anchor, `          ) : null}\n          ${labMarkup}\n          <div className="mt-4 flex flex-wrap items-center gap-2">`);
}

const clutchMarkup = '<ChondroClutchEvaluation offspring={clutch.offspring} holdbackIds={holdbacks} season={season} />';
if (!source.includes(clutchMarkup)) {
  const anchor = '            {!clutchEstablished ? (';
  if (!source.includes(anchor)) throw new Error("Clutch Evaluation installer could not find active-clutch establishment anchor.");
  source = source.replace(anchor, `            ${clutchMarkup}\n            {!clutchEstablished ? (`);
}

fs.writeFileSync(file, source);
console.log("Installed Chondro Pairing Lab and Clutch Evaluation into the breeder game.");
