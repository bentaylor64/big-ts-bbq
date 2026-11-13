import {normalize, formatAmount, ingredientAmount, filterRecipes, aggregateShopping, validFactor} from './recipe-utils.js?v=20261113-pairings-2';

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const star = filled => `<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg>`;
const arrow = '<span aria-hidden="true">↗</span>';
function readStore(key, fallback) { try { return JSON.parse(localStorage.getItem(`bigts-${key}`)) ?? fallback; } catch { return fallback; } }
function saveStore(key, value) { try { localStorage.setItem(`bigts-${key}`, JSON.stringify(value)); } catch { /* Browsing remains available without storage. */ } }
const savedFavorites = readStore('favorites', []);
const favorites = new Set(Array.isArray(savedFavorites) ? savedFavorites.filter(x => typeof x === 'string') : []);
let shopping = readStore('shopping', []);
if (!Array.isArray(shopping)) shopping = [];
shopping = shopping.filter(item => item && typeof item.recipeId === 'string' && validFactor(item.factor));
let recipes = [], categories = [], activeRecipe = null, factor = 1, cookMode = false;
const checkedIngredients = new Map(), checkedSteps = new Map(), shoppingChecked = new Set();
const filters = {query: '', category: 'All recipes', favoritesOnly: false, favorites, sort: 'original'};
let toastTimer;

function toast(message) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
}

function renderCategories() {
  $('#category-filters').innerHTML = ['All recipes', ...categories].map(category => `<button class="category-button" type="button" data-category="${escapeHtml(category)}" aria-pressed="${filters.category === category}">${escapeHtml(category)} <span>${category === 'All recipes' ? recipes.length : recipes.filter(r => r.category === category).length}</span></button>`).join('');
}

function recipeSummary(recipe) {
  if (recipe.description && !/source|workbook|imported/i.test(recipe.description)) return recipe.description;
  return recipe.ingredients.slice(0, 4).map(i => i.name).join(' · ');
}

function renderPairings(recipe) {
  if (!recipe.pairings?.items?.length) return '';
  return `<section class="recipe-pairings" aria-label="${escapeHtml(recipe.pairings.heading)}"><p class="pairings-eyebrow">TRY IT THIS WAY</p><h3 class="detail-section-title">${escapeHtml(recipe.pairings.heading)}</h3><ul class="pairing-list">${recipe.pairings.items.map(item => `<li><strong class="pairing-food">${escapeHtml(item.food)}</strong><span class="pairing-note">${escapeHtml(item.note)}</span></li>`).join('')}</ul>${recipe.pairings.tip ? `<p class="pairing-tip">${escapeHtml(recipe.pairings.tip)}</p>` : ''}</section>`;
}

