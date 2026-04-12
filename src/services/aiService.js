/**
 * AI Service — Supabase Edge Functions + Direct API fallback
 */
import { supabase } from '../lib/supabase';

const AI_DISCLAIMER = 'これは診断ではありません。可能性のある候補として提示しています。最終判断は指導者が行ってください。';

// Try Edge Function first, fall back to direct API call
async function callAI(promptType, inputData) {
  // Attempt Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('ai-analyze', {
      body: { type: promptType, data: inputData },
    });
    if (!error && data) return data;
  } catch (e) {
    console.warn('[AI] Edge Function unavailable, trying direct API...');
  }

  // Fallback: direct OpenAI call with stored key
  const { data: profile } = await supabase
    .from('profiles')
    .select('openai_api_key')
    .eq('id', (await supabase.auth.getUser()).data.user.id)
    .single();

  const apiKey = profile?.openai_api_key || localStorage.getItem('hst_openai_key');
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。設定画面からAPIキーを入力してください。');
  }

  return callOpenAIDirect(apiKey, promptType, inputData);
}

async function callOpenAIDirect(apiKey, promptType, inputData) {
  const prompts = {
    'intake-summary': SYSTEM_PROMPT_A,
    'hypothesis-generation': SYSTEM_PROMPT_B,
    'intervention-generation': SYSTEM_PROMPT_C,
    'explanation-generation': SYSTEM_PROMPT_D,
    'suggest-observations': SYSTEM_PROMPT_OTE_OBS,
    'suggest-tests': SYSTEM_PROMPT_OTE_TEST,
    'suggest-evaluations': SYSTEM_PROMPT_OTE_EVAL,
    'session-structuring': SYSTEM_PROMPT_E,
    'client-summary': SYSTEM_PROMPT_F,
    'intake-autofill': SYSTEM_PROMPT_G,
  };

  const systemPrompt = prompts[promptType];
  if (!systemPrompt) throw new Error(`Unknown prompt type: ${promptType}`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt + '\n\n必ずJSON形式のみで返答してください。余計なテキストは含めないでください。' },
        { role: 'user', content: JSON.stringify(inputData, null, 2) },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  // Try to extract JSON from response (handles markdown code blocks)
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  try {
    return JSON.parse(jsonMatch[1].trim());
  } catch {
    return JSON.parse(content.trim());
  }
}

// ============ System Prompts ============

const SYSTEM_PROMPT_A = `あなたはパーソナルトレーナーの思考支援アシスタントです。
クライアントの問診情報を構造化し、追加確認が望ましい質問を提案してください。

【絶対ルール】
- 病名診断をしない
- 原因を断定しない
- 「〜の可能性がある」「〜を確認する価値がある」のような表現を使う
- 不安を煽る表現を避ける
- 単一の筋肉や構造だけで説明しない

以下のJSON形式で回答してください：
{
  "chief_complaint": "主訴の要約",
  "goal": "目標の要約",
  "concerns": ["困りごとリスト"],
  "desires": ["望みリスト"],
  "background_factors": ["背景因子リスト"],
  "follow_up_questions": ["追加確認質問リスト（3-5個）"],
  "disclaimer": "これは診断ではありません。"
}`;

const SYSTEM_PROMPT_B = `あなたはパーソナルトレーナーの仮説思考を支援するアシスタントです。
観察所見・評価所見・背景因子から、6カテゴリの仮説候補を生成してください。

【仮説カテゴリ（必ず全6カテゴリで考える）】
1. 構造・可動性仮説 2. 筋機能仮説 3. 運動制御仮説
4. 感覚入力仮説 5. 呼吸・圧仮説 6. 生活背景仮説

【絶対ルール】
- 「原因は○○です」と断定しない
- 「可能性がある仮説候補」として提示
- 各仮説に短い根拠を添える
- 仮説ごとに次に見るべき評価候補を出す

以下のJSON形式で回答：
{
  "hypotheses": [
    { "category": "カテゴリ名", "description": "仮説の説明", "rationale": "根拠", "priority": 1, "next_checks": ["確認項目"] }
  ],
  "disclaimer": "これらは可能性のある候補です。"
}`;

