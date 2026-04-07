import { v4 as uuidv4 } from 'uuid';

// --- Users ---
export const USERS = [
  {
    id: 'user-001',
    email: 'tanaka@example.com',
    name: '田中 健太',
    role: 'admin',
    password: 'demo1234',
  },
  {
    id: 'user-002',
    email: 'suzuki@example.com',
    name: '鈴木 美咲',
    role: 'trainer',
    password: 'demo1234',
  },
];

// --- Clients ---
export const CLIENTS = [
  {
    id: 'client-001',
    trainerId: 'user-001',
    name: '山田 花子',
    age: 32,
    gender: '女性',
    status: 'active',
    flags: [],
    createdAt: '2026-03-01',
    latestChiefComplaint: 'スクワットで前ももばかり張る',
    latestGoal: 'ヒップラインを整えたい',
    sessionCount: 5,
    lastSessionDate: '2026-04-01',
    nextSessionDate: '2026-04-07',
  },
  {
    id: 'client-002',
    trainerId: 'user-001',
    name: '佐藤 太郎',
    age: 45,
    gender: '男性',
    status: 'active',
    flags: [{ type: 'referral', label: '要紹介判断', note: '頸部痛が2週間以上持続' }],
    createdAt: '2026-02-15',
    latestChiefComplaint: '姿勢を良くしたい',
    latestGoal: '写真で見た印象を整えたい',
    sessionCount: 8,
    lastSessionDate: '2026-04-03',
    nextSessionDate: '2026-04-08',
  },
  {
    id: 'client-003',
    trainerId: 'user-002',
    name: '伊藤 恵美',
    age: 28,
    gender: '女性',
    status: 'active',
    flags: [{ type: 'attention', label: '注意', note: '以前ヨガで肩を痛めた経験あり' }],
    createdAt: '2026-03-10',
    latestChiefComplaint: '肩こりと腕の上げづらさ',
    latestGoal: '首肩を楽にしつつ見た目も整えたい',
    sessionCount: 3,
    lastSessionDate: '2026-04-05',
    nextSessionDate: '2026-04-10',
  },
];

