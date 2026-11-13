export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function formatAmount(amount) {
  if (!Number.isFinite(amount)) return '';
  if (amount === 0) return '0';
  const whole = Math.floor(amount);
  const fractions = [[1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞']];
  const fraction = fractions.find(([n]) => Math.abs(amount - whole - n) < 0.000001);
  if (fraction) return `${whole || ''}${whole ? ' ' : ''}${fraction[1]}`;
  return Number(amount.toPrecision(7)).toString();
}

export function ingredientAmount(ingredient, factor = 1) {
  const amount = typeof ingredient.amount === 'number' ? ingredient.amount * (ingredient.scalable === false ? 1 : factor) : null;
  return { amount, unit: ingredient.unit || '', label: [formatAmount(amount), ingredient.unit || ''].filter(Boolean).join(' ') };
}

export function filterRecipes(recipes, {query = '', category = 'All recipes', favoritesOnly = false, favorites = new Set(), sort = 'original'} = {}) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const result = recipes.filter(recipe => {
    const pairingFoods = (recipe.pairings?.items || []).map(item => item.food);
    const fishKeywords = /salmon|trout|steelhead|whitefish|perch/i.test([recipe.title, ...pairingFoods].join(' ')) ? 'fish Lake Michigan' : '';
    const haystack = normalize([recipe.title, recipe.category, ...(recipe.tags || []), ...recipe.ingredients.map(i => i.name), ...pairingFoods, fishKeywords].join(' '));
    return (category === 'All recipes' || recipe.category === category) && (!favoritesOnly || favorites.has(recipe.id)) && words.every(word => haystack.includes(word));
  });
  if (['az', 'name', 'a-z', 'alphabetical'].includes(sort)) result.sort((a, b) => a.title.localeCompare(b.title));
  if (['ingredients', 'fewest'].includes(sort)) result.sort((a, b) => a.ingredients.length - b.ingredients.length || a.title.localeCompare(b.title));
  return result;
}

export function aggregateShopping(entries, recipes) {
  const byId = new Map(recipes.map(recipe => [recipe.id, recipe]));
  const items = new Map();
  for (const [entryIndex, entry] of entries.entries()) {
    const recipe = byId.get(entry.recipeId);
    if (!recipe) continue;
    const factor = recipe.scalingAllowed === false ? 1 : entry.factor;
    for (const [ingredientIndex, ingredient] of recipe.ingredients.entries()) {
      const {amount, unit} = ingredientAmount(ingredient, factor);
      const preserveRow = recipe.scalingAllowed === false;
      const key = preserveRow ? `source-row|${entryIndex}|${ingredientIndex}` : `${normalize(ingredient.name)}|${normalize(unit)}|${amount === null ? 'unspecified' : 'measured'}`;
      if (!items.has(key)) items.set(key, {key, name: ingredient.name, amount, unit, recipes: [recipe.title], original: ingredient.original || '', sourceLabel: preserveRow ? `${ingredient.source?.sheet || recipe.source?.sheet || ''} ${ingredient.source?.cell || ''}`.trim() : ''});
      else {
        const item = items.get(key);
        if (amount !== null) item.amount += amount;
        if (!item.recipes.includes(recipe.title)) item.recipes.push(recipe.title);
      }
    }
  }
  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function validFactor(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0.1 && number <= 20;
}
