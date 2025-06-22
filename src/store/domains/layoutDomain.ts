import type { Scene, EditorNodeWrapper } from "../../types/dialogue";
import type { ICoreServices, ILayoutDomain, NodePosition, LayoutType, NodeRelationMaps, PositionMap, NodeDimensions, PositionInitData } from "../types/editorTypes";

/**
 * Layout Domain - 노드 레이아웃 및 자동 정렬 관리
 *
 * ## 📋 주요 책임
 * - **위치 계산**: 새 노드 배치 위치 및 자식 노드 위치 계산
 * - **레이아웃 시스템**: 글로벌 레이아웃 엔진 기반 정렬 (3개 메서드)
 * - **겹침 방지**: 노드 배치 시 다른 노드와의 겹침 검사 및 회피
 * - **관계 분석**: 부모-자식, 형제 관계 기반 레이아웃 최적화
 *
 * ## 🔄 의존성 관리
 * - **Core Services**: 히스토리 기록, 레이아웃 시스템 실행
 * - **Layout Engine**: utils/layoutEngine의 글로벌 레이아웃 시스템
 * - **독립성**: 다른 도메인과 순환 의존성 없음
 *
 * ## 🎯 핵심 특징
 * - **글로벌 레이아웃**: 다중 그래프 지원하는 통합 레이아웃 시스템
 * - **스마트 배치**: 노드 크기 추정 및 겹침 방지 알고리즘
 * - **계층 관리**: depth 기반 부모-자식-후손 관계 처리
 * - **비동기 처리**: 레이아웃 실행 중 상태 변경 안전성 보장
 * - **성능 최적화**: 변경된 노드만 선별적 정렬
 *
 * @description 5개 public 메서드 + 20개 private 헬퍼 메서드
 */
export class LayoutDomain implements Omit<ILayoutDomain, "lastNodePosition"> {
  constructor(private getState: () => any, private setState: (partial: any) => void, private coreServices: ICoreServices) {}

  // ===== 위치 계산 (2개) =====

  /**
   * 다음 노드 위치를 계산합니다.
   */
  getNextNodePosition(): NodePosition {
    const initData = this._initializePositionCalculation();

    // 후보 위치 계산
    const candidatePosition = this._calculateCandidatePosition(initData);

    // 겹치지 않는 위치 찾기
    const finalPosition = this._findNonOverlappingPosition(candidatePosition, initData);

    return finalPosition;
  }

  /**
   * 자식 노드의 위치를 계산합니다.
   */
  calculateChildNodePosition(parentNodeKey: string, choiceKey?: string): NodePosition {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

    if (!currentScene || !currentScene[parentNodeKey]) {
      return this.getNextNodePosition();
    }

    const parentNode = currentScene[parentNodeKey];
    const parentDimensions = this._getRealNodeDimensions(parentNodeKey);

    if (parentNode.dialogue.type === "text") {
      return this._calculateTextNodeChildPosition(parentNode, parentDimensions);
    } else if (parentNode.dialogue.type === "choice" && choiceKey) {
      return this._calculateChoiceNodeChildPosition(parentNode, parentDimensions, choiceKey);
    }

    return this.getNextNodePosition();
  }

    // ===== 레이아웃 시스템 (3개) =====

  /**
   * 전체 캔버스의 모든 노드를 정렬합니다.
   */
  async arrangeAllNodes(internal: boolean = false): Promise<void> {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

    if (!currentScene) {
      return;
    }

    const allNodeKeys = Object.keys(currentScene);
    if (allNodeKeys.length === 0) {
      return;
    }

    // 현재 위치 스냅샷
    const beforePositions = this._captureNodePositions(allNodeKeys);

    // 루트 노드 찾기 (하위 호환성을 위해 유지)
    const rootNodeKey = this._findRootNodeForLayout(currentScene, allNodeKeys);

    // 글로벌 레이아웃 시스템 실행 (다중 그래프 지원)
    await this._runGlobalLayoutSystem(currentScene, rootNodeKey);

    // 결과 처리
    this._handleLayoutResult(beforePositions, allNodeKeys);

    if (!internal) {
      this.coreServices.pushToHistory("전체 노드 자동 정렬");
    }
  }

  /**
   * 선택된 노드의 직접 자식들을 정렬합니다.
   */
  async arrangeSelectedNodeChildren(nodeKey: string, internal: boolean = false): Promise<void> {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

    if (!currentScene || !currentScene[nodeKey]) {
      return;
    }

    // 자식 노드들 찾기
    const childNodeKeys = this._findChildNodes(nodeKey, currentScene);

    if (childNodeKeys.size === 0) {
      return;
    }

    const affectedNodeKeys = Array.from(childNodeKeys);

    // 현재 위치 스냅샷
    const beforePositions = this._captureNodePositions(affectedNodeKeys);

    // 자식 레이아웃 시스템 실행
    await this._runChildLayoutSystem(nodeKey, currentScene, affectedNodeKeys);

    if (!internal) {
      this.coreServices.pushToHistory(`자식 노드 정렬 (${nodeKey})`);
    }
  }

