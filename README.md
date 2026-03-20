# DDSP Car Sound Evaluation

This app runs a two-stage listening test on Vercel + Supabase.

- Stage 1: Application of Engine Order
- Stage 2: Model Architecture
- Stage 1: 16 fixed items, 5 shuffled candidates per item plus Ground Truth
- Stage 2: 16 fixed items, 7 shuffled candidates per item plus Ground Truth
- Rating method: 0 to 100 sliders
- Ground Truth is shown at the top of every item
- Candidate order is shuffled per session so participants cannot identify the method directly
- The underlying source items are fixed across all participants

## Current config

The fixed stage setup is defined in:

- [`lib/evaluation-config.js`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/lib/evaluation-config.js)

Important defaults:

- Fixed source item IDs: `035, 179, 178, 010, 009, 057, 080, 074, 050, 068, 031, 089, 039, 172, 102, 132`
- `AUDIO_ROOT = "/samples/aes-selected"`

Current candidate IDs:

- Stage 1: `reference_test`, `c2_direct`, `c1_direct`, `c2_encoder`, `c1_encoder`
- Stage 2: `reference_test`, `c1_direct_rpm`, `c1_encoder_rpm`, `c1_direct_rpm_pedal_gear`, `c1_encoder_rpm_pedal_gear`, `c1_direct_full`, `c1_encoder_full`

The current item set was sampled once from the shared TestA/TestB `processed/selected/16kHz` pool and is now fixed for every participant.

## Vercel + Supabase setup

- Vercel project name: `ddsp-carsound-eval`
- Suggested Vercel URL: `https://ddsp-carsound-eval.vercel.app`
- GitHub repo: `https://github.com/dabinkim0/ddsp-carsound-eval.git`
- Production branch: `main`

## 1. Create the Supabase project

In the Supabase dashboard:

1. Create a new project.
2. Choose a region close to your expected participants.
3. Wait for the database to finish provisioning.
4. Open `SQL Editor`.

If this is a fresh project, run:

- [`migrations/0001_init.sql`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/migrations/0001_init.sql)

If this project already used the older AB-style schema, run:

- [`migrations/0002_stage_mushra.sql`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/migrations/0002_stage_mushra.sql)

If this project already uses the stage-based schema and you only need the corrected admin aggregation, run:

- [`migrations/0003_group_admin_stats_by_candidate.sql`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/migrations/0003_group_admin_stats_by_candidate.sql)

After Supabase is ready, copy:

1. `Project URL`
2. `service_role` key or the current elevated secret key

Use them as:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2. Create the Vercel project

In the Vercel dashboard:

1. Click `Add New... > Project`.
2. Import `dabinkim0/ddsp-carsound-eval`.
3. Keep the root directory as `/`.
4. Framework preset: `Other`.
5. Build command: leave empty.
6. Output directory: leave empty.
7. Install command: `npm install`.

## 3. Add environment variables to Vercel

Add these in `Project Settings > Environment Variables`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_TOKEN`

Generate `ADMIN_TOKEN` locally if needed:

```bash
openssl rand -hex 32
```

After saving the variables, redeploy once so the server picks them up.

## 4. Local development

```bash
cd ddsp-carsound-eval
cp .env.example .env.local
npx vercel dev
```

## 5. Audio sync

The deployed app serves a fixed 16-item subset copied from `AES_ListeningTestset_v0`.

- Source dataset root: [`/Users/dabinkim/Desktop/Research Projects/2026_DDSPCarSound/AES_ListeningTestset_v0`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/AES_ListeningTestset_v0)
- Target asset root: [`public/samples/aes-selected`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/public/samples/aes-selected)
- Sync script: [`scripts/sync_aes_selected_audio.py`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/scripts/sync_aes_selected_audio.py)
- Layout reference: [`public/samples/aes-selected/README.md`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/public/samples/aes-selected/README.md)

To refresh the copied audio from the dataset:

```bash
cd ddsp-carsound-eval
npm run sync:aes-audio
```

## Routes

- `/`: participant-facing listening test
- `/admin.html`: admin dashboard
- `/api/start`: create a participant session and stage payload
- `/api/respond`: save ratings for one item
- `/api/complete`: mark a session as completed
- `/api/admin/summary`: dashboard summary
- `/api/admin/trials`: per-item candidate score statistics

## Notes

- Participant name and email are stored in Supabase.
- The admin per-item table is aggregated by `candidate_id`, not shuffled slot number.
- `admin.html` expects `ADMIN_TOKEN` and stores the entered token in browser local storage.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Vercel server-side environment variables.
