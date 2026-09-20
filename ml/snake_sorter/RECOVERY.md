# Snake Sorter recovery runbook

Backups are created with the owner's normal authenticated Supabase session. No service-role key is required.

## Create and verify a backup

```bash
python backup_project.py --output backups/snake-sorter-YYYY-MM-DD
python verify_backup.py --backup backups/snake-sorter-YYYY-MM-DD
```

Required environment:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ACCESS_TOKEN`

The backup includes Snake Sorter metadata plus the private reference and model buckets unless `--skip-storage` is used.

## Recovery order

Recover into an empty replacement project or a verified empty Snake Sorter schema rather than overwriting a healthy production database.

1. Verify `backup-manifest.json`.
2. Restore private Storage objects.
3. Restore reference animals.
4. Restore reference media.
5. Restore dataset snapshots as building/unfinalized records, restore their items, then finalize through the normal snapshot-finalization path.
6. Restore model registry rows and model artifacts.
7. Restore model-versioned reference embeddings.
8. Restore analysis history and owner feedback last.
9. Run Supabase security and performance advisors.
10. Verify the active model artifact SHA-256, classifier snapshot hash, optional challenge snapshot hash, reference-vector count, and inference-service registry UUID before accepting scans.

Snapshot immutability, RLS, owner checks, and scan-media separation remain part of recovery. Raw scan evidence is not expected in backups because Snake Sorter does not persist it.
