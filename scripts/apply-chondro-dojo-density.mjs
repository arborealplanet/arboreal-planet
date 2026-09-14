import fs from "node:fs";

const gameFile = "src/components/ChondroBreederGameV3.tsx";
let game = fs.readFileSync(gameFile, "utf8");
game = game.replace(
  'import { geneticTestingUnlocked, roomCapacityFromSave, ROOM_EXPANSIONS, type FacilityRoomState } from "@/lib/chondro-facility-limits";',
  'import { animalHousingCapacity, enclosureFootprint, geneticTestingUnlocked, roomCapacityFromSave, ROOM_EXPANSIONS, type FacilityRoomState } from "@/lib/chondro-facility-limits";',
);
game = game.replace('  "Chondro Dojo Bin": 225,', '  "Chondro Dojo Bin": 250,');
game = game.replace(
  '  const installedEnclosureCount = enclosures["Chondro Dojo Bin"] + enclosures["PVC Arboreal"];\n  const physicalRoomCapacity = roomCapacityFromSave({ facilityRooms });\n  const capacity = installedEnclosureCount;\n  const openSlots = Math.max(0, capacity - colony.length);\n  const roomEnclosureSlots = Math.max(0, physicalRoomCapacity - installedEnclosureCount);',
  '  const installedEnclosureCount = enclosureFootprint(enclosures);\n  const physicalRoomCapacity = roomCapacityFromSave({ facilityRooms });\n  const capacity = animalHousingCapacity(enclosures);\n  const openSlots = Math.max(0, capacity - colony.length);\n  const roomEnclosureSlots = Math.max(0, physicalRoomCapacity - installedEnclosureCount);',
);
fs.writeFileSync(gameFile, game);

const shopFile = "src/components/ChondroBreederExpandedShop.tsx";
let shop = fs.readFileSync(shopFile, "utf8");
shop = shop.replace(
  'import { roomCapacityFromSave } from "@/lib/chondro-facility-limits";',
  'import { animalHousingCapacity, enclosureFootprint, roomCapacityFromSave } from "@/lib/chondro-facility-limits";',
);
shop = shop.replace('const enclosurePrices: Record<EnclosureType, number> = { "Chondro Dojo Bin": 225, "PVC Arboreal": 650 };', 'const enclosurePrices: Record<EnclosureType, number> = { "Chondro Dojo Bin": 250, "PVC Arboreal": 650 };');
shop = shop.replace(
  '  "Chondro Dojo Bin": { label: "Chondro Dojo Enclosure", detail: "Clean tub-style chondro housing with the functional Dojo setup." },',
  '  "Chondro Dojo Bin": { label: "Chondro Dojo Pair", detail: "Two space-saving Dojo enclosures sold as one set. The pair uses one facility slot and houses two snakes." },',
);
shop = shop.replace(
  '  const capacity = Object.values(save?.enclosures ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);\n  const physicalRoomCapacity = roomCapacityFromSave({ facilityRooms: save?.facilityRooms });\n  const roomEnclosureSlots = Math.max(0, physicalRoomCapacity - capacity);\n  const openSlots = Math.max(0, capacity - (save?.colony.length ?? 0));',
  '  const installedFootprint = enclosureFootprint(save?.enclosures);\n  const capacity = animalHousingCapacity(save?.enclosures);\n  const physicalRoomCapacity = roomCapacityFromSave({ facilityRooms: save?.facilityRooms });\n  const roomEnclosureSlots = Math.max(0, physicalRoomCapacity - installedFootprint);\n  const openSlots = Math.max(0, capacity - (save?.colony.length ?? 0));',
);
shop = shop.replace(
  '<p className="mt-1 text-xs leading-5 text-white/38">Each enclosure adds room for one snake. Your facility currently has {roomEnclosureSlots} installation slot{roomEnclosureSlots === 1 ? "" : "s"} open.</p>',
  '<p className="mt-1 text-xs leading-5 text-white/38">A PVC enclosure uses one facility slot for one snake. A Chondro Dojo Pair uses that same single facility slot for two snakes. Your facility currently has {roomEnclosureSlots} installation slot{roomEnclosureSlots === 1 ? "" : "s"} open.</p>',
);
shop = shop.replace(
  '<div className="mt-1 text-sm font-semibold text-white/70">{owned} · +1 snake capacity each</div>',
  '<div className="mt-1 text-sm font-semibold text-white/70">{owned} owned · {type === "Chondro Dojo Bin" ? "+2 snake capacity per set" : "+1 snake capacity each"}</div>',
);
fs.writeFileSync(shopFile, shop);

const colonyFile = "src/components/ChondroColonyOverview.tsx";
let colony = fs.readFileSync(colonyFile, "utf8");
colony = colony.replace(
  'import { installedEnclosures, roomCapacityFromSave, type FacilityRoomState } from "@/lib/chondro-facility-limits";',
  'import { animalHousingCapacity, enclosureFootprint, roomCapacityFromSave, type FacilityRoomState } from "@/lib/chondro-facility-limits";',
);
colony = colony.replace(
  '  const capacity = roomCapacityFromSave(save);\n  const enclosures = installedEnclosures(save.enclosures);',
  '  const facilityCapacity = roomCapacityFromSave(save);\n  const footprint = enclosureFootprint(save.enclosures);\n  const animalCapacity = animalHousingCapacity(save.enclosures);',
);
colony = colony.replace(
  '<Metric label="Housing" value={`${enclosures}/${capacity}`} detail={`${Math.max(0, capacity - enclosures)} facility slot${Math.max(0, capacity - enclosures) === 1 ? "" : "s"} open`} />',
  '<Metric label="Housing" value={`${colony.length}/${animalCapacity}`} detail={`${footprint}/${facilityCapacity} facility slots used · ${Math.max(0, animalCapacity - colony.length)} animal spaces open`} />',
);
fs.writeFileSync(colonyFile, colony);

console.log("Applied Chondro Dojo two-for-one facility density across game, Store and Colony.");