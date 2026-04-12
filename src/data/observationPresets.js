/**
 * 観察・テスト・評価 — プリセットデータ & 定数定義
 */

// ─── 観察カテゴリ ─────────────────────────────
export const OBSERVATION_CATEGORIES = {
  static:     { label: '静的観察',     icon: '🧍' },
  dynamic:    { label: '動的観察',     icon: '🏃' },
  breathing:  { label: '呼吸観察',     icon: '💨' },
  sensory:    { label: '感覚入力観察', icon: '👁️' },
  appearance: { label: '見た目観察',   icon: '📐' },
  freeNote:   { label: '自由メモ',     icon: '📝' },
};

// ─── テストカテゴリ ───────────────────────────
export const TEST_CATEGORIES = {
  mobility:          { label: '可動性テスト',         icon: '🔄' },
  muscle_stability:  { label: '筋機能・安定性テスト', icon: '💪' },
  sensory:           { label: '感覚系テスト',         icon: '🧠' },
  breathing_pressure:{ label: '呼吸・圧テスト',       icon: '🫁' },
  appearance_body:   { label: '見た目・体づくり評価', icon: '📏' },
  custom:            { label: '自由追加テスト',       icon: '➕' },
};

// ─── 評価カテゴリ ─────────────────────────────
export const EVALUATION_CATEGORIES = {
  structure_mobility:  { label: '構造・可動性解釈',       icon: '🦴' },
  muscle_function:     { label: '筋機能解釈',             icon: '💪' },
  motor_control:       { label: '運動制御解釈',           icon: '🎯' },
  sensory_input:       { label: '感覚入力解釈',           icon: '👁️' },
  breathing_pressure:  { label: '呼吸・圧解釈',           icon: '🫁' },
  lifestyle:           { label: '生活背景・修飾因子解釈', icon: '🏠' },
};

// ─── 選択肢定義 ───────────────────────────────
export const SEVERITY_OPTIONS = [
  { value: 'mild',     label: '軽度' },
  { value: 'moderate', label: '中等度' },
  { value: 'severe',   label: '強い' },
];

export const LATERALITY_OPTIONS = [
  { value: 'bilateral', label: '両側' },
  { value: 'left',      label: '左' },
  { value: 'right',     label: '右' },
  { value: 'left_dominant', label: '左優位' },
  { value: 'right_dominant', label: '右優位' },
  { value: 'none',      label: 'なし' },
];

export const CONDITION_OPTIONS = [
  { value: 'static',    label: '静止時' },
  { value: 'movement',  label: '動作時' },
  { value: 'repetition',label: '反復時' },
  { value: 'loaded',    label: '負荷時' },
  { value: 'descent',   label: '下降時' },
  { value: 'ascent',    label: '上昇時' },
];

export const TEST_RESULT_OPTIONS = [
  { value: 'normal',         label: '正常' },
  { value: 'decreased',      label: '低下' },
  { value: 'laterality_diff', label: '左右差あり' },
  { value: 'conditional',    label: '条件付き' },
];

export const EVAL_TYPE_OPTIONS = [
  { value: 'primary_factor',   label: '主要因候補',                 color: '#c0392b' },
  { value: 'modifying_factor', label: '修飾因子候補',               color: '#b8860b' },
  { value: 'resulting_finding',label: '結果として見えている所見',   color: '#555e6e' },
];

export const PRIORITY_OPTIONS = [
  { value: 'high',   label: '高', color: '#c0392b' },
  { value: 'medium', label: '中', color: '#b8860b' },
  { value: 'low',    label: '低', color: '#555e6e' },
];

// ─── 観察プリセット ───────────────────────────
export const OBSERVATION_PRESETS = {
  static: [
    '頭頸部前方偏位',
    '胸郭前方偏位',
    '骨盤前傾傾向',
    '荷重左右差',
    '足部回内傾向',
  ],
  dynamic: [
    'スクワットで膝関節内側偏位',
    'スクワットで前もも優位',
    'ヒンジで腰椎伸展代償',
    '片脚支持で骨盤側方偏位',
    '上肢挙上で肩甲帯挙上',
    '反復で崩れ増加',
  ],
  breathing: [
    '呼吸停止',
    '吸気優位',
    '頸部緊張増加',
    '胸郭上部優位',
    '呼気不足',
  ],
  sensory: [
    '視線固定で安定',
    '視線移動で不安定',
    '足底接地感が乏しい',
    '片側支持で不安定',
  ],
  appearance: [],
  freeNote: [],
};