const SYSTEM_PROMPT_C = `あなたはパーソナルトレーナーの介入設計を支援するアシスタントです。
採用された仮説に基づき、小さな介入候補を提案してください。

【絶対ルール】
- 介入は改善手段かつ検証手段として設計する
- 初回で試しやすい小さい介入を優先する
- 各介入に再評価すべき項目を必ず紐づける
- 介入候補は3-5個程度

以下のJSON形式で回答：
{
  "interventions": [
    { "name": "介入名", "intent": "意図", "target_hypothesis_category": "対象カテゴリ", "reevaluation_items": ["再評価項目"], "next_session_note": "次回観点", "difficulty": "easy|moderate|advanced" }
  ],
  "disclaimer": "安全性の最終判断は指導者が行ってください。"
}`;

const SYSTEM_PROMPT_D = `あなたはパーソナルトレーナーがクライアントに説明する文章を作成するアシスタントです。

【絶対ルール】
- 専門用語を避け、平易だが幼くしない
- 不安を煽らない
- ポジティブで建設的なトーン

以下のJSON形式で回答：
{
  "client_explanation": "クライアント向け説明文（200-300文字）",
  "homework_explanation": "ホームワークの意図説明（100-200文字）",
  "next_focus": "次回見るポイント（100文字程度）"
}`;

// ─── OTE用プロンプト ──────────────────────────

const SYSTEM_PROMPT_OTE_OBS = `あなたはパーソナルトレーナーの観察を支援するアシスタントです。
クライアントの問診情報を読み、セッションで観察すべきポイントを提案してください。

【カテゴリ】
- static: 静的観察（立位姿勢など）
- dynamic: 動的観察（スクワット、ヒンジなど）
- breathing: 呼吸観察
- sensory: 感覚入力観察

【絶対ルール】
- 断定しない。「確認する価値がある」程度の表現
- 5〜10項目程度に絞る
- 主訴と目標に関連する項目を優先

以下のJSON形式で回答：
{
  "suggestions": [
    { "category": "dynamic", "name": "スクワットで膝関節内側偏位", "reason": "膝が内側に入りやすいとの訴え" }
  ]
}`;

const SYSTEM_PROMPT_OTE_TEST = `あなたはパーソナルトレーナーのテスト選択を支援するアシスタントです。
観察所見を読み、確かめるべきテストを提案してください。

【カテゴリ】
- mobility: 可動性テスト
- muscle_stability: 筋機能・安定性テスト
- sensory: 感覚系テスト
- breathing_pressure: 呼吸・圧テスト

【絶対ルール】
- 各観察所見に対して1〜3個のテスト候補
- テストは実施可能で安全なもの
- どの観察を確かめるためかを明記

以下のJSON形式で回答：
{
  "suggestions": [
    { "category": "mobility", "name": "足関節背屈ウォールテスト", "for_observation": "踵荷重が抜けやすい", "reason": "背屈制限の確認" }
  ]
}`;

const SYSTEM_PROMPT_OTE_EVAL = `あなたはパーソナルトレーナーの評価解釈を支援するアシスタントです。
観察所見とテスト結果を読み、複数の評価解釈候補を提案してください。

【カテゴリ】
- structure_mobility: 構造・可動性解釈
- muscle_function: 筋機能解釈
- motor_control: 運動制御解釈
- sensory_input: 感覚入力解釈
- breathing_pressure: 呼吸・圧解釈
- lifestyle: 生活背景・修飾因子解釈

【種別】
- primary_factor: 主要因候補
- modifying_factor: 修飾因子候補
- resulting_finding: 結果として見えている所見

【絶対ルール】
- 単一原因に飛びつかない。必ず3つ以上の候補を出す
- 「〜の可能性」という表現を使う
- 根拠となる観察・テストを明記

以下のJSON形式で回答：
{
  "suggestions": [
    { "category": "structure_mobility", "title": "足関節背屈制限", "interpretation": "背屈制限により重心前方偏位の可能性", "type": "primary_factor", "priority": "high", "linked_observations": ["所見名"], "linked_tests": ["テスト名"] }
  ]
}`;

// ─── Prompt-E: セッション後構造化 ──────────────────

