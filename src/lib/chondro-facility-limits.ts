export type FacilityRoomState = Record<string, number>;

export type FacilityRoomDefinition = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  cost: number;
  reputationRequired: number;
  buildHours: number;
  maxOwned: number;
};

export const ROOM_EXPANSIONS: FacilityRoomDefinition[] = [
  { id: "starter-room", name: "Starter Reptile Room", description: "The room you begin with at home.", capacity: 12, cost: 0, reputationRequired: 0, buildHours: 0, maxOwned: 1 },
  { id: "reptile-room", name: "Additional Reptile Room", description: "Convert another room into dedicated animal space.", capacity: 18, cost: 12500, reputationRequired: 250, buildHours: 6, maxOwned: 2 },
  { id: "breeding-room", name: "Breeding Room", description: "Purpose-built pairing space with room for a serious adult collection.", capacity: 30, cost: 35000, reputationRequired: 750, buildHours: 12, maxOwned: 2 },
  { id: "nursery-room", name: "Nursery & Grow-Out Room", description: "High-density space for neonates, holdbacks and young stock.", capacity: 40, cost: 50000, reputationRequired: 1200, buildHours: 18, maxOwned: 2 },
  { id: "commercial-room", name: "Commercial Facility Room", description: "A dedicated off-site room that greatly expands the operation.", capacity: 75, cost: 110000, reputationRequired: 2500, buildHours: 24, maxOwned: 2 },
  { id: "professional-wing", name: "Professional Facility Wing", description: "A large purpose-built expansion for established breeders.", capacity: 125, cost: 225000, reputationRequired: 4500, buildHours: 36, maxOwned: 2 },
  { id: "research-wing", name: "Research & Conservation Wing", description: "Late-game research space supporting advanced testing and conservation work.", capacity: 60, cost: 325000, reputationRequired: 6500, buildHours: 48, maxOwned: 1 },
];

export const FACILITY_ENCLOSURE_CAPS: Record<string, number> = {
  "spare-room": 12,
  "reptile-room": 30,
  "small-facility": 75,
  "professional-facility": 180,
  "research-center": 400,
};

export function facilityEnclosureCap(facilityId: string | null | undefined) {
  return FACILITY_ENCLOSURE_CAPS[facilityId ?? "spare-room"] ?? FACILITY_ENCLOSURE_CAPS["spare-room"];
}

export function roomCapacity(rooms: FacilityRoomState | null | undefined) {
  const inventory = rooms && Object.keys(rooms).length ? rooms : { "starter-room": 1 };
  return ROOM_EXPANSIONS.reduce((sum, room) => sum + room.capacity * Math.max(0, Number(inventory[room.id] ?? 0)), 0);
}

export function roomCapacityFromSave(save: { facilityRooms?: FacilityRoomState; facilityId?: string | null }) {
  if (save.facilityRooms && Object.keys(save.facilityRooms).length) return roomCapacity(save.facilityRooms);
  return facilityEnclosureCap(save.facilityId);
}

export function geneticTestingUnlocked(save: { careerReputation?: number; facilityRooms?: FacilityRoomState }) {
  const reputation = Math.max(0, Number(save.careerReputation ?? 0));
  return reputation >= 1500 || Number(save.facilityRooms?.["research-wing"] ?? 0) > 0;
}

export function installedEnclosures(enclosures: Record<string, number> | null | undefined) {
  return Object.values(enclosures ?? {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

export function remainingFacilityEnclosureSlots(
  facilityId: string | null | undefined,
  enclosures: Record<string, number> | null | undefined,
  facilityRooms?: FacilityRoomState,
) {
  const cap = roomCapacityFromSave({ facilityId, facilityRooms });
  return Math.max(0, cap - installedEnclosures(enclosures));
}