  /**
   * 선택된 노드의 모든 후손들을 정렬합니다.
   */
  async arrangeSelectedNodeDescendants(nodeKey: string, internal: boolean = false): Promise<void> {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

    if (!currentScene || !currentScene[nodeKey]) {
      return;
    }

    // 후손 노드들 찾기
    const descendantNodeKeys = this._findDescendantNodes(nodeKey, currentScene);

    if (descendantNodeKeys.size === 0) {
      return;
    }

    const affectedNodeKeys = Array.from(descendantNodeKeys);

    // 현재 위치 스냅샷
    const beforePositions = this._captureNodePositions(affectedNodeKeys);

    // 후손 레이아웃 시스템 실행
    await this._runDescendantLayoutSystem(nodeKey, currentScene, affectedNodeKeys);

    if (!internal) {
      this.coreServices.pushToHistory(`후손 노드 정렬 (${nodeKey})`);
    }
  }

  // ===== Private 헬퍼 메서드들 (20개) =====

  /**
   * 위치 계산을 위한 초기 데이터를 준비합니다.
   */
  private _initializePositionCalculation(): PositionInitData {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    const allNodes = currentScene ? Object.values(currentScene) : [];
    const lastNodePosition = state.lastNodePosition;

    const constants = {
      DEFAULT_NODE_WIDTH: 200,
      DEFAULT_NODE_HEIGHT: 100,
      SPACING_X: 250,
      SPACING_Y: 150,
      MAX_ATTEMPTS: 50,
      MAX_ROWS_PER_COLUMN: 10,
    };

    return {
      currentScene,
      allNodes,
      lastNodePosition,
      constants,
    };
  }

  /**
   * 후보 위치를 계산합니다.
   */
  private _calculateCandidatePosition(initData: PositionInitData): NodePosition {
    const { lastNodePosition, constants } = initData;

    return {
      x: lastNodePosition.x + constants.SPACING_X,
      y: lastNodePosition.y,
    };
  }

  /**
   * 겹치지 않는 위치를 찾습니다.
   */
  private _findNonOverlappingPosition(candidatePosition: NodePosition, initData: PositionInitData): NodePosition {
    const { allNodes, constants } = initData;
    const { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, SPACING_X, SPACING_Y, MAX_ATTEMPTS, MAX_ROWS_PER_COLUMN } = constants;

    let { x, y } = candidatePosition;
    let attempts = 0;
    let currentRow = 0;

    while (attempts < MAX_ATTEMPTS) {
      let hasOverlap = false;

      // 현재 위치에서 다른 노드와 겹치는지 확인
      for (const node of allNodes) {
        if (this._isPositionOverlapping({ x, y }, node.position, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT)) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        return { x, y };
      }

      // 겹치면 다음 위치로 이동
      x += SPACING_X;

      // 한 줄에 너무 많은 노드가 배치되면 다음 줄로
      if (currentRow >= MAX_ROWS_PER_COLUMN) {
        x = candidatePosition.x;
        y += SPACING_Y;
        currentRow = 0;
      } else {
        currentRow++;
      }

      attempts++;
    }

    // 적절한 위치를 못 찾으면 기본 위치 반환
    return this._getFallbackPosition(initData);
  }

  /**
   * 두 위치가 겹치는지 확인합니다.
   */
  private _isPositionOverlapping(pos1: NodePosition, pos2: NodePosition, width: number, height: number): boolean {
    return !(pos1.x + width < pos2.x || pos2.x + width < pos1.x || pos1.y + height < pos2.y || pos2.y + height < pos1.y);
  }

  /**
   * 폴백 위치를 반환합니다.
   */
  private _getFallbackPosition(initData: PositionInitData): NodePosition {
    const { constants } = initData;

    return {
      x: Math.random() * 500 + 100,
      y: Math.random() * 400 + 100,
    };
  }

  /**
   * 노드의 실제 크기를 계산합니다.
   */
  private _getRealNodeDimensions(nodeKey: string): NodeDimensions {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

    if (!currentScene || !currentScene[nodeKey]) {
      return this._getEstimatedNodeDimensions("");
    }

    const node = currentScene[nodeKey];
    const contentLength = node.dialogue.contentText?.length || 0;

    return this._getEstimatedNodeDimensions(node.dialogue.contentText || "");
  }

