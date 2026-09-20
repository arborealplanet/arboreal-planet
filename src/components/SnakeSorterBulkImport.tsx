"use client";

import { useMemo, useState } from "react";

type ParsedRow = Record<string, string>;

type ImportAnimal = {
  animalCode: string;
  taxon: string;
  locality: string;
  lifeStage: string;
  neonateColor: string;
  labelConfidence: string;
  purityStatus: string;
  sourceType: string;
  sourceName: string;
  sourceUrl: string;
  splitGroup: string;
  notes: string;
  trainingEligible: boolean;
  challengeEligible: boolean;
  challengeExpectation: "reject" | "classify" | "review";
  rightsStatus: string;
  rightsNotes: string;
  images: Array<{ fileName: string; viewType: string }>;
};

const TAXA = new Set([
  "Morelia azurea azurea",
  "Morelia azurea pulcher",
  "Morelia azurea utaraensis",
  "Morelia viridis",
  "Unknown / review",
]);
const STAGES = new Set(["hatchling","neonate","juvenile","subadult","adult","unknown"]);
const COLORS = new Set(["red","yellow","not_applicable","unknown"]);
const CONFIDENCE = new Set(["confirmed","strong","provisional","uncertain"]);
const PURITY = new Set(["known_pure","believed_pure","possible_mixed","hybrid","unknown"]);
const SOURCES = new Set(["personal","breeder","listing","publication","other"]);
const RIGHTS = new Set(["owned_by_owner","permission_granted","private_reference_only","unknown"]);
const VIEWS = new Set(["unknown","full_body","head","dorsal","left_lateral","right_lateral","tail","other"]);

const field = "w-full rounded-xl border border-white/[.07] bg-black/15 px-3 py-2.5 text-xs text-white outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-white/[.07] file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-white/55";

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index++;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeBoolean(value: string, fallback = false) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return ["1","true","yes","y"].includes(normalized);
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