function renderRecipes() {
  const visible = filterRecipes(recipes, filters);
  $('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'recipe' : 'recipes'}${filters.favoritesOnly ? ' in your favorites' : ''}`;
  $('#favorites-filter').setAttribute('aria-pressed', String(filters.favoritesOnly));
  $('#recipe-grid').innerHTML = visible.length ? visible.map((recipe, index) => `<article class="recipe-card" data-category="${escapeHtml(recipe.category)}" style="--card-index:${Math.min(index, 8)}">
    <div class="card-topline"><span class="card-category">${escapeHtml(recipe.category)}</span><button type="button" class="favorite-button ${favorites.has(recipe.id) ? 'is-favorite' : ''}" data-favorite="${escapeHtml(recipe.id)}" aria-label="${favorites.has(recipe.id) ? 'Remove' : 'Save'} ${escapeHtml(recipe.title)} ${favorites.has(recipe.id) ? 'from' : 'to'} favorites" aria-pressed="${favorites.has(recipe.id)}">${star(favorites.has(recipe.id))}</button></div>
    <h3 class="recipe-title"><button type="button" data-open="${escapeHtml(recipe.id)}">${escapeHtml(recipe.title)}</button></h3>
    <p class="recipe-description">${escapeHtml(recipeSummary(recipe))}</p>
    ${recipe.pairings?.items?.length ? `<p class="card-pairings"><span>${recipe.pairings.heading === 'Goes great on' ? 'Great on' : 'Serve with'}</span> ${recipe.pairings.items.map(item => escapeHtml(item.food)).join(' · ')}</p>` : ''}
    <div class="card-bottom"><span class="ingredient-count">${recipe.ingredients.length} ingredients${recipe.warnings?.length ? ' <span class="source-flag" title="Includes source notes">· source notes</span>' : ''}</span><button type="button" class="recipe-open" data-open="${escapeHtml(recipe.id)}" aria-label="Open ${escapeHtml(recipe.title)}">View recipe ${arrow}</button></div>
  </article>`).join('') : `<div class="empty-state"><span aria-hidden="true">✳</span><h3>No recipes on this rack.</h3><p>${filters.favoritesOnly ? 'Tap the star on any recipe to save it here, or try a broader search.' : 'Try a different ingredient, recipe name, or category.'}</p><button type="button" class="secondary-button" data-reset-filters>Show all recipes</button></div>`;
}

function setFavorite(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  saveStore('favorites', [...favorites]); renderRecipes();
  if (activeRecipe?.id === id) {
    const button = $('[data-detail-favorite]');
    if (button) { button.innerHTML = `${star(favorites.has(id))} ${favorites.has(id) ? 'Saved' : 'Save recipe'}`; button.setAttribute('aria-pressed', String(favorites.has(id))); }
  }
}

function renderDetail() {
  const recipe = activeRecipe;
  const scalable = recipe.scalingAllowed !== false;
  const source = recipe.source || {};
  const checked = checkedIngredients.get(recipe.id) || new Set();
  const steps = checkedSteps.get(recipe.id) || new Set();
  $('#recipe-dialog-body').innerHTML = `<div class="detail-eyebrow">${escapeHtml(recipe.category)} <span> / THE RECIPE BOOK</span></div>
    <h2 class="detail-title" id="recipe-dialog-title">${escapeHtml(recipe.title)}</h2>
    <p class="detail-description">${escapeHtml(recipeSummary(recipe))}</p>
    ${recipe.bigTNote ? `<aside class="big-t-note" aria-label="At Big T’s table"><img src="./assets/big-t-mascot.png" alt="" width="64" height="64"><div><h4>At Big T’s table</h4><p>${escapeHtml(recipe.bigTNote)}</p></div></aside>` : ''}
    <div class="detail-meta"><span>${recipe.ingredients.length} ingredients</span><span>${recipe.baseBatch ? `Source batch: ${formatAmount(recipe.baseBatch.amount)} ${escapeHtml(recipe.baseBatch.unit)}` : '1× = original recipe'}</span></div>
    <div class="detail-actions"><button type="button" class="secondary-button" data-detail-favorite aria-pressed="${favorites.has(recipe.id)}">${star(favorites.has(recipe.id))} ${favorites.has(recipe.id) ? 'Saved' : 'Save recipe'}</button><button type="button" class="secondary-button" data-cook-mode aria-pressed="${cookMode}">${cookMode ? 'Exit cook mode' : 'Cook mode'}</button><button type="button" class="secondary-button" data-print="recipe">Print</button><button type="button" class="secondary-button" data-share>Copy link</button></div>
    ${renderPairings(recipe)}
    ${recipe.warnings?.length ? `<aside class="recipe-warning"><strong>Notes on the original recipe</strong><ul>${recipe.warnings.map(note => `<li>${escapeHtml(note)}</li>`).join('')}</ul></aside>` : ''}
    <section class="batch-panel" aria-label="Batch size"><div><h3 class="detail-section-title">Make it your batch</h3><p>${scalable ? 'Adjust the quantities to fit your cook.' : 'Original quantities shown. Scaling is unavailable for this recipe.'}</p></div>
    ${scalable ? `<div class="scale-controls">${[0.5, 1, 2, 3].map(value => `<button type="button" class="scale-button ${factor === value ? 'active' : ''}" data-factor="${value}" aria-pressed="${factor === value}">${value === 0.5 ? '½' : value}×</button>`).join('')}<label class="custom-scale">Custom <input class="scale-input" id="custom-factor" type="number" min="0.1" max="20" step="any" value="${factor}" aria-label="Custom batch multiplier"> ×</label></div>${recipe.baseBatch?.amount ? `<label class="target-batch">Target batch <input class="scale-input" id="target-batch" type="number" min="${recipe.baseBatch.amount * 0.1}" max="${recipe.baseBatch.amount * 20}" step="any" value="${Number((recipe.baseBatch.amount * factor).toPrecision(7))}"> ${escapeHtml(recipe.baseBatch.unit)} <small>using the workbook’s batch basis</small></label>` : ''}<p class="scale-caption">Showing <strong>${formatAmount(factor)}×</strong> the source quantities. Ranges and unspecified amounts stay as written. Method text and original batch details do not change.</p>` : ''}</section>
    <div class="detail-columns"><section><div class="section-heading-row"><h3 class="detail-section-title">The ingredients</h3><button type="button" class="text-button" data-reset-checks>Reset checks</button></div><ul class="ingredient-list">${recipe.ingredients.map((ingredient, i) => {
      const quantity = ingredientAmount(ingredient, factor);
      const group = ingredient.group && ingredient.group !== recipe.ingredients[i - 1]?.group ? `<li class="ingredient-group">${escapeHtml(ingredient.group)}</li>` : '';
      return `${group}<li class="${checked.has(i) ? 'is-checked' : ''}"><label><input type="checkbox" data-ingredient="${i}" ${checked.has(i) ? 'checked' : ''}><span class="ingredient-name">${escapeHtml(ingredient.name)}${ingredient.note ? `<small>${escapeHtml(ingredient.note)}</small>` : ''}</span><span class="ingredient-amount">${escapeHtml(quantity.label || 'as listed')}</span></label></li>`;
    }).join('')}</ul><button type="button" class="primary-button add-shopping-button" data-add-shopping>Add ingredients to shopping list <span aria-hidden="true">＋</span></button></section>
    <section><h3 class="detail-section-title">The method</h3>${recipe.steps?.length ? `<ol class="direction-list">${recipe.steps.map((step, i) => `<li class="${steps.has(i) ? 'is-checked' : ''}"><label><input type="checkbox" data-step="${i}" ${steps.has(i) ? 'checked' : ''}><span>${escapeHtml(step)}</span></label></li>`).join('')}</ol>` : '<p class="missing-method">This entry contains an ingredient formula. No preparation steps were included in the workbook.</p>'}${recipe.notes?.length ? `<div class="recipe-notes"><h4>From the notebook</h4>${recipe.notes.map(note => `<p>${escapeHtml(note)}</p>`).join('')}</div>` : ''}</section></div>
    <details class="source-details"><summary>View original workbook entry</summary><p class="source-note">${escapeHtml(source.sheet || '')}${source.range ? ` · ${escapeHtml(source.range)}` : ''}</p><pre>${escapeHtml(recipe.originalText || 'Original text not available.')}</pre></details>`;
  $('#recipe-dialog').setAttribute('aria-labelledby', 'recipe-dialog-title');
  $('#recipe-dialog').classList.toggle('cook-mode', cookMode);
}

function openRecipe(id, changeUrl = true) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;
  activeRecipe = recipe; factor = 1; cookMode = false; renderDetail();
  if (!$('#recipe-dialog').open) $('#recipe-dialog').showModal();
  $('#recipe-dialog').scrollTop = 0;
  if (changeUrl) history.replaceState(null, '', `${location.pathname}${location.search}#recipe=${encodeURIComponent(id)}`);
}

