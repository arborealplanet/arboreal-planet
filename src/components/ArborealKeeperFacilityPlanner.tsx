"use client";

import { useEffect, useMemo, useState } from "react";
import { ARBOREAL_KEEPER_ENCLOSURES, type KeeperEnclosureId } from "@/lib/arboreal-keeper-enclosures";
import {
  ARBOREAL_KEEPER_DECOR,
  ARBOREAL_KEEPER_FACILITY_SAVE_KEY,
  EMPTY_KEEPER_FACILITY_SAVE,
  KEEPER_PLACEMENT_ZONES,
  KEEPER_ROOM_PURPOSES,
  enclosureCountInRoom,
  roomExpansionPrice,
  roomPurposeLabel,
  sanitizeKeeperFacilitySave,
  type KeeperDecorItemId,
  type KeeperFacilityEnclosure,
  type KeeperFacilitySave,
  type KeeperRoomPurpose,
} from "@/lib/arboreal-keeper-facility";
import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";

const CHONDRO_SAVE_KEY = "arboreal_chondro_breeder_v2";
const ECONOMY_EVENT = "arboreal-keeper-economy-action";
const ECONOMY_UPDATED_EVENT = "arboreal-keeper-economy-updated";

type EconomyAction = {
  action: "spend" | "credit" | "reputation";
  amount: number;
  reason: string;
  approved: boolean;
  balance?: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function readSharedProgress() {
  if (typeof window === "undefined") return { cash: 30000, reputation: 0 };
  try {
    const raw = window.localStorage.getItem(CHONDRO_SAVE_KEY);
    if (!raw) return { cash: 30000, reputation: 0 };
    const parsed = JSON.parse(raw) as { cash?: unknown; careerReputation?: unknown };
    return {
      cash: Number.isFinite(Number(parsed.cash)) ? Number(parsed.cash) : 30000,
      reputation: Number.isFinite(Number(parsed.careerReputation)) ? Number(parsed.careerReputation) : 0,
    };
  } catch {
    return { cash: 30000, reputation: 0 };
  }
}

function requestEconomyAction(action: EconomyAction["action"], amount: number, reason: string) {
  const detail: EconomyAction = { action, amount, reason, approved: false };
  window.dispatchEvent(new CustomEvent<EconomyAction>(ECONOMY_EVENT, { detail }));
  return detail;
}

function readFacility() {
  try {
    const raw = window.localStorage.getItem(ARBOREAL_KEEPER_FACILITY_SAVE_KEY);
    return raw ? sanitizeKeeperFacilitySave(JSON.parse(raw)) : structuredClone(EMPTY_KEEPER_FACILITY_SAVE);
  } catch {
    return structuredClone(EMPTY_KEEPER_FACILITY_SAVE);
  }
}

function placementLabel(itemId: KeeperDecorItemId | undefined) {
  return ARBOREAL_KEEPER_DECOR.find((item) => item.id === itemId)?.label ?? "Empty";
}

export function ArborealKeeperFacilityPlanner() {
  const [save, setSave] = useState<KeeperFacilitySave>(EMPTY_KEEPER_FACILITY_SAVE);
  const [hydrated, setHydrated] = useState(false);
  const [cash, setCash] = useState(30000);
  const [reputation, setReputation] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState("room-nursery");
  const [selectedEnclosureId, setSelectedEnclosureId] = useState<string | null>(null);
  const [selectedDecor, setSelectedDecor] = useState<KeeperDecorItemId>("rubber-perch");
  const [newRoomName, setNewRoomName] = useState("New Animal Room");
  const [newRoomPurpose, setNewRoomPurpose] = useState<KeeperRoomPurpose>("general");
  const [templateName, setTemplateName] = useState("My Setup");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = readFacility();
      setSave(next);
      setSelectedRoomId(next.rooms[0]?.id ?? "room-nursery");
      const progress = readSharedProgress();
      setCash(progress.cash);
      setReputation(progress.reputation);
      setHydrated(true);
    }, 0);

    const syncEconomy = (event: Event) => {
      const detail = (event as CustomEvent<{ cash?: number; reputation?: number }>).detail;
      if (typeof detail?.cash === "number") setCash(detail.cash);
      if (typeof detail?.reputation === "number") setReputation(detail.reputation);
      if (typeof detail?.cash !== "number" && typeof detail?.reputation !== "number") {
        const progress = readSharedProgress();
        setCash(progress.cash);
        setReputation(progress.reputation);
      }
    };

    window.addEventListener(ECONOMY_UPDATED_EVENT, syncEconomy);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(ECONOMY_UPDATED_EVENT, syncEconomy);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const snapshot = { ...save, updatedAt: Date.now() };
    window.localStorage.setItem(ARBOREAL_KEEPER_FACILITY_SAVE_KEY, JSON.stringify(snapshot));
  }, [hydrated, save]);

  const keeperLevel = useMemo(() => keeperLevelFromReputation(reputation), [reputation]);
  const selectedRoom = save.rooms.find((room) => room.id === selectedRoomId) ?? save.rooms[0] ?? null;
  const roomEnclosures = selectedRoom
    ? save.enclosures.filter((enclosure) => enclosure.roomId === selectedRoom.id)
    : [];
  const selectedEnclosure = save.enclosures.find((enclosure) => enclosure.id === selectedEnclosureId) ?? null;
  const unlockedDecor = ARBOREAL_KEEPER_DECOR.filter((item) => keeperLevel >= item.unlockLevel);
  const expansionCost = roomExpansionPrice(save.rooms.length);

  function spend(amount: number, reason: string) {
    const result = requestEconomyAction("spend", amount, reason);
    if (!result.approved) {
      setStatus(`You need ${money(amount)} available in the shared facility budget.`);
      return false;
    }
    if (typeof result.balance === "number") setCash(result.balance);
    return true;
  }

  function addRoom() {
    if (!newRoomName.trim()) return;
    if (!spend(expansionCost, `Add facility room: ${newRoomName.trim()}`)) return;
    const roomId = `keeper-room-${Date.now()}`;
    setSave((current) => ({
      ...current,
      rooms: [
        ...current.rooms,
        {
          id: roomId,
          name: newRoomName.trim().slice(0, 80),
          purpose: newRoomPurpose,
          enclosureSlots: 8,
          createdAt: Date.now(),
        },
      ],
    }));
    setSelectedRoomId(roomId);
    setSelectedEnclosureId(null);
    setNewRoomName("New Animal Room");
    setStatus("Room added. Species are not forced into taxon-specific rooms; organize it however you want.");
  }

  function renameRoom(roomId: string, name: string) {
    const clean = name.trim().slice(0, 80);
    if (!clean) return;
    setSave((current) => ({
      ...current,
      rooms: current.rooms.map((room) => (room.id === roomId ? { ...room, name: clean } : room)),
    }));
  }

  function addEnclosure(enclosureId: KeeperEnclosureId) {
    if (!selectedRoom) return;
    const definition = ARBOREAL_KEEPER_ENCLOSURES.find((item) => item.id === enclosureId);
    if (!definition) return;
    const used = enclosureCountInRoom(save, selectedRoom.id);
    if (used >= selectedRoom.enclosureSlots) {
      setStatus(`${selectedRoom.name} is full. Add another room or use a room with open enclosure slots.`);
      return;
    }
    if (!spend(definition.price, `Install ${definition.displayName} in ${selectedRoom.name}`)) return;
    const instanceId = `keeper-enclosure-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setSave((current) => ({
      ...current,
      enclosures: [
        ...current.enclosures,
        {
          id: instanceId,
          roomId: selectedRoom.id,
          enclosureId,
          label: definition.displayName,
          placements: [],
          templateName: null,
        },
      ],
    }));
    setSelectedEnclosureId(instanceId);
    setStatus(`${definition.displayName} installed in ${selectedRoom.name}. Open it below to customize the nine placement zones.`);
  }

  function moveEnclosure(enclosure: KeeperFacilityEnclosure, roomId: string) {
    const target = save.rooms.find((room) => room.id === roomId);
    if (!target) return;
    if (enclosureCountInRoom(save, target.id) >= target.enclosureSlots) {
      setStatus(`${target.name} does not have an open enclosure slot.`);
      return;
    }
    setSave((current) => ({
      ...current,
      enclosures: current.enclosures.map((item) =>
        item.id === enclosure.id ? { ...item, roomId: target.id } : item,
      ),
    }));
    setSelectedRoomId(target.id);
    setStatus(`${enclosure.label} moved to ${target.name}.`);
  }

  function placeDecor(zone: KeeperFacilityEnclosure["placements"][number]["zone"]) {
    if (!selectedEnclosure) return;
    const item = ARBOREAL_KEEPER_DECOR.find((decor) => decor.id === selectedDecor);
    if (!item || keeperLevel < item.unlockLevel) return;
    const existing = selectedEnclosure.placements.find((placement) => placement.zone === zone);
    if (existing?.itemId === item.id) return;
    if (!spend(item.price, `Customize enclosure with ${item.label}`)) return;
    setSave((current) => ({
      ...current,
      enclosures: current.enclosures.map((enclosure) =>
        enclosure.id === selectedEnclosure.id
          ? {
              ...enclosure,
              templateName: null,
              placements: [
                ...enclosure.placements.filter((placement) => placement.zone !== zone),
                { zone, itemId: item.id },
              ],
            }
          : enclosure,
      ),
    }));
    setStatus(`${item.label} placed in ${zone.replace("-", " ")}.`);
  }

  function clearZone(zone: KeeperFacilityEnclosure["placements"][number]["zone"]) {
    if (!selectedEnclosure) return;
    setSave((current) => ({
      ...current,
      enclosures: current.enclosures.map((enclosure) =>
        enclosure.id === selectedEnclosure.id
          ? { ...enclosure, templateName: null, placements: enclosure.placements.filter((placement) => placement.zone !== zone) }
          : enclosure,
      ),
    }));
  }

  function saveTemplate() {
    if (!selectedEnclosure || !templateName.trim()) return;
    const id = `keeper-template-${Date.now()}`;
    const cleanName = templateName.trim().slice(0, 80);
    setSave((current) => ({
      ...current,
      templates: [
        ...current.templates,
        {
          id,
          name: cleanName,
          enclosureId: selectedEnclosure.enclosureId,
          placements: selectedEnclosure.placements.map((placement) => ({ ...placement })),
        },
      ],
      enclosures: current.enclosures.map((enclosure) =>
        enclosure.id === selectedEnclosure.id ? { ...enclosure, templateName: cleanName } : enclosure,
      ),
    }));
    setStatus(`${cleanName} saved as a reusable enclosure template.`);
  }

  function applyTemplate(templateId: string) {
    if (!selectedEnclosure) return;
    const template = save.templates.find((item) => item.id === templateId);
    if (!template || template.enclosureId !== selectedEnclosure.enclosureId) return;
    setSave((current) => ({
      ...current,
      enclosures: current.enclosures.map((enclosure) =>
        enclosure.id === selectedEnclosure.id
          ? {
              ...enclosure,
              placements: template.placements.map((placement) => ({ ...placement })),
              templateName: template.name,
            }
          : enclosure,
      ),
    }));
    setStatus(`${template.name} applied to ${selectedEnclosure.label}.`);
  }

  if (!hydrated || !selectedRoom) return null;

  return (
    <section className="mx-auto mb-6 max-w-7xl px-4 sm:px-6">
      <div className="overflow-hidden rounded-[30px] border border-emerald-300/10 bg-[#05100b] shadow-[0_24px_70px_rgba(0,0,0,.22)]">
        <div className="border-b border-white/[.055] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-200/48">Facility · Rooms · Enclosures</div>
              <h2 className="mt-2 text-xl font-semibold tracking-[-.035em] text-white sm:text-2xl">Build one mixed-species arboreal facility.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">Rooms are player organization, not species restrictions. Put Green Tree Pythons, Emerald Tree Boas and future animals in the same room when their individual enclosure requirements are satisfied.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="rounded-full border border-white/[.06] bg-black/20 px-3 py-1.5 text-white/45">Level {keeperLevel}</span>
              <span className="rounded-full border border-amber-200/10 bg-amber-200/[.035] px-3 py-1.5 text-amber-100/60">{money(cash)}</span>
              <span className="rounded-full border border-emerald-300/10 bg-emerald-300/[.035] px-3 py-1.5 text-emerald-100/55">{save.rooms.length} rooms</span>
            </div>
          </div>
          {status ? <div role="status" className="mt-4 rounded-2xl border border-white/[.055] bg-white/[.025] px-4 py-3 text-xs leading-5 text-white/55">{status}</div> : null}
        </div>

        <div className="grid lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-white/[.055] p-4 lg:border-b-0 lg:border-r sm:p-5">
            <div className="text-[9px] font-black uppercase tracking-[.15em] text-white/30">Rooms</div>
            <div className="mt-3 space-y-2">
              {save.rooms.map((room) => {
                const count = enclosureCountInRoom(save, room.id);
                const active = room.id === selectedRoom.id;
                return (
                  <button key={room.id} type="button" onClick={() => { setSelectedRoomId(room.id); setSelectedEnclosureId(null); }} className={`w-full rounded-[18px] border px-3 py-3 text-left transition ${active ? "border-emerald-300/16 bg-emerald-300/[.07]" : "border-white/[.05] bg-black/15 hover:bg-white/[.025]"}`}>
                    <div className="text-xs font-semibold text-white/68">{room.name}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-[.1em] text-white/28">{roomPurposeLabel(room.purpose)} · {count}/{room.enclosureSlots} cages</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-white/[.055] pt-4">
              <div className="text-[9px] font-black uppercase tracking-[.14em] text-white/28">Add room</div>
              <input value={newRoomName} onChange={(event) => setNewRoomName(event.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-white/[.07] bg-black/20 px-3 py-2 text-xs text-white/65 outline-none focus:border-emerald-300/25" />
              <select value={newRoomPurpose} onChange={(event) => setNewRoomPurpose(event.target.value as KeeperRoomPurpose)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#07110d] px-3 py-2 text-xs text-white/58 outline-none">
                {KEEPER_ROOM_PURPOSES.map((purpose) => <option key={purpose.id} value={purpose.id}>{purpose.label}</option>)}
              </select>
              <button type="button" onClick={addRoom} className="mt-2 w-full rounded-xl bg-emerald-300 px-3 py-2.5 text-[10px] font-black text-[#06100c]">Add room · {money(expansionCost)}</button>
            </div>
          </aside>

          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.15em] text-white/28">Selected room</div>
                <input defaultValue={selectedRoom.name} key={selectedRoom.id} onBlur={(event) => renameRoom(selectedRoom.id, event.target.value)} maxLength={80} className="mt-1 w-full max-w-md border-0 border-b border-white/[.08] bg-transparent py-1 text-xl font-semibold text-white/78 outline-none focus:border-emerald-300/30" />
                <div className="mt-1 text-[10px] text-white/28">{roomPurposeLabel(selectedRoom.purpose)} · {roomEnclosures.length} of {selectedRoom.enclosureSlots} enclosure slots used</div>
              </div>
              <div className="rounded-xl border border-white/[.055] bg-black/15 px-3 py-2 text-[10px] text-white/34">Rooms may mix species. Enclosures carry the husbandry rules.</div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {roomEnclosures.map((enclosure) => {
                const definition = ARBOREAL_KEEPER_ENCLOSURES.find((item) => item.id === enclosure.enclosureId);
                const selected = selectedEnclosure?.id === enclosure.id;
                return (
                  <button key={enclosure.id} type="button" onClick={() => setSelectedEnclosureId(enclosure.id)} className={`rounded-[18px] border p-3 text-left ${selected ? "border-emerald-300/18 bg-emerald-300/[.06]" : "border-white/[.055] bg-black/15"}`}>
                    <div className="text-xs font-semibold text-white/68">{enclosure.label}</div>
                    <div className="mt-1 text-[9px] text-white/28">{definition?.sizeClass ?? "arboreal"} · {enclosure.placements.length}/9 zones decorated</div>
                    {enclosure.templateName ? <div className="mt-2 text-[9px] font-semibold text-emerald-100/48">Template · {enclosure.templateName}</div> : null}
                  </button>
                );
              })}
              {roomEnclosures.length < selectedRoom.enclosureSlots ? (
                <div className="rounded-[18px] border border-dashed border-white/[.07] bg-white/[.012] p-3">
                  <div className="text-xs font-semibold text-white/42">Open enclosure slot</div>
                  <div className="mt-1 text-[9px] text-white/24">Install any unlocked compatible cage shell.</div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 border-t border-white/[.055] pt-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.14em] text-white/28">Enclosure shells</div>
                  <div className="mt-1 text-sm font-semibold text-white/58">Install housing into {selectedRoom.name}</div>
                </div>
                <div className="text-[10px] text-white/24">One animal per enclosure unless a future species explicitly allows otherwise.</div>
              </div>
              <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-2">
                {ARBOREAL_KEEPER_ENCLOSURES.map((enclosure) => (
                  <button key={enclosure.id} type="button" onClick={() => addEnclosure(enclosure.id)} className="min-w-[190px] snap-start rounded-[18px] border border-white/[.055] bg-black/18 p-3 text-left">
                    <div className="text-xs font-semibold text-white/60">{enclosure.displayName}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-[.1em] text-white/25">{enclosure.sizeClass} · {enclosure.habitatProfile}</div>
                    <div className="mt-3 text-sm font-semibold text-amber-100/58">{money(enclosure.price)}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedEnclosure ? (
              <div className="mt-5 border-t border-white/[.055] pt-5">
                <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-100/38">Customize enclosure</div>
                        <div className="mt-1 text-base font-semibold text-white/68">{selectedEnclosure.label}</div>
                      </div>
                      <select value={selectedEnclosure.roomId} onChange={(event) => moveEnclosure(selectedEnclosure, event.target.value)} className="rounded-xl border border-white/[.07] bg-[#07110d] px-3 py-2 text-[10px] text-white/48 outline-none">
                        {save.rooms.map((room) => <option key={room.id} value={room.id}>Move to {room.name}</option>)}
                      </select>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-[22px] border border-white/[.055] bg-[radial-gradient(circle_at_50%_20%,rgba(52,211,153,.08),transparent_40%),#020605] p-3">
                      {KEEPER_PLACEMENT_ZONES.map((zone) => {
                        const placement = selectedEnclosure.placements.find((item) => item.zone === zone);
                        return (
                          <div key={zone} className="min-h-[88px] rounded-[16px] border border-white/[.055] bg-white/[.018] p-2 text-center">
                            <button type="button" onClick={() => placeDecor(zone)} className="flex h-full min-h-[62px] w-full flex-col items-center justify-center rounded-xl hover:bg-white/[.025]">
                              <span className="text-[8px] font-black uppercase tracking-[.08em] text-white/22">{zone.replace("-", " ")}</span>
                              <span className="mt-1 text-[10px] font-semibold text-white/50">{placementLabel(placement?.itemId)}</span>
                            </button>
                            {placement ? <button type="button" onClick={() => clearZone(zone)} className="mt-1 text-[8px] uppercase tracking-[.08em] text-red-100/35">clear</button> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="rounded-[20px] border border-white/[.055] bg-black/18 p-3">
                      <div className="text-[9px] font-black uppercase tracking-[.14em] text-white/28">Placement item</div>
                      <select value={selectedDecor} onChange={(event) => setSelectedDecor(event.target.value as KeeperDecorItemId)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#07110d] px-3 py-2 text-xs text-white/58 outline-none">
                        {unlockedDecor.map((item) => <option key={item.id} value={item.id}>{item.label} · {money(item.price)}</option>)}
                      </select>
                      <div className="mt-2 text-[10px] leading-5 text-white/28">Pick an item, then click any of the nine snap zones. This keeps cage building fast on desktop and mobile instead of turning the game into a 3D editor.</div>
                    </div>

                    <div className="mt-3 rounded-[20px] border border-white/[.055] bg-black/18 p-3">
                      <div className="text-[9px] font-black uppercase tracking-[.14em] text-white/28">Templates</div>
                      <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-white/[.07] bg-black/20 px-3 py-2 text-xs text-white/58 outline-none" />
                      <button type="button" onClick={saveTemplate} className="mt-2 w-full rounded-xl border border-emerald-300/12 bg-emerald-300/[.06] px-3 py-2 text-[10px] font-bold text-emerald-100/58">Save current setup</button>
                      <div className="mt-3 space-y-1.5">
                        {save.templates.filter((template) => template.enclosureId === selectedEnclosure.enclosureId).map((template) => (
                          <button key={template.id} type="button" onClick={() => applyTemplate(template.id)} className="w-full rounded-xl border border-white/[.05] bg-white/[.018] px-3 py-2 text-left text-[10px] text-white/42">Apply {template.name}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
