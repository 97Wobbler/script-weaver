import type { 
  EditorNodeWrapper, 
  Dialogue, 
  Scene, 
  TemplateDialogues,
  TextDialogue,
  ChoiceDialogue 
} from "../../types/dialogue";
import type { 
  ICoreServices, 
  INodeDomain,
  NodePosition,
  NodeUpdateOptions
} from "../types/editorTypes";
import { useLocalizationStore } from "../localizationStore";

/**
 * 노드 핵심 도메인 클래스
 * 
 * 노드의 기본 CRUD, 선택 관리, 내용 수정, 연결 관리 등 핵심 기능을 담당합니다.
 * 
 * @description 20개 메서드 + 15개 헬퍼 메서드 포함
 * @dependencies CORE SERVICES, LocalizationStore
 */
export class NodeDomain implements Omit<INodeDomain, 'lastDraggedNodeKey' | 'lastDragActionTime' | 'selectedNodeKeys'> {
  constructor(
    private getState: () => any,
    private setState: (partial: any) => void,
    private coreServices: ICoreServices
  ) {}

  // ===== 선택 관리 (4개) =====

  /**
   * 단일 노드를 선택합니다.
   */
  setSelectedNode(nodeKey?: string): void {
    const state = this.getState();
    
    this.setState({
      selectedNodeKey: nodeKey,
      selectedNodeKeys: nodeKey ? new Set([nodeKey]) : new Set()
    });
  }

  /**
   * 노드 선택을 토글합니다.
   */
  toggleNodeSelection(nodeKey: string): void {
    const state = this.getState();
    const newSelectedKeys = new Set(state.selectedNodeKeys);
    
    if (newSelectedKeys.has(nodeKey)) {
      newSelectedKeys.delete(nodeKey);
    } else {
      newSelectedKeys.add(nodeKey);
    }
    
    this.setState({
      selectedNodeKeys: newSelectedKeys,
      selectedNodeKey: newSelectedKeys.size === 1 ? Array.from(newSelectedKeys)[0] : undefined
    });
  }

  /**
   * 모든 선택을 해제합니다.
   */
  clearSelection(): void {
    this.setState({
      selectedNodeKey: undefined,
      selectedNodeKeys: new Set()
    });
  }

  /**
   * 여러 노드를 한번에 선택합니다.
   */
  selectMultipleNodes(nodeKeys: string[]): void {
    const newSelectedKeys = new Set(nodeKeys);
    
    this.setState({
      selectedNodeKeys: newSelectedKeys,
      selectedNodeKey: newSelectedKeys.size === 1 ? Array.from(newSelectedKeys)[0] : undefined
    });
  }

  // ===== 기본 CRUD (4개) =====

  /**
   * 새 노드를 추가합니다.
   */
  addNode(node: EditorNodeWrapper): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    
    if (!currentScene) {
      state.showToast?.("현재 씬을 찾을 수 없습니다.", "warning");
      return;
    }

    // 씬에 노드 추가
    const updatedScene = { ...currentScene, [node.nodeKey]: node };
    
    this.setState({
      templateData: {
        ...state.templateData,
        [state.currentTemplate]: {
          ...state.templateData[state.currentTemplate],
          [state.currentScene]: updatedScene
        }
      },
      lastNodePosition: node.position,
      selectedNodeKey: node.nodeKey
    });

