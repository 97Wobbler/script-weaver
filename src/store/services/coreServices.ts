/**
 * Core Services - 도메인 간 공통 사용 서비스
 *
 * ## 📋 주요 책임
 * - **히스토리 관리**: 액션 기록 및 복합 액션 그룹 관리
 * - **노드 키 생성**: 고유한 노드 식별자 생성
 * - **제한 검증**: 노드 개수 제한 등 비즈니스 규칙 검증
 * - **레이아웃 실행**: 통합 레이아웃 시스템 호출
 * - **공통 유틸리티**: 씬/노드 조회 및 설정 헬퍼
 *
 * ## 🔄 의존성 관리
 * - **순환 의존성 방지**: 다른 도메인에 의존하지 않는 순수 함수 구조
 * - **DI 패턴**: 모든 도메인이 coreServices에 의존하는 단방향 의존성
 * - **상태 무관성**: Zustand 상태에만 의존, 다른 도메인 로직과 독립
 *
 * ## 📊 사용 통계
 * - pushToHistory: 9회 호출 (PROJECT, NODE, LAYOUT 도메인)
 * - generateNodeKey: 5회 호출 (NODE OPERATIONS 도메인)
 * - validateNodeCountLimit: 4회 호출 (NODE OPERATIONS 도메인)
 * - endCompoundAction: 4회 호출 (NODE OPERATIONS 도메인)
 * - runLayoutSystem: 3회 호출 (LAYOUT 도메인)
 */

import type { ICoreServices, LayoutType, NodeCountValidationOptions, NodeCountValidationResult } from "../types/editorTypes";
import type { Scene } from "../../types/dialogue";
import { useLocalizationStore } from "../localizationStore";
import { globalAsyncOperationManager } from "../asyncOperationManager";

/**
 * Core Services 구현
 *
 * 다른 도메인들이 공통으로 사용하는 5개의 핵심 메서드를 제공합니다:
 * 1. pushToHistory - 히스토리 기록 (9회 호출됨)
 * 2. generateNodeKey - 고유 키 생성 (5회 호출됨)
 * 3. validateNodeCountLimit - 노드 수 제한 검증 (4회 호출됨)
 * 4. endCompoundAction - 복합 액션 종료 (4회 호출됨)
 * 5. runLayoutSystem - 레이아웃 실행 (3회 호출됨)
 */
export class CoreServices implements ICoreServices {
  private getState: () => any;
  private setState: (updater: (state: any) => any) => void;

  constructor(getState: () => any, setState: (updater: (state: any) => any) => void) {
    this.getState = getState;
    this.setState = setState;
  }