function setFactor(next) {
  if (!validFactor(next)) { toast('Choose a batch multiplier between 0.1× and 20×.'); renderDetail(); return; }
  if (factor !== Number(next)) checkedIngredients.delete(activeRecipe.id);
  factor = Number(next); renderDetail();
}

function openHashRecipe() {
  if (!location.hash.startsWith('#recipe=')) return;
  try { openRecipe(decodeURIComponent(location.hash.slice(8)), false); } catch { /* An invalid link must not hide the recipe library. */ }
}

function updateShopping() {
  saveStore('shopping', shopping); $('#shopping-count').textContent = shopping.length;
  $('#shopping-button').setAttribute('aria-label', `Shopping list, ${shopping.length} ${shopping.length === 1 ? 'recipe' : 'recipes'}`);
}

function shoppingText() {
  const items = aggregateShopping(shopping, recipes);
  const selected = shopping.map(entry => { const r = recipes.find(r => r.id === entry.recipeId); return `${r.title} (${formatAmount(entry.factor)}×)${r.warnings?.length ? '\nSource notes: ' + r.warnings.join(' ') : ''}`; });
  return `BIG T'S BBQ — SHOPPING LIST\n\n${selected.join('\n')}\n\n${items.map(item => `${shoppingChecked.has(item.key) ? '[x]' : '[ ]'} ${[formatAmount(item.amount), item.unit, item.name].filter(Boolean).join(' ')}${item.sourceLabel ? ` [${item.recipes.join(', ')} · ${item.sourceLabel}]` : ''}${item.amount === null ? ' — amount as listed in recipe' : ''}`).join('\n')}\n\nMatching names and units are combined; different units and review-required source rows stay separate.\n`;
}

