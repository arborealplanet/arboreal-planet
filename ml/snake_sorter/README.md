# Snake Sorter ML

This package is the offline / GPU training and evaluation layer for Snake Sorter.

It is intentionally separate from the Next.js application. The web app owns capture, reference review, immutable dataset snapshots, model registry, and result display. This package turns a frozen Snake Sorter training manifest plus its downloaded media into a trained vision model.

## Default backbone

Primary default:

- `facebook/dinov3-vitb16-pretrain-lvd1689m`

Higher-capacity option:

- `facebook/dinov3-vitl16-pretrain-lvd1689m`

DINOv3 weights are gated by Meta's model terms on Hugging Face. The training machine must have authorized access to the chosen checkpoint.

The first production approach uses one shared visual encoder with three supervised heads:

- taxon
- developmental stage
- juvenile color phase

The normalized projection embedding is also exported for nearest-reference retrieval.

## Why this structure

Snake Sorter needs to distinguish subtle morphology while accounting for major ontogenetic changes. Adults, hatchlings, neonates, and juveniles therefore share one representation, but stage and color are modeled explicitly instead of being allowed to become hidden shortcuts.

The dataset split comes from Arboreal Planet and is assigned by individual animal. This package never randomly re-splits images.

## Expected manifest columns

Required:

- `animal_id`
- `storage_path`
- `taxon`
- `life_stage`
- `neonate_color`
- `dataset_split`

Optional per-image overrides:

- `life_stage_override`
- `neonate_color_override`
- `view_type`
- `is_primary`

The manifest should already contain only owner-approved, rights-reviewed, accepted training images.

## Media layout

Download the private reference images into a local root while preserving each manifest `storage_path`.

Example:

```
training-media/
  <animal uuid>/
    <image file>
```

Then run:

```bash
python train.py \
  --manifest snake-sorter-manifest.csv \
  --media-root training-media \
  --output runs/snake-sorter-v1
```

For a higher-capacity run:

```bash
python train.py \
  --manifest snake-sorter-manifest.csv \
  --media-root training-media \
  --encoder facebook/dinov3-vitl16-pretrain-lvd1689m \
  --output runs/snake-sorter-v1-large
```

Evaluate only on the held-out `test` individuals:

```bash
python evaluate.py \
  --manifest snake-sorter-manifest.csv \
  --media-root training-media \
  --checkpoint runs/snake-sorter-v1/best.pt
```

## Training stages

Early dataset:

1. freeze the backbone
2. train the projection + heads
3. measure class confusion and calibration
4. only unfreeze when the curated dataset is diverse enough

Later dataset:

1. start from the best frozen-backbone checkpoint
2. unfreeze the encoder with a much smaller learning rate
3. evaluate by unseen individual, stage, color, and locality
4. compare against the previous active model before promotion

Do not promote a model because of one overall accuracy number. Macro F1, per-class recall, stage-specific performance, confusion matrices, rejection behavior, and owner-confirmed scan errors all matter.


## Calibration, rejection and retrieval

After training, `evaluate.py` fits a temperature scalar using validation individuals only and reports calibration error on the untouched test individuals.

`inference.py` contains the shared multi-view aggregation and conservative rejection policy. It weights labeled head/dorsal/lateral evidence more strongly than weak/unknown views, aggregates normalized embeddings, and exposes low-confidence / low-margin / poor-evidence / out-of-distribution rejection reasons.

Use `export_embeddings.py` to create JSONL reference embeddings for a model version. These records are intended for the versioned `snake_sorter_reference_embeddings` table and nearest-reference search in Arboreal Planet.

The out-of-distribution threshold is intentionally a placeholder until we have a real validation population. It must be calibrated from held-out known snakes plus deliberately unrelated / mixed / low-quality examples before production use.


## Private inference service

`service.py` is the production-facing Python inference boundary. It accepts normalized still frames from the Next.js server, performs multi-view inference in memory, and returns the Snake Sorter result contract.

Required service environment:

- `SNAKE_SORTER_CHECKPOINT` — trained checkpoint path
- `SNAKE_SORTER_SERVICE_TOKEN` — private bearer token shared only with the Next.js server

Optional:

- `SNAKE_SORTER_REFERENCE_EMBEDDINGS` — JSONL produced by `export_embeddings.py`
- `SNAKE_SORTER_TEMPERATURE` — validation-fitted calibration temperature
- `SNAKE_SORTER_MODEL_VERSION` — registry version string

Arboreal Planet server environment:

- `SNAKE_SORTER_INFERENCE_URL`
- `SNAKE_SORTER_INFERENCE_TOKEN`

Scan frames are sent server-to-server for the request and are not written to disk by this service.


## Publishing a trained model

Large model files should not be uploaded through Vercel. `publish_model.py` packages the checkpoint, evaluation/calibration JSON, and optional reference embeddings into a `tar.gz`, computes its SHA-256, uploads it directly to the private `snake-sorter-models` bucket with Supabase resumable TUS upload, and inserts the corresponding model-registry row.

The publisher uses the owner's normal authenticated session token so Storage RLS remains enforced. Do not use a service-role key.

Required environment on the training machine:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_ACCESS_TOKEN=<owner access token>
```

Example:

```bash
python publish_model.py \
  --checkpoint runs/snake-sorter-v1/best.pt \
  --version v1.0.0 \
  --snapshot-id <immutable-snapshot-uuid> \
  --metrics-json runs/snake-sorter-v1/test-metrics.json \
  --calibration-json runs/snake-sorter-v1/calibration.json \
  --reference-embeddings runs/snake-sorter-v1/reference-embeddings.jsonl \
  --status candidate
```

Model promotion to `active` remains a separate owner action in Arboreal Planet.
