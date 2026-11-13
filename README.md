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
- `assets/` — original SVG illustrations

## Recipe data

The import preserves the workbook’s recipes and records their source sheet and cell ranges. Common units are normalized for display. Missing preparation methods are clearly labeled; the site does not invent instructions. Quantity ranges and unspecified amounts remain as written.

Formula recipes use saved workbook ingredient values, with source discrepancies noted. Ten recipes containing curing ingredients have automatic scaling disabled. Source curing formulas and procedures require review before use. The original source is retained in each recipe’s disclosure panel.

Shopping totals combine matching ingredient names and units only. They do not convert volumes to weights or combine unlike units. Original amounts and ranges remain identifiable. Favorites and the selected shopping recipes are stored in the visitor’s browser; there is no account, server database, or cross-device synchronization. Ingredient and method checkmarks last for the current page session.

Recipe labels mentioning brands or chefs are preserved from the supplied workbook and do not imply affiliation or endorsement. The original workbook is not included in this repository.

## Update recipes

Edit `data/recipes.json`, preserving stable recipe IDs so saved favorites and recipe links continue to work. Each recipe includes its category, ingredients, methods, notes, source, and scaling settings. Counts and category filters are calculated by the app. Commit to `main` to publish updates through GitHub Pages.

The optional Google Fonts stylesheet supplies Barlow Condensed and DM Sans; local system font fallbacks are provided.
