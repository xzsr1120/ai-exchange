export type EmotionLabel = "自然笑容" | "惊讶" | "低落" | "紧张笑容";
export type FeatureVector = { eyes: number; brows: number; mouth: number };

export type EvidenceKind =
  | "预测"
  | "变量"
  | "推荐"
  | "核验"
  | "设计"
  | "反思";

export type EvidenceEvent = {
  id: string;
  kind: EvidenceKind;
  title: string;
  detail: string;
  at: string;
  route: string;
};

export type EmotionReport = {
  prediction: string;
  variable: string;
  beforeAccuracy: number;
  afterAccuracy: number;
  confidence: number;
  explanation: string;
  sampleSize: number;
  diversity: "单一" | "多样";
  labelErrors: number;
  realSampleCount?: number;
  scanCount?: number;
  scanLabel?: EmotionLabel;
  scanConfidence?: number;
};

export type RecommendationAction = {
  category: string;
  action: "点赞" | "跳过" | "停留查看";
  delta: number;
};

export type DetectiveResult = {
  caseId: string;
  caseTitle: string;
  detailEvidence: string;
  sourceEvidence: string;
  crossEvidence: string;
  conclusion: "可信" | "存疑" | "错误" | "证据不足";
  reasoning: string;
  quality: number;
};

export type AgentModel = "轻快对话模型" | "推理增强模型" | "图文理解模型";

export type AgentDesign = {
  template: string;
  pain: string;
  data: string;
  excludedData: string;
  judgment: string;
  boundary: string;
  model: AgentModel;
  prompt: string;
  welcome: string;
  plugins: string[];
  knowledge: string[];
  safety: [boolean, boolean, boolean];
  completed: boolean;
};

export type LearningState = {
  evidence: EvidenceEvent[];
  emotionReport?: EmotionReport;
  recommendationActions: RecommendationAction[];
  detectiveResults: DetectiveResult[];
  agentDesign?: AgentDesign;
};

export const emptyLearningState: LearningState = {
  evidence: [],
  recommendationActions: [],
  detectiveResults: [],
};
