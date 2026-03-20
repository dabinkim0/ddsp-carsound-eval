# DDSP Car Sound Evaluation

This app runs a two-stage listening test on Vercel + Supabase.

- Stage 1: Comparative Study on the Application of Engine Order
- Stage 2: Comparative Study on the Model Architecture
- Stage 1: 12 items, 4 shuffled candidates per item plus Ground Truth
- Stage 2: 12 items, 6 shuffled candidates per item plus Ground Truth
- Rating method: 0 to 100 MUSHRA-style sliders
- Ground Truth is shown at the top of every item
- Audio is currently template-driven and playback is disabled until you enable it in the config

## Project settings

- Vercel project name: `ddsp-carsound-eval`
- Suggested Vercel URL: `https://ddsp-carsound-eval.vercel.app`
- GitHub repo: `https://github.com/dabinkim0/ddsp-carsound-eval.git`
- Branch: `main`

## 1. Create the Supabase project

In the Supabase dashboard:

1. Create a new project
2. Choose a region close to your expected participants
3. Wait for the database to finish provisioning
4. Open `SQL Editor`

If this is a fresh project, run:

- [`migrations/0001_init.sql`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/migrations/0001_init.sql)

If you already ran the older AB-style schema before this Stage 1 / Stage 2 update, run:

- [`migrations/0002_stage_mushra.sql`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/migrations/0002_stage_mushra.sql)

`0002_stage_mushra.sql` drops the old response tables and recreates them for the new MUSHRA flow, so old AB-style response rows are removed.

After the project is ready, collect:

1. `Project URL`
2. `service_role` key or the current elevated secret key

Use them as:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2. Create the Vercel project

In the Vercel dashboard:

1. Click `Add New... > Project`
2. Import `dabinkim0/ddsp-carsound-eval`
3. Keep the root directory as `/`
4. Framework preset: `Other`
5. Build command: leave empty
6. Output directory: leave empty
7. Install command: `npm install`

## 3. Add environment variables to Vercel

Add these in `Project Settings > Environment Variables`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_TOKEN`

Generate `ADMIN_TOKEN` locally if needed:

```bash
openssl rand -hex 32
```

After saving the variables, run a Vercel redeploy once so the server picks them up.

## 4. Local development

```bash
cd ddsp-carsound-eval
cp .env.example .env.local
npx vercel dev
```

## 5. Configure Stage content

Stage structure and placeholder items live in:

- [`lib/evaluation-config.js`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/lib/evaluation-config.js)

Update that file when the final test content is ready:

1. Replace the Stage 1 and Stage 2 intro/outro text
2. Replace placeholder item titles and prompts
3. Place the final Ground Truth and candidate files into the template directory tree
4. Expand the item arrays as needed

Current placeholder candidate IDs:

- Stage 1: `A_01`, `A_02`, `B_01`, `B_02`
- Stage 2: `A_sig_01`, `A_sig_02`, `A_sig_03`, `B_sig_01`, `B_sig_02`, `B_sig_03`

Audio naming template:

- Root: [`public/samples/mushra`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/public/samples/mushra)
- Detailed tree: [`public/samples/mushra/README.md`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/public/samples/mushra/README.md)

Activation rule:

1. Put the files into the naming template above
2. Set `ENABLE_AUDIO_PLAYBACK = true` in [`lib/evaluation-config.js`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/ddsp-carsound-eval/lib/evaluation-config.js)

Until then, every item keeps rendering with audio placeholders instead of broken players.

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
- Candidate order is shuffled per session payload so the underlying candidate identity is hidden from participants.
- The current repository no longer includes the old AB-style JSON import path because the data schema changed to stage-based MUSHRA ratings.
- `admin.html` expects `ADMIN_TOKEN` and stores the entered token in browser local storage.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Vercel server-side environment variables.