// --- Intake Forms ---
export const INTAKE_FORMS = [
  {
    id: 'intake-001',
    clientId: 'client-001',
    chiefComplaint: 'スクワットで前ももばかり張る。お尻に効いている感じがない。',
    goal: 'ヒップラインを整えたい。ヒップアップして後ろ姿に自信を持ちたい。',
    concerns: '何年もトレーニングしているが下半身が変わらない。膝が内側に入りやすい。',
    desires: 'お尻の形を変えたい。スクワットをちゃんとできるようになりたい。',
    timeline: '3ヶ月後の夏までに変化を感じたい',
    history: '2年前からジム通い。独学でスクワット中心。最近膝が少し気になる。',
    medicalHistory: '特になし',
    medications: 'なし',
    occupation: 'デスクワーク（IT企業）1日8時間座位',
    sleep: '6時間程度。寝つきは普通。',
    nutrition: '朝食抜き。タンパク質は意識して摂取。',
    stress: '仕事のストレスはやや高め。繁忙期は残業多い。',
    exerciseHistory: 'ジム2年。週3回。スクワット・レッグプレス中心。',
    successExperience: '上半身のトレーニングでは筋肉がつきやすい実感あり',
    failureExperience: '下半身トレーニングはやればやるほど太もも前が太くなる気がする',
    notes: 'この日は足首が少し硬く、フルスクワットが深くしゃがめない印象。',
    aiSummary: {
      chiefComplaint: 'スクワット時の前もも優位な筋活動パターン',
      goal: 'ヒップラインの改善・臀筋の活性化',
      concerns: ['長期間の下半身トレーニングで変化が少ない', '膝の内側への動揺'],
      desires: ['臀筋優位のスクワット習得', 'ヒップアップ'],
      backgroundFactors: ['長時間座位（IT企業）', '朝食欠食', '足関節の可動性低下の可能性'],
      followUpQuestions: [
        '足首の硬さはいつ頃から気になりますか？',
        '膝が内側に入るのは荷重時のみですか？',
        '呼吸を止めてスクワットしていませんか？',
        '普段の立ち方で体重はどこにかかっていますか？',
      ],
    },
    createdAt: '2026-03-01',
  },
  {
    id: 'intake-002',
    clientId: 'client-002',
    chiefComplaint: '姿勢を良くしたい。猫背だと言われる。写真を撮ると自分の姿勢が気になる。',
    goal: '写真で見た印象を整えたい。特に横からのシルエットを改善したい。',
    concerns: '姿勢を意識しても長時間維持できない。背中を反らすと腰が痛い。',
    desires: '自然と良い姿勢でいられるようになりたい。首肩の疲れも減らしたい。',
    timeline: '半年くらいかけて改善したい',
    history: '若い頃は気にならなかった。40代に入ってから同僚に指摘されるようになった。',
    medicalHistory: '腰椎ヘルニア（10年前、保存療法で改善）',
    medications: 'なし',
    occupation: '管理職。デスクワーク中心。会議が多い。',
    sleep: '5-6時間。中途覚醒あり。',
    nutrition: '外食が多い。飲酒は週3回程度。',
    stress: '管理職のプレッシャーが高い。慢性的に肩が凝っている。',
    exerciseHistory: '学生時代は野球。現在は週1でジョギング。',
    successExperience: 'ジョギングを始めて体重が少し減った',
    failureExperience: '姿勢矯正ベルトを買ったが続かなかった',
    notes: '頸部の痛みが2週間続いている。要確認。',
    aiSummary: {
      chiefComplaint: '姿勢不良（猫背傾向）、写真映りへの不満',
      goal: '横からのシルエット改善・自然な姿勢保持',
      concerns: ['姿勢維持の持続困難', '腰部伸展時の痛み'],
      desires: ['無意識での良姿勢', '首肩の疲労軽減'],
      backgroundFactors: ['腰椎ヘルニア既往', '管理職ストレス', '飲酒頻度', '睡眠の質低下'],
      followUpQuestions: [
        '頸部の痛みの部位と程度を教えてください',
        '痛みは安静時にもありますか？',
        '腕のしびれや筋力低下はありますか？',
        '腰のヘルニア後、リハビリは行いましたか？',
      ],
    },
    createdAt: '2026-02-15',
  },
  {
    id: 'intake-003',
    clientId: 'client-003',
    chiefComplaint: '肩こりがひどい。腕を上げると途中で詰まる感じがある。',
    goal: '首肩を楽にしつつ、見た目も整えたい。いかり肩を改善したい。',
    concerns: 'マッサージに行っても翌日には戻る。デスクワーク中に首が前に出る。',
    desires: 'ストレッチだけでなく根本的に改善したい。肩のラインをきれいにしたい。',
    timeline: '2-3ヶ月で楽になりたい',
    history: '大学時代から肩こり持ち。社会人になって悪化。最近は頭痛も出る。',
    medicalHistory: 'ヨガで肩を痛めた経験あり（1年前、右肩）',
    medications: '偏頭痛時にロキソニン',
    occupation: 'Webデザイナー。1日10時間以上PC作業。',
    sleep: '7時間。ただし枕が合わず首が疲れる。',
    nutrition: '自炊中心。食事バランスは比較的良い。',
    stress: '締め切りのプレッシャー。画面を長時間見続ける。',
    exerciseHistory: 'ヨガ3年。最近はサボりがち。以前はダンスも。',
    successExperience: 'ヨガで体が柔らかくなった実感はあった',
    failureExperience: 'ヨガのポーズで無理をして肩を痛めた',
    notes: '右肩の既往に注意。挙上時に代償動作を確認すること。',
    aiSummary: {
      chiefComplaint: '慢性的な肩こり・肩関節挙上時の制限感',
      goal: '肩こり改善・肩周囲のシルエット改善（いかり肩）',
      concerns: ['マッサージの効果が持続しない', '頭痛の随伴'],
      desires: ['根本的な肩こり改善', '肩のライン改善'],
      backgroundFactors: ['長時間PC作業', '右肩の既往', '偏頭痛', '枕の不適合'],
      followUpQuestions: [
        '腕を上げる際、どの角度で詰まりますか？',
        '右肩を痛めた際の動きはどのようなものでしたか？',
        '呼吸は胸式ですか？腹式ですか？',
        '頭痛は肩こりと連動しますか？',
      ],
    },
    createdAt: '2026-03-10',
  },
];

// --- Sessions ---
export const SESSIONS = [
  {
    id: 'session-001',
    clientId: 'client-001',
    trainerId: 'user-001',
    sessionNumber: 5,
    sessionType: 'followup',
    status: 'completed',
    date: '2026-04-01',
    createdAt: '2026-04-01',
  },
  {
    id: 'session-002',
    clientId: 'client-002',
    trainerId: 'user-001',
    sessionNumber: 8,
    sessionType: 'followup',
    status: 'in_progress',
    date: '2026-04-07',
    createdAt: '2026-04-07',
  },
  {
    id: 'session-003',
    clientId: 'client-003',
    trainerId: 'user-002',
    sessionNumber: 3,
    sessionType: 'followup',
    status: 'completed',
    date: '2026-04-05',
    createdAt: '2026-04-05',
  },
];

