/**
 * History Domain - Undo/Redo 및 복합 액션 관리
 * 
 * 이 파일은 에디터의 히스토리 관리 기능을 제공합니다.
 * Core Services를 의존하여 순환 의존성을 방지합니다.
 */

import type { IHistoryDomain, ICoreServices, HistoryState } from "../types/editorTypes";
import type { TemplateDialogues } from "../../types/dialogue";
import type { LocalizationData } from "../localizationStore";
import { useLocalizationStore } from "../localizationStore";
import { globalAsyncOperationManager } from "../asyncOperationManager";

/**
 * History Domain 구현
 * 
 * 히스토리 관리에 특화된 6개의 메서드를 제공합니다:
 * 1. startCompoundAction - 복합 액션 시작 (4회 호출됨)
 * 2. undo - 되돌리기 (UI에서 호출)
 * 3. redo - 다시실행 (UI에서 호출)  
 * 4. canUndo - 되돌리기 가능 여부 (UI 상태 체크)
 * 5. canRedo - 다시실행 가능 여부 (UI 상태 체크)
 * 6. pushToHistoryWithTextEdit - 텍스트 편집 전용 히스토리 (3회 호출됨)
 */
export class HistoryDomain {
  constructor(
    private getState: () => any,
    private setState: (partial: any) => void,
    private coreServices: ICoreServices,
    private updateLocalizationStoreRef: () => void
  ) {}

  /**
   * 복합 액션 시작
   * 여러 개의 개별 액션을 하나의 그룹으로 묶어서 관리
   * 
   * @param actionName 복합 액션 이름
   * @returns 복합 액션 그룹 ID (차단된 경우 blocked-timestamp 형태)
   */
  startCompoundAction(actionName: string): string {
    // 다른 비동기 작업 중이면 차단
    if (!globalAsyncOperationManager.startOperation(`복합 액션: ${actionName}`)) {
      return `blocked-${Date.now()}`;
    }

    const state = this.getState();

    // 시작 전 상태 저장
    const startState: HistoryState = {
      templateData: JSON.parse(JSON.stringify(state.templateData)),
      localizationData: useLocalizationStore.getState().exportLocalizationData(),
      timestamp: Date.now(),
      action: `복합 액션 시작: ${actionName}`,
      groupId: undefined,
    };

    const groupId = `compound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.setState({
      currentCompoundActionId: groupId,
      compoundActionStartState: startState,
    });

    return groupId;
  }

  /**
   * 되돌리기 (Undo)
   * 히스토리에서 이전 상태로 복원
   */
  undo(): void {
    // 비동기 작업 진행 중이면 차단
    if (!globalAsyncOperationManager.canPerformUndoRedo()) {
      return;
    }

    const state = this.getState();
    if (!this.canUndo()) return;

    this.setState({ isUndoRedoInProgress: true });

    const previousState = state.history[state.historyIndex - 1];
    const currentState = state.history[state.historyIndex]; // 취소되는 액션

    if (previousState) {
      this.setState({
        templateData: JSON.parse(JSON.stringify(previousState.templateData)),
        historyIndex: state.historyIndex - 1,
        isUndoRedoInProgress: false,
      });

      // LocalizationStore 데이터도 함께 복원
      const localizationStore = useLocalizationStore.getState();
      localizationStore.importLocalizationData(previousState.localizationData);

      if (state.showToast && currentState) {
        state.showToast(`되돌리기: ${currentState.action}`, "info");
      }
    } else {
      this.setState({ isUndoRedoInProgress: false });
    }

    this.updateLocalizationStoreRef();
  }

  /**
   * 다시실행 (Redo)
   * 히스토리에서 다음 상태로 복원
   */
  redo(): void {
    // 비동기 작업 진행 중이면 차단
    if (!globalAsyncOperationManager.canPerformUndoRedo()) {
      return;
    }

    const state = this.getState();
    if (!this.canRedo()) return;

    this.setState({ isUndoRedoInProgress: true });

    const nextState = state.history[state.historyIndex + 1];

    if (nextState) {
      this.setState({
        templateData: JSON.parse(JSON.stringify(nextState.templateData)),
        historyIndex: state.historyIndex + 1,
        isUndoRedoInProgress: false,
      });

      // LocalizationStore 데이터도 함께 복원
      const localizationStore = useLocalizationStore.getState();
      localizationStore.importLocalizationData(nextState.localizationData);

      if (state.showToast) {
        state.showToast(`다시실행: ${nextState.action}`, "info");
      }
    } else {
      this.setState({ isUndoRedoInProgress: false });
    }

    this.updateLocalizationStoreRef();
  }

  /**
   * 되돌리기 가능 여부 확인
   * @returns 되돌리기 가능하면 true
   */
  canUndo(): boolean {
    const state = this.getState();
    return state.historyIndex > 0;
  }

  /**
   * 다시실행 가능 여부 확인
   * @returns 다시실행 가능하면 true
   */
  canRedo(): boolean {
    const state = this.getState();
    return state.historyIndex < state.history.length - 1;
  }

  /**
   * 텍스트 편집 전용 히스토리 추가
   * LocalizationStore와 함께 히스토리에 기록
   * 
   * @param action 액션 설명
   */
  pushToHistoryWithTextEdit(action: string): void {
    // Core Services의 pushToHistory를 호출
    // 텍스트 편집의 경우 LocalizationStore와 함께 히스토리 추가
    this.coreServices.pushToHistory(action);
  }
}

/**
 * History Domain 팩토리 함수
 * 
 * @param getState Zustand get 함수
 * @param setState Zustand set 함수  
 * @param coreServices Core Services 인스턴스
 * @param updateLocalizationStoreRef LocalizationStore 참조 업데이트 함수
 * @returns HistoryDomain 인스턴스
 */
export function createHistoryDomain(
  getState: () => any,
  setState: (partial: any) => void,
  coreServices: ICoreServices,
  updateLocalizationStoreRef: () => void
): HistoryDomain {
  return new HistoryDomain(getState, setState, coreServices, updateLocalizationStoreRef);
} 