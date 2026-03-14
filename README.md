# DDSP Car Sound Evaluation on Cloudflare Pages

This folder contains a Cloudflare Pages + Pages Functions + D1 deployment target for the listening test.

## Project settings

- Pages project name: `ddsp-carsound-eval`
- Suggested Pages URL: `https://ddsp-carsound-eval.pages.dev`
- Branch: `main`
- D1 database id: `adda9e69-7359-4b82-8fdf-10354ff8d88d`

## 1. Put this folder into the GitHub repo

Your GitHub repository is `https://github.com/dabinkim0/ddsp_carsound_eval.git`.

The repository should contain the contents of this folder at the root, or this folder should be uploaded as the Pages root directory.

Recommended repository layout:

```text
ddsp_carsound_eval/
  README.md
  package.json
  wrangler.toml
  public/
  functions/
  migrations/
  scripts/
```

## 2. Create the Pages project

In Cloudflare Dashboard:

1. Open `Workers & Pages`
2. Click `Create application`
3. Choose `Pages`
4. Choose `Connect to Git`
5. Select `dabinkim0/ddsp_carsound_eval`
6. Set `Production branch` to `main`

Configure the Pages project with these values:

- Project name: `ddsp-carsound-eval`
- Root directory: `/` if this folder is at the repo root, otherwise `ddsp-carsound-eval`
- Build command: leave empty
- Build output directory: `public`

## 3. Add the D1 binding

In Pages project settings:

1. Open `Settings`
2. Open `Bindings`
3. Add a new `D1 database binding`
4. Binding name: `DB`
5. Select the existing database with id `adda9e69-7359-4b82-8fdf-10354ff8d88d`

## 4. Add required environment variables

Set the following secret in Cloudflare Pages:

- `ADMIN_TOKEN`: token used by `admin.html`

You can generate one locally with:

```bash
openssl rand -hex 32
```

Add it in:

- `Settings > Variables and Secrets > Add variable`
- Type: `Secret`
- Name: `ADMIN_TOKEN`

## 5. Run the database migration

Run the schema migration against the remote D1 database before opening the site:

```bash
cd ddsp-carsound-eval
npx wrangler d1 execute ddsp-carsound-eval --remote --file=./migrations/0001_init.sql
```

If you prefer using the known database id instead of the database name:

```bash
cd ddsp-carsound-eval
npx wrangler d1 execute adda9e69-7359-4b82-8fdf-10354ff8d88d --remote --file=./migrations/0001_init.sql
```

## 6. Optional: import legacy JSON results into D1

If you want the existing `CarSound_exps/Subjective Eval/results/result_*.json` files to appear in the admin dashboard:

```bash
cd ddsp-carsound-eval
npm run legacy:sql
npx wrangler d1 execute ddsp-carsound-eval --remote --file=./legacy_results_import.sql
```

This script reads the legacy JSON files and creates:

- one `session` row per JSON file
- one `assignment` row per answered trial
- one `response` row per answered trial

## 7. Deploy

After pushing to GitHub, Cloudflare Pages will deploy automatically from `main`.

You can also deploy manually:

```bash
cd ddsp-carsound-eval
npx wrangler pages deploy public --project-name ddsp-carsound-eval
```

## 8. Local development

```bash
cd ddsp-carsound-eval
npx wrangler pages dev public
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

- Name and email are stored in D1 along with each participant session.
- Warm-up responses are stored, but admin preference statistics are calculated from main trials only.
- Audio assets are served from `public/samples` and `public/samples_warmup`.
- `admin.html` expects the `ADMIN_TOKEN` secret and stores the entered token in browser local storage.
