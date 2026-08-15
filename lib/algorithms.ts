import type {
  EmotionLabel,
  FeatureVector,
  LearningState,
  RecommendationAction,
} from "./types";

export const emotionLabels: EmotionLabel[] = ["自然笑容", "惊讶", "低落", "紧张笑容"];

export type EmotionSample = {
  id: string;
  label: EmotionLabel;
  features: FeatureVector;
  note: string;
};

export const emotionTrainingSamples: EmotionSample[] = [
  { id: "h1", label: "自然笑容", features: { eyes: 82, brows: 54, mouth: 92 }, note: "弯眼、大幅上扬嘴角" },
  { id: "h2", label: "自然笑容", features: { eyes: 68, brows: 57, mouth: 78 }, note: "放松眼睛、上扬嘴角" },
  { id: "h3", label: "自然笑容", features: { eyes: 58, brows: 48, mouth: 68 }, note: "较轻的笑意" },
  { id: "s1", label: "惊讶", features: { eyes: 96, brows: 94, mouth: 55 }, note: "睁大眼、眉毛抬高" },
  { id: "s2", label: "惊讶", features: { eyes: 84, brows: 82, mouth: 62 }, note: "眼睛放大、嘴巴微张" },
  { id: "s3", label: "惊讶", features: { eyes: 74, brows: 76, mouth: 50 }, note: "较轻的惊讶" },
  { id: "n1", label: "低落", features: { eyes: 28, brows: 35, mouth: 22 }, note: "半闭眼、嘴角向下" },
  { id: "n2", label: "低落", features: { eyes: 38, brows: 40, mouth: 30 }, note: "眼睛低垂、嘴角向下" },
  { id: "n3", label: "低落", features: { eyes: 46, brows: 36, mouth: 38 }, note: "轻微低落表情" },
  { id: "m1", label: "紧张笑容", features: { eyes: 30, brows: 67, mouth: 91 }, note: "嘴角上扬但眼睛紧张" },
  { id: "m2", label: "紧张笑容", features: { eyes: 42, brows: 62, mouth: 80 }, note: "眼睛与嘴角信号不一致" },
  { id: "m3", label: "紧张笑容", features: { eyes: 50, brows: 58, mouth: 72 }, note: "较轻的紧张笑容" },
];

export const emotionTestSamples: EmotionSample[] = [
  { id: "t1", label: "自然笑容", features: { eyes: 64, brows: 52, mouth: 74 }, note: "自然上扬" },
  { id: "t2", label: "惊讶", features: { eyes: 80, brows: 86, mouth: 54 }, note: "眉眼明显抬高" },
  { id: "t3", label: "低落", features: { eyes: 40, brows: 37, mouth: 34 }, note: "眼睛低垂、嘴角较低" },
  { id: "t4", label: "紧张笑容", features: { eyes: 45, brows: 61, mouth: 77 }, note: "眼睛紧、嘴角扬" },
  { id: "t5", label: "自然笑容", features: { eyes: 72, brows: 58, mouth: 82 }, note: "明显自然笑容" },
  { id: "t6", label: "紧张笑容", features: { eyes: 53, brows: 55, mouth: 69 }, note: "信号较微弱" },
  { id: "t7", label: "惊讶", features: { eyes: 76, brows: 74, mouth: 58 }, note: "轻度惊讶" },
  { id: "t8", label: "低落", features: { eyes: 48, brows: 40, mouth: 39 }, note: "轻度低落" },
];

export type EmotionConfig = {
  sampleSize: "small" | "large";
  diversity: "narrow" | "diverse";
  labelOverrides?: Record<string, EmotionLabel>;
  additionalSamples?: EmotionSample[];
};

export type EmotionMetrics = {
  accuracy: number;
  averageConfidence: number;
  predictions: Array<EmotionSample & { predicted: EmotionLabel; confidence: number; distances: Record<EmotionLabel, number> }>;
  sampleCount: number;
  labelErrors: number;
  reason: string;
};

const distance = (a: FeatureVector, b: FeatureVector) =>
  Math.sqrt((a.eyes - b.eyes) ** 2 + (a.brows - b.brows) ** 2 + (a.mouth - b.mouth) ** 2);

export function buildEmotionTrainingSet(config: EmotionConfig): EmotionSample[] {
  const source = config.sampleSize === "small"
    ? emotionTrainingSamples.filter((sample) => ["h2", "s2", "n2", "m2"].includes(sample.id))
    : emotionTrainingSamples;
  const selected = source.map((sample) => ({
    ...sample,
    label: config.labelOverrides?.[sample.id] ?? sample.label,
  }));

  const trainingSamples = config.diversity === "narrow"
    ? selected.map((sample) => {
        const prototype = emotionTrainingSamples.find((item) => item.label === sample.label) ?? sample;
        return { ...sample, features: prototype.features, note: "同类样本使用了相近的典型特征" };
      })
    : selected;
  return [...trainingSamples, ...(config.additionalSamples ?? [])];
}

