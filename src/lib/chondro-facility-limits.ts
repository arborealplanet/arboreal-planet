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

export function installedEnclosures(enclosures: Record<string, number> | null | undefined) {
  return Object.values(enclosures ?? {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

export function remainingFacilityEnclosureSlots(
  facilityId: string | null | undefined,
  enclosures: Record<string, number> | null | undefined,
) {
  return Math.max(0, facilityEnclosureCap(facilityId) - installedEnclosures(enclosures));
}
