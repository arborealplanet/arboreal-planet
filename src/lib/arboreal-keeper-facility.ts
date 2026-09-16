import type { KeeperEnclosureId } from "@/lib/arboreal-keeper-enclosures";

export type KeeperRoomPurpose =
  | "nursery"
  | "growout"
  | "adult"
  | "breeding"
  | "quarantine"
  | "display"
  | "general";

export type KeeperPlacementZone =
  | "upper-left"
  | "upper-center"
  | "upper-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "floor-left"
  | "floor-center"
  | "floor-right";

export type KeeperDecorCategory =
  | "perch"
  | "plant"
  | "background"
  | "water"
  | "environment";

export type KeeperDecorItemId =
  | "rubber-perch"
  | "natural-branch"
  | "cork-branch"
  | "bromeliad"
  | "orchid"
  | "aroid"
  | "fern"
  | "moss"
  | "cork-background"
  | "water-bowl"
  | "misting-nozzle"
  | "heat-panel";

export type KeeperDecorItem = {
  id: KeeperDecorItemId;
  label: string;
  category: KeeperDecorCategory;
  price: number;
  unlockLevel: number;
};

export type KeeperEnclosurePlacement = {
  zone: KeeperPlacementZone;
  itemId: KeeperDecorItemId;
};

export type KeeperFacilityEnclosure = {
  id: string;
  roomId: string;
  enclosureId: KeeperEnclosureId;
  label: string;
  placements: KeeperEnclosurePlacement[];
  templateName: string | null;
};

export type KeeperFacilityRoom = {
  id: string;
  name: string;
  purpose: KeeperRoomPurpose;
  enclosureSlots: number;
  createdAt: number;
};

export type KeeperEnclosureTemplate = {
  id: string;
  name: string;
  enclosureId: KeeperEnclosureId;
  placements: KeeperEnclosurePlacement[];
};

export type KeeperFacilitySave = {
  rooms: KeeperFacilityRoom[];
  enclosures: KeeperFacilityEnclosure[];
  templates: KeeperEnclosureTemplate[];
  updatedAt: number;
};

export const ARBOREAL_KEEPER_FACILITY_SAVE_KEY = "arboreal_keeper_facility_v1";

export const ARBOREAL_KEEPER_DECOR: KeeperDecorItem[] = [
  { id: "rubber-perch", label: "Rubber Perch", category: "perch", price: 45, unlockLevel: 1 },
  { id: "natural-branch", label: "Natural Branch", category: "perch", price: 80, unlockLevel: 5 },
  { id: "cork-branch", label: "Cork Branch", category: "perch", price: 95, unlockLevel: 10 },
  { id: "bromeliad", label: "Bromeliad", category: "plant", price: 55, unlockLevel: 4 },
  { id: "orchid", label: "Orchid", category: "plant", price: 75, unlockLevel: 8 },
  { id: "aroid", label: "Aroid", category: "plant", price: 60, unlockLevel: 5 },
  { id: "fern", label: "Fern", category: "plant", price: 45, unlockLevel: 3 },
  { id: "moss", label: "Moss", category: "plant", price: 25, unlockLevel: 1 },
  { id: "cork-background", label: "Cork Background", category: "background", price: 110, unlockLevel: 6 },
  { id: "water-bowl", label: "Water Bowl", category: "water", price: 30, unlockLevel: 1 },
  { id: "misting-nozzle", label: "Misting Nozzle", category: "environment", price: 140, unlockLevel: 5 },
  { id: "heat-panel", label: "Heat Panel", category: "environment", price: 175, unlockLevel: 8 },
];

export const KEEPER_ROOM_PURPOSES: Array<{ id: KeeperRoomPurpose; label: string; detail: string }> = [
  { id: "nursery", label: "Nursery", detail: "Neonates and other small arboreal animals." },
  { id: "growout", label: "Grow-Out Room", detail: "Juvenile and subadult enclosures." },
  { id: "adult", label: "Adult Room", detail: "Adult animals across compatible species." },
  { id: "breeding", label: "Breeding Room", detail: "Breeding-ready adult animals and pairing workflows." },
  { id: "quarantine", label: "Quarantine", detail: "New arrivals and isolated records." },
  { id: "display", label: "Display Room", detail: "High-visual enclosures and premium builds." },
  { id: "general", label: "General Room", detail: "Mixed-purpose room controlled by the player." },
];