const SYSTEM_PROMPT_E = `あなたはパーソナルトレーナーのセッション記録を構造化するアシスタントです。
テキスト（文字起こし、自由メモ、箇条書き）を読み、以下のカテゴリに自動分類してください。

【最重要ルール】
事実と解釈を絶対に混ぜないでください。

1. 事実 (fact)
  - 観察で見た内容（例：スクワットで膝関節内側偏位あり）
  - テストの結果（例：足関節背屈 左低下）
  - 問診で聞いた内容（例：デスクワーク8時間）
  - 介入で行った内容（例：腹式呼吸エクササイズ実施）
  - 再評価結果（例：背屈角度 改善）

2. 解釈 (interpretation)
  - 評価（例：足部支持の不十分さの可能性）
  - 仮説（例：股関節制御の問題の可能性）

3. 推定が弱い項目 (tentative)
  - 明示的根拠は弱いが保持すべき項目
  - 「〜かもしれない」レベルの推定

【カテゴリ】
- intake: 問診情報
- observation: 観察所見（見た事実）
- test: テスト結果（確かめた事実）
- evaluation: 評価解釈
- hypothesis: 仮説
- intervention: 介入内容
- reevaluation: 再評価結果
- homework: ホームワーク
- next_plan: 次回方針
- notice: 要確認事項

【観察サブカテゴリ】
- static: 静的観察
- dynamic: 動的観察
- breathing: 呼吸観察
- sensory: 感覚入力

【テストサブカテゴリ】
- mobility: 可動性テスト
- muscle_stability: 筋機能テスト
- sensory: 感覚系テスト
- breathing_pressure: 呼吸・圧テスト

【評価サブカテゴリ】
- structure_mobility: 構造・可動性
- muscle_function: 筋機能
- motor_control: 運動制御
- sensory_input: 感覚入力
- breathing_pressure: 呼吸・圧
- lifestyle: 生活背景

以下のJSON形式で回答：
{
  "items": [
    {
      "id": "draft_001",
      "category": "observation",
      "title": "短いタイトル",
      "content": "詳細説明",
      "type": "fact",
      "confidence": "high",
      "source_excerpt": "元テキストの該当部分",
      "needs_review": true,
      "sub_category": "dynamic"
    }
  ],
  "unclassified": [
    { "text": "分類できなかったテキスト", "reason": "理由" }
  ]
}`;

const SYSTEM_PROMPT_F = `あなたはパーソナルトレーナーがクライアントに共有するセッション報告を作成するアシスタントです。

【絶対ルール】
- 専門用語を使わない。平易で安心できる文章
- 不安を煽らない
- ポジティブで建設的なトーン
- 「〜の問題」ではなく「〜を改善するポイント」
- 短く読みやすい文章

以下のJSON形式で回答：
{
  "today_checked": "今日確認したこと（2-3文）",
  "today_findings": "今日見えていたポイント（2-3文）",
  "today_intervention": "今日行ったこと（2-3文）",
  "changes": "変化したこと（1-2文）",
  "homework": [
    { "task": "やること", "frequency": "頻度", "purpose": "目的" }
  ],
  "next_check": "次回確認すること（1-2文）",
  "encouragement": "クライアントへの一言メッセージ"
}`;

const SYSTEM_PROMPT_G = `あなたはパーソナルトレーナーの問診入力を支援するアシスタントです。
自由記述や音声文字起こしのテキストから、問診票の各項目に内容を振り分けてください。

【問診票の項目（全16項目）】
1. chief_complaint: 主訴（一番困っていること、一番の訴え）
2. goal: 目標（こうなりたい、改善したいこと）
3. concerns: 困りごと（日常の困りごと、不便さ）
4. desires: 望み・希望（こうしたい、こうありたい）
5. timeline: 期間イメージ（いつまでに改善したいか）
6. history: 経緯（いつから、きっかけ、発症の流れ）
7. medical_history: 既往歴・医療情報（過去の怪我、病気、手術、通院）
8. medications: 服薬（現在の薬、サプリメント）
9. occupation: 仕事・生活環境（職業、労働時間、姿勢、通勤）
10. sleep: 睡眠（時間、質、寝つき、目覚め）
11. nutrition: 栄養（食事パターン、飲水、アルコール）
12. stress: ストレス（ストレス要因、リラックス方法）
13. exercise_history: 運動歴（過去・現在の運動習慣、スポーツ歴）
14. success_experience: 成功体験（うまくいった経験）
15. failure_experience: 失敗体験（うまくいかなかった経験）
16. notes: メモ（上記に当てはまらない特記事項）

【絶対ルール】
- テキストに書かれていないことを推測で埋めない
- 不明な項目は空にする
- 原文のニュアンスを変えない
- 病名診断をしない
- 1つの文が複数項目に該当する場合は、最も適切な1つに分類する
- 分類困難な内容はunclassifiedに入れる

以下のJSON形式で回答：
{
  "fields": {
    "chief_complaint": "テキストから抽出した主訴 or 空文字列",
    "goal": "",
    "concerns": "",
    "desires": "",
    "timeline": "",
    "history": "",
    "medical_history": "",
    "medications": "",
    "occupation": "",
    "sleep": "",
    "nutrition": "",
    "stress": "",
    "exercise_history": "",
    "success_experience": "",
    "failure_experience": "",
    "notes": ""
  },
  "filled_count": 5,
  "unclassified": [
    { "text": "分類できなかったテキスト", "reason": "理由" }
  ],
  "source_summary": "入力内容の簡潔な要約（1-2文）"
}`;

