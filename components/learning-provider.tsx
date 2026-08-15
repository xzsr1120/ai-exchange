"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { localLearningRepository } from "@/lib/storage";
import {
  emptyLearningState,
  type AgentDesign,
  type DetectiveResult,
  type EmotionReport,
  type EvidenceEvent,
  type LearningState,
  type RecommendationAction,
} from "@/lib/types";

type NewEvidence = Omit<EvidenceEvent, "id" | "at">;

type LearningContextValue = {
  state: LearningState;
  hydrated: boolean;
  addEvidence: (event: NewEvidence) => void;
  saveEmotionReport: (report: EmotionReport) => void;
  saveRecommendationAction: (action: RecommendationAction) => void;
  resetRecommendation: () => void;
  saveDetectiveResult: (result: DetectiveResult) => void;
  saveAgentDesign: (design: AgentDesign) => void;
  resetAll: () => void;
};

const LearningContext = createContext<LearningContextValue | null>(null);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LearningState>(emptyLearningState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(localLearningRepository.load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localLearningRepository.save(state);
  }, [hydrated, state]);

  const value = useMemo<LearningContextValue>(() => ({
    state,
    hydrated,
    addEvidence(event) {
      setState((current) => ({
        ...current,
        evidence: [
          { ...event, id: crypto.randomUUID(), at: new Date().toISOString() },
          ...current.evidence,
        ].slice(0, 80),
      }));
    },
    saveEmotionReport(report) {
      setState((current) => ({ ...current, emotionReport: report }));
    },
    saveRecommendationAction(action) {
      setState((current) => ({
        ...current,
        recommendationActions: [...current.recommendationActions, action].slice(-40),
      }));
    },
    resetRecommendation() {
      setState((current) => ({ ...current, recommendationActions: [] }));
    },
    saveDetectiveResult(result) {
      setState((current) => ({
        ...current,
        detectiveResults: [...current.detectiveResults.filter((item) => item.caseId !== result.caseId), result],
      }));
    },
    saveAgentDesign(design) {
      setState((current) => ({ ...current, agentDesign: design }));
    },
    resetAll() {
      localLearningRepository.clear();
      setState({ ...emptyLearningState });
    },
  }), [hydrated, state]);

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw new Error("useLearning 必须在 LearningProvider 中使用");
  return context;
}