function renderShopping() {
  const items = aggregateShopping(shopping, recipes);
  const warnings = shopping.map(entry => recipes.find(r => r.id === entry.recipeId)).filter(r => r.warnings?.length);
  $('#shopping-dialog-body').innerHTML = `<div class="detail-eyebrow">PREP BEFORE THE FIRE</div><h2 class="detail-title" id="shopping-dialog-title">Your shopping list.</h2><p class="detail-description">${shopping.length ? `${shopping.length} ${shopping.length === 1 ? 'recipe' : 'recipes'}. ${items.length} ingredients. One trip to the store.` : 'A great cook starts with a little prep.'}</p>
  ${!shopping.length ? '<div class="empty-state"><h3>Your list is ready for a recipe.</h3><p>Open a recipe, choose your batch size, and add its ingredients here.</p><button class="primary-button" data-close-dialog="shopping-dialog">Explore recipes ↗</button></div>' : `
  <div class="shopping-recipes">${shopping.map((entry, i) => { const recipe = recipes.find(r => r.id === entry.recipeId); return `<div class="shopping-recipe"><span><strong>${escapeHtml(recipe.title)}</strong><small>${formatAmount(entry.factor)}× batch</small></span><button type="button" class="text-button" data-remove-shopping="${i}" aria-label="Remove ${escapeHtml(recipe.title)} from shopping list">Remove</button></div>`; }).join('')}</div>
  ${warnings.length ? `<aside class="recipe-warning"><strong>Source notes apply to this list</strong>${warnings.map(r => `<p><strong>${escapeHtml(r.title)}:</strong> ${escapeHtml(r.warnings.join(' '))}</p>`).join('')}</aside>` : ''}
  <p class="source-note">Matching ingredient names and units are combined. Recipes with scaling disabled retain separate source rows. Different units stay separate; amounts are not converted.</p><ul class="ingredient-list shopping-ingredients">${items.map(item => `<li class="${shoppingChecked.has(item.key) ? 'is-checked' : ''}"><label><input type="checkbox" data-shopping-check="${escapeHtml(item.key)}" ${shoppingChecked.has(item.key) ? 'checked' : ''}><span class="ingredient-name">${escapeHtml(item.name)}<small>${escapeHtml(item.recipes.join(' · '))}${item.sourceLabel ? ` · ${escapeHtml(item.sourceLabel)}` : ''}</small></span><span class="ingredient-amount">${escapeHtml([formatAmount(item.amount), item.unit].filter(Boolean).join(' ') || 'as listed')}</span></label></li>`).join('')}</ul>
  <div class="detail-actions"><button type="button" class="primary-button" data-copy-shopping>Copy list</button><button type="button" class="secondary-button" data-download-shopping>Download .txt</button><button type="button" class="secondary-button" data-print="shopping">Print</button><button type="button" class="text-button" data-clear-shopping>Clear list</button></div>`}`;
  $('#shopping-dialog').setAttribute('aria-labelledby', 'shopping-dialog-title');
}

