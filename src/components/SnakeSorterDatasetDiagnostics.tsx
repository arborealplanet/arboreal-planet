"use client";

import { useEffect, useMemo, useState } from "react";
import type { SnakeReferenceAnimal, SnakeReferenceMedia } from "@/components/SnakeSorterReferenceManager";

type Need = {
  locality: string;
  bucket: "red neonate" | "yellow neonate" | "juvenile/subadult" | "adult";
  animals: number;
  images: number;
  candidates: number;
  priority: number;
};

type AcquisitionCandidate = {
  id: string;
  provisional_locality?: string | null;
  locality_raw?: string | null;
  life_stage_hint?: string | null;
  neonate_color_hint?: string | null;
  review_status?: string | null;
  exclusion_reason?: string | null;
};

const localityRules: Array<{
  locality: string;
  redNeonate: boolean;
  yellowNeonate: boolean;
}> = [
  { locality: "Jayapura", redNeonate: true, yellowNeonate: true },
  { locality: "Cyclops", redNeonate: true, yellowNeonate: true },
  { locality: "Lereh", redNeonate: true, yellowNeonate: true },
  { locality: "Sorong", redNeonate: true, yellowNeonate: true },
  { locality: "Timika", redNeonate: true, yellowNeonate: true },
  { locality: "Manokwari", redNeonate: true, yellowNeonate: true },
  { locality: "Arfak", redNeonate: true, yellowNeonate: true },
  { locality: "Kofiau", redNeonate: false, yellowNeonate: true },
  { locality: "Yapen", redNeonate: true, yellowNeonate: true },
  { locality: "Wamena", redNeonate: true, yellowNeonate: true },
  { locality: "Aru", redNeonate: false, yellowNeonate: true },
  { locality: "Merauke", redNeonate: false, yellowNeonate: true },
  { locality: "Biak", redNeonate: false, yellowNeonate: true },
  { locality: "Numfor", redNeonate: true, yellowNeonate: true },
];

