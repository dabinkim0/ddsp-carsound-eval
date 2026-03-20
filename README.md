# DDSP Car Sound Evaluation

This app runs a two-stage listening test on Vercel + Supabase.

- Stage 1: Comparative Study on the Application of Engine Order
- Stage 2: Comparative Study on the Model Architecture
- Stage 1: 12 items, 4 shuffled candidates per item plus Ground Truth
- Stage 2: 12 items, 6 shuffled candidates per item plus Ground Truth
- Rating method: 0 to 100 MUSHRA-style sliders
- Ground Truth is shown at the top of every item
- Candidate order is shuffled per session so participants cannot identify the method directly
- Audio playback is currently disabled by config until the final files are placed in the template directory

## Current config

The current stage template is defined in:

- [`lib/evaluation-config.js`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/lib/evaluation-config.js)

Important defaults:

- `ITEMS_PER_STAGE = 12`
- `ENABLE_AUDIO_PLAYBACK = false`
- `ENABLE_LEGACY_PREVIEW_AUDIO = true`
- `AUDIO_ROOT = "/samples/mushra"`

Current candidate IDs:

- Stage 1: `A_01`, `A_02`, `B_01`, `B_02`
- Stage 2: `A_sig_01`, `A_sig_02`, `A_sig_03`, `B_sig_01`, `B_sig_02`, `B_sig_03`

Current preview state:

- Stage 1 item 1-2 use legacy preview audio from `public/samples/16kHz`
- Stage 2 item 1-2 use legacy preview audio from `public/samples/16kHz`
- The remaining items still render with disabled placeholder players until the final MUSHRA assets are added

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

`0002_stage_mushra.sql` drops the old AB response tables and recreates the score-based Stage 1 / Stage 2 schema.

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

## 5. Audio file template

The app now uses a fixed directory and filename convention.

- Root: [`public/samples/mushra`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/public/samples/mushra)
- Full example tree: [`public/samples/mushra/README.md`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/public/samples/mushra/README.md)

Expected pattern:

- Stage 1 Ground Truth: `/public/samples/mushra/stage1/item01/ground_truth.wav`
- Stage 1 candidate: `/public/samples/mushra/stage1/item01/A_01.wav`
- Stage 2 candidate: `/public/samples/mushra/stage2/item01/A_sig_03.wav`

The config generates paths automatically from this template for all 12 items in each stage.

## 6. Turn audio playback on

When the real files are ready:

1. Put the files into the template directory tree above.
2. Set `ENABLE_AUDIO_PLAYBACK = true` in [`lib/evaluation-config.js`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/lib/evaluation-config.js).
3. Commit and push to `main`.

Until then, the UI renders the full test but shows audio placeholders instead of players.

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
- The current repository no longer includes the old AB-style JSON import path because the data schema changed to stage-based MUSHRA ratings.
- `admin.html` expects `ADMIN_TOKEN` and stores the entered token in browser local storage.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Vercel server-side environment variables.