export const KEEPER_PLACEMENT_ZONES: KeeperPlacementZone[] = [
  "upper-left",
  "upper-center",
  "upper-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "floor-left",
  "floor-center",
  "floor-right",
];

export const EMPTY_KEEPER_FACILITY_SAVE: KeeperFacilitySave = {
  rooms: [
    {
      id: "room-nursery",
      name: "Nursery",
      purpose: "nursery",
      enclosureSlots: 6,
      createdAt: 1,
    },
    {
      id: "room-main",
      name: "Main Animal Room",
      purpose: "general",
      enclosureSlots: 8,
      createdAt: 2,
    },
  ],
  enclosures: [],
  templates: [],
  updatedAt: 0,
};

export function roomExpansionPrice(roomCount: number) {
  return 4500 + Math.max(0, roomCount - 2) * 2250;
}

export function roomPurposeLabel(purpose: KeeperRoomPurpose) {
  return KEEPER_ROOM_PURPOSES.find((item) => item.id === purpose)?.label ?? "Room";
}

export function enclosureCountInRoom(save: KeeperFacilitySave, roomId: string) {
  return save.enclosures.filter((enclosure) => enclosure.roomId === roomId).length;
}

export function sanitizeKeeperFacilitySave(value: unknown): KeeperFacilitySave {
  if (!value || typeof value !== "object" || Array.isArray(value)) return structuredClone(EMPTY_KEEPER_FACILITY_SAVE);
  const input = value as Partial<KeeperFacilitySave>;
  const rooms = Array.isArray(input.rooms)
    ? input.rooms
        .filter((room): room is KeeperFacilityRoom => Boolean(room && typeof room === "object" && !Array.isArray(room)))
        .map((room) => ({
          id: String(room.id ?? "").slice(0, 180),
          name: String(room.name ?? "Room").slice(0, 80),
          purpose: KEEPER_ROOM_PURPOSES.some((item) => item.id === room.purpose) ? room.purpose : "general",
          enclosureSlots: Math.max(1, Math.min(40, Math.round(Number(room.enclosureSlots ?? 6)))),
          createdAt: Number.isFinite(Number(room.createdAt)) ? Number(room.createdAt) : 0,
        }))
        .filter((room) => room.id)
    : [];

  const roomIds = new Set(rooms.map((room) => room.id));
  const enclosures = Array.isArray(input.enclosures)
    ? input.enclosures
        .filter((enclosure): enclosure is KeeperFacilityEnclosure => Boolean(enclosure && typeof enclosure === "object" && !Array.isArray(enclosure)))
        .map((enclosure) => ({
          id: String(enclosure.id ?? "").slice(0, 180),
          roomId: String(enclosure.roomId ?? "").slice(0, 180),
          enclosureId: enclosure.enclosureId,
          label: String(enclosure.label ?? "Enclosure").slice(0, 80),
          templateName: enclosure.templateName ? String(enclosure.templateName).slice(0, 80) : null,
          placements: Array.isArray(enclosure.placements)
            ? enclosure.placements
                .filter((placement) => KEEPER_PLACEMENT_ZONES.includes(placement.zone) && ARBOREAL_KEEPER_DECOR.some((item) => item.id === placement.itemId))
                .slice(0, 9)
            : [],
        }))
        .filter((enclosure) => enclosure.id && roomIds.has(enclosure.roomId))
    : [];

  const templates = Array.isArray(input.templates)
    ? input.templates
        .filter((template): template is KeeperEnclosureTemplate => Boolean(template && typeof template === "object" && !Array.isArray(template)))
        .map((template) => ({
          id: String(template.id ?? "").slice(0, 180),
          name: String(template.name ?? "Template").slice(0, 80),
          enclosureId: template.enclosureId,
          placements: Array.isArray(template.placements)
            ? template.placements
                .filter((placement) => KEEPER_PLACEMENT_ZONES.includes(placement.zone) && ARBOREAL_KEEPER_DECOR.some((item) => item.id === placement.itemId))
                .slice(0, 9)
            : [],
        }))
        .filter((template) => template.id)
    : [];

  return {
    rooms: rooms.length ? rooms : structuredClone(EMPTY_KEEPER_FACILITY_SAVE.rooms),
    enclosures,
    templates,
    updatedAt: Number.isFinite(Number(input.updatedAt)) ? Number(input.updatedAt) : 0,
  };
}