function canonical(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export function SnakeSorterDatasetDiagnostics({
  animals,
  media,
  onOpenCandidates,
  onOpenReferences,
  onRefreshReferences,
}: {
  animals: SnakeReferenceAnimal[];
  media: SnakeReferenceMedia[];
  onOpenCandidates?: () => void;
  onOpenReferences?: () => void;
  onRefreshReferences?: () => Promise<void> | void;
}) {
  const [candidates, setCandidates] = useState<AcquisitionCandidate[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/snake-sorter/acquisition", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled && data) setCandidates(data.candidates ?? []);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const diagnostics = useMemo(() => {
    const mediaCount = new Map<string, number>();
    for (const item of media) {
      mediaCount.set(item.animal_id, (mediaCount.get(item.animal_id) ?? 0) + 1);
    }

    const approved = animals.filter((animal) => (animal.review_status ?? "pending") === "approved");
    const trainReady = approved.filter((animal) =>
      animal.training_eligible &&
      ["confirmed", "strong"].includes(animal.label_confidence) &&
      ["known_pure", "believed_pure"].includes(animal.purity_status) &&
      ["owned_by_owner", "permission_granted", "open_license"].includes(animal.rights_status ?? "unknown") &&
      !animal.challenge_eligible
    );

    const needs: Need[] = [];
    const usableCandidates = candidates.filter((candidate) =>
      !candidate.exclusion_reason &&
      ["pending", "approved", "permission_required"].includes(candidate.review_status ?? "pending")
    );

    for (const rule of localityRules) {
      const local = approved.filter((animal) => canonical(animal.locality) === canonical(rule.locality));
      const localCandidates = usableCandidates.filter((candidate) =>
        canonical(candidate.provisional_locality || candidate.locality_raw) === canonical(rule.locality)
      );

      const candidateBucketCount = (bucket: Need["bucket"]) => localCandidates.filter((candidate) => {
        const stage = candidate.life_stage_hint ?? "unknown";
        const color = candidate.neonate_color_hint ?? "unknown";
        if (bucket === "red neonate") return ["hatchling", "neonate"].includes(stage) && color === "red";
        if (bucket === "yellow neonate") return ["hatchling", "neonate"].includes(stage) && color === "yellow";
        if (bucket === "juvenile/subadult") return ["juvenile", "subadult"].includes(stage);
        return stage === "adult";
      }).length;

      const addNeed = (bucket: Need["bucket"], matches: SnakeReferenceAnimal[]) => {
        const count = matches.length;
        const images = matches.reduce((sum, animal) => sum + (mediaCount.get(animal.id) ?? 0), 0);
        const candidateCount = candidateBucketCount(bucket);
        // Missing reference coverage is highest priority. Existing candidates reduce the acquisition urgency
        // because the gap may be solved by review rather than searching for a new animal.
        const priority =
          (count === 0 ? 1000 : Math.max(0, 300 - count * 60)) +
          Math.max(0, 80 - images * 10) -
          Math.min(250, candidateCount * 50);
        needs.push({ locality: rule.locality, bucket, animals: count, images, candidates: candidateCount, priority });
      };

      if (rule.redNeonate) {
        addNeed(
          "red neonate",
          local.filter((animal) =>
            ["hatchling", "neonate"].includes(animal.life_stage) &&
            animal.neonate_color === "red"
          ),
        );
      }

      if (rule.yellowNeonate) {
        addNeed(
          "yellow neonate",
          local.filter((animal) =>
            ["hatchling", "neonate"].includes(animal.life_stage) &&
            animal.neonate_color === "yellow"
          ),
        );
      }

      addNeed(
        "juvenile/subadult",
        local.filter((animal) => ["juvenile", "subadult"].includes(animal.life_stage)),
      );
      addNeed(
        "adult",
        local.filter((animal) => animal.life_stage === "adult"),
      );
    }

    const topNeeds = [...needs]
      .sort((a, b) => b.priority - a.priority || a.animals - b.animals || a.locality.localeCompare(b.locality))
      .slice(0, 18);

    const taxonCounts = new Map<string, number>();
    const localityCounts = new Map<string, number>();
    const colorCounts = new Map<string, number>();
    const stageCounts = new Map<string, number>();

    for (const animal of approved) {
      taxonCounts.set(animal.taxon, (taxonCounts.get(animal.taxon) ?? 0) + 1);
      localityCounts.set(animal.locality || "Unknown", (localityCounts.get(animal.locality || "Unknown") ?? 0) + 1);
      colorCounts.set(animal.neonate_color, (colorCounts.get(animal.neonate_color) ?? 0) + 1);
      stageCounts.set(animal.life_stage, (stageCounts.get(animal.life_stage) ?? 0) + 1);
    }

    const imageTotal = approved.reduce((sum, animal) => sum + (mediaCount.get(animal.id) ?? 0), 0);
    const multiImageAnimals = approved.filter((animal) => (mediaCount.get(animal.id) ?? 0) >= 2).length;
    const unassignedTrainReady = trainReady.filter((animal) => !animal.dataset_split || animal.dataset_split === "unassigned").length;

    const classifierTaxa = [
      "Morelia azurea azurea",
      "Morelia azurea pulcher",
      "Morelia azurea utaraensis",
      "Morelia viridis",
    ];
    const splitCoverage = classifierTaxa.map((taxon) => {
      const taxonAnimals = trainReady.filter((animal) => animal.taxon === taxon);
      const counts = {
        train: taxonAnimals.filter((animal) => animal.dataset_split === "train").length,
        validation: taxonAnimals.filter((animal) => animal.dataset_split === "validation").length,
        test: taxonAnimals.filter((animal) => animal.dataset_split === "test").length,
        unassigned: taxonAnimals.filter((animal) => !animal.dataset_split || animal.dataset_split === "unassigned").length,
      };
      return { taxon, ...counts, total: taxonAnimals.length };
    });

    const missingEvalTaxa = splitCoverage.filter((row) =>
      row.total > 0 && (row.validation === 0 || row.test === 0)
    );

    const groups = new Map<string, Set<string>>();
    for (const animal of trainReady) {
      const group = String(animal.split_group ?? "").trim();
      const split = String(animal.dataset_split ?? "unassigned");
      if (!group) continue;
      const set = groups.get(group) ?? new Set<string>();
      set.add(split);
      groups.set(group, set);
    }
    const leakingGroups = [...groups.entries()]
      .filter(([, splits]) => splits.size > 1)
      .map(([group, splits]) => ({ group, splits: [...splits] }));

    return {
      approved,
      trainReady,
      needs,
      topNeeds,
      taxonCounts,
      localityCounts,
      colorCounts,
      stageCounts,
      imageTotal,
      multiImageAnimals,
      unassignedTrainReady,
      usableCandidateCount: usableCandidates.length,
      splitCoverage,
      missingEvalTaxa,
      leakingGroups,
    };
  }, [animals, media, candidates]);

  const coverageBuckets = diagnostics.needs.length;
  const filledBuckets = diagnostics.needs.filter((item) => item.animals > 0).length;
  const zeroBuckets = coverageBuckets - filledBuckets;
  const coveragePercent = coverageBuckets ? Math.round((filledBuckets / coverageBuckets) * 100) : 0;

  const nextAction =
    diagnostics.approved.length === 0 && diagnostics.usableCandidateCount > 0
      ? { title: "Review existing candidates", detail: "You already have candidates waiting. Promote trustworthy animals before searching for more.", action: "Open candidates", run: onOpenCandidates }
      : diagnostics.approved.length === 0
        ? { title: "Build the first reference set", detail: "No approved reference animals exist yet. Add or harvest a small, trustworthy starter set first.", action: "Open candidates", run: onOpenCandidates }
        : diagnostics.trainReady.length === 0
          ? { title: "Strengthen reference records", detail: "Approved animals exist, but none currently pass the training gate. Review labels, provenance, purity, rights, and challenge status.", action: "Open references", run: onOpenReferences }
          : diagnostics.unassignedTrainReady > 0
            ? { title: "Assign dataset splits", detail: `${diagnostics.unassignedTrainReady} training-ready animal(s) still need train/validation/test assignment.`, action: "Assign splits now", run: undefined }
            : zeroBuckets > 0
              ? { title: "Fill the highest-value gaps", detail: `${zeroBuckets} expected locality/stage/color bucket(s) still have no approved animal.`, action: "Open candidates", run: onOpenCandidates }
              : { title: "Dataset structure looks ready", detail: "Coverage targets are populated and training-ready animals are split. You can move toward a frozen classifier snapshot when the counts are large enough.", action: "Open references", run: onOpenReferences };

  async function assignSplits() {
    setBusy("splits");
    setMessage("");
    const response = await fetch("/api/snake-sorter/splits", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not assign dataset splits.");
      setBusy("");
      return;
    }
    setMessage(`Dataset splits assigned. ${data.changed ?? 0} record(s) changed.`);
    await onRefreshReferences?.();
    setBusy("");
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {[
          ["Approved animals", diagnostics.approved.length],
          ["Training-ready", diagnostics.trainReady.length],
          ["Reference images", diagnostics.imageTotal],
          ["Usable candidates", diagnostics.usableCandidateCount],
          ["Coverage", `${coveragePercent}%`],
          ["Zero-coverage buckets", zeroBuckets],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-[20px] border border-white/[.06] bg-black/[.08] p-4">
            <div className="text-2xl font-semibold text-white/68">{value}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.09em] text-white/22">{label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-[24px] border border-emerald-300/10 bg-emerald-300/[.018] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-100/45">Suggested next action</div>
            <div className="mt-2 text-sm font-semibold text-white/65">{nextAction.title}</div>
            <div className="mt-1 max-w-3xl text-[10px] leading-5 text-white/28">{nextAction.detail}</div>
          </div>
          <button
            type="button"
            disabled={busy === "splits" || (!nextAction.run && diagnostics.unassignedTrainReady === 0)}
            onClick={() => {
              if (diagnostics.unassignedTrainReady > 0 && nextAction.action === "Assign splits now") void assignSplits();
              else nextAction.run?.();
            }}
            className="rounded-xl border border-emerald-300/12 bg-emerald-300/[.03] px-4 py-2 text-[9px] font-black text-emerald-100/55 disabled:opacity-35"
          >
            {busy === "splits" ? "Assigning…" : nextAction.action}
          </button>
        </div>
        {message && <div className="mt-3 text-[9px] leading-4 text-white/30">{message}</div>}
      </section>

      <section className="rounded-[24px] border border-amber-300/10 bg-amber-300/[.018] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.12em] text-amber-100/45">Priority acquisition needs</div>
            <div className="mt-1 text-xs leading-5 text-white/28">
              Animals are counted first; extra photos help but do not substitute for independent individuals. Existing candidates are shown separately so we can review what we already have before hunting for more.
            </div>
          </div>
          <div className="rounded-full border border-white/[.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.08em] text-white/28">
            {zeroBuckets} completely empty buckets
          </div>
        </div>

        {diagnostics.topNeeds.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {diagnostics.topNeeds.map((need) => {
              const empty = need.animals === 0;
              return (
                <div
                  key={`${need.locality}-${need.bucket}`}
                  className={`rounded-2xl border p-3 ${empty ? "border-rose-300/12 bg-rose-300/[.025]" : "border-white/[.06] bg-black/[.05]"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white/65">{need.locality}</div>
                      <div className="mt-0.5 text-[9px] uppercase tracking-[.07em] text-white/28">{need.bucket}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase ${empty ? "border-rose-300/12 text-rose-100/55" : "border-white/[.06] text-white/28"}`}>
                      {empty ? "Missing" : `${need.animals} animal${need.animals === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-white/22">
                    <span>{need.images} associated image(s)</span>
                    <span>{need.candidates} candidate(s) in review pool</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-white/[.07] p-7 text-center text-xs text-white/24">
            No diagnostic targets available yet.
          </div>
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Distribution title="Approved animals by taxon" values={diagnostics.taxonCounts} />
        <Distribution title="Approved animals by locality" values={diagnostics.localityCounts} />
        <Distribution title="Approved animals by life stage" values={diagnostics.stageCounts} />
        <Distribution title="Approved animals by neonate color" values={diagnostics.colorCounts} />
      </section>

      <section className="rounded-[24px] border border-violet-300/10 bg-violet-300/[.018] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.12em] text-violet-100/45">Train / validation / test coverage</div>
            <div className="mt-1 text-[10px] leading-5 text-white/24">Each classifier taxon should eventually be represented in validation and test, not only train.</div>
          </div>
          <div className="rounded-full border border-white/[.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.08em] text-white/28">
            {diagnostics.missingEvalTaxa.length} taxon gap(s)
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[9px]">
            <thead className="text-white/22">
              <tr>
                <th className="pb-2 pr-3 font-black uppercase tracking-[.07em]">Taxon</th>
                <th className="pb-2 px-3 font-black uppercase tracking-[.07em]">Train</th>
                <th className="pb-2 px-3 font-black uppercase tracking-[.07em]">Validation</th>
                <th className="pb-2 px-3 font-black uppercase tracking-[.07em]">Test</th>
                <th className="pb-2 pl-3 font-black uppercase tracking-[.07em]">Unassigned</th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.splitCoverage.map((row) => (
                <tr key={row.taxon} className="border-t border-white/[.04] text-white/38">
                  <td className="py-2 pr-3">{row.taxon}</td>
                  <td className="px-3 py-2">{row.train}</td>
                  <td className={`px-3 py-2 ${row.total > 0 && row.validation === 0 ? "text-amber-100/65" : ""}`}>{row.validation}</td>
                  <td className={`px-3 py-2 ${row.total > 0 && row.test === 0 ? "text-amber-100/65" : ""}`}>{row.test}</td>
                  <td className={`pl-3 py-2 ${row.unassigned > 0 ? "text-amber-100/65" : ""}`}>{row.unassigned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {diagnostics.leakingGroups.length > 0 && (
          <div className="mt-3 rounded-xl border border-rose-300/12 bg-rose-300/[.025] px-3 py-2 text-[9px] leading-4 text-rose-100/50">
            Related-group leakage detected in {diagnostics.leakingGroups.length} split group(s). Re-run split assignment or correct those groups before snapshotting.
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-sky-300/10 bg-sky-300/[.018] p-4">
        <div className="text-[9px] font-black uppercase tracking-[.12em] text-sky-100/45">Dataset integrity checks</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Integrity label="Animals with 2+ images" value={diagnostics.multiImageAnimals} okay={diagnostics.multiImageAnimals > 0 || diagnostics.approved.length === 0} />
          <Integrity label="Training-ready unassigned split" value={diagnostics.unassignedTrainReady} okay={diagnostics.unassignedTrainReady === 0} />
          <Integrity label="Approved but not training-ready" value={Math.max(0, diagnostics.approved.length - diagnostics.trainReady.length)} okay={diagnostics.approved.length === diagnostics.trainReady.length || diagnostics.approved.length === 0} />
          <Integrity label="Challenge/OOD examples" value={diagnostics.approved.filter((animal) => animal.challenge_eligible).length} okay />
          <Integrity label="Related-group split leaks" value={diagnostics.leakingGroups.length} okay={diagnostics.leakingGroups.length === 0} />
          <Integrity label="Taxa missing val/test" value={diagnostics.missingEvalTaxa.length} okay={diagnostics.missingEvalTaxa.length === 0} />
        </div>
      </section>
    </div>
  );
}

function Distribution({ title, values }: { title: string; values: Map<string, number> }) {
  const rows = [...values.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const max = Math.max(1, ...rows.map(([, count]) => count));

  return (
    <div className="rounded-[24px] border border-white/[.06] bg-black/[.06] p-4">
      <div className="text-[9px] font-black uppercase tracking-[.11em] text-white/32">{title}</div>
      {rows.length ? (
        <div className="mt-3 space-y-2">
          {rows.slice(0, 14).map(([label, count]) => (
            <div key={label}>
              <div className="flex items-center justify-between gap-3 text-[9px] text-white/34">
                <span className="truncate">{label}</span>
                <span>{count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[.05]">
                <div className="h-full rounded-full bg-emerald-300/35" style={{ width: `${Math.max(4, (count / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-white/[.06] p-5 text-center text-[10px] text-white/20">
          No approved reference animals yet.
        </div>
      )}
    </div>
  );
}

function Integrity({ label, value, okay }: { label: string; value: number; okay: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[.055] bg-black/[.05] p-3">
      <div className={`text-xl font-semibold ${okay ? "text-emerald-100/65" : "text-amber-100/65"}`}>{value}</div>
      <div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-white/24">{label}</div>
    </div>
  );
}
