# DDSP Car Sound Evaluation on Vercel + Supabase

This folder contains a Vercel + Supabase deployment target for the listening test.

## Project settings

- Vercel project name: `ddsp-carsound-eval`
- Suggested Vercel URL: `https://ddsp-carsound-eval.vercel.app`
- Branch: `main`
- Supabase project: create a new project and keep the project URL and service-role key.

## 1. Put this folder into the GitHub repo

Your GitHub repository is `https://github.com/dabinkim0/ddsp-carsound-eval.git`.

The repository should contain the contents of this folder at the root, or this folder should be uploaded as the Pages root directory.

Recommended repository layout:

```text
ddsp-carsound-eval/
  README.md
  package.json
  wrangler.toml
  public/
  functions/
  migrations/
  scripts/
```

## 2. Create the Supabase project

In the Supabase dashboard:

1. Create a new project
2. Choose the project name `ddsp-carsound-eval`
3. Choose a region close to your expected participants
4. Wait for the database to finish provisioning
5. Open `SQL Editor`
6. Run the SQL in `migrations/0001_init.sql`

After the project is ready, collect:

- `Project URL` from `Settings > API`
- `service_role` key from `Settings > API`

## 3. Create the Vercel project

In the Vercel dashboard:

1. Click `Add New... > Project`
2. Import the repo `dabinkim0/ddsp-carsound-eval`
3. Keep the root directory as `/`
4. Framework preset: `Other`
5. Build command: leave empty
6. Output directory: leave empty
7. Install command: `npm install`

## 4. Add required environment variables to Vercel

Add these environment variables in `Project Settings > Environment Variables`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_TOKEN`

You can generate one locally with:

```bash
openssl rand -hex 32
```

## 5. Optional: import legacy JSON results into Supabase

If you want the existing `CarSound_exps/Subjective Eval/results/result_*.json` files to appear in the admin dashboard:

```bash
cd ddsp-carsound-eval
npm run legacy:sql
```

Then open the generated `legacy_results_import.sql` and run it in the Supabase SQL Editor.

This script reads the legacy JSON files and creates:

- one `sessions` row per JSON file
- one `assignments` row per answered trial
- one `responses` row per answered trial

## 6. Deploy

After the environment variables are saved, trigger a Vercel redeploy from the dashboard.

## 7. Local development

```bash
cd ddsp-carsound-eval
cp .env.example .env.local
vercel dev
```

## Public routes

- `/`: participant-facing evaluation page
- `/admin.html`: admin dashboard
- `/api/start`: create session and randomized assignments
- `/api/respond`: save one response
- `/api/complete`: complete a session
- `/api/admin/summary`: session and participant summary
- `/api/admin/trials`: per-trial statistics

## Notes

- Name and email are stored in Supabase along with each participant session.
- Warm-up responses are stored, but admin preference statistics are calculated from main trials only.
- Audio assets are served from `public/samples` and `public/samples_warmup`.
- `admin.html` expects the `ADMIN_TOKEN` environment variable and stores the entered token in browser local storage.
- The server uses the Supabase `service_role` key, so keep `SUPABASE_SERVICE_ROLE_KEY` only in Vercel server-side environment variables.