// ─── テストプリセット ─────────────────────────
export const TEST_PRESETS = {
  mobility: [
    '足関節背屈',
    '股関節屈曲',
    '股関節回旋',
    '胸椎伸展',
    '肩関節屈曲',
    '肩甲帯可動性',
  ],
  muscle_stability: [
    '片脚支持保持',
    '股関節周囲制御',
    '体幹保持',
    '肩甲帯安定性',
    '足部支持',
    '左右差',
  ],
  sensory: [
    '視覚条件変更',
    '頭位変化',
    '足底入力変化',
    '支持面変更',
    '触覚入力追加',
  ],
  breathing_pressure: [
    '呼気で変化するか',
    '胸郭拡張性',
    '呼吸継続下で動作可能か',
    '胸郭-骨盤位置',
    '腹圧保持感',
  ],
  appearance_body: [],
  custom: [],
};

// ─── デモデータ (代表ケース: スクワット膝内側偏位) ──
export const DEMO_DATA = {
  observations: [
    {
      id: 'obs-demo-001',
      category: 'dynamic',
      name: 'スクワットで膝関節内側偏位',
      severity: 'moderate',
      laterality: 'bilateral',
      condition: 'descent',
      comment: '下降20°付近から出現',
      isPreset: true,
      timestamp: '2026-04-01T10:00:00',
    },
    {
      id: 'obs-demo-002',
      category: 'breathing',
      name: '下降で呼吸停止',
      severity: 'moderate',
      laterality: 'none',
      condition: 'descent',
      comment: 'スクワット下降時に息を止める傾向',
      isPreset: false,
      timestamp: '2026-04-01T10:01:00',
    },
    {
      id: 'obs-demo-003',
      category: 'dynamic',
      name: '踵荷重が抜けやすい',
      severity: 'mild',
      laterality: 'left_dominant',
      condition: 'loaded',
      comment: '荷重時に前足部偏位',
      isPreset: false,
      timestamp: '2026-04-01T10:02:00',
    },
    {
      id: 'obs-demo-004',
      category: 'dynamic',
      name: '反復で前もも優位増加',
      severity: 'moderate',
      laterality: 'bilateral',
      condition: 'repetition',
      comment: '5レップ以降で顕著',
      isPreset: false,
      timestamp: '2026-04-01T10:03:00',
    },
  ],
  tests: [
    {
      id: 'test-demo-001',
      category: 'mobility',
      name: '足関節背屈',
      result: 'laterality_diff',
      laterality: 'left',
      score: '左8cm / 右12cm',
      comment: '膝立位ウォールテストで左低下',
      linkedObservationIds: ['obs-demo-001', 'obs-demo-003'],
      isPreset: true,
      timestamp: '2026-04-01T10:05:00',
    },
    {
      id: 'test-demo-002',
      category: 'sensory',
      name: '足底接地を調整すると改善',
      result: 'conditional',
      laterality: 'none',
      score: '',
      comment: '3点接地を意識させるとValgus軽減',
      linkedObservationIds: ['obs-demo-001', 'obs-demo-003'],
      isPreset: false,
      timestamp: '2026-04-01T10:08:00',
    },
    {
      id: 'test-demo-003',
      category: 'breathing_pressure',
      name: '呼気を使うと膝軌道改善',
      result: 'conditional',
      laterality: 'none',
      score: '',
      comment: '呼気を意識させるとValgus軽減、体幹安定感増加',
      linkedObservationIds: ['obs-demo-001', 'obs-demo-002'],
      isPreset: false,
      timestamp: '2026-04-01T10:10:00',
    },
    {
      id: 'test-demo-004',
      category: 'muscle_stability',
      name: '片脚支持保持',
      result: 'laterality_diff',
      laterality: 'left',
      score: '左12秒 / 右20秒',
      comment: '左不安定、骨盤側方偏位あり',
      linkedObservationIds: ['obs-demo-001'],
      isPreset: true,
      timestamp: '2026-04-01T10:12:00',
    },
  ],
  evaluations: [
    {
      id: 'eval-demo-001',
      category: 'structure_mobility',
      title: '足関節背屈制限',
      interpretation: '左足関節背屈の制限により、スクワット時に重心が前方偏位し、膝内側偏位のドライバーとなっている可能性。ウォールテストで左右差を確認済み。',
      priority: 'high',
      type: 'primary_factor',
      linkedObservationIds: ['obs-demo-001', 'obs-demo-003'],
      linkedTestIds: ['test-demo-001'],
      nextCheck: '背屈ROM計測（膝屈曲位・伸展位）',
      sendToHypothesis: false,
      timestamp: '2026-04-01T10:15:00',
    },
    {
      id: 'eval-demo-002',
      category: 'sensory_input',
      title: '足部支持の不十分さ',
      interpretation: '足底の接地感覚が乏しく、3点接地を意識させると膝軌道が改善することから、足部からの感覚入力不足が膝内側偏位の一因と推定。',
      priority: 'high',
      type: 'primary_factor',
      linkedObservationIds: ['obs-demo-001', 'obs-demo-003'],
      linkedTestIds: ['test-demo-002', 'test-demo-004'],
      nextCheck: '裸足での立位バランス評価',
      sendToHypothesis: false,
      timestamp: '2026-04-01T10:18:00',
    },
    {
      id: 'eval-demo-003',
      category: 'breathing_pressure',
      title: '呼吸・圧戦略の不十分さ',
      interpretation: 'スクワット下降時に呼吸停止が見られ、呼気を意識させると膝軌道が改善。適切な呼吸・腹圧戦略が獲得できていない可能性。',
      priority: 'medium',
      type: 'primary_factor',
      linkedObservationIds: ['obs-demo-001', 'obs-demo-002'],
      linkedTestIds: ['test-demo-003'],
      nextCheck: '呼吸パターン評価、腹圧保持下でのスクワット再評価',
      sendToHypothesis: false,
      timestamp: '2026-04-01T10:20:00',
    },
    {
      id: 'eval-demo-004',
      category: 'muscle_function',
      title: '前もも優位は結果として見えている可能性',
      interpretation: '反復で前もも優位が増加するのは、上記の構造・感覚・呼吸の制限の結果として現れている代償パターンである可能性が高い。',
      priority: 'low',
      type: 'resulting_finding',
      linkedObservationIds: ['obs-demo-004'],
      linkedTestIds: [],
      nextCheck: '',
      sendToHypothesis: false,
      timestamp: '2026-04-01T10:22:00',
    },
    {
      id: 'eval-demo-005',
      category: 'lifestyle',
      title: 'デスクワーク中心で足部入力が乏しい可能性',
      interpretation: 'IT企業で1日8時間座位。靴着用時間が長く、足底感覚への刺激が慢性的に少ない環境要因が修飾因子として足部機能に影響している可能性。',
      priority: 'medium',
      type: 'modifying_factor',
      linkedObservationIds: ['obs-demo-003'],
      linkedTestIds: ['test-demo-002'],
      nextCheck: '',
      sendToHypothesis: false,
      timestamp: '2026-04-01T10:24:00',
    },
  ],
  freeNote: '',
};

