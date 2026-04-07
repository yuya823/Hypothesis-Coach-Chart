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
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: prompts[promptType] },
        { role: 'user', content: JSON.stringify(inputData, null, 2) },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
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
