// BiasDetector.js — Pure function that analyzes competency ratings for cognitive biases.
// Returns an array of { type, message } bias flags.

export function detectBias(ratings, competencyIds) {
  const flags = [];
  const levels = competencyIds
    .map(id => ratings[id]?.bars_level ?? ratings[id]?.level)
    .filter(l => l != null);

  if (levels.length < 3) return flags;

  // Central tendency: >70% of ratings at levels 2-3
  const middleCount = levels.filter(l => l === 2 || l === 3).length;
  if (middleCount / levels.length > 0.7) {
    flags.push({
      type: 'central_tendency',
      message: `${middleCount} of ${levels.length} competencies rated at levels 2-3. Consider whether any deserve a higher or lower rating.`,
    });
  }

  // Halo effect: all ratings identical
  const unique = new Set(levels);
  if (unique.size === 1) {
    flags.push({
      type: 'halo_effect',
      message: `All competencies rated at level ${levels[0]}. Reflect on whether some areas are genuinely stronger or weaker.`,
    });
  }

  // Inflation: average > 3.5
  const avg = levels.reduce((s, l) => s + l, 0) / levels.length;
  if (avg > 3.5) {
    flags.push({
      type: 'inflation',
      message: `Average rating is ${avg.toFixed(1)} out of 4. High self-ratings are valid if supported by evidence — consider linking wins to back up your assessment.`,
    });
  }

  return flags;
}