  /**
   * 히스토리에 새로운 액션 기록
   *
   * @param action 액션 설명
   * @description 9회 호출됨 - 모든 도메인에서 사용하는 핵심 히스토리 기능
   */
  pushToHistory(action: string): void {
    const state = this.getState();
    if (state.isUndoRedoInProgress) return;

    // 복합 액션 진행 중에는 중간 히스토리 저장하지 않음
    if (state.currentCompoundActionId) {
      return;
    }

    // 즉시 최신 상태를 가져와서 인덱스 충돌 방지
    const currentState = this.getState();

    this.setState((state) => {
      const newHistory = currentState.history.slice(0, currentState.historyIndex + 1);
      newHistory.push({
        templateData: JSON.parse(JSON.stringify(currentState.templateData)),
        localizationData: useLocalizationStore.getState().exportLocalizationData(),
        timestamp: Date.now(),
        action,
        groupId: undefined, // 복합 액션이 아닌 경우는 groupId 없음
      });

      // 히스토리는 최대 50개까지만 유지
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }

  /**
   * 고유한 노드 키 생성
   *
   * @returns 생성된 고유 노드 키
   * @description 5회 호출됨 - 노드 생성 시 사용되는 핵심 유틸리티
   */
  generateNodeKey(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `node_${timestamp}_${random}`;
  }

  /**
   * 노드 개수 제한 검증
   *
   * @param options 검증 옵션
   * @returns 검증 결과
   * @description 4회 호출됨 - 노드 생성 전 제한 체크
   */
  validateNodeCountLimit(options?: NodeCountValidationOptions): NodeCountValidationResult {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    const currentNodeCount = currentScene ? Object.keys(currentScene).length : 0;
    const MAX_NODES = 100;

    if (currentNodeCount < MAX_NODES) {
      return { isValid: true };
    }

    // 복합 액션 종료 (필요한 경우)
    if (options?.endCompoundAction) {
      this.endCompoundAction();
    }

    // 토스트 메시지 표시
    if (state.showToast) {
      state.showToast(`노드 개수가 최대 100개 제한에 도달했습니다. (현재: ${currentNodeCount}개)`, "warning");
    }

    return { isValid: false };
  }

  /**
   * 복합 액션 종료
   *
   * @description 4회 호출됨 - 복합 액션 그룹 관리
   */
  endCompoundAction(): void {
    const state = this.getState();
    if (!state.currentCompoundActionId || !state.compoundActionStartState) {
      console.warn("[복합 액션] 종료 시도했으나 진행중인 복합 액션이 없음");
      return;
    }

    // 최종 상태로 단일 히스토리 저장
    const finalAction = state.compoundActionStartState.action.replace("복합 액션 시작:", "복합 액션:");

    this.setState((currentState) => {
      const newHistory = currentState.history.slice(0, currentState.historyIndex + 1);
      newHistory.push({
        templateData: JSON.parse(JSON.stringify(currentState.templateData)),
        localizationData: useLocalizationStore.getState().exportLocalizationData(),
        timestamp: Date.now(),
        action: finalAction,
        groupId: currentState.currentCompoundActionId || undefined,
      });

      // 히스토리는 최대 50개까지만 유지
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return {
        ...currentState,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        currentCompoundActionId: null,
        compoundActionStartState: null,
      };
    });

    // 비동기 작업 완료
    globalAsyncOperationManager.endOperation();
  }

  /**
   * 통합 레이아웃 시스템 실행
   *
   * @param currentScene 현재 씬
   * @param rootNodeId 루트 노드 ID
   * @param layoutType 레이아웃 타입
   * @description 3회 호출됨 - 레이아웃 도메인에서 사용
   */
  async runLayoutSystem(currentScene: Scene, rootNodeId: string, layoutType: LayoutType): Promise<void> {
    const { globalLayoutSystem } = await import("../../utils/layoutEngine");

    // 레이아웃 타입별 설정
    const layoutConfigs = {
      global: { depth: null, anchorNodeId: undefined },
      descendant: { depth: null, anchorNodeId: rootNodeId },
      child: { depth: 1, anchorNodeId: rootNodeId },
    };

    const config = layoutConfigs[layoutType];

    if (layoutType === "global") {
      // 전체 정렬의 경우 다중 그래프 레이아웃 사용
      await globalLayoutSystem.runMultiGraphLayout(
        currentScene,
        {
          depth: config.depth,
          includeRoot: true,
          direction: "LR",
          nodeSpacing: 30,
          rankSpacing: 80,
          anchorNodeId: config.anchorNodeId,
        },
        (nodeId: string, position: { x: number; y: number }) => {
          this.setState((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene || !currentScene[nodeId]) return state;

            const updatedNode = { ...currentScene[nodeId], position };
            const updatedScene = { ...currentScene, [nodeId]: updatedNode };

            return {
              ...state,
              templateData: {
                ...state.templateData,
                [state.currentTemplate]: {
                  ...state.templateData[state.currentTemplate],
                  [state.currentScene]: updatedScene,
                },
              },
            };
          });
        }
      );
    } else {
      // 기존 단일 루트 레이아웃 사용
      await globalLayoutSystem.runLayout(
        currentScene,
        {
          rootNodeId,
          depth: config.depth,
          includeRoot: true,
          direction: "LR",
          nodeSpacing: 30,
          rankSpacing: 80,
          anchorNodeId: config.anchorNodeId,
        },
        (nodeId: string, position: { x: number; y: number }) => {
          this.setState((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene || !currentScene[nodeId]) return state;

            const updatedNode = { ...currentScene[nodeId], position };
            const updatedScene = { ...currentScene, [nodeId]: updatedNode };

            return {
              ...state,
              templateData: {
                ...state.templateData,
                [state.currentTemplate]: {
                  ...state.templateData[state.currentTemplate],
                  [state.currentScene]: updatedScene,
                },
              },
            };
          });
        }
      );
    }
  }

  /**
   * 씬에서 노드 조회
   *
   * @param scene 대상 씬
   * @param nodeKey 노드 키
   * @returns 노드 또는 undefined
   */
  getNode(scene: Scene, nodeKey: string) {
    return scene[nodeKey];
  }

  /**
   * 씬에 노드 설정 (불변성 유지)
   *
   * @param scene 대상 씬
   * @param nodeKey 노드 키
   * @param node 설정할 노드
   * @returns 새로운 씬
   */
  setNode(scene: Scene, nodeKey: string, node: any) {
    return {
      ...scene,
      [nodeKey]: node,
    };
  }
}

/**
 * Core Services 팩토리 함수
 *
 * @param getState Zustand getState 함수
 * @param setState Zustand setState 함수
 * @returns CoreServices 인스턴스
 */
export const createCoreServices = (getState: () => any, setState: (updater: (state: any) => any) => void): ICoreServices => {
  return new CoreServices(getState, setState);
};
