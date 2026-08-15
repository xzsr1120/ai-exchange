import { emptyLearningState, type AgentModel, type LearningState } from "./types";

export interface LearningRepository {
  load(): LearningState;
  save(state: LearningState): void;
  clear(): void;
}

const STORAGE_KEY = "ai-boundary-lab:v1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const objectArray = (value: unknown) => Array.isArray(value) ? value.filter(isRecord) : [];
const agentModels: AgentModel[] = ["轻快对话模型", "推理增强模型", "图文理解模型"];
const stringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export function normalizeLearningState(value: unknown): LearningState {
  if (!isRecord(value)) return { ...emptyLearningState };

  const evidence = objectArray(value.evidence).filter((item) =>
    typeof item.id === "string"
    && typeof item.kind === "string"
    && typeof item.title === "string"
    && typeof item.detail === "string"
    && typeof item.at === "string"
    && typeof item.route === "string",
  ) as LearningState["evidence"];
  const recommendationActions = objectArray(value.recommendationActions).filter((item) =>
    typeof item.category === "string"
    && ["点赞", "跳过", "停留查看"].includes(String(item.action))
    && typeof item.delta === "number",
  ) as LearningState["recommendationActions"];
  const detectiveResults = objectArray(value.detectiveResults).filter((item) =>
    typeof item.caseId === "string"
    && typeof item.caseTitle === "string"
    && typeof item.detailEvidence === "string"
    && typeof item.sourceEvidence === "string"
    && typeof item.crossEvidence === "string"
    && ["可信", "存疑", "错误", "证据不足"].includes(String(item.conclusion))
    && typeof item.reasoning === "string"
    && typeof item.quality === "number",
  ) as LearningState["detectiveResults"];

  const emotionReport = isRecord(value.emotionReport)
    && typeof value.emotionReport.prediction === "string"
    && typeof value.emotionReport.variable === "string"
    && typeof value.emotionReport.beforeAccuracy === "number"
    && typeof value.emotionReport.afterAccuracy === "number"
    && typeof value.emotionReport.confidence === "number"
    && typeof value.emotionReport.explanation === "string"
    && typeof value.emotionReport.sampleSize === "number"
    && ["单一", "多样"].includes(String(value.emotionReport.diversity))
    && typeof value.emotionReport.labelErrors === "number"
      ? value.emotionReport as LearningState["emotionReport"]
      : undefined;

  const agentDesign = isRecord(value.agentDesign)
    && typeof value.agentDesign.template === "string"
    && typeof value.agentDesign.pain === "string"
    && typeof value.agentDesign.data === "string"
    && typeof value.agentDesign.excludedData === "string"
    && typeof value.agentDesign.judgment === "string"
    && typeof value.agentDesign.boundary === "string"
    && Array.isArray(value.agentDesign.safety)
    && value.agentDesign.safety.length === 3
    && value.agentDesign.safety.every((item) => typeof item === "boolean")
    && typeof value.agentDesign.completed === "boolean"
      ? {
        template: value.agentDesign.template,
        pain: value.agentDesign.pain,
        data: value.agentDesign.data,
        excludedData: value.agentDesign.excludedData,
        judgment: value.agentDesign.judgment,
        boundary: value.agentDesign.boundary,
        model: agentModels.includes(String(value.agentDesign.model) as AgentModel)
          ? value.agentDesign.model as AgentModel
          : "轻快对话模型",
        prompt: typeof value.agentDesign.prompt === "string" ? value.agentDesign.prompt : value.agentDesign.judgment,
        welcome: typeof value.agentDesign.welcome === "string" ? value.agentDesign.welcome : "你好，我可以帮你解决一个校园小问题。",
        plugins: stringArray(value.agentDesign.plugins),
        knowledge: stringArray(value.agentDesign.knowledge),
        safety: value.agentDesign.safety as [boolean, boolean, boolean],
        completed: value.agentDesign.completed,
      } as LearningState["agentDesign"]
      : undefined;

  return { evidence, recommendationActions, detectiveResults, emotionReport, agentDesign };
}

export const localLearningRepository: LearningRepository = {
  load() {
    if (typeof window === "undefined") return emptyLearningState;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeLearningState(JSON.parse(raw)) : { ...emptyLearningState };
    } catch {
      return { ...emptyLearningState };
    }
  },
  save(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeLearningState(state)));
    } catch {
      // Storage may be unavailable in privacy mode or full; the in-memory session still works.
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Clearing an unavailable storage area should not break the current page.
    }
  },
};