  /**
   * 노드 크기를 추정합니다.
   */
  private _getEstimatedNodeDimensions(content: string): NodeDimensions {
    const baseWidth = 200;
    const baseHeight = 100;
    const charWidth = 8;
    const lineHeight = 20;

    const contentLength = content.length;
    const estimatedWidth = Math.max(baseWidth, Math.min(400, baseWidth + contentLength * charWidth * 0.5));
    const estimatedLines = Math.ceil(contentLength / 30);
    const estimatedHeight = Math.max(baseHeight, baseHeight + estimatedLines * lineHeight);

    return {
      width: estimatedWidth,
      height: estimatedHeight,
    };
  }

  /**
   * 텍스트 노드의 자식 위치를 계산합니다.
   */
  private _calculateTextNodeChildPosition(parentNode: EditorNodeWrapper, parentDimensions: NodeDimensions): NodePosition {
    return {
      x: parentNode.position.x,
      y: parentNode.position.y + parentDimensions.height + 50,
    };
  }

  /**
   * 선택지 노드의 자식 위치를 계산합니다.
   */
  private _calculateChoiceNodeChildPosition(parentNode: EditorNodeWrapper, parentDimensions: NodeDimensions, choiceKey: string): NodePosition {
    const dialogue = parentNode.dialogue as any;
    const choices = Object.keys(dialogue.choices || {});
    const choiceIndex = choices.indexOf(choiceKey);

    const baseX = parentNode.position.x + parentDimensions.width + 100;
    const baseY = parentNode.position.y + choiceIndex * 120;

    return { x: baseX, y: baseY };
  }

  /**
   * 노드 관계 매핑을 구축합니다.
   */
  private _buildNodeRelationMaps(currentScene: Scene, allNodeKeys: string[]): NodeRelationMaps {
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string[]>();

    // 초기화
    for (const nodeKey of allNodeKeys) {
      childrenMap.set(nodeKey, []);
      parentMap.set(nodeKey, []);
    }

    // 관계 매핑 구축
    for (const nodeKey of allNodeKeys) {
      const node = currentScene[nodeKey];
      const dialogue = node.dialogue;

      if (dialogue.type === "text" && dialogue.nextNodeKey) {
        if (allNodeKeys.includes(dialogue.nextNodeKey)) {
          childrenMap.get(nodeKey)!.push(dialogue.nextNodeKey);
          parentMap.get(dialogue.nextNodeKey)!.push(nodeKey);
        }
      } else if (dialogue.type === "choice") {
        const choiceDialogue = dialogue as any;
        for (const choice of Object.values(choiceDialogue.choices || {})) {
          const choiceObj = choice as any;
          if (choiceObj.nextNodeKey && allNodeKeys.includes(choiceObj.nextNodeKey)) {
            childrenMap.get(nodeKey)!.push(choiceObj.nextNodeKey);
            parentMap.get(choiceObj.nextNodeKey)!.push(nodeKey);
          }
        }
      }
    }

    return { childrenMap, parentMap };
  }



  /**
   * 노드 위치를 업데이트합니다.
   */
  private _updateNodePosition(nodeKey: string, position: NodePosition): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

    if (!currentScene || !currentScene[nodeKey]) {
      return;
    }

    const updatedNode = { ...currentScene[nodeKey], position };
    const updatedScene = { ...currentScene, [nodeKey]: updatedNode };