    this.coreServices.pushToHistory("노드 추가");
  }

  /**
   * 기존 노드를 업데이트합니다.
   */
  updateNode(nodeKey: string, updates: Partial<EditorNodeWrapper>): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    
    if (!currentScene || !currentScene[nodeKey]) {
      return;
    }

    const updatedNode = { ...currentScene[nodeKey], ...updates };
    const updatedScene = { ...currentScene, [nodeKey]: updatedNode };
    
    this.setState({
      templateData: {
        ...state.templateData,
        [state.currentTemplate]: {
          ...state.templateData[state.currentTemplate],
          [state.currentScene]: updatedScene
        }
      }
    });
  }

  /**
   * 노드를 삭제합니다.
   */
  deleteNode(nodeKey: string): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    
    if (!currentScene || !currentScene[nodeKey]) {
      return;
    }

    const nodeToDelete = currentScene[nodeKey];

    // 1. 로컬라이제이션 키 수집
    const keysToCleanup = this._collectNodeKeysForCleanup(nodeToDelete);

    // 2. 실제 노드 삭제 수행
    this._performNodeDeletion(nodeKey);

    // 3. 로컬라이제이션 정리 및 히스토리 기록
    this._cleanupAfterNodeDeletion(keysToCleanup);
  }

  /**
   * 노드를 이동합니다.
   */
  moveNode(nodeKey: string, position: { x: number; y: number }): void {
    const currentTime = Date.now();

    // 1. 노드 및 위치 변경 유효성 검사
    const validation = this._validateNodeMovement(nodeKey, position);
    if (!validation.isValid || !validation.hasPositionChanged) return;

    // 2. 연속 드래그 체크
    const isContinuousDrag = this._checkContinuousDrag(nodeKey, currentTime);

    // 3. 실제 노드 위치 업데이트
    this._performNodeMove(nodeKey, position, currentTime);

    // 4. 연속 드래그 처리
    if (isContinuousDrag) {
      this._handleContinuousDrag(nodeKey, currentTime);
    } else {
      this._addMoveHistory(nodeKey);
    }
  }

  // ===== 내용 수정 (3개) =====

  /**
   * 노드의 대화 내용을 업데이트합니다.
   */
  updateDialogue(nodeKey: string, dialogue: Partial<Dialogue>): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    
    if (!currentScene || !currentScene[nodeKey]) {
      return;
    }

    const updatedNode = {
      ...currentScene[nodeKey],
      dialogue: { ...currentScene[nodeKey].dialogue, ...dialogue }
    };

    this.updateNode(nodeKey, updatedNode);
  }

  /**
   * 노드의 텍스트를 업데이트합니다.
   */
  updateNodeText(nodeKey: string, speakerText?: string, contentText?: string): void {
    const updates: Partial<Dialogue> = {};
    
    if (speakerText !== undefined) {
      updates.speakerText = speakerText;
    }
    if (contentText !== undefined) {
      updates.contentText = contentText;
    }

    this.updateDialogue(nodeKey, updates);
  }

  /**
   * 선택지 텍스트를 업데이트합니다.
   */
  updateChoiceText(nodeKey: string, choiceKey: string, choiceText: string): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    
    if (!currentScene || !currentScene[nodeKey]) {
      return;
    }

    const node = currentScene[nodeKey];
    if (node.dialogue.type !== "choice") {
      return;
    }

    const dialogue = node.dialogue as ChoiceDialogue;
    const updatedChoices = {
      ...dialogue.choices,
      [choiceKey]: {
        ...dialogue.choices[choiceKey],
        choiceText
      }
    };

    this.updateDialogue(nodeKey, { choices: updatedChoices });
  }

  // ===== 연결 관리 (2개) =====

  /**
   * 두 노드를 연결합니다.
   */
  connectNodes(fromNodeKey: string, toNodeKey: string, choiceKey?: string): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    
    if (!currentScene || !currentScene[fromNodeKey]) {
      return;
    }

    const fromNode = currentScene[fromNodeKey];

    if (fromNode.dialogue.type === "text") {
      // 텍스트 노드의 경우 nextNodeKey 설정
      this.updateDialogue(fromNodeKey, { nextNodeKey: toNodeKey });
    } else if (fromNode.dialogue.type === "choice" && choiceKey) {
      // 선택지 노드의 경우 특정 선택지의 nextNodeKey 설정
      const dialogue = fromNode.dialogue as ChoiceDialogue;
      const updatedChoices = {
        ...dialogue.choices,
        [choiceKey]: {
          ...dialogue.choices[choiceKey],
          nextNodeKey: toNodeKey
        }
      };
      this.updateDialogue(fromNodeKey, { choices: updatedChoices });
    }
  }

  /**
   * 노드 연결을 끊습니다.
   */
  disconnectNodes(fromNodeKey: string, choiceKey?: string): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    
    if (!currentScene || !currentScene[fromNodeKey]) {
      return;
    }

    const fromNode = currentScene[fromNodeKey];

    if (fromNode.dialogue.type === "text") {
      // 텍스트 노드의 경우 nextNodeKey 제거
      const textDialogue = fromNode.dialogue as TextDialogue;
      const updatedDialogue: Partial<TextDialogue> = { 
        ...textDialogue, 
        nextNodeKey: undefined 
      };
      this.updateDialogue(fromNodeKey, updatedDialogue);
    } else if (fromNode.dialogue.type === "choice" && choiceKey) {
      // 선택지 노드의 경우 특정 선택지의 nextNodeKey 제거
      const dialogue = fromNode.dialogue as ChoiceDialogue;
      const currentChoice = dialogue.choices[choiceKey];
      if (currentChoice) {
        const updatedChoice = { 
          ...currentChoice, 
          nextNodeKey: undefined as any // 타입 강제 캐스팅으로 임시 해결
        };
        const updatedChoices = {
          ...dialogue.choices,
          [choiceKey]: updatedChoice
        };
        this.updateDialogue(fromNodeKey, { choices: updatedChoices });
      }
    }
  }

  // ===== 유틸리티 (3개) =====

  /**
   * 고유한 노드 키를 생성합니다.
   */
  generateNodeKey(): string {
    return this.coreServices.generateNodeKey();
  }

  /**
   * 현재 노드 개수를 반환합니다.
   */
  getCurrentNodeCount(): number {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    return currentScene ? Object.keys(currentScene).length : 0;
  }

  /**
   * 새 노드 생성 가능 여부를 확인합니다.
   */
  canCreateNewNode(): boolean {
    return this.getCurrentNodeCount() < 100;
  }

  // ===== 참조/상태 업데이트 (4개) =====

  /**
   * 노드의 키 참조를 업데이트합니다.
   */
  updateNodeKeyReference(nodeKey: string, keyType: "speaker" | "text", newKeyRef: string): void {
    const updates: Partial<Dialogue> = {};
    
    if (keyType === "speaker") {
      updates.speakerKeyRef = newKeyRef;
    } else if (keyType === "text") {
      updates.textKeyRef = newKeyRef;
    }

    this.updateDialogue(nodeKey, updates);
  }

  /**
   * 선택지의 키 참조를 업데이트합니다.
   */
  updateChoiceKeyReference(nodeKey: string, choiceKey: string, newKeyRef: string): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    
    if (!currentScene || !currentScene[nodeKey]) {
      return;
    }

    const node = currentScene[nodeKey];
    if (node.dialogue.type !== "choice") {
      return;
    }

    const dialogue = node.dialogue as ChoiceDialogue;
    const updatedChoices = {
      ...dialogue.choices,
      [choiceKey]: {
        ...dialogue.choices[choiceKey],
        textKeyRef: newKeyRef
      }
    };

    this.updateDialogue(nodeKey, { choices: updatedChoices });
  }

  /**
   * 노드의 가시성을 업데이트합니다.
   */
  updateNodeVisibility(nodeKey: string, hidden: boolean): void {
    this.updateNode(nodeKey, { hidden });
  }

  /**
   * 노드의 위치와 가시성을 함께 업데이트합니다.
   */
  updateNodePositionAndVisibility(nodeKey: string, position: { x: number; y: number }, hidden: boolean): void {
    this.updateNode(nodeKey, { position, hidden });
  }

  // ===== Private 헬퍼 메서드들 (15개) =====

  /**
   * 노드 삭제 시 정리할 로컬라이제이션 키들을 수집합니다.
   */
  private _collectNodeKeysForCleanup(nodeToDelete: EditorNodeWrapper): string[] {
    return this._collectLocalizationKeys([nodeToDelete]);
  }

  /**
   * 노드들의 로컬라이제이션 키들을 수집합니다.
   */
  private _collectLocalizationKeys(nodes: EditorNodeWrapper[]): string[] {
    const keysToCleanup: string[] = [];
    const localizationStore = useLocalizationStore.getState();

    for (const node of nodes) {
      const dialogue = node.dialogue;

      // 화자 키 정리
      if (dialogue.speakerKeyRef) {
        const nodesUsingKey = localizationStore.findNodesUsingKey(dialogue.speakerKeyRef);
        if (nodesUsingKey.length <= 1) {
          keysToCleanup.push(dialogue.speakerKeyRef);
        }
      }

      // 내용 키 정리
      if (dialogue.textKeyRef) {
        const nodesUsingKey = localizationStore.findNodesUsingKey(dialogue.textKeyRef);
        if (nodesUsingKey.length <= 1) {
          keysToCleanup.push(dialogue.textKeyRef);
        }
      }

      // 선택지 키 정리
      if (dialogue.type === "choice") {
        const choiceDialogue = dialogue as ChoiceDialogue;
        for (const choice of Object.values(choiceDialogue.choices)) {
          if (choice.textKeyRef) {
            const nodesUsingKey = localizationStore.findNodesUsingKey(choice.textKeyRef);
            if (nodesUsingKey.length <= 1) {
              keysToCleanup.push(choice.textKeyRef);
            }
          }
        }
      }
    }

    return keysToCleanup;
  }

  /**
   * 특정 노드를 참조하는 다른 노드들을 찾습니다.
   */
  private _findReferencingNodes(currentScene: Scene, nodeKey: string): string[] {
    const referencingNodes: string[] = [];

    for (const [key, node] of Object.entries(currentScene)) {
      if (key === nodeKey) continue;

      const dialogue = node.dialogue;

      // 텍스트 노드의 nextNodeKey 체크
      if (dialogue.type === "text" && dialogue.nextNodeKey === nodeKey) {
        referencingNodes.push(`${key} (텍스트 노드)`);
      }

      // 선택지 노드의 각 선택지 nextNodeKey 체크
      if (dialogue.type === "choice") {
        const choiceDialogue = dialogue as ChoiceDialogue;
        for (const [choiceKey, choice] of Object.entries(choiceDialogue.choices)) {
          if (choice.nextNodeKey === nodeKey) {
            referencingNodes.push(`${key} > ${choiceKey}`);
          }
        }
      }
    }

    return referencingNodes;
  }

  /**
   * 실제 노드 삭제를 수행합니다.
   */
  private _performNodeDeletion(nodeKey: string): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    
    if (!currentScene) return;

    // 삭제할 노드를 참조하는 다른 노드들 찾기
    const referencingNodes = this._findReferencingNodes(currentScene, nodeKey);

    if (referencingNodes.length > 0) {
      const message = `다음 노드들이 삭제 대상을 참조하고 있습니다:\n${referencingNodes.join(', ')}\n\n참조를 제거하고 삭제를 진행합니다.`;
      state.showToast?.(message, "warning");

      // 댕글링 참조 정리: 삭제된 노드를 참조하는 모든 노드들의 참조를 제거
      const updatedScene = { ...currentScene };
      for (const [key, node] of Object.entries(updatedScene)) {
        if (key === nodeKey) continue;

        // 타입 가드: node가 EditorNodeWrapper인지 확인
        const nodeWrapper = node as EditorNodeWrapper;
        
        let nodeUpdated = false;
        const updatedNode: EditorNodeWrapper = { 
          nodeKey: nodeWrapper.nodeKey,
          dialogue: nodeWrapper.dialogue,
          position: nodeWrapper.position,
          hidden: nodeWrapper.hidden
        };

        // 텍스트 노드의 nextNodeKey 정리
        if (updatedNode.dialogue.type === "text" && updatedNode.dialogue.nextNodeKey === nodeKey) {
          const textDialogue = updatedNode.dialogue as TextDialogue;
          const newDialogue: Partial<TextDialogue> = { 
            ...textDialogue, 
            nextNodeKey: undefined 
          };
          updatedNode.dialogue = newDialogue as TextDialogue;
          nodeUpdated = true;
        }

        // 선택지 노드의 각 선택지 nextNodeKey 정리
        if (updatedNode.dialogue.type === "choice") {
          const choiceDialogue = updatedNode.dialogue as ChoiceDialogue;
          const updatedChoices = { ...choiceDialogue.choices };

          for (const [choiceKey, choice] of Object.entries(updatedChoices)) {
            if (choice.nextNodeKey === nodeKey) {
              const updatedChoice = { 
                ...choice, 
                nextNodeKey: undefined as any // 타입 강제 캐스팅으로 해결
              };
              updatedChoices[choiceKey] = updatedChoice;
              nodeUpdated = true;
            }
          }

          if (nodeUpdated) {
            updatedNode.dialogue = { ...choiceDialogue, choices: updatedChoices };
          }
        }

        if (nodeUpdated) {
          updatedScene[key] = updatedNode;
        }
      }

      // 업데이트된 씬 적용
      this.setState({
        templateData: {
          ...state.templateData,
          [state.currentTemplate]: {
            ...state.templateData[state.currentTemplate],
            [state.currentScene]: updatedScene
          }
        }
      });
    }

    // 실제 노드 삭제 수행
    const { [nodeKey]: deletedNode, ...remainingNodes } = currentScene;
    
    this.setState({
      templateData: {
        ...state.templateData,
        [state.currentTemplate]: {
          ...state.templateData[state.currentTemplate],
          [state.currentScene]: remainingNodes
        }
      },
      selectedNodeKey: state.selectedNodeKey === nodeKey ? undefined : state.selectedNodeKey
    });
  }

  /**
   * 노드 삭제 후 정리 작업을 수행합니다.
   */
  private _cleanupAfterNodeDeletion(keysToCleanup: string[]): void {
    // 로컬라이제이션 키 정리
    if (keysToCleanup.length > 0) {
      const localizationStore = useLocalizationStore.getState();
      keysToCleanup.forEach(key => {
        localizationStore.deleteKey(key);
      });
    }

    this.coreServices.pushToHistory("노드 삭제");
  }

  /**
   * 노드 이동 유효성을 검사합니다.
   */
  private _validateNodeMovement(nodeKey: string, position: { x: number; y: number }): { 
    isValid: boolean; 
    currentNode: EditorNodeWrapper | null; 
    hasPositionChanged: boolean 
  } {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    
    if (!currentScene || !currentScene[nodeKey]) {
      return { isValid: false, currentNode: null, hasPositionChanged: false };
    }

    const currentNode = currentScene[nodeKey];
    const hasPositionChanged = 
      currentNode.position.x !== position.x || 
      currentNode.position.y !== position.y;

    return { isValid: true, currentNode, hasPositionChanged };
  }

  /**
   * 연속 드래그 여부를 확인합니다.
   */
  private _checkContinuousDrag(nodeKey: string, currentTime: number): boolean {
    const state = this.getState();
    return state.lastDraggedNodeKey === nodeKey && 
           (currentTime - state.lastDragActionTime) < 1000;
  }

  /**
   * 실제 노드 위치 업데이트를 수행합니다.
   */
  private _performNodeMove(nodeKey: string, position: { x: number; y: number }, currentTime: number): void {
    // 노드 위치 업데이트
    this.updateNode(nodeKey, { position });

    // 드래그 상태 업데이트
    this.setState({
      lastDraggedNodeKey: nodeKey,
      lastDragActionTime: currentTime
    });
  }

  /**
   * 연속 드래그를 처리합니다.
   */
  private _handleContinuousDrag(nodeKey: string, currentTime: number): void {
    const state = this.getState();
    
    // 마지막 히스토리가 같은 노드의 이동이고 2초 이내라면 새 히스토리를 추가하지 않음
    const lastHistory = state.history[state.historyIndex];
    if (lastHistory && 
        lastHistory.action === `노드 이동 (${nodeKey})` && 
        currentTime - lastHistory.timestamp < 2000) {
      return;
    }

    this._addMoveHistory(nodeKey);
  }

  /**
   * 노드 이동 히스토리를 추가합니다.
   */
  private _addMoveHistory(nodeKey: string): void {
    this.coreServices.pushToHistory(`노드 이동 (${nodeKey})`);
  }
}

/**
 * NodeDomain 인스턴스를 생성합니다.
 */
export const createNodeDomain = (
  getState: () => any,
  setState: (partial: any) => void,
  coreServices: ICoreServices
): NodeDomain => {
  return new NodeDomain(getState, setState, coreServices);
};