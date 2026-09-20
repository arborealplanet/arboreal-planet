# Snake Sorter Architecture

Snake Sorter is a private, owner-controlled visual identification system for Green Tree Python / Morelia taxon and locality analysis inside Arboreal Planet.

The design intentionally follows proven interaction and model patterns used by mature visual-identification systems such as iNaturalist/Seek, Pl@ntNet, and Merlin Photo ID, adapted for the unusual constraints of chondros: ontogenetic color change, subtle subspecies morphology, provisional locality labels, captive animals, and mixed/uncertain ancestry.

## Non-negotiable data rule

Scan media is analysis-only.

Photos, uploaded videos, recorded camera video, and live camera frames must never enter the reference or training dataset automatically.

Only media explicitly added to the reference library by the owner/admin may become training/reference material.

Owner confirmation or correction of a scan is feedback metadata only. It does not promote the scan media into training.

## Identification modes

### Quick Scan
Purpose: fast answer with a small amount of evidence.

- up to ~6 normalized evidence frames
- key video frames only
- taxon + confidence + alternatives
- nearest references when available
- conservative rejection remains enabled

### Deep Scan
Purpose: strongest available answer.

- up to ~24 normalized evidence frames
- multi-angle evidence
- richer video sampling
- view-aware weighting
- stage/color inference
- nearest-reference retrieval
- locality estimation
- weak provenance prior when explicitly supplied
- out-of-distribution detection
- biological consistency checks
- calibrated rejection

### Live Guide
Purpose: improve the evidence before classification.

- live exposure/brightness feedback
- contrast feedback
- sharpness/refocus feedback
- capture stills
- record video
- later: snake framing/visibility detector and requested-view guidance

Live Guide should help the owner acquire an identifiable observation rather than repeatedly sending low-quality frames to the classifier.

## Evidence model

One scan represents one snake.

Each image or sampled frame can carry a view label:

- auto
- full body
- head
- dorsal
- left lateral
- right lateral
- tail
- other

The model should eventually predict view type when set to auto.

Views are not equally informative. The aggregation layer should learn or configure view-specific weights by task and developmental stage.

## Developmental stages

Raw reference metadata preserves:

- hatchling
- neonate
- juvenile
- subadult
- adult
- unknown

Per-image stage overrides are supported so the same known individual can be represented longitudinally.

Per-image metadata can also contain:

- red/yellow juvenile phase
- capture date
- approximate age in days
- view type
- quality/review state

Whenever possible, known longitudinal images of the same animal should stay attached to one individual record.

## Model stack

### 1. Media quality gate

Estimate:

- exposure
- sharpness
- contrast
- snake visibility
- usable-frame count
- duplicate/near-duplicate frame rate

Poor evidence can trigger a request for better media before taxon classification.

### 2. Snake detection / segmentation

Locate the snake and generate:

- subject crop
- optional head crop
- optional body-pattern crop
- full-frame context representation

Background should be reduced as a shortcut while retaining enough context to avoid destructive crops.

### 3. Stage and color heads

Infer:

- developmental stage
- red/yellow/not-applicable/unknown phase

User-supplied stage/color hints can constrain or override these only when the owner intentionally provides them.

### 4. Shared visual encoder

A strong pretrained vision encoder should learn morphology across all developmental stages.

Adult, hatchling, neonate, juvenile, and subadult images all contribute to the shared representation.

Stage-specific classification heads keep adult appearance from overwhelming baby identification.

### 5. Stage-conditioned taxon classifier

Primary target classes:

- Morelia azurea azurea
- Morelia azurea pulcher
- Morelia azurea utaraensis
- Morelia viridis

The classifier should combine evidence across views rather than averaging raw single-image guesses blindly.

### 6. Reference embedding retrieval

Every accepted reference image may have model-version-specific embeddings.

Nearest-reference search must be versioned by encoder/model.

Results should prefer:

- same or similar stage
- same view type when useful
- accepted images
- approved animals

The output includes visually similar known individuals so the owner can compare the model's decision against real reference animals.

### 7. Context / provenance prior

Current physical GPS location is not useful for captive snakes.

An optional known provenance/locality hint may be supplied by the owner.

