/**
 * matchDish.js
 * Maps an AI-returned dish name string to a nutrition DB entry.
 * No external dependencies — pure JS.
 */

/**
 * Normalise a string for comparison:
 *   - lowercase
 *   - trim whitespace
 *   - collapse multiple spaces
 *   - strip punctuation except hyphens (preserve "kaya-toast" style names)
 */
function normalise(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ');
}

/** Tokenise a normalised string into a Set of words. */
function tokenSet(str) {
  return new Set(str.split(' ').filter(Boolean));
}

/**
 * Jaccard similarity between two token sets.
 * Returns 0–1.
 */
function jaccard(setA, setB) {
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Levenshtein distance between two strings.
 * Inline implementation — no library needed.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Match an AI-returned dish label to the closest entry in nutritionData.
 *
 * @param {string} aiLabel      - Raw string returned by the AI (e.g. "Char Kway Teow")
 * @param {Array}  nutritionData - Array of dish objects from hawker_nutrition.json
 * @param {Object} aliases       - Alias map from dish_aliases.json
 * @returns {{ dish: Object, confidence: number } | null}
 *   dish       – the matched nutrition object
 *   confidence – 0–1 (1.0 = exact / alias match, lower = fuzzy)
 *   Returns null when no acceptable match is found.
 */
export function matchDish(aiLabel, nutritionData, aliases) {
  if (!aiLabel || !nutritionData?.length) return null;

  const norm = normalise(aiLabel);

  // ── 1. Alias lookup (O(1)) ──────────────────────────────────────────────────
  const aliasId = aliases[norm];
  if (aliasId) {
    const dish = nutritionData.find(d => d.id === aliasId);
    if (dish) return { dish, confidence: 1.0 };
  }

  // ── 2. Exact canonical name match ───────────────────────────────────────────
  const exactMatch = nutritionData.find(d => normalise(d.name) === norm);
  if (exactMatch) return { dish: exactMatch, confidence: 1.0 };

  // ── 3. Token overlap (Jaccard) ──────────────────────────────────────────────
  const inputTokens = tokenSet(norm);
  let bestDish = null;
  let bestScore = 0;

  for (const dish of nutritionData) {
    const dishTokens = tokenSet(normalise(dish.name));
    const score = jaccard(inputTokens, dishTokens);
    if (score > bestScore) {
      bestScore = score;
      bestDish = dish;
    }
  }

  if (bestScore >= 0.4) {
    return { dish: bestDish, confidence: bestScore };
  }

  // ── 4. Levenshtein fallback (short inputs only) ─────────────────────────────
  // Only attempt when the input is ≤ 3 tokens to avoid false positives on
  // longer phrases that simply scored low on Jaccard.
  if (inputTokens.size <= 3) {
    let closestDish = null;
    let closestDist = Infinity;

    for (const dish of nutritionData) {
      const dishNorm = normalise(dish.name);
      const dist = levenshtein(norm, dishNorm);
      if (dist < closestDist) {
        closestDist = dist;
        closestDish = dish;
      }
    }

    // Accept if edit distance is within ~1/3 of the input length
    const threshold = Math.floor(norm.length / 3);
    if (closestDist <= threshold && closestDist < Infinity) {
      // Convert distance to a 0–1 confidence (closer = higher confidence)
      const confidence = Math.max(0, 1 - closestDist / norm.length);
      return { dish: closestDish, confidence };
    }
  }

  // ── 5. No match ─────────────────────────────────────────────────────────────
  return null;
}
