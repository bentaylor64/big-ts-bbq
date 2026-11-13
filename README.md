# Big T’s BBQ — The Recipe Box

A static, responsive recipe collection built from **Big T's BBQ Recipes .xlsx**. Browse 97 recipes across nine categories, search by ingredient, scale batches, save favorites, check off cooking steps, and build a combined shopping list.

## Run locally

From this directory:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173`. Use a web server rather than opening `index.html` directly, because the app loads its recipe JSON with `fetch`.

## GitHub Pages

The site has no build step or package dependencies. In the repository’s **Settings → Pages**, select **Deploy from a branch**, then **main / (root)**. The `.nojekyll` file keeps static assets intact. All app paths are relative, so the site works under a GitHub Pages repository path.

## Files

- `index.html` — semantic page and dialog structure
- `styles.css` — responsive layout, cook mode, and print styles
- `app.js` — browsing, favorites, recipe views, batch controls, and shopping list
- `recipe-utils.js` — pure search, quantity formatting, and aggregation helpers
- `data/recipes.json` — recipe data with original text and workbook cell references
- `assets/` — original SVG illustrations and Big T’s transparent cartoon mascot

## Recipe data

The import preserves the workbook’s recipes and records their source sheet and cell ranges. Common units are normalized for display. Missing preparation methods are clearly labeled; the site does not invent instructions. Quantity ranges and unspecified amounts remain as written.

Formula recipes use saved workbook ingredient values, with source discrepancies noted. Ten recipes containing curing ingredients have automatic scaling disabled. Source curing formulas and procedures require review before use. The original source is retained in each recipe’s disclosure panel.

Shopping totals combine matching ingredient names and units only. They do not convert volumes to weights or combine unlike units. Original amounts and ranges remain identifiable. Favorites and the selected shopping recipes are stored in the visitor’s browser; there is no account, server database, or cross-device synchronization. Ingredient and method checkmarks last for the current page session.

Recipe labels mentioning brands or chefs are preserved from the supplied workbook and do not imply affiliation or endorsement. The original workbook is not included in this repository.

## Big T’s story and mascot

Big T’s biography is based on the owner’s description of his lifelong hunting and fishing, interest in harvesting and processing his own game, and enjoyment of sharing good food and conversation. The `bigTNote` fields provide editorial context connecting each recipe’s contents to that background; they are not quotations, specific personal memories, or claims of authorship.

The mascot was created with OpenAI’s built-in image generation tool using four owner-supplied reference photographs. Only the finished mascot is published here; the reference photographs are not included.

## Update recipes

Each recipe also has editorial `pairings`: a “Goes great on” section for rubs, sauces, seasonings, marinades and condiments, or “Serve it with” for dishes. These are suggested combinations, not claims about Big T’s personal favorites. Search includes pairing foods, so queries such as `venison`, `salmon`, or `fish` can find matching seasonings as well as main dishes. Lake Michigan fish selections were checked against [Michigan DNR’s Better Fishing Waters](https://www.michigan.gov/dnr/things-to-do/fishing/where/better-fishing-waters). Pairing suggestions do not change source preparation, brining, or curing directions.

Edit `data/recipes.json`, preserving stable recipe IDs so saved favorites and recipe links continue to work. Each recipe includes its category, ingredients, methods, notes, source, and scaling settings. Counts and category filters are calculated by the app. Commit to `main` to publish updates through GitHub Pages.

The optional Google Fonts stylesheet supplies Barlow Condensed and DM Sans; local system font fallbacks are provided.

CSS, JavaScript, and recipe-data URLs include a release version to avoid mixing cached files after a deployment. Bump the shared `v=` value in `index.html` and `app.js` when those files change. Recipe-data requests also revalidate their cache on page load. Pairing sections remain available in Cook Mode.