Examples:
- Jayapura
- Cyclops
- Wamena
- Biak
- Sorong

This prior is deliberately weak.

It may help break a close visual tie but must never override strong contradictory visual evidence.

Seller/locality labels remain provisional unless independently confirmed.

### 8. Biological consistency rules

Rules sit after the visual classifier rather than replacing it.

Example project rule:
- trusted red-neonate evidence conflicts with Morelia viridis neonate classification

Rules may:
- zero an impossible class
- flag a conflict
- reduce confidence
- force review

Rules must be versioned and auditable.

### 9. Calibration and rejection

Snake Sorter must be allowed to say:

- Unknown / review
- insufficient media
- low confidence
- low separation between top candidates
- out of distribution
- biological rule conflict

Useful confidence signals include:

- calibrated top-class probability
- top-two class margin
- entropy
- out-of-distribution score
- evidence quality score

A forced wrong answer is worse than a correct rejection.

### 10. Locality estimation

Locality is a separate downstream task.

Taxon/subspecies classification should not depend on forcing a locality answer.

Locality should only be returned when:
- taxon confidence is adequate
- the locality model has adequate training data
- locality confidence clears its own threshold

Otherwise the result should remain at the taxon level.

## Training data governance

Training material must be:

- owner-reviewed
- training eligible
- rights-reviewed
- image quality accepted
- assigned to train/validation/test at the individual-animal level

Exact duplicate files are blocked with SHA-256.

Near-duplicate detection should be added at the embedding level once embeddings exist.

## Splitting

All images of one individual snake stay in exactly one split.

Never randomly split photos from the same animal between train and test.

Preferred stratification dimensions:

- taxon
- developmental stage
- red/yellow phase
- locality where sufficiently populated

Longitudinal photos of one animal remain in the same split.

## Dataset snapshots

Every training run uses an immutable dataset snapshot.

The snapshot freezes:

- included individuals
- included images
- labels
- stage/color
- view type
- dataset split
- rights status
- review status
- manifest SHA-256

A trained model points back to the exact snapshot used to create it.

## Model registry

Lifecycle:

draft -> training -> evaluating -> candidate -> active -> retired

Failed is a terminal/diagnostic state.

Only one model may be active at a time.

Candidate promotion is explicit and owner-controlled.

Recorded model metadata should include:

- encoder
- architecture
- embedding dimension
- dataset snapshot
- training counts
- overall metrics
- per-class metrics
- confusion matrix
- calibration metrics
- rejection/OOD metrics
- notes

## Evaluation

The most important benchmark is unseen individual animals.

Metrics should be broken out by:

- taxon
- hatchling
- neonate
- juvenile
- adult
- red juvenile
- yellow juvenile
- locality when available
- image view
- Quick vs Deep Scan

Track:
- accuracy
- balanced accuracy
- macro F1
- per-class precision/recall
- confusion matrix
- calibration error
- rejection accuracy
- OOD performance

A model should not be promoted because of one aggregate accuracy number.

## Owner feedback

Completed scans may be:

- confirmed
- corrected
- uncertain
- marked insufficient media

Feedback records:
- analysis run
- active model version
- predicted result
- corrected result when supplied
- notes

Feedback does not automatically retrain the model.

It creates a review/evaluation queue that can guide the next curated dataset snapshot.

## Data collection priority

Because baby identification is a primary objective, collection should prioritize unique hatchling/neonate/juvenile individuals while still gathering adults.

High-value data:

1. many distinct individuals
2. multiple informative views per individual
3. red and yellow young animals
4. reliable taxon/locality provenance
5. longitudinal images of the same known animal across development
6. difficult/ambiguous examples
7. examples that visually mimic another taxon

Lots of nearly identical images of one animal should never substitute for population diversity.

## Future production inference

The Next.js application owns:
- auth
- scan UX
- preprocessing
- reference management
- analysis history
- feedback
- model registry

The heavy vision model should be deployable behind the stable Snake Sorter engine interface.

This allows the inference implementation to move between:
- dedicated Python service
- GPU service
- hosted inference endpoint
- optimized local/on-device model

without rewriting the Arboreal Planet UI or dataset system.