async function copyText(text, success) {
  try { await navigator.clipboard.writeText(text); toast(success); } catch { toast('Copy is unavailable in this browser. Use Download or Print instead.'); }
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.open) openRecipe(button.dataset.open);
  if (button.dataset.favorite) setFavorite(button.dataset.favorite);
  if (button.hasAttribute('data-detail-favorite')) setFavorite(activeRecipe.id);
  if (button.dataset.category) { filters.category = button.dataset.category; renderCategories(); renderRecipes(); }
  if (button.hasAttribute('data-reset-filters')) { filters.category = 'All recipes'; filters.query = ''; filters.favoritesOnly = false; $('#search-input').value = ''; renderCategories(); renderRecipes(); }
  if (button.dataset.closeDialog) $(`#${button.dataset.closeDialog}`).close();
  if (button.dataset.factor) setFactor(button.dataset.factor);
  if (button.hasAttribute('data-cook-mode')) { cookMode = !cookMode; renderDetail(); }
  if (button.hasAttribute('data-reset-checks')) { checkedIngredients.delete(activeRecipe.id); checkedSteps.delete(activeRecipe.id); renderDetail(); }
  if (button.hasAttribute('data-add-shopping')) { shopping.push({recipeId: activeRecipe.id, factor}); shoppingChecked.clear(); updateShopping(); toast(`${activeRecipe.title} added to your list.`); }
  if (button.hasAttribute('data-remove-shopping')) { shopping.splice(Number(button.dataset.removeShopping), 1); shoppingChecked.clear(); updateShopping(); renderShopping(); }
  if (button.hasAttribute('data-clear-shopping')) { shopping = []; shoppingChecked.clear(); updateShopping(); renderShopping(); }
  if (button.hasAttribute('data-copy-shopping')) copyText(shoppingText(), 'Shopping list copied.');
  if (button.hasAttribute('data-download-shopping')) {
    const url = URL.createObjectURL(new Blob([shoppingText()], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'big-ts-shopping-list.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (button.hasAttribute('data-share')) copyText(location.href, 'Recipe link copied.');
  if (button.dataset.print) { document.body.dataset.print = button.dataset.print; window.print(); }
});

document.addEventListener('change', event => {
  const input = event.target;
  if (input.id === 'custom-factor') setFactor(input.value);
  if (input.id === 'target-batch') setFactor(Number(input.value) / activeRecipe.baseBatch.amount);
  for (const [key, store] of [['ingredient', checkedIngredients], ['step', checkedSteps]]) {
    if (input.hasAttribute(`data-${key}`)) {
      const set = store.get(activeRecipe.id) || new Set(); const index = Number(input.dataset[key]);
      input.checked ? set.add(index) : set.delete(index); store.set(activeRecipe.id, set); input.closest('li').classList.toggle('is-checked', input.checked);
    }
  }
  if (input.hasAttribute('data-shopping-check')) { input.checked ? shoppingChecked.add(input.dataset.shoppingCheck) : shoppingChecked.delete(input.dataset.shoppingCheck); input.closest('li').classList.toggle('is-checked', input.checked); }
});

$('#search-input').addEventListener('input', event => { filters.query = event.target.value; renderRecipes(); });
$('#favorites-filter').addEventListener('click', () => { filters.favoritesOnly = !filters.favoritesOnly; renderRecipes(); });
$('#sort-select').addEventListener('change', event => { filters.sort = event.target.value; renderRecipes(); });
$('#shopping-button').addEventListener('click', () => { renderShopping(); $('#shopping-dialog').showModal(); });
$('#surprise-button').addEventListener('click', () => { const pool = filterRecipes(recipes, filters); if (pool.length) openRecipe(pool[Math.floor(Math.random() * pool.length)].id); else toast('Clear your filters to discover a recipe.'); });
$('#recipe-dialog').addEventListener('close', () => { history.replaceState(null, '', `${location.pathname}${location.search}`); });
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
window.addEventListener('hashchange', openHashRecipe);

try {
  const response = await fetch('./data/recipes.json?v=20261113-pairings-2', {cache: 'no-cache'});
  if (!response.ok) throw new Error(`Recipe data returned ${response.status}`);
  const data = await response.json(); recipes = data.recipes;
  const order = ['Dry Rubs', 'Seasonings', 'Sausages', 'Burgers', 'Sauces & Glazes', 'Marinades', 'Mains', 'Sides & Snacks', 'Butters & Condiments'];
  categories = [...new Set(recipes.map(r => r.category))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  // Start the collection with rubs and seasonings; retain workbook order within each category.
  recipes.sort((a, b) => categories.indexOf(a.category) - categories.indexOf(b.category));
  shopping = shopping.filter(item => recipes.some(r => r.id === item.recipeId));
  $('#total-recipes').textContent = recipes.length; $('#total-categories').textContent = categories.length;
  renderCategories(); renderRecipes(); updateShopping();
  openHashRecipe();
} catch (error) {
  $('#result-count').textContent = 'Recipe book unavailable';
  $('#recipe-grid').innerHTML = '<div class="empty-state"><h3>The recipe book couldn’t load.</h3><p>Please refresh the page to try again.</p><button class="primary-button" type="button" id="retry-loading">Try again</button></div>';
  $('#retry-loading').addEventListener('click', () => location.reload());
  console.error(error);
}
