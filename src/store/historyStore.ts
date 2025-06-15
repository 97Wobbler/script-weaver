import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TemplateDialogues } from "../types/dialogue";
import type { LocalizationData } from "./localizationStore";

// 히스토리 상태 타입
export interface HistoryState {
  templateData: TemplateDialogues;
  localizationData: LocalizationData;
  timestamp: number;
  action: string;
  groupId?: string; // 복합 액션 그룹 식별자
}

// 히스토리 Store 상태 인터페이스
export interface HistoryStoreState {
  // 히스토리 상태
  history: HistoryState[];
  historyIndex: number;
  isUndoRedoInProgress: boolean;
  
  // 복합 액션 그룹 관리
  currentCompoundActionId: string | null;
  compoundActionStartState: HistoryState | null;
}

// 히스토리 Store 액션 인터페이스
export interface HistoryActions {
  // 기본 히스토리 관리
  pushToHistory: (action: string, templateData: TemplateDialogues, localizationData: LocalizationData) => void;
  clearHistory: () => void;
  
  // Undo/Redo 액션
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // 복합 액션 그룹 관리
  startCompoundAction: (actionName: string, initialState: HistoryState) => string;
  endCompoundAction: (finalState: HistoryState) => void;
  cancelCompoundAction: () => void;
  
  // 상태 관리
  setUndoRedoInProgress: (inProgress: boolean) => void;
  
  // 유틸리티
  getCurrentState: () => HistoryState | null;
  getHistorySize: () => number;
  trimHistory: (maxSize?: number) => void;
}

export interface HistoryStore extends HistoryStoreState, HistoryActions {}

// 초기 상태
const initialState: HistoryStoreState = {
  history: [],
  historyIndex: -1,
  isUndoRedoInProgress: false,
  currentCompoundActionId: null,
  compoundActionStartState: null,
};

// 히스토리 Store 생성
export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 기본 히스토리 관리
      pushToHistory: (action: string, templateData: TemplateDialogues, localizationData: LocalizationData) => {
        const state = get();
        
        // Undo/Redo 진행 중이면 히스토리 추가하지 않음
        if (state.isUndoRedoInProgress) return;
        
        // 복합 액션 진행 중에는 중간 히스토리 저장하지 않음
        if (state.currentCompoundActionId) return;
        
        set(() => {
          // 현재 인덱스 이후의 히스토리는 제거 (새로운 분기 생성)
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          
          // 새 히스토리 상태 추가
          newHistory.push({
            templateData: JSON.parse(JSON.stringify(templateData)),
            localizationData: JSON.parse(JSON.stringify(localizationData)),
            timestamp: Date.now(),
            action,
            groupId: undefined,
          });
          
          // 히스토리는 최대 50개까지만 유지
          if (newHistory.length > 50) {
            newHistory.shift();
          }
          
          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        });
      },
      
      clearHistory: () => {
        set(() => ({
          history: [],
          historyIndex: -1,
          currentCompoundActionId: null,
          compoundActionStartState: null,
        }));
      },
      
      // Undo/Redo 액션
      undo: () => {
        const state = get();
        if (!state.canUndo()) return null;
        
        const previousState = state.history[state.historyIndex - 1];
        
        set(() => ({
          historyIndex: state.historyIndex - 1,
        }));
        
        return previousState;
      },
      
      redo: () => {
        const state = get();
        if (!state.canRedo()) return null;
        
        const nextState = state.history[state.historyIndex + 1];
        
        set(() => ({
          historyIndex: state.historyIndex + 1,
        }));
        
        return nextState;
      },
      
      canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
      },
      
      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },
      
      // 복합 액션 그룹 관리
      startCompoundAction: (actionName: string, initialState: HistoryState) => {
        const groupId = `compound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        set(() => ({
          currentCompoundActionId: groupId,
          compoundActionStartState: {
            ...initialState,
            action: `복합 액션 시작: ${actionName}`,
            groupId: undefined,
          },
        }));
        
        return groupId;
      },
      
      endCompoundAction: (finalState: HistoryState) => {
        const state = get();
        if (!state.currentCompoundActionId || !state.compoundActionStartState) {
          console.warn("[히스토리] 종료 시도했으나 진행중인 복합 액션이 없음");
          return;
        }
        
        // 복합 액션을 단일 히스토리로 저장
        const finalAction = state.compoundActionStartState.action.replace("복합 액션 시작:", "복합 액션:");
        
        set(() => {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push({
            ...finalState,
            action: finalAction,
            groupId: state.currentCompoundActionId || undefined,
          });
          
          // 히스토리는 최대 50개까지만 유지
          if (newHistory.length > 50) {
            newHistory.shift();
          }
          
          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
            currentCompoundActionId: null,
            compoundActionStartState: null,
          };
        });
      },
      
      cancelCompoundAction: () => {
        set(() => ({
          currentCompoundActionId: null,
          compoundActionStartState: null,
        }));
      },
      
      // 상태 관리
      setUndoRedoInProgress: (inProgress: boolean) => {
        set(() => ({ isUndoRedoInProgress: inProgress }));
      },
      
      // 유틸리티
      getCurrentState: () => {
        const state = get();
        if (state.historyIndex >= 0 && state.historyIndex < state.history.length) {
          return state.history[state.historyIndex];
        }
        return null;
      },
      
      getHistorySize: () => {
        return get().history.length;
      },
      
      trimHistory: (maxSize = 50) => {
        set((state) => {
          if (state.history.length <= maxSize) return state;
          
          const trimAmount = state.history.length - maxSize;
          const newHistory = state.history.slice(trimAmount);
          
          return {
            history: newHistory,
            historyIndex: Math.max(0, state.historyIndex - trimAmount),
          };
        });
      },
    }),
    {
      name: "script-weaver-history-store",
      version: 1,
      partialize: (state) => ({
        // localStorage에는 히스토리만 저장 (진행 상태는 세션별로 초기화)
        history: state.history,
        historyIndex: state.historyIndex,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 복합 액션 상태는 항상 초기화
          state.currentCompoundActionId = null;
          state.compoundActionStartState = null;
          state.isUndoRedoInProgress = false;
        }
      },
    }
  )
); 