import type { KeeperHousingStage } from "@/lib/arboreal-keeper-enclosures";
import type { KeeperSpeciesId } from "@/lib/arboreal-keeper-species";

export type KeeperRackDefinitionId = "arboreal-rack-12" | "arboreal-rack-18";
export type KeeperRackRotation = 0 | 90 | 180 | 270;

export type KeeperRackDefinition = {
  id: KeeperRackDefinitionId;
  displayName: string;
  capacity: number;
  rows: number;
  columns: number;
  price: number;
  compatibleSpecies: Partial<Record<KeeperSpeciesId, KeeperHousingStage[]>>;
};

export type KeeperRackTub = {
  id: string;
  row: number;
  column: number;
  label: string;
  occupantId: string | null;
};

export type KeeperRackInstance = {
  id: string;
  rackDefinitionId: KeeperRackDefinitionId;
  roomId: string;
  position: {
    x: number;
    y: number;
  };
  rotation: KeeperRackRotation;
  tubs: KeeperRackTub[];
};

const NEONATE_RACK_COMPATIBILITY: Partial<Record<KeeperSpeciesId, KeeperHousingStage[]>> = {
  green_tree_python: ["hatchling", "neonate"],
  northern_emerald_tree_boa: ["neonate"],
  amazon_basin_emerald_tree_boa: ["neonate"],
};

export const ARBOREAL_KEEPER_RACKS: KeeperRackDefinition[] = [
  {
    id: "arboreal-rack-12",
    displayName: "Standard Hatchling / Neonate Rack",
    capacity: 12,
    rows: 3,
    columns: 4,
    price: 2100,
    compatibleSpecies: NEONATE_RACK_COMPATIBILITY,
  },
  {
    id: "arboreal-rack-18",
    displayName: "Expanded Hatchling / Neonate Rack",
    capacity: 18,
    rows: 3,
    columns: 6,
    price: 3150,
    compatibleSpecies: NEONATE_RACK_COMPATIBILITY,
  },
];

export function rackDefinition(rackDefinitionId: KeeperRackDefinitionId) {
  return ARBOREAL_KEEPER_RACKS.find((rack) => rack.id === rackDefinitionId) ?? null;
}

export function rackTubLabel(row: number, column: number) {
  return `R${row} T${column}`;
}

export function createRackInstance(args: {
  id: string;
  rackDefinitionId: KeeperRackDefinitionId;
  roomId?: string;
  position?: { x: number; y: number };
  rotation?: KeeperRackRotation;
}) {
  const definition = rackDefinition(args.rackDefinitionId);
  if (!definition) throw new Error(`Unknown Arboreal rack: ${args.rackDefinitionId}`);

  const tubs: KeeperRackTub[] = [];
  for (let row = 1; row <= definition.rows; row += 1) {
    for (let column = 1; column <= definition.columns; column += 1) {
      if (tubs.length >= definition.capacity) break;
      tubs.push({
        id: `${args.id}:r${row}:t${column}`,
        row,
        column,
        label: rackTubLabel(row, column),
        occupantId: null,
      });
    }
  }

  return {
    id: args.id,
    rackDefinitionId: args.rackDefinitionId,
    roomId: args.roomId ?? "main-room",
    position: args.position ?? { x: 0, y: 0 },
    rotation: args.rotation ?? 0,
    tubs,
  } satisfies KeeperRackInstance;
}

export function rackSupportsAnimal(
  rackDefinitionId: KeeperRackDefinitionId,
  speciesId: KeeperSpeciesId,
  stage: KeeperHousingStage,
) {
  const definition = rackDefinition(rackDefinitionId);
  return Boolean(definition?.compatibleSpecies[speciesId]?.includes(stage));
}

export function neighboringRackTubs(rack: KeeperRackInstance, tubId: string) {
  const source = rack.tubs.find((tub) => tub.id === tubId);
  if (!source) return [];
  return rack.tubs.filter(
    (tub) =>
      tub.id !== source.id &&
      Math.abs(tub.row - source.row) + Math.abs(tub.column - source.column) === 1,
  );
}

export function emptyCompatibleRackTubs(
  racks: KeeperRackInstance[],
  speciesId: KeeperSpeciesId,
  stage: KeeperHousingStage,
) {
  return racks.flatMap((rack) => {
    if (!rackSupportsAnimal(rack.rackDefinitionId, speciesId, stage)) return [];
    return rack.tubs
      .filter((tub) => tub.occupantId === null)
      .map((tub) => ({ rack, tub }));
  });
}
