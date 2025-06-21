import type { 
  EditorNodeWrapper, 
  Dialogue, 
  Scene, 
  TemplateDialogues,
  TextDialogue,
  ChoiceDialogue 
} from "../../types/dialogue";
import type { ICoreServices } from "../types/editorTypes";
import { useLocalizationStore } from "../localizationStore";

// 클립보드 데이터 (모듈 레벨)
let clipboardData: EditorNodeWrapper[] = [];

/**
 * Node Operations Domain - 노드 복합 연산 관리
 * 
 * ## 📋 주요 책임
 * - **노드 생성**: 텍스트/선택지 노드 생성 및 로컬라이제이션 설정
 * - **자동 연결**: 노드 생성과 동시에 부모-자식 관계 설정
 * - **복사/붙여넣기**: 클립보드 기반 노드 복제 및 배치
 * - **다중 작업**: 선택된 여러 노드의 일괄 삭제/이동
 * - **선택지 관리**: 동적 선택지 추가/제거
 * - **복합 액션**: 여러 단계 작업을 하나의 히스토리로 그룹화
 * 
 * ## 🔄 의존성 관리
 * - **Core Services**: 키 생성, 제한 검증, 복합 액션 관리
 * - **Node Core**: 기본 CRUD 연산 위임
 * - **Layout Domain**: 자동 정렬 및 위치 계산
 * - **History Domain**: 복합 액션 시작/종료
 * - **LocalizationStore**: 텍스트 키 생성 및 정리
 * 
 * ## 🎯 핵심 특징
 * - **감춤→정렬→표시**: 자연스러운 UX를 위한 노드 생성 순서
 * - **로컬라이제이션 통합**: 노드 생성 시 자동 텍스트 키 생성
 * - **클립보드 관리**: 모듈 레벨 클립보드로 복사/붙여넣기 지원
 * - **일괄 처리**: 다중 노드 작업의 효율적 처리
 * - **키 정리**: 노드 삭제 시 미사용 로컬라이제이션 키 자동 정리
 * 
 * @description 11개 public 메서드 + 15개 private 헬퍼 메서드
 */
export class NodeOperationsDomain {
  constructor(
    private getState: () => any,
    private setState: (partial: any) => void,
    private coreServices: ICoreServices,
    private updateLocalizationStoreRef: () => void,
    private nodeDomain: any, // NODE CORE DOMAIN 의존성
    private layoutDomain: any, // LAYOUT DOMAIN 의존성
    private historyDomain: any // HISTORY DOMAIN 의존성
  ) {}

  // === 노드 생성 (2개) ===

  /**
   * 텍스트 노드 생성
   */
  createTextNode(contentText: string = "", speakerText: string = ""): string {
    const validationResult = this.coreServices.validateNodeCountLimit();
    if (!validationResult.isValid) {
      return "";
    }

    const nodeKey = this.coreServices.generateNodeKey();
    const position = this.layoutDomain.getNextNodePosition();

    // 로컬라이제이션 키 생성
    const localizationStore = useLocalizationStore.getState();
    let textKeyRef: string | undefined;
    let speakerKeyRef: string | undefined;

    if (contentText) {
      const result = localizationStore.generateTextKey(contentText);
      localizationStore.setText(result.key, contentText);
      textKeyRef = result.key;
    }

    if (speakerText) {
      const result = localizationStore.generateSpeakerKey(speakerText);
      localizationStore.setText(result.key, speakerText);
      speakerKeyRef = result.key;
    }

    const dialogue: TextDialogue = {
      type: "text",
      speakerText,
      contentText,
      speakerKeyRef,
      textKeyRef,
    };

    const node: EditorNodeWrapper = {
      nodeKey,
      dialogue,
      position,
      hidden: false,
    };

    this.nodeDomain.addNode(node);
    return nodeKey;
  }