export function runEmotionModel(config: EmotionConfig): EmotionMetrics {
  const trainingSet = buildEmotionTrainingSet(config);

  const centroids = Object.fromEntries(
    emotionLabels.map((label) => {
      const samples = trainingSet.filter((sample) => sample.label === label);
      const fallback = emotionTrainingSamples.find((sample) => sample.label === label)!;
      const list = samples.length ? samples : [fallback];
      return [
        label,
        {
          eyes: list.reduce((sum, item) => sum + item.features.eyes, 0) / list.length,
          brows: list.reduce((sum, item) => sum + item.features.brows, 0) / list.length,
          mouth: list.reduce((sum, item) => sum + item.features.mouth, 0) / list.length,
        },
      ];
    }),
  ) as Record<EmotionLabel, FeatureVector>;

  const predictions = emotionTestSamples.map((sample) => {
    const distances = Object.fromEntries(
      emotionLabels.map((label) => [label, distance(sample.features, centroids[label])]),
    ) as Record<EmotionLabel, number>;
    const ranked = emotionLabels.toSorted((a, b) => distances[a] - distances[b]);
    const margin = distances[ranked[1]] - distances[ranked[0]];
    const confidence = Math.round(Math.max(52, Math.min(96, 58 + margin * 2.2)));
    return { ...sample, predicted: ranked[0], confidence, distances };
  });
  const correct = predictions.filter((item) => item.predicted === item.label).length;
  const labelErrors = trainingSet.filter(
    (item) => emotionTrainingSamples.find((base) => base.id === item.id)?.label !== item.label,
  ).filter((item) => emotionTrainingSamples.some((base) => base.id === item.id)).length;
  const reasons = [];
  if (config.sampleSize === "small") reasons.push("样本少，类别中心由少数夸张表情决定");
  if (config.diversity === "narrow") reasons.push("样本覆盖偏窄，轻微表情更容易混淆");
  if (labelErrors) reasons.push(`${labelErrors} 个错误标签把类别中心拉向了错误方向`);
  if (config.additionalSamples?.length) reasons.push(`${config.additionalSamples.length} 张真人贴标签样本已参与计算`);
  if (!reasons.length) reasons.push("较多且多样的正确样本让类别中心更接近测试表情");

  return {
    accuracy: Math.round((correct / predictions.length) * 100),
    averageConfidence: Math.round(predictions.reduce((sum, item) => sum + item.confidence, 0) / predictions.length),
    predictions,
    sampleCount: trainingSet.length,
    labelErrors,
    reason: reasons.join("；") + "。",
  };
}

export const recommendationCategories = ["音乐", "游戏", "动漫", "运动", "科技", "校园生活"] as const;
export type RecommendationCategory = (typeof recommendationCategories)[number];
export type RecommendationWeights = Record<RecommendationCategory, number>;

export const initialWeights = (): RecommendationWeights => ({
  音乐: 5,
  游戏: 5,
  动漫: 5,
  运动: 5,
  科技: 5,
  校园生活: 5,
});

export function applyRecommendationAction(
  weights: RecommendationWeights,
  category: RecommendationCategory,
  action: RecommendationAction["action"],
): RecommendationWeights {
  const delta = action === "点赞" ? 3 : action === "停留查看" ? 1 : -1;
  return { ...weights, [category]: Math.max(1, weights[category] + delta) };
}

export function recommendationStats(weights: RecommendationWeights) {
  const total = recommendationCategories.reduce((sum, category) => sum + weights[category], 0);
  const ratios = recommendationCategories.map((category) => ({
    category,
    weight: weights[category],
    ratio: Math.round((weights[category] / total) * 1000) / 10,
  }));
  const entropy = ratios.reduce((sum, item) => {
    const p = item.ratio / 100;
    return p ? sum - p * Math.log(p) : sum;
  }, 0);
  const diversity = Math.round((entropy / Math.log(recommendationCategories.length)) * 100);
  const top = ratios.toSorted((a, b) => b.weight - a.weight)[0];
  return { ratios, diversity, top };
}

export type AbilityResult = { dimension: string; level: number; evidence: string };

export function calculateAbilities(state: LearningState): AbilityResult[] {
  const emotion = state.emotionReport;
  const detective = state.detectiveResults;
  const design = state.agentDesign;
  const variableEvents = state.evidence.filter((event) => event.kind === "变量").length;
  const reflectionEvents = state.evidence.filter((event) => event.kind === "反思").length;

  return [
    {
      dimension: "AI理解力",
      level: emotion ? (emotion.explanation.trim().length >= 18 ? 4 : 3) : variableEvents ? 2 : 1,
      evidence: emotion ? `模型报告：准确率 ${emotion.beforeAccuracy}% → ${emotion.afterAccuracy}%` : "尚未形成模型测试报告",
    },
    {
      dimension: "实验探究力",
      level: variableEvents >= 2 && emotion?.explanation ? 4 : variableEvents >= 1 ? 3 : state.evidence.length ? 2 : 1,
      evidence: variableEvents ? `${variableEvents} 条变量对照记录` : "尚未完成变量对照",
    },
    {
      dimension: "证据判断力",
      level: detective.length >= 3 ? 4 : detective.length >= 1 ? 3 : state.evidence.some((e) => e.kind === "核验") ? 2 : 1,
      evidence: detective.length ? `${detective.length} 个完整三证核验案卷` : "尚未提交完整证据链",
    },
    {
      dimension: "创意解决力",
      level: design?.completed ? (design.pain.length + design.judgment.length > 65 ? 4 : 3) : design ? 2 : 1,
      evidence: design?.completed ? `${design.template}四步设计板已完成` : "尚未生成智能体成果卡",
    },
    {
      dimension: "责任意识",
      level: design?.safety.every(Boolean) ? (design.excludedData.length >= 12 && design.boundary.length >= 18 ? 4 : 3) : design ? 2 : 1,
      evidence: design?.safety.every(Boolean) ? "三个安全开关均有明确设计" : "安全边界尚未完整",
    },
    {
      dimension: "展示表达力",
      level: reflectionEvents >= 2 ? 4 : emotion?.explanation || detective.some((item) => item.reasoning.length >= 12) ? 3 : state.evidence.length ? 2 : 1,
      evidence: reflectionEvents ? `${reflectionEvents} 条反思与解释` : "需要补充基于证据的解释",
    },
  ];
}