async function sha256File(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function downloadTemplate() {
  const headers = [
    "animal_code","file_name","view_type","taxon","locality","life_stage","neonate_color",
    "label_confidence","purity_status","source_type","source_name","source_url","split_group",
    "rights_status","rights_notes","training_eligible","challenge_eligible","challenge_expectation","notes"
  ];
  const example = [
    "ABB-001","abb-001-head.jpg","head","Morelia azurea utaraensis","Jayapura","neonate","red",
    "confirmed","known_pure","personal","Arboreals By Bunn","","",
    "owned_by_owner","","true","false","review","Known individual"
  ];
  const csv = [headers, example].map((row) => row.map((value) => `"${String(value).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "snake-sorter-reference-import-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SnakeSorterBulkImport({ onImported }: { onImported: () => Promise<void> | void }) {
  const [manifestName, setManifestName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState("");

  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const grouped = new Map<string, ImportAnimal>();

    if (!rows.length) errors.push("Choose a manifest CSV.");
    if (!files.length) errors.push("Choose the reference images for this batch.");

    const fileMap = new Map<string, File>();
    const duplicateSelectedNames = new Set<string>();
    for (const file of files) {
      if (fileMap.has(file.name)) duplicateSelectedNames.add(file.name);
      fileMap.set(file.name, file);
      if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
        errors.push(`${file.name}: unsupported image type.`);
      }
      if (file.size > 15 * 1024 * 1024) {
        errors.push(`${file.name}: exceeds the 15 MB image limit.`);
      }
    }
    if (duplicateSelectedNames.size) {
      errors.push(`Selected files contain duplicate file names: ${[...duplicateSelectedNames].slice(0,6).join(", ")}. Rename them uniquely before import.`);
    }

    const referencedFiles = new Set<string>();
    const required = ["animal_code","file_name","taxon","life_stage","neonate_color","label_confidence","purity_status","source_type","rights_status"];

    rows.forEach((row, index) => {
      const line = index + 2;
      for (const key of required) {
        if (!row[key]?.trim()) errors.push(`CSV line ${line}: missing ${key}.`);
      }

      const animalCode = row.animal_code?.trim();
      const fileName = row.file_name?.trim();
      if (!animalCode || !fileName) return;

      const file = fileMap.get(fileName);
      if (!file) errors.push(`CSV line ${line}: image "${fileName}" was not selected.`);
      if (referencedFiles.has(fileName)) errors.push(`CSV line ${line}: "${fileName}" is referenced more than once.`);
      referencedFiles.add(fileName);

      const taxon = row.taxon?.trim() || "";
      const lifeStage = row.life_stage?.trim() || "";
      const color = row.neonate_color?.trim() || "";
      const confidence = row.label_confidence?.trim() || "";
      const purity = row.purity_status?.trim() || "";
      const source = row.source_type?.trim() || "";
      const rights = row.rights_status?.trim() || "";
      const viewType = row.view_type?.trim() || "unknown";
      const challengeExpectation = (row.challenge_expectation?.trim() || "review") as "reject" | "classify" | "review";

      if (!TAXA.has(taxon)) errors.push(`CSV line ${line}: invalid taxon "${taxon}".`);
      if (!STAGES.has(lifeStage)) errors.push(`CSV line ${line}: invalid life_stage "${lifeStage}".`);
      if (!COLORS.has(color)) errors.push(`CSV line ${line}: invalid neonate_color "${color}".`);
      if (!CONFIDENCE.has(confidence)) errors.push(`CSV line ${line}: invalid label_confidence "${confidence}".`);
      if (!PURITY.has(purity)) errors.push(`CSV line ${line}: invalid purity_status "${purity}".`);
      if (!SOURCES.has(source)) errors.push(`CSV line ${line}: invalid source_type "${source}".`);
      if (!RIGHTS.has(rights)) errors.push(`CSV line ${line}: invalid rights_status "${rights}".`);
      if (!VIEWS.has(viewType)) errors.push(`CSV line ${line}: invalid view_type "${viewType}".`);
      if (!["reject","classify","review"].includes(challengeExpectation)) errors.push(`CSV line ${line}: invalid challenge_expectation "${challengeExpectation}".`);

      const candidate: ImportAnimal = {
        animalCode,
        taxon,
        locality: row.locality?.trim() || "",
        lifeStage,
        neonateColor: color,
        labelConfidence: confidence,
        purityStatus: purity,
        sourceType: source,
        sourceName: row.source_name?.trim() || "",
        sourceUrl: row.source_url?.trim() || "",
        splitGroup: row.split_group?.trim() || "",
        notes: row.notes?.trim() || "",
        trainingEligible: normalizeBoolean(row.training_eligible ?? "", true),
        challengeEligible: normalizeBoolean(row.challenge_eligible ?? "", false),
        challengeExpectation,
        rightsStatus: rights,
        rightsNotes: row.rights_notes?.trim() || "",
        images: [{ fileName, viewType }],
      };

      const existing = grouped.get(animalCode);
      if (!existing) {
        grouped.set(animalCode, candidate);
      } else {
        const comparableKeys: Array<keyof Omit<ImportAnimal, "images">> = [
          "taxon","locality","lifeStage","neonateColor","labelConfidence","purityStatus","sourceType",
          "sourceName","sourceUrl","splitGroup","notes","trainingEligible","challengeEligible",
          "challengeExpectation","rightsStatus","rightsNotes","animalCode"
        ];
        const conflict = comparableKeys.find((key) => existing[key] !== candidate[key]);
        if (conflict) {
          errors.push(`CSV line ${line}: animal ${animalCode} has conflicting ${String(conflict)} metadata across rows.`);
        } else {
          existing.images.push({ fileName, viewType });
        }
      }
    });

    for (const [animalCode, animal] of grouped) {
      if (animal.images.length > 12) errors.push(`${animalCode}: has ${animal.images.length} images; maximum is 12 per intake.`);
      if (animal.challengeEligible && animal.challengeExpectation === "review") {
        warnings.push(`${animalCode}: challenge role is enabled with Review-only expectation.`);
      }
      if (animal.trainingEligible && ["possible_mixed","hybrid","unknown"].includes(animal.purityStatus)) {
        warnings.push(`${animalCode}: marked training-eligible with ancestry "${animal.purityStatus}"; clean-supervision rules will exclude it later.`);
      }
    }

    const unusedFiles = files.filter((file) => !referencedFiles.has(file.name));
    if (unusedFiles.length) warnings.push(`${unusedFiles.length} selected image(s) are not referenced by the CSV and will not be imported.`);

    return {
      errors: [...new Set(errors)],
      warnings: [...new Set(warnings)],
      animals: [...grouped.values()],
      imageCount: [...grouped.values()].reduce((sum, animal) => sum + animal.images.length, 0),
    };
  }, [rows, files]);

  async function readManifest(file: File | undefined) {
    setParseError("");
    setResult("");
    setRows([]);
    setManifestName(file?.name ?? "");
    if (!file) return;

    try {
      const matrix = parseCsv(await file.text());
      if (matrix.length < 2) throw new Error("Manifest must contain a header row and at least one data row.");
      const headers = matrix[0].map(normalizeHeader);
      const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
      if (duplicates.length) throw new Error(`Duplicate CSV headers: ${[...new Set(duplicates)].join(", ")}`);

      const parsed = matrix.slice(1).map((cells) => {
        const row: ParsedRow = {};
        headers.forEach((header, index) => { row[header] = (cells[index] ?? "").trim(); });
        return row;
      });
      setRows(parsed);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Could not parse manifest CSV.");
    }
  }

  async function importBatch() {
    if (validation.errors.length || !validation.animals.length) return;
    setImporting(true);
    setResult("");

    const referencedNames = new Set(
      validation.animals.flatMap((animal) => animal.images.map((image) => image.fileName))
    );
    const referencedFiles = files.filter((file) => referencedNames.has(file.name));

    const hashes: Array<{ name: string; sha256: string }> = [];
    try {
      for (let index = 0; index < referencedFiles.length; index++) {
        setProgress(`Hashing ${index + 1} of ${referencedFiles.length}: ${referencedFiles[index].name}`);
        hashes.push({
          name: referencedFiles[index].name,
          sha256: await sha256File(referencedFiles[index]),
        });
      }

      setProgress("Checking existing Snake Sorter references…");
      const preflightResponse = await fetch("/api/snake-sorter/references/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animal_codes: validation.animals.map((animal) => animal.animalCode),
          files: hashes,
        }),
      });
      const preflight = await preflightResponse.json().catch(() => ({}));
      if (!preflightResponse.ok) {
        setProgress("");
        setImporting(false);
        setResult(preflight.error ?? "Could not complete server preflight.");
        return;
      }

      const existingCodes = Array.isArray(preflight.existing_animal_codes)
        ? preflight.existing_animal_codes as string[]
        : [];
      const duplicateExisting = Array.isArray(preflight.duplicate_existing_files)
        ? preflight.duplicate_existing_files as Array<{ selected_names?: string[] }>
        : [];
      const duplicateBatch = Array.isArray(preflight.duplicate_within_batch)
        ? preflight.duplicate_within_batch as Array<{ names?: string[] }>
        : [];

      if (existingCodes.length || duplicateExisting.length || duplicateBatch.length) {
        const problems: string[] = [];
        if (existingCodes.length) problems.push(`existing animal code(s): ${existingCodes.slice(0,8).join(", ")}`);
        if (duplicateExisting.length) {
          const names = duplicateExisting.flatMap((item) => item.selected_names ?? []);
          problems.push(`image(s) already in the library: ${names.slice(0,8).join(", ")}`);
        }
        if (duplicateBatch.length) {
          const names = duplicateBatch.flatMap((item) => item.names ?? []);
          problems.push(`duplicate image content within this batch: ${names.slice(0,8).join(", ")}`);
        }
        setProgress("");
        setImporting(false);
        setResult(`Preflight blocked the import — ${problems.join("; ")}. Nothing was written.`);
        return;
      }
    } catch (error) {
      setProgress("");
      setImporting(false);
      setResult(error instanceof Error ? error.message : "Bulk import preflight failed.");
      return;
    }

    let importedAnimals = 0;
    let importedImages = 0;
    let duplicateImages = 0;
    const failures: string[] = [];
    const fileMap = new Map(files.map((file) => [file.name, file]));

    for (let index = 0; index < validation.animals.length; index++) {
      const animal = validation.animals[index];
      setProgress(`Importing ${index + 1} of ${validation.animals.length}: ${animal.animalCode}`);

      const form = new FormData();
      form.set("animal_code", animal.animalCode);
      form.set("taxon", animal.taxon);
      form.set("locality", animal.locality);
      form.set("life_stage", animal.lifeStage);
      form.set("neonate_color", animal.neonateColor);
      form.set("label_confidence", animal.labelConfidence);
      form.set("purity_status", animal.purityStatus);
      form.set("source_type", animal.sourceType);
      form.set("source_name", animal.sourceName);
      form.set("source_url", animal.sourceUrl);
      form.set("split_group", animal.splitGroup);
      form.set("notes", animal.notes);
      form.set("training_eligible", String(animal.trainingEligible));
      form.set("challenge_eligible", String(animal.challengeEligible));
      form.set("challenge_expectation", animal.challengeExpectation);
      form.set("rights_status", animal.rightsStatus);
      form.set("rights_notes", animal.rightsNotes);

      for (const image of animal.images) {
        const file = fileMap.get(image.fileName);
        if (!file) continue;
        form.append("images", file, file.name);
        form.append("image_view", image.viewType);
      }

      const response = await fetch("/api/snake-sorter/references", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        failures.push(`${animal.animalCode}: ${data.error ?? "import failed"}`);
        break;
      }

      importedAnimals++;
      importedImages += Number(data.uploaded ?? 0);
      duplicateImages += Array.isArray(data.duplicates) ? data.duplicates.length : 0;
      if (Array.isArray(data.failed) && data.failed.length) {
        failures.push(`${animal.animalCode}: ${data.failed.length} image(s) failed upload`);
        break;
      }
    }

    setProgress("");
    setImporting(false);
    if (importedAnimals) await onImported();

    const summary = `Imported ${importedAnimals} animal(s) and ${importedImages} image(s)${duplicateImages ? `; skipped ${duplicateImages} exact duplicate image(s)` : ""}.`;
    setResult(failures.length ? `${summary} Stopped: ${failures[0]}` : summary);
  }

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Bulk reference intake</div>
          <h2 className="mt-2 text-2xl font-semibold">Import known animals from a manifest</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/30">One CSV row equals one image. Reuse the same animal_code across rows to attach several views to the same individual. Nothing is written until you explicitly start the import.</p>
        </div>
        <button type="button" onClick={downloadTemplate} className="rounded-xl border border-white/[.08] bg-white/[.025] px-3 py-2 text-[10px] font-black text-white/45 hover:text-white/65">Download CSV template</button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Manifest CSV
          <input type="file" accept=".csv,text/csv" onChange={(event) => void readManifest(event.target.files?.[0])} className={`${field} mt-2`} />
        </label>
        <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Reference images
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setResult(""); }} className={`${field} mt-2`} />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Manifest", manifestName || "—"],
          ["CSV rows", rows.length],
          ["Individuals", validation.animals.length],
          ["Referenced images", validation.imageCount],
        ].map(([name,value]) => (
          <div key={String(name)} className="rounded-2xl border border-white/[.055] bg-black/[.06] p-3">
            <div className="text-[8px] font-black uppercase tracking-[.08em] text-white/18">{name}</div>
            <div className="mt-1 truncate text-xs font-semibold text-white/48">{value}</div>
          </div>
        ))}
      </div>

      {parseError && <div className="mt-4 rounded-xl border border-rose-300/12 bg-rose-300/[.03] px-3 py-2 text-[10px] text-rose-100/55">{parseError}</div>}

      {validation.errors.length > 0 && (
        <div className="mt-4 rounded-2xl border border-rose-300/12 bg-rose-300/[.025] p-4">
          <div className="text-[9px] font-black uppercase tracking-[.1em] text-rose-100/55">Fix before import</div>
          <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">{validation.errors.slice(0,40).map((item) => <div key={item} className="text-[10px] leading-4 text-rose-50/45">• {item}</div>)}</div>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-300/10 bg-amber-300/[.02] p-4">
          <div className="text-[9px] font-black uppercase tracking-[.1em] text-amber-100/50">Review warnings</div>
          <div className="mt-2 space-y-1">{validation.warnings.slice(0,20).map((item) => <div key={item} className="text-[10px] leading-4 text-amber-50/40">• {item}</div>)}</div>
        </div>
      )}

      {!validation.errors.length && validation.animals.length > 0 && (
        <div className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.02] p-4">
          <div className="text-[9px] font-black uppercase tracking-[.1em] text-emerald-100/50">Validated batch</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {validation.animals.slice(0,12).map((animal) => (
              <div key={animal.animalCode} className="rounded-xl border border-white/[.05] bg-black/[.05] px-3 py-2">
                <div className="truncate text-[10px] font-semibold text-white/46">{animal.animalCode}</div>
                <div className="mt-1 truncate text-[9px] text-white/22">{animal.taxon} · {animal.images.length} image{animal.images.length === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>
          {validation.animals.length > 12 && <div className="mt-2 text-[9px] text-white/18">+ {validation.animals.length - 12} more individual animals</div>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={importing || validation.errors.length > 0 || validation.animals.length === 0} onClick={() => void importBatch()} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-[10px] font-black text-[#06100c] disabled:cursor-not-allowed disabled:opacity-35">{importing ? "Importing…" : "Import validated batch"}</button>
        {progress && <span className="text-[10px] text-white/30">{progress}</span>}
        {result && <span className="text-[10px] text-white/38">{result}</span>}
      </div>

      <div className="mt-4 rounded-xl border border-white/[.05] bg-black/[.04] px-3 py-2 text-[9px] leading-4 text-white/20">
        Before the first write, the browser hashes every referenced image and the server checks the batch against existing animal codes and image hashes. After a clean preflight, the import runs one individual at a time through the normal owner-only reference endpoint and stops on the first failure.
      </div>
    </section>
  );
}