// ============ Public API ============

export async function promptA_IntakeSummary(intakeData) {
  try {
    const result = await callAI('intake-summary', intakeData);
    result.disclaimer = AI_DISCLAIMER;
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function promptB_HypothesisGeneration(observations, assessments, backgroundFactors) {
  try {
    const result = await callAI('hypothesis-generation', { observations, assessments, background_factors: backgroundFactors });
    result.disclaimer = AI_DISCLAIMER;
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function promptC_InterventionGeneration(adoptedHypotheses) {
  try {
    const result = await callAI('intervention-generation', { adopted_hypotheses: adoptedHypotheses });
    result.disclaimer = AI_DISCLAIMER;
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function promptD_ExplanationGeneration(chiefComplaint, hypotheses, interventions) {
  try {
    const result = await callAI('explanation-generation', { chief_complaint: chiefComplaint, hypotheses, interventions });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ OTE AI Suggestions ============

/**
 * 問診内容から観察で見るべきポイントを提案
 */
export async function suggestObservationsFromIntake(intakeData) {
  try {
    const result = await callAI('suggest-observations', {
      chief_complaint: intakeData.chief_complaint || intakeData.chiefComplaint || '',
      goal: intakeData.goal || '',
      concerns: intakeData.concerns || '',
      occupation: intakeData.occupation || '',
      exercise_history: intakeData.exercise_history || intakeData.exerciseHistory || '',
      medical_history: intakeData.medical_history || intakeData.medicalHistory || '',
      notes: intakeData.notes || '',
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 観察所見からテスト候補を提案
 */
export async function suggestTestsFromObservations(observationNames) {
  try {
    const result = await callAI('suggest-tests', { observations: observationNames });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 観察+テスト結果から評価解釈候補を提案
 */
export async function suggestEvaluationsFromFindings(observationNames, testResults) {
  try {
    const result = await callAI('suggest-evaluations', { observations: observationNames, tests: testResults });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ Prompt-E: Session Structuring ============

/**
 * テキスト（文字起こし・メモ等）からセッション内容をAI構造化
 */
export async function promptE_SessionStructuring(rawText, inputType, clientContext) {
  try {
    const result = await callAI('session-structuring', {
      input_type: inputType,
      raw_text: rawText,
      client_context: clientContext || {},
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ Prompt-F: Client Summary ============

/**
 * セッション全記録からクライアント共有用要約を生成
 */
export async function promptF_ClientSummary(sessionRecord) {
  try {
    const result = await callAI('client-summary', sessionRecord);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ Mock fallback ============

export function getMockIntakeSummary(intakeData) {
  return {
    chiefComplaint: intakeData.chiefComplaint || intakeData.chief_complaint || '',
    goal: intakeData.goal || '',
    concerns: [intakeData.concerns || ''].filter(Boolean),
    desires: [intakeData.desires || ''].filter(Boolean),
    backgroundFactors: [intakeData.occupation, intakeData.sleep, intakeData.stress].filter(Boolean).map(s => s.substring(0, 40)),
    followUpQuestions: [
      '症状はいつ頃から気になり始めましたか？',
      '日常生活で特に困る場面は具体的にどのような時ですか？',
      '過去に専門家に相談したことはありますか？',
      '現在のトレーニング時の呼吸の仕方を意識していますか？',
    ],
    disclaimer: AI_DISCLAIMER,
  };
}

// ============ Prompt-G: Intake Auto-fill ============

/**
 * 自由テキスト/文字起こしから問診票項目へ自動振り分け
 */
export async function promptG_IntakeAutofill(rawText) {
  try {
    const result = await callAI('intake-autofill', {
      raw_text: rawText,
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