// ─── ユーティリティ ───────────────────────────
let _counter = 0;
export function generateId(prefix) {
  _counter += 1;
  return `${prefix}-${Date.now()}-${_counter}`;
}

export function createObservation(category, name, isPreset = false) {
  return {
    id: generateId('obs'),
    category,
    name,
    severity: '',
    laterality: '',
    condition: '',
    comment: '',
    isPreset,
    timestamp: new Date().toISOString(),
  };
}

export function createTest(category, name, isPreset = false) {
  return {
    id: generateId('test'),
    category,
    name,
    result: '',
    laterality: '',
    score: '',
    comment: '',
    linkedObservationIds: [],
    isPreset,
    timestamp: new Date().toISOString(),
  };
}

export function createEvaluation(category) {
  return {
    id: generateId('eval'),
    category,
    title: '',
    interpretation: '',
    priority: 'medium',
    type: 'primary_factor',
    linkedObservationIds: [],
    linkedTestIds: [],
    nextCheck: '',
    sendToHypothesis: false,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 旧形式データを新形式にマイグレーション
 */
export function migrateObservations(oldData) {
  if (!oldData) return { observations: [], tests: [], evaluations: [], freeNote: '' };

  // 新形式チェック
  if (Array.isArray(oldData.observations)) return oldData;

  // 旧形式 → 新形式
  const observations = [];
  const tests = [];
  const evaluations = [];

  if (oldData.static) {
    oldData.static.forEach((item, i) => {
      observations.push({
        id: generateId('obs-migrated'),
        category: 'static',
        name: item.text || item,
        severity: '',
        laterality: '',
        condition: 'static',
        comment: '',
        isPreset: false,
        timestamp: item.timestamp || new Date().toISOString(),
      });
    });
  }

  if (oldData.dynamic) {
    oldData.dynamic.forEach((item) => {
      observations.push({
        id: generateId('obs-migrated'),
        category: 'dynamic',
        name: item.text || item,
        severity: '',
        laterality: '',
        condition: 'movement',
        comment: '',
        isPreset: false,
        timestamp: item.timestamp || new Date().toISOString(),
      });
    });
  }

  if (oldData.assessments) {
    oldData.assessments.forEach((item) => {
      tests.push({
        id: generateId('test-migrated'),
        category: 'custom',
        name: item.text || item,
        result: '',
        laterality: '',
        score: '',
        comment: '',
        linkedObservationIds: [],
        isPreset: false,
        timestamp: item.timestamp || new Date().toISOString(),
      });
    });
  }

  return {
    observations,
    tests,
    evaluations,
    freeNote: oldData.freeNote || '',
  };
}
