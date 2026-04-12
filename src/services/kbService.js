/**
 * Knowledge Base Service — 知識ベース検索・フィルタ・優先度計算
 */
import kbData from '../data/knowledgeBase.json';

// ─── Index builds (run once) ───
const itemById = {};
const itemsByType = {};
const linksByFrom = {};
const linksByTo = {};
const linksByType = {};
const sourceByKey = {};

function buildIndexes() {
  kbData.items.forEach(item => {
    itemById[item.id] = item;
    if (!itemsByType[item.item_type]) itemsByType[item.item_type] = [];
    itemsByType[item.item_type].push(item);
  });

  kbData.links.forEach(link => {
    if (!linksByFrom[link.from_id]) linksByFrom[link.from_id] = [];
    linksByFrom[link.from_id].push(link);
    if (!linksByTo[link.to_id]) linksByTo[link.to_id] = [];
    linksByTo[link.to_id].push(link);
    if (!linksByType[link.link_type]) linksByType[link.link_type] = [];
    linksByType[link.link_type].push(link);
  });

  kbData.sources.forEach(src => {
    sourceByKey[src.source_key] = src;
  });
}

buildIndexes();

// ─── Public API ───

/**
 * KB統計情報
 */
export function getKBStats() {
  return kbData.stats;
}

/**
 * 全参考文献を取得
 */
export function getAllSources() {
  return kbData.sources;
}

/**
 * source_keyから参考文献を取得
 */
export function getSourceByKey(key) {
  return sourceByKey[key] || null;
}

/**
 * source_keysのセミコロン区切り文字列から参考文献リストを取得
 */
export function getSourcesByKeys(keysStr) {
  if (!keysStr) return [];
  return keysStr.split(';').map(k => sourceByKey[k.trim()]).filter(Boolean);
}

/**
 * アイテムをフィルタして取得
 */
export function getItems(filters = {}) {
  let result = kbData.items;

  if (filters.item_type) {
    result = result.filter(i => i.item_type === filters.item_type);
  }
  if (filters.layer) {
    result = result.filter(i => i.layer === filters.layer);
  }
  if (filters.body_region) {
    result = result.filter(i => i.body_region === filters.body_region || i.body_region_label === filters.body_region);
  }
  if (filters.movement_theme) {
    result = result.filter(i => i.movement_theme && i.movement_theme.includes(filters.movement_theme));
  }
  if (filters.target_population) {
    result = result.filter(i => i.target_population && i.target_population.includes(filters.target_population));
  }
  if (filters.condition_theme) {
    result = result.filter(i => i.condition_theme && i.condition_theme.includes(filters.condition_theme));
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(i =>
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.content && i.content.toLowerCase().includes(q))
    );
  }
  if (filters.is_active !== undefined) {
    result = result.filter(i => i.is_active !== false);
  }

  return result;
}

/**
 * 全リンクをフィルタして取得
 */
export function getLinks(filters = {}) {
  let result = kbData.links;
  if (filters.link_type) {
    result = result.filter(l => l.link_type === filters.link_type);
  }
  if (filters.from_id) {
    result = result.filter(l => l.from_id === filters.from_id);
  }
  return result;
}

/**
 * 全優先ルールを取得
 */
export function getPriorityRules() {
  return kbData.priority_rules || [];
}

// ─── Core suggestion engine ───

/**
 * テキストマッチでKBアイテムを検索（あいまい一致）
 */
function fuzzyMatchItems(queryText, itemType) {
  if (!queryText) return [];
  const q = queryText.toLowerCase();
  const words = q.split(/[、,・\s/]+/).filter(w => w.length > 1);

  const candidates = itemsByType[itemType] || [];
  const scored = candidates.map(item => {
    const title = (item.title || '').toLowerCase();
    const content = (item.content || '').toLowerCase();

    let score = 0;
    // 完全一致
    if (title === q) score += 100;
    // 部分一致
    if (title.includes(q) || q.includes(title)) score += 60;
    if (content.includes(q)) score += 30;
    // ワード一致
    for (const word of words) {
      if (title.includes(word)) score += 15;
      if (content.includes(word)) score += 8;
    }

    return { item, score };
  }).filter(s => s.score > 0);

  return scored.sort((a, b) => b.score - a.score).slice(0, 20);
}

/**
 * 観察所見からテスト候補を提案
 */