    this.setState({
      templateData: {
        ...state.templateData,
        [state.currentTemplate]: {
          ...state.templateData[state.currentTemplate],
          [state.currentScene]: updatedScene,
        },
      },
    });
  }

  /**
   * 레이아웃을 위한 루트 노드를 찾습니다.
   */
  private _findRootNodeForLayout(currentScene: Scene, allNodeKeys: string[]): string {
    const { parentMap } = this._buildNodeRelationMaps(currentScene, allNodeKeys);

    // 부모가 없는 노드를 찾기
    for (const nodeKey of allNodeKeys) {
      const parents = parentMap.get(nodeKey) || [];
      if (parents.length === 0) {
        return nodeKey;
      }
    }

    // 부모가 없는 노드가 없으면 첫 번째 노드를 루트로
    return allNodeKeys[0] || "";
  }

  /**
   * 글로벌 레이아웃 시스템을 실행합니다.
   */
  private async _runGlobalLayoutSystem(currentScene: Scene, rootNodeKey: string): Promise<void> {
    await this.coreServices.runLayoutSystem(currentScene, rootNodeKey, "global");
  }

  /**
   * 레이아웃 결과를 처리합니다.
   */
  private _handleLayoutResult(beforePositions: PositionMap, allNodeKeys: string[]): void {
    this._handleLayoutSystemResult(beforePositions, allNodeKeys, "global", allNodeKeys.length);
  }

  /**
   * 레이아웃 시스템 결과를 처리합니다.
   */
  private _handleLayoutSystemResult(beforePositions: PositionMap, nodeKeys: string[], layoutType: LayoutType, nodeCount: number): void {
    // 위치 변경 감지 및 결과 처리
    let hasPositionChanged = false;

    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

    if (currentScene) {
      for (const nodeKey of nodeKeys) {
        const beforePos = beforePositions.get(nodeKey);
        const currentPos = currentScene[nodeKey]?.position;

        if (beforePos && currentPos && (beforePos.x !== currentPos.x || beforePos.y !== currentPos.y)) {
          hasPositionChanged = true;
          break;
        }
      }
    }

    // 상태 메시지 표시
    const message = hasPositionChanged ? `${layoutType} 레이아웃 완료 (${nodeCount}개 노드 정렬됨)` : `${layoutType} 레이아웃 실행됨 (위치 변경 없음)`;

    state.showToast?.(message, "info");
  }

  /**
   * 노드 위치 스냅샷을 캡처합니다.
   */
  private _captureNodePositions(nodeKeys: string[]): PositionMap {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    const positions = new Map<string, NodePosition>();

    if (currentScene) {
      for (const nodeKey of nodeKeys) {
        const node = currentScene[nodeKey];
        if (node) {
          positions.set(nodeKey, { ...node.position });
        }
      }
    }

    return positions;
  }

  /**
   * 관련 노드들을 찾습니다.
   */
  private _findRelatedNodes(nodeKey: string, currentScene: Scene, maxDepth: number = Infinity): Set<string> {
    const related = new Set<string>();
    const visited = new Set<string>();

    const findRelated = (currentKey: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentKey)) return;
      visited.add(currentKey);

      const node = currentScene[currentKey];
      if (!node) return;

      const dialogue = node.dialogue;

      if (dialogue.type === "text" && dialogue.nextNodeKey) {
        if (currentScene[dialogue.nextNodeKey]) {
          related.add(dialogue.nextNodeKey);
          findRelated(dialogue.nextNodeKey, depth + 1);
        }
      } else if (dialogue.type === "choice") {
        const choiceDialogue = dialogue as any;
        for (const choice of Object.values(choiceDialogue.choices || {})) {
          const choiceObj = choice as any;
          if (choiceObj.nextNodeKey && currentScene[choiceObj.nextNodeKey]) {
            related.add(choiceObj.nextNodeKey);
            findRelated(choiceObj.nextNodeKey, depth + 1);
          }
        }
      }
    };

    findRelated(nodeKey, 0);
    return related;
  }

  /**
   * 후손 노드들을 찾습니다.
   */
  private _findDescendantNodes(nodeKey: string, currentScene: Scene): Set<string> {
    return this._findRelatedNodes(nodeKey, currentScene, Infinity);
  }

  /**
   * 후손 레이아웃 시스템을 실행합니다.
   */
  private async _runDescendantLayoutSystem(nodeKey: string, currentScene: Scene, affectedNodeKeys: string[]): Promise<void> {
    await this.coreServices.runLayoutSystem(currentScene, nodeKey, "descendant");

    const beforePositions = this._captureNodePositions(affectedNodeKeys);
    const descendantCount = affectedNodeKeys.length;
    this._handleLayoutSystemResult(beforePositions, affectedNodeKeys, "descendant", descendantCount);
  }

  /**
   * 자식 노드들을 찾습니다.
   */
  private _findChildNodes(nodeKey: string, currentScene: Scene): Set<string> {
    return this._findRelatedNodes(nodeKey, currentScene, 1);
  }

  /**
   * 자식 레이아웃 시스템을 실행합니다.
   */
  private async _runChildLayoutSystem(nodeKey: string, currentScene: Scene, affectedNodeKeys: string[]): Promise<void> {
    await this.coreServices.runLayoutSystem(currentScene, nodeKey, "child");

    const beforePositions = this._captureNodePositions(affectedNodeKeys);
    const childCount = affectedNodeKeys.length;
    this._handleLayoutSystemResult(beforePositions, affectedNodeKeys, "child", childCount);
  }
}

/**
 * LayoutDomain 인스턴스를 생성합니다.
 */
export const createLayoutDomain = (getState: () => any, setState: (partial: any) => void, coreServices: ICoreServices): LayoutDomain => {
  return new LayoutDomain(getState, setState, coreServices);
};
