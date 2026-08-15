import { describe, expect, it } from "vitest";
import {
  applyRecommendationAction,
  calculateAbilities,
  buildEmotionTrainingSet,
  initialWeights,
  recommendationStats,
  runEmotionModel,
} from "./algorithms";
import { emptyLearningState } from "./types";

describe("表情分类教学模型", () => {
  it("精简组和完整组会真实切换为 4 张和 12 张内置样本", () => {
    expect(buildEmotionTrainingSet({ sampleSize: "small", diversity: "diverse" })).toHaveLength(4);
    expect(buildEmotionTrainingSet({ sampleSize: "large", diversity: "diverse" })).toHaveLength(12);
    expect(buildEmotionTrainingSet({ sampleSize: "small", diversity: "narrow" })).toHaveLength(4);
    expect(buildEmotionTrainingSet({ sampleSize: "large", diversity: "narrow" })).toHaveLength(12);
  });

  it("错误标签会改变稳定可复现的模型结果", () => {
    const clean = runEmotionModel({ sampleSize: "large", diversity: "diverse" });
    const noisy = runEmotionModel({
      sampleSize: "large",
      diversity: "diverse",
      labelOverrides: { h2: "紧张笑容", h3: "紧张笑容" },
    });
    expect(clean.accuracy).toBeGreaterThan(noisy.accuracy);
    expect(noisy.labelErrors).toBe(2);
    expect(runEmotionModel({ sampleSize: "large", diversity: "diverse" })).toEqual(clean);
  });

  it("精简组也能装入两张可见的错误标签", () => {
    const noisy = runEmotionModel({
      sampleSize: "small",
      diversity: "diverse",
      labelOverrides: { h2: "紧张笑容", s2: "低落" },
    });
    expect(noisy.sampleCount).toBe(4);
    expect(noisy.labelErrors).toBe(2);
  });

  it("多样样本不弱于窄覆盖样本", () => {
    const diverse = runEmotionModel({ sampleSize: "large", diversity: "diverse" });
    const narrow = runEmotionModel({ sampleSize: "large", diversity: "narrow" });
    expect(diverse.accuracy).toBeGreaterThanOrEqual(narrow.accuracy);
  });

  it("真人贴标签样本会进入训练集并影响类别中心", () => {
    const extra = { id: "U1", label: "惊讶" as const, features: { eyes: 35, brows: 38, mouth: 28 }, note: "真人样本" };
    const config = { sampleSize: "large" as const, diversity: "diverse" as const, additionalSamples: [extra] };
    expect(buildEmotionTrainingSet(config).at(-1)).toEqual(extra);
    expect(runEmotionModel(config).sampleCount).toBe(13);
    expect(runEmotionModel(config).reason).toContain("真人贴标签样本已参与计算");
  });
});

describe("透明推荐模型", () => {
  it("连续点赞同类会提高该类比例并降低多样性", () => {
    let weights = initialWeights();
    const before = recommendationStats(weights);
    for (let i = 0; i < 5; i += 1) weights = applyRecommendationAction(weights, "科技", "点赞");
    const after = recommendationStats(weights);
    expect(after.top.category).toBe("科技");
    expect(after.top.ratio).toBeGreaterThan(before.top.ratio);
    expect(after.diversity).toBeLessThan(before.diversity);
  });

  it("探索其他类别能恢复多样性", () => {
    let weights = initialWeights();
    for (let i = 0; i < 5; i += 1) weights = applyRecommendationAction(weights, "科技", "点赞");
    const concentrated = recommendationStats(weights).diversity;
    for (const category of ["音乐", "游戏", "动漫", "运动", "校园生活"] as const) {
      weights = applyRecommendationAction(weights, category, "点赞");
    }
    expect(recommendationStats(weights).diversity).toBeGreaterThan(concentrated);
  });
});

describe("能力量规", () => {
  it("空记录不会获得虚假高分", () => {
    expect(calculateAbilities(emptyLearningState).every((item) => item.level === 1)).toBe(true);
  });
});