  /**
   * 선택지 노드 생성
   */
  createChoiceNode(contentText: string = "", speakerText: string = ""): string {
    const validationResult = this.coreServices.validateNodeCountLimit();
    if (!validationResult.isValid) {
      return "";
    }

    const nodeKey = this.coreServices.generateNodeKey();
    const position = this.layoutDomain.getNextNodePosition();

    // 로컬라이제이션 키 생성
    const localizationStore = useLocalizationStore.getState();
    let textKeyRef: string | undefined;
    let speakerKeyRef: string | undefined;

    if (contentText) {
      const result = localizationStore.generateTextKey(contentText);
      localizationStore.setText(result.key, contentText);
      textKeyRef = result.key;
    }

    if (speakerText) {
      const result = localizationStore.generateSpeakerKey(speakerText);
      localizationStore.setText(result.key, speakerText);
      speakerKeyRef = result.key;
    }

    // 기본 선택지 생성
    const defaultChoices: ChoiceDialogue["choices"] = {
      "choice_1": {
        choiceText: "선택지 1",
        textKeyRef: "",
        nextNodeKey: "",
      },
      "choice_2": {
        choiceText: "선택지 2", 
        textKeyRef: "",
        nextNodeKey: "",
      },
    };

    // 선택지 로컬라이제이션 설정
    Object.entries(defaultChoices).forEach(([choiceKey, choice]) => {
      if (choice.choiceText) {
        const result = localizationStore.generateChoiceKey(choice.choiceText);
        localizationStore.setText(result.key, choice.choiceText);
        choice.textKeyRef = result.key;
      }
    });

    const dialogue: ChoiceDialogue = {
      type: "choice",
      speakerText,
      contentText,
      speakerKeyRef,
      textKeyRef,
      choices: defaultChoices,
    };

    const node: EditorNodeWrapper = {
      nodeKey,
      dialogue,
      position,
      hidden: false,
    };

    this.nodeDomain.addNode(node);
    return nodeKey;
  }

  // === 자동 생성/연결 (2개) ===

  /**
   * 선택지 노드 생성 및 연결
   */
  async createAndConnectChoiceNode(fromNodeKey: string, choiceKey: string, nodeType: "text" | "choice" = "text"): Promise<string> {
    const validation = this._validateChoiceNodeCreation(fromNodeKey, choiceKey);
    if (!validation.isValid || !validation.fromNode || !validation.choice || !validation.currentScene) {
      return "";
    }

    const { newNodeKey, newNode, tempPosition } = this._createNewChoiceChild(
      validation.fromNode,
      fromNodeKey,
      choiceKey,
      nodeType
    );

    this._connectAndUpdateChoiceNode(
      validation.fromNode,
      fromNodeKey,
      choiceKey,
      validation.choice,
      newNodeKey,
      newNode,
      tempPosition
    );

    await this._finalizeChoiceNodeCreation(fromNodeKey, newNodeKey);

    return newNodeKey;
  }

  /**
   * 텍스트 노드 생성 및 연결
   */
  async createAndConnectTextNode(fromNodeKey: string, nodeType: "text" | "choice" = "text"): Promise<string> {
    const validation = this._validateTextNodeCreation(fromNodeKey);
    if (!validation.isValid || !validation.fromNode || !validation.currentScene) {
      return "";
    }

    const { newNodeKey, newNode, tempPosition } = this._createNewTextChild(
      validation.fromNode,
      fromNodeKey,
      nodeType
    );

    this._connectAndUpdateTextNode(validation.fromNode, fromNodeKey, newNodeKey, newNode, tempPosition);

    await this._finalizeTextNodeCreation(fromNodeKey, newNodeKey);

    return newNodeKey;
  }

  // === 복사/붙여넣기 (3개) ===

  /**
   * 선택된 노드들 복사
   */
  copySelectedNodes(): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    if (!currentScene) return;

    const nodesToCopy: EditorNodeWrapper[] = [];

    // 선택된 노드가 있으면 선택된 노드들을, 없으면 현재 선택된 단일 노드를 복사
    const targetKeys = state.selectedNodeKeys.size > 0 ? Array.from(state.selectedNodeKeys) : state.selectedNodeKey ? [state.selectedNodeKey] : [];

