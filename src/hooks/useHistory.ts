import { useCallback, useMemo } from 'react';
import { useHistoryStore } from '../store/historyStore';
import { useProjectStore } from '../store/projectStore';
import { useLocalizationStore } from '../store/localizationStore';

// useHistory Hook 반환 타입
export interface UseHistoryReturn {
  // 기본 히스토리 관리
  pushToHistory: (action: string) => void;
  pushToHistoryWithTextEdit: (action: string) => void;
  clearHistory: () => void;
  
  // Undo/Redo 액션
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // 복합 액션 관리
  startCompoundAction: (actionName: string) => string;
  endCompoundAction: () => void;
  cancelCompoundAction: () => void;
  
  // 상태 정보
  historySize: number;
  currentAction: string | null;
  isUndoRedoInProgress: boolean;
  currentCompoundActionId: string | null;
  
  // 유틸리티
  trimHistory: (maxSize?: number) => void;
  getHistoryInfo: () => { history: any[]; currentIndex: number };
}

/**
 * 히스토리 관련 기능을 통합 제공하는 Hook
 * historyStore + projectStore + localizationStore를 연동
 */
export const useHistory = (): UseHistoryReturn => {
  const historyStore = useHistoryStore();
  const projectStore = useProjectStore();
  const localizationStore = useLocalizationStore();

  // 현재 상태 스냅샷 생성
  const createSnapshot = useCallback(() => {
    return {
      templateData: projectStore.templateData,
      localizationData: localizationStore.localizationData,
    };
  }, [projectStore.templateData, localizationStore.localizationData]);

  // 상태 복원
  const restoreSnapshot = useCallback((snapshot: any) => {
    projectStore.updateTemplateData(snapshot.templateData);
    localizationStore.importLocalizationData(snapshot.localizationData);
  }, [projectStore, localizationStore]);

  // 히스토리에 추가
  const pushToHistory = useCallback((action: string) => {
    const snapshot = createSnapshot();
    historyStore.pushToHistory(action, snapshot.templateData, snapshot.localizationData);
  }, [historyStore, createSnapshot]);

  // 텍스트 편집용 히스토리 추가 (현재는 일반 히스토리와 동일)
  const pushToHistoryWithTextEdit = useCallback((action: string) => {
    const snapshot = createSnapshot();
    historyStore.pushToHistory(action, snapshot.templateData, snapshot.localizationData);
  }, [historyStore, createSnapshot]);

  // Undo
  const undo = useCallback(() => {
    const snapshot = historyStore.undo();
    if (snapshot) {
      restoreSnapshot(snapshot);
    }
  }, [historyStore, restoreSnapshot]);

  // Redo
  const redo = useCallback(() => {
    const snapshot = historyStore.redo();
    if (snapshot) {
      restoreSnapshot(snapshot);
    }
  }, [historyStore, restoreSnapshot]);

  // 복합 액션 시작
  const startCompoundAction = useCallback((actionName: string) => {
    const snapshot = createSnapshot();
    const historyState = {
      ...snapshot,
      timestamp: Date.now(),
      action: actionName,
    };
    return historyStore.startCompoundAction(actionName, historyState);
  }, [historyStore, createSnapshot]);

  // 복합 액션 종료
  const endCompoundAction = useCallback(() => {
    const snapshot = createSnapshot();
    const historyState = {
      ...snapshot,
      timestamp: Date.now(),
      action: "복합 액션 완료",
    };
    historyStore.endCompoundAction(historyState);
  }, [historyStore, createSnapshot]);

  // 히스토리 상태
  const historyState = useMemo(() => ({
    canUndo: historyStore.canUndo(),
    canRedo: historyStore.canRedo(),
    currentIndex: historyStore.historyIndex,
    historyLength: historyStore.history.length,
    isUndoRedoInProgress: historyStore.isUndoRedoInProgress,
    currentCompoundActionId: historyStore.currentCompoundActionId,
  }), [historyStore]);

  // 히스토리 유틸리티
  const clearHistory = useCallback(() => {
    historyStore.clearHistory();
  }, [historyStore]);

  const getHistoryInfo = useCallback(() => {
    return {
      history: historyStore.history,
      currentIndex: historyStore.historyIndex,
    };
  }, [historyStore]);

  // 누락된 함수들 추가
  const cancelCompoundAction = useCallback(() => {
    historyStore.cancelCompoundAction();
  }, [historyStore]);

  const trimHistory = useCallback((maxSize?: number) => {
    historyStore.trimHistory(maxSize);
  }, [historyStore]);

  return {
    // 기본 히스토리 기능
    pushToHistory,
    pushToHistoryWithTextEdit,
    undo,
    redo,
    
    // 복합 액션
    startCompoundAction,
    endCompoundAction,
    cancelCompoundAction,
    
    // 상태
    ...historyState,
    historySize: historyState.historyLength,
    currentAction: historyStore.getCurrentState()?.action || null,
    
    // 유틸리티
    clearHistory,
    getHistoryInfo,
    trimHistory,
  };
}; 