export function suggestTestsForObservation(observationName, context = {}) {
  // 1. KB内の観察アイテムをマッチ
  const matched = fuzzyMatchItems(observationName, 'observation');
  if (matched.length === 0) return [];

  // 2. マッチした観察からリンクを辿る
  const suggestions = [];
  const seen = new Set();

  for (const { item: obsItem, score: matchScore } of matched) {
    const outLinks = linksByFrom[obsItem.id] || [];
    for (const link of outLinks) {
      if (link.link_type !== 'observation_to_test') continue;
      const testItem = itemById[link.to_id];
      if (!testItem || seen.has(testItem.id)) continue;
      seen.add(testItem.id);

      suggestions.push({
        item: testItem,
        link,
        matchedObservation: obsItem,
        sources: getSourcesByKeys(link.source_keys || testItem.source_keys),
        priority: computePriority(link, testItem, matchScore, context),
      });
    }
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

/**
 * テスト結果から評価候補を提案
 */
export function suggestEvaluationsForTest(testName, context = {}) {
  const matched = fuzzyMatchItems(testName, 'test');
  if (matched.length === 0) return [];

  const suggestions = [];
  const seen = new Set();

  for (const { item: testItem, score: matchScore } of matched) {
    const outLinks = linksByFrom[testItem.id] || [];
    for (const link of outLinks) {
      if (link.link_type !== 'test_to_evaluation') continue;
      const evalItem = itemById[link.to_id];
      if (!evalItem || seen.has(evalItem.id)) continue;
      seen.add(evalItem.id);

      suggestions.push({
        item: evalItem,
        link,
        matchedTest: testItem,
        sources: getSourcesByKeys(link.source_keys || evalItem.source_keys),
        priority: computePriority(link, evalItem, matchScore, context),
      });
    }
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

/**
 * 評価から介入候補を提案
 */
export function suggestInterventionsForEvaluation(evaluationTitle, context = {}) {
  const matched = fuzzyMatchItems(evaluationTitle, 'evaluation');
  if (matched.length === 0) return [];

  const suggestions = [];
  const seen = new Set();

  for (const { item: evalItem, score: matchScore } of matched) {
    const outLinks = linksByFrom[evalItem.id] || [];
    for (const link of outLinks) {
      if (link.link_type !== 'evaluation_to_intervention') continue;
      const ivItem = itemById[link.to_id];
      if (!ivItem || seen.has(ivItem.id)) continue;
      seen.add(ivItem.id);

      suggestions.push({
        item: ivItem,
        link,
        matchedEvaluation: evalItem,
        sources: getSourcesByKeys(link.source_keys || ivItem.source_keys),
        priority: computePriority(link, ivItem, matchScore, context),
      });
    }
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

/**
 * 介入から再評価候補を提案
 */
export function suggestReevaluationsForIntervention(interventionName, context = {}) {
  const matched = fuzzyMatchItems(interventionName, 'intervention');
  if (matched.length === 0) return [];

  const suggestions = [];
  const seen = new Set();

  for (const { item: ivItem, score: matchScore } of matched) {
    const outLinks = linksByFrom[ivItem.id] || [];
    for (const link of outLinks) {
      if (link.link_type !== 'intervention_to_reevaluation') continue;
      const reItem = itemById[link.to_id];
      if (!reItem || seen.has(reItem.id)) continue;
      seen.add(reItem.id);

      suggestions.push({
        item: reItem,
        link,
        matchedIntervention: ivItem,
        sources: getSourcesByKeys(link.source_keys || reItem.source_keys),
        priority: computePriority(link, reItem, matchScore, context),
      });
    }
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

// ─── Priority computation ───

function computePriority(link, targetItem, matchScore, context) {
  let score = (link.priority_weight || 50) + (matchScore * 0.3);

  // 部位マッチボーナス
  if (context.body_region && targetItem.body_region) {
    if (targetItem.body_region === context.body_region ||
        targetItem.body_region_label === context.body_region) {
      score += 15;
    }
  }

  // 動作マッチボーナス
  if (context.movement_theme && targetItem.movement_theme) {
    if (targetItem.movement_theme.includes(context.movement_theme)) {
      score += 10;
    }
  }

  // 対象マッチ
  if (context.target_population && targetItem.target_population) {
    if (targetItem.target_population.includes(context.target_population)) {
      score += 10;
    }
  }

  // 優先ルール適用
  const rules = kbData.priority_rules || [];
  for (const rule of rules) {
    if (rule.rule_type === 'population_movement') {
      if (context.target_population && context.movement_theme) {
        if (rule.rule_key.includes(context.target_population) &&
            rule.condition_key === context.movement_theme) {
          score += (rule.weight_adjustment || 0);
        }
      }
    }
    if (rule.rule_type === 'region_syndrome') {
      if (context.body_region && rule.rule_key === context.body_region) {
        // Check if target item title appears in boost fields
        const title = targetItem.title.toLowerCase();
        const boosts = [
          rule.boost_observations, rule.boost_tests,
          rule.boost_interventions, rule.boost_reevaluations,
        ].filter(Boolean).join(',').toLowerCase();
        if (boosts && title.split(/[、,]/).some(w => boosts.includes(w.trim()))) {
          score += 20;
        }
      }
    }
  }

  // Evidence level bonus
  const evBonus = { A: 8, B: 4, C: 0 };
  const evLevel = targetItem.evidence_level || link.evidence_level || '';
  score += evBonus[evLevel] || 0;

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ─── Utility ───

export function getUniqueBodyRegions() {
  const set = new Set();
  kbData.items.forEach(i => { if (i.body_region_label) set.add(i.body_region_label); });
  return [...set].sort();
}

export function getUniqueMovementThemes() {
  const set = new Set();
  kbData.items.forEach(i => { if (i.movement_theme) set.add(i.movement_theme); });
  return [...set].sort();
}

export function getUniquePopulations() {
  const set = new Set();
  kbData.items.forEach(i => { if (i.target_population) set.add(i.target_population); });
  return [...set].sort();
}

export function getUniqueLayers() {
  const set = new Set();
  kbData.items.forEach(i => { if (i.layer) set.add(i.layer); });
  return [...set].sort();
}