    targetKeys.forEach((nodeKey: string) => {
      const node = this.coreServices.getNode(currentScene, nodeKey);
      if (node) {
        nodesToCopy.push(JSON.parse(JSON.stringify(node)));
      }
    });

    clipboardData = nodesToCopy;

    if (state.showToast && nodesToCopy.length > 0) {
      state.showToast(`${nodesToCopy.length}개 노드를 복사했습니다.`, "success");
    }
  }

  /**
   * 노드 붙여넣기
   */
  pasteNodes(position?: { x: number; y: number }): void {
    if (clipboardData.length === 0) return;

    const state = this.getState();
    const nodesToPaste = clipboardData.length;

    // 1. 붙여넣기 작업 검증
    if (!this._validatePasteOperation(nodesToPaste)) {
      return;
    }

    // 2. 붙여넣기 위치 계산
    const startX = position?.x ?? state.lastNodePosition.x + 50;
    const startY = position?.y ?? state.lastNodePosition.y + 50;

    // 3. 새 노드들 생성
    const { newNodes, newNodeKeys } = this._createPastedNodes(startX, startY);

    // 4. 모든 노드를 한 번에 추가
    this.setState((currentState: any) => {
      let updatedState = { ...currentState };

      newNodes.forEach((node) => {
        const newTemplateData = this._ensureSceneExists(updatedState.templateData, updatedState.currentTemplate, updatedState.currentScene);

        const currentScene = newTemplateData[updatedState.currentTemplate][updatedState.currentScene];
        const updatedScene = this.coreServices.setNode(currentScene, node.nodeKey, node);

        updatedState = {
          ...updatedState,
          templateData: {
            ...newTemplateData,
            [updatedState.currentTemplate]: {
              ...newTemplateData[updatedState.currentTemplate],
              [updatedState.currentScene]: updatedScene,
            },
          },
          lastNodePosition: node.position,
          selectedNodeKey: node.nodeKey,
        };
      });

      return {
        ...updatedState,
        selectedNodeKeys: new Set(newNodeKeys),
      };
    });

    // 5. 상태 변경 후에 히스토리에 추가
    this.coreServices.pushToHistory("노드 붙여넣기");
    this.updateLocalizationStoreRef();

    if (state.showToast) {
      state.showToast(`${clipboardData.length}개 노드를 붙여넣었습니다.`, "success");
    }
  }

  /**
   * 노드 복제
   */
  duplicateNode(nodeKey: string): string {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    if (!currentScene) return "";

    const originalNode = this.coreServices.getNode(currentScene, nodeKey);
    if (!originalNode) return "";

    // 임시로 클립보드에 저장하고 붙여넣기
    const originalClipboard = [...clipboardData];
    clipboardData = [originalNode];

    this.pasteNodes({
      x: originalNode.position.x + 50,
      y: originalNode.position.y + 50,
    });

    // 클립보드 복원
    clipboardData = originalClipboard;

    return state.selectedNodeKeys.size > 0 ? Array.from(state.selectedNodeKeys)[0] as string : "";
  }

  // === 다중 작업 (2개) ===

  /**
   * 선택된 노드들 삭제
   */
  deleteSelectedNodes(): void {
    const { targetKeys, currentScene } = this._getNodesForDeletion();
    if (targetKeys.length === 0 || !currentScene) return;

    const allKeysToCleanup = this._collectKeysForCleanup(targetKeys, currentScene);
    this._performNodesDeletion(targetKeys);
    this._finalizeNodesDeletion(allKeysToCleanup, targetKeys);
  }

  /**
   * 선택된 노드들 이동
   */
  moveSelectedNodes(deltaX: number, deltaY: number): void {
    const state = this.getState();
    const targetKeys = state.selectedNodeKeys.size > 0 ? Array.from(state.selectedNodeKeys) : state.selectedNodeKey ? [state.selectedNodeKey] : [];

    targetKeys.forEach((nodeKey: string) => {
      const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
      if (!currentScene) return;

      const node = this.coreServices.getNode(currentScene, nodeKey);
      if (node) {
        this.nodeDomain.moveNode(nodeKey, {
          x: node.position.x + deltaX,
          y: node.position.y + deltaY,
        });
      }
    });
  }

  // === 선택지 관리 (2개) ===

  /**
   * 선택지 추가
   */
  addChoice(nodeKey: string, choiceKey: string, choiceText: string, nextNodeKey: string = ""): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    if (!currentScene) return;

    const node = this.coreServices.getNode(currentScene, nodeKey);
    if (!node || node.dialogue.type !== "choice") return;

    // 로컬라이제이션 키 생성
    const localizationStore = useLocalizationStore.getState();
    const result = localizationStore.generateChoiceKey(choiceText);
    localizationStore.setText(result.key, choiceText);

    const updatedChoices = {
      ...node.dialogue.choices,
      [choiceKey]: {
        choiceText,
        textKeyRef: result.key,
        nextNodeKey,
      },
    };

    this.nodeDomain.updateNode(nodeKey, {
      dialogue: {
        ...node.dialogue,
        choices: updatedChoices,
      },
    });
  }

  /**
   * 선택지 제거
   */
  removeChoice(nodeKey: string, choiceKey: string): void {
    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    if (!currentScene) return;

    const node = this.coreServices.getNode(currentScene, nodeKey);
    if (!node || node.dialogue.type !== "choice") return;

    const choice = node.dialogue.choices?.[choiceKey];
    if (!choice) return;

    // 로컬라이제이션 키 정리
    const localizationStore = useLocalizationStore.getState();
    if (choice.textKeyRef) {
      localizationStore.deleteKey(choice.textKeyRef);
    }

    const updatedChoices = { ...node.dialogue.choices };
    delete updatedChoices[choiceKey];

    this.nodeDomain.updateNode(nodeKey, {
      dialogue: {
        ...node.dialogue,
        choices: updatedChoices,
      },
    });
  }

  // === 헬퍼 메서드들 ===

  // 붙여넣기 관련 헬퍼들
  private _validatePasteOperation(nodesToPaste: number): boolean {
    const state = this.getState();
    const currentNodeCount = this.nodeDomain.getCurrentNodeCount();
    const totalAfterPaste = currentNodeCount + nodesToPaste;

    if (totalAfterPaste > 100) {
      if (state.showToast) {
        state.showToast(`노드 개수 제한 초과: 현재 ${currentNodeCount}개 + 붙여넣기 ${nodesToPaste}개 = ${totalAfterPaste}개 (최대 100개)`, "warning");
      }
      return false;
    }
    return true;
  }

  private _setupPastedNodeLocalization(newNode: EditorNodeWrapper): void {
    const localizationStore = useLocalizationStore.getState();

    if (newNode.dialogue.type === "text" || newNode.dialogue.type === "choice") {
      // 화자 텍스트가 있으면 새 키 생성
      if (newNode.dialogue.speakerText) {
        const result = localizationStore.generateSpeakerKey(newNode.dialogue.speakerText);
        localizationStore.setText(result.key, newNode.dialogue.speakerText);
        newNode.dialogue.speakerKeyRef = result.key;
      }

      // 내용 텍스트가 있으면 새 키 생성
      if (newNode.dialogue.contentText) {
        const result = localizationStore.generateTextKey(newNode.dialogue.contentText);
        localizationStore.setText(result.key, newNode.dialogue.contentText);
        newNode.dialogue.textKeyRef = result.key;
      }
    }

    // 선택지 텍스트들도 새 키 생성
    if (newNode.dialogue.type === "choice" && newNode.dialogue.choices) {
      Object.entries(newNode.dialogue.choices).forEach(([choiceKey, choice]) => {
        if (choice.choiceText) {
          const result = localizationStore.generateChoiceKey(choice.choiceText);
          localizationStore.setText(result.key, choice.choiceText);
          choice.textKeyRef = result.key;
        }
        // 연결된 노드 참조는 제거 (복사된 노드는 연결 없음)
        choice.nextNodeKey = "";
      });
    }

    // 텍스트 노드의 연결도 제거
    if (newNode.dialogue.type === "text") {
      newNode.dialogue.nextNodeKey = undefined;
    }
  }

  private _createPastedNodes(startX: number, startY: number): { newNodes: EditorNodeWrapper[]; newNodeKeys: string[] } {
    const newNodeKeys: string[] = [];
    const newNodes: EditorNodeWrapper[] = [];

    // 새 노드들을 준비
    clipboardData.forEach((originalNode, index) => {
      const newNodeKey = this.coreServices.generateNodeKey();
      const newNode: EditorNodeWrapper = {
        ...JSON.parse(JSON.stringify(originalNode)),
        nodeKey: newNodeKey,
        position: {
          x: startX + index * 20,
          y: startY + index * 20,
        },
      };

      // 로컬라이제이션 설정
      this._setupPastedNodeLocalization(newNode);

      newNodes.push(newNode);
      newNodeKeys.push(newNodeKey);
    });

    return { newNodes, newNodeKeys };
  }

  // 삭제 관련 헬퍼들
  private _getNodesForDeletion(): { targetKeys: string[]; currentScene: Scene | null } {
    const state = this.getState();
    const targetKeys = state.selectedNodeKeys.size > 0 ? Array.from(state.selectedNodeKeys) : state.selectedNodeKey ? [state.selectedNodeKey] : [];
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene] || null;

    return { targetKeys, currentScene };
  }

  private _collectKeysForCleanup(targetKeys: string[], currentScene: Scene): string[] {
    const allNodes = Object.values(currentScene).filter((item): item is EditorNodeWrapper => 
      typeof item === 'object' && item !== null && 'nodeKey' in item
    );
    const nodesToDelete = allNodes.filter(node => targetKeys.includes(node.nodeKey));
    return this._collectLocalizationKeys(nodesToDelete);
  }

  private _performNodesDeletion(targetKeys: string[]): void {
    targetKeys.forEach(nodeKey => {
      this.nodeDomain.deleteNode(nodeKey, true); // 개별 히스토리 기록 생략
    });
  }

  private _finalizeNodesDeletion(allKeysToCleanup: string[], targetKeys: string[]): void {
    // 로컬라이제이션 키 정리는 이미 개별 deleteNode에서 처리됨
    // 중복 정리 제거
    
    // 선택 상태 정리
    this.nodeDomain.clearSelection();

    // 히스토리 추가 (통합 히스토리)
    this.coreServices.pushToHistory(`${targetKeys.length}개 노드 삭제`);
    this.updateLocalizationStoreRef();
  }

  // 노드 생성/연결 헬퍼들
  private _validateChoiceNodeCreation(fromNodeKey: string, choiceKey: string): { 
    isValid: boolean; 
    fromNode: EditorNodeWrapper | null; 
    choice: any | null; 
    currentScene: Scene | null 
  } {
    const compoundActionId = this.historyDomain.startCompoundAction(`선택지에서 새 노드 생성: ${fromNodeKey} -> ${choiceKey}`);
    
    const validationResult = this.coreServices.validateNodeCountLimit({ endCompoundAction: true });
    if (!validationResult.isValid) {
      return { isValid: false, fromNode: null, choice: null, currentScene: null };
    }

    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    if (!currentScene) {
      this.coreServices.endCompoundAction();
      return { isValid: false, fromNode: null, choice: null, currentScene: null };
    }

    const fromNode = this.coreServices.getNode(currentScene, fromNodeKey);
    if (!fromNode || fromNode.dialogue.type !== "choice") {
      this.coreServices.endCompoundAction();
      return { isValid: false, fromNode: null, choice: null, currentScene: null };
    }

    const choice = fromNode.dialogue.choices?.[choiceKey];
    if (!choice) {
      this.coreServices.endCompoundAction();
      return { isValid: false, fromNode: null, choice: null, currentScene: null };
    }

    return { isValid: true, fromNode, choice, currentScene };
  }

  private _createNewChoiceChild(
    fromNode: EditorNodeWrapper,
    fromNodeKey: string,
    choiceKey: string,
    nodeType: "text" | "choice"
  ): { newNodeKey: string; newNode: EditorNodeWrapper; tempPosition: { x: number; y: number } } {
    const newNodeKey = this.coreServices.generateNodeKey();
    const tempPosition = this.layoutDomain.calculateChildNodePosition(fromNodeKey, choiceKey);

    let dialogue: Dialogue;
    if (nodeType === "choice") {
      dialogue = this._createBaseChoiceDialogue();
    } else {
      dialogue = this._createBaseTextDialogue();
    }

    const newNode: EditorNodeWrapper = {
      nodeKey: newNodeKey,
      dialogue,
      position: tempPosition,
      hidden: true, // 감춰진 상태로 생성
    };

    return { newNodeKey, newNode, tempPosition };
  }

  private _connectAndUpdateChoiceNode(
    fromNode: EditorNodeWrapper,
    fromNodeKey: string,
    choiceKey: string,
    choice: any,
    newNodeKey: string,
    newNode: EditorNodeWrapper,
    tempPosition: { x: number; y: number }
  ): void {
    // 새 노드 추가
    this.nodeDomain.addNode(newNode);

    // 선택지 연결 업데이트
    const updatedChoice = { ...choice, nextNodeKey: newNodeKey };
    const updatedChoices = { ...(fromNode.dialogue as ChoiceDialogue).choices, [choiceKey]: updatedChoice };

    this.nodeDomain.updateNode(fromNodeKey, {
      dialogue: {
        ...fromNode.dialogue,
        choices: updatedChoices,
      },
    });
  }

  private async _finalizeChoiceNodeCreation(fromNodeKey: string, newNodeKey: string): Promise<void> {
    // 선택 노드를 새로 생성된 노드로 변경
    this.nodeDomain.setSelectedNode(newNodeKey);

    // 자식 노드들 정렬 (위치 조정)
    await this.layoutDomain.arrangeSelectedNodeChildren(fromNodeKey, true);

    // 정렬 완료 후 새 노드 나타내기
    this.nodeDomain.updateNodeVisibility(newNodeKey, false);

    this.coreServices.endCompoundAction();
  }

  private _validateTextNodeCreation(fromNodeKey: string): { 
    isValid: boolean; 
    fromNode: EditorNodeWrapper | null; 
    currentScene: Scene | null 
  } {
    const compoundActionId = this.historyDomain.startCompoundAction(`텍스트 노드에서 새 노드 생성: ${fromNodeKey}`);
    
    const validationResult = this.coreServices.validateNodeCountLimit({ endCompoundAction: true });
    if (!validationResult.isValid) {
      return { isValid: false, fromNode: null, currentScene: null };
    }

    const state = this.getState();
    const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
    if (!currentScene) {
      this.coreServices.endCompoundAction();
      return { isValid: false, fromNode: null, currentScene: null };
    }

    const fromNode = this.coreServices.getNode(currentScene, fromNodeKey);
    if (!fromNode || fromNode.dialogue.type !== "text") {
      this.coreServices.endCompoundAction();
      return { isValid: false, fromNode: null, currentScene: null };
    }

    return { isValid: true, fromNode, currentScene };
  }

  private _createNewTextChild(
    fromNode: EditorNodeWrapper,
    fromNodeKey: string,
    nodeType: "text" | "choice"
  ): { newNodeKey: string; newNode: EditorNodeWrapper; tempPosition: { x: number; y: number } } {
    const newNodeKey = this.coreServices.generateNodeKey();
    const tempPosition = this.layoutDomain.calculateChildNodePosition(fromNodeKey);

    let dialogue: Dialogue;
    if (nodeType === "choice") {
      dialogue = this._createBaseChoiceDialogue();
    } else {
      dialogue = this._createBaseTextDialogue();
    }

    const newNode: EditorNodeWrapper = {
      nodeKey: newNodeKey,
      dialogue,
      position: tempPosition,
      hidden: true, // 감춰진 상태로 생성
    };

    return { newNodeKey, newNode, tempPosition };
  }

  private _connectAndUpdateTextNode(
    fromNode: EditorNodeWrapper,
    fromNodeKey: string,
    newNodeKey: string,
    newNode: EditorNodeWrapper,
    tempPosition: { x: number; y: number }
  ): void {
    // 새 노드 추가
    this.nodeDomain.addNode(newNode);

    // 텍스트 노드 연결 업데이트
    this.nodeDomain.updateNode(fromNodeKey, {
      dialogue: {
        ...fromNode.dialogue,
        nextNodeKey: newNodeKey,
      },
    });
  }

  private async _finalizeTextNodeCreation(fromNodeKey: string, newNodeKey: string): Promise<void> {
    // 선택 노드를 새로 생성된 노드로 변경
    this.nodeDomain.setSelectedNode(newNodeKey);

    // 자식 노드들 정렬 (위치 조정)
    await this.layoutDomain.arrangeSelectedNodeChildren(fromNodeKey, true);

    // 정렬 완료 후 새 노드 나타내기
    this.nodeDomain.updateNodeVisibility(newNodeKey, false);

    this.coreServices.endCompoundAction();
  }

  // 로컬라이제이션 키 수집
  private _collectLocalizationKeys(nodes: EditorNodeWrapper[]): string[] {
    const keys: string[] = [];

    nodes.forEach(node => {
      if (node.dialogue.type === "text" || node.dialogue.type === "choice") {
        if (node.dialogue.speakerKeyRef) keys.push(node.dialogue.speakerKeyRef);
        if (node.dialogue.textKeyRef) keys.push(node.dialogue.textKeyRef);
      }

      if (node.dialogue.type === "choice" && node.dialogue.choices) {
        Object.values(node.dialogue.choices).forEach(choice => {
          if (choice.textKeyRef) keys.push(choice.textKeyRef);
        });
      }
    });

    return keys;
  }



  // 유틸리티 헬퍼들
  private _ensureSceneExists(templateData: TemplateDialogues, templateKey: string, sceneKey: string): TemplateDialogues {
    if (!templateData[templateKey]) {
      templateData = {
        ...templateData,
        [templateKey]: {},
      };
    }

    if (!templateData[templateKey][sceneKey]) {
      templateData = {
        ...templateData,
        [templateKey]: {
          ...templateData[templateKey],
          [sceneKey]: {},
        },
      };
    }

    return templateData;
  }

  private _createBaseTextDialogue(speakerText: string = "", contentText: string = "", speakerKeyRef?: string, textKeyRef?: string, nextNodeKey?: string): TextDialogue {
    return {
      type: "text",
      speakerText,
      contentText,
      speakerKeyRef,
      textKeyRef,
      nextNodeKey,
    };
  }

  private _createBaseChoiceDialogue(
    speakerText: string = "",
    contentText: string = "",
    speakerKeyRef?: string,
    textKeyRef?: string,
    choices: ChoiceDialogue["choices"] = {}
  ): ChoiceDialogue {
    const defaultChoices = choices && Object.keys(choices).length > 0 ? choices : {
      "choice_1": {
        choiceText: "선택지 1",
        textKeyRef: "",
        nextNodeKey: "",
      },
      "choice_2": {
        choiceText: "선택지 2",
        textKeyRef: "",
        nextNodeKey: "",
      },
    };

    return {
      type: "choice",
      speakerText,  
      contentText,
      speakerKeyRef,
      textKeyRef,
      choices: defaultChoices,
    };
  }
}

/**
 * Node Operations Domain 팩토리 함수
 */
export function createNodeOperationsDomain(
  getState: () => any,
  setState: (partial: any) => void,
  coreServices: ICoreServices,
  updateLocalizationStoreRef: () => void,
  nodeDomain: any,
  layoutDomain: any,
  historyDomain: any
): NodeOperationsDomain {
  return new NodeOperationsDomain(getState, setState, coreServices, updateLocalizationStoreRef, nodeDomain, layoutDomain, historyDomain);
} 