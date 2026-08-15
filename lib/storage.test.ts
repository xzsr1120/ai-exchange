import { afterEach, describe, expect, it, vi } from "vitest";
import { localLearningRepository, normalizeLearningState } from "./storage";

describe("本地学习记录", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("把 null 和错误类型的集合恢复为空数组", () => {
    const state = normalizeLearningState({
      evidence: null,
      recommendationActions: "bad",
      detectiveResults: [null, { caseId: 1 }],
      emotionReport: null,
      agentDesign: { completed: true },
    });
    expect(state).toEqual({
      evidence: [],
      recommendationActions: [],
      detectiveResults: [],
      emotionReport: undefined,
      agentDesign: undefined,
    });
  });

  it("localStorage 写入失败时不会抛出异常", () => {
    vi.stubGlobal("window", {
      localStorage: {
        setItem: () => { throw new DOMException("quota", "QuotaExceededError"); },
      },
    });
    expect(() => localLearningRepository.save(normalizeLearningState({}))).not.toThrow();
  });
});