// --- Hypotheses (代表ケース1用) ---
export const HYPOTHESES = [
  {
    id: 'hyp-001',
    sessionId: 'session-001',
    category: '構造・可動性仮説',
    description: '足関節背屈制限により、スクワット時に重心が前方偏位し、前もも優位パターンとなっている可能性',
    rationale: '問診より足首の硬さの自覚あり。デスクワーク長時間の背景因子もあり、下腿三頭筋の短縮が示唆される',
    priority: 1,
    status: 'adopted',
    source: 'ai',
    nextCheck: '足関節背屈ROM（膝屈曲位・伸展位）、ウォールテスト',
  },
  {
    id: 'hyp-002',
    sessionId: 'session-001',
    category: '運動制御仮説',
    description: 'スクワット降下相での股関節屈曲不足（ヒンジ不足）により、膝関節優位の動作パターンとなっている可能性',
    rationale: '前もも優位と膝の内側動揺から、股関節の運動制御に課題がある可能性',
    priority: 2,
    status: 'adopted',
    source: 'ai',
    nextCheck: 'ヒップヒンジパターンの確認、片脚スクワットでの制御評価',
  },
  {
    id: 'hyp-003',
    sessionId: 'session-001',
    category: '呼吸・圧仮説',
    description: 'スクワット時の息止め・過度な腹腔内圧戦略により、体幹が硬直して股関節の自由度が低下している可能性',
    rationale: 'トレーニング経験2年だが呼吸法の指導を受けた経歴なし。息止めを自覚しているか確認が必要',
    priority: 3,
    status: 'pending',
    source: 'ai',
    nextCheck: 'スクワット時の呼吸パターン観察、腹部の膨張パターン確認',
  },
  {
    id: 'hyp-004',
    sessionId: 'session-001',
    category: '感覚入力仮説',
    description: '足部の感覚入力が不十分で、接地ポイントが前足部に偏り、後方荷重ができていない可能性',
    rationale: '長時間靴着用＋デスクワークで足底感覚が低下している可能性。荷重位置の自覚を確認する価値がある',
    priority: 4,
    status: 'pending',
    source: 'ai',
    nextCheck: '裸足での立位バランス評価、足底3点意識テスト',
  },
];

// --- Interventions ---
export const INTERVENTIONS = [
  {
    id: 'int-001',
    sessionId: 'session-001',
    name: 'カーフストレッチ（壁使用）',
    intent: '足関節背屈可動域の一時的改善を確認し、スクワットへの影響を検証する',
    targetHypothesisId: 'hyp-001',
    reevaluationItems: ['背屈ROM変化', 'スクワット深さの変化', '前もも張り感の変化'],
    nextSessionNote: '次回も背屈改善が保持されているか確認',
    source: 'ai',
  },
  {
    id: 'int-002',
    sessionId: 'session-001',
    name: 'ボックスヒップヒンジドリル',
    intent: '股関節屈曲パターンの再学習。ボックスを使い安全に動きの感覚を確認',
    targetHypothesisId: 'hyp-002',
    reevaluationItems: ['ヒンジ動作の改善', 'スクワット時の膝前方動揺の変化'],
    nextSessionNote: '自宅でもヒンジ練習を行えるか確認',
    source: 'ai',
  },
];

// --- Helper Functions ---
export function getClientById(id) {
  return CLIENTS.find(c => c.id === id);
}

export function getIntakeByClientId(clientId) {
  return INTAKE_FORMS.find(f => f.clientId === clientId);
}

export function getSessionsByClientId(clientId) {
  return SESSIONS.filter(s => s.clientId === clientId);
}

export function getHypothesesBySessionId(sessionId) {
  return HYPOTHESES.filter(h => h.sessionId === sessionId);
}

export function getInterventionsBySessionId(sessionId) {
  return INTERVENTIONS.filter(i => i.sessionId === sessionId);
}

export function getTodaySessions() {
  const today = new Date().toISOString().split('T')[0];
  return SESSIONS.filter(s => s.date === today).map(s => ({
    ...s,
    client: getClientById(s.clientId),
  }));
}

export function getClientsWithFlags() {
  return CLIENTS.filter(c => c.flags && c.flags.length > 0);
}
