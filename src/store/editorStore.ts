import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorState, EditorNodeWrapper, Dialogue, TextDialogue, ChoiceDialogue, InputDialogue, Scene, TemplateDialogues, ValidationResult } from "../types/dialogue";
import type { LocalizationData } from "./localizationStore";
import type { IEditorStore, HistoryState, ICoreServices } from "./types/editorTypes";
import { createCoreServices } from "./services/coreServices";
import { createHistoryDomain } from "./domains/historyDomain";
import { createProjectDomain, type IProjectDomain } from "./domains/projectDomain";
import { createNodeDomain } from "./domains/nodeDomain";
import { createLayoutDomain } from "./domains/layoutDomain";
import { createNodeOperationsDomain } from "./domains/nodeOperationsDomain";
import { DialogueSpeed } from "../types/dialogue";
import { useLocalizationStore } from "./localizationStore";
import { globalAsyncOperationManager } from "./asyncOperationManager";
import dagre from "@dagrejs/dagre";



interface EditorStore extends IEditorStore {
  // === PROJECT DOMAIN - 액션들 ===
  // 기본 액션들
  setCurrentTemplate: (templateKey: string) => void;
  setCurrentScene: (sceneKey: string) => void;

  // 템플릿/씬 관리 액션들
  createTemplate: (templateKey: string) => void;
  createScene: (templateKey: string, sceneKey: string) => void;

  // 검증 액션들
  validateCurrentScene: () => { isValid: boolean; errors: string[] };
  validateAllData: () => ValidationResult;

  // Import/Export 액션들
  exportToJSON: () => string;
  exportToCSV: () => { dialogue: string; localization: string };
  importFromJSON: (jsonString: string) => void;

  // 데이터 관리 액션들
  resetEditor: () => void;
  loadFromLocalStorage: () => void;
  migrateToNewArchitecture: () => void;

  // === NODE DOMAIN ===
  // 연속 드래그 감지용 상태
  lastDraggedNodeKey: string | null;
  lastDragActionTime: number;

  // 다중 선택 상태
  selectedNodeKeys: Set<string>;

  // 노드 선택 액션
  setSelectedNode: (nodeKey?: string) => void;

  // 다중 선택 액션들
  toggleNodeSelection: (nodeKey: string) => void;
  clearSelection: () => void;
  selectMultipleNodes: (nodeKeys: string[]) => void;

  // 복사/붙여넣기
  copySelectedNodes: () => void;
  pasteNodes: (position?: { x: number; y: number }) => void;
  duplicateNode: (nodeKey: string) => string;

  // 다중 조작
  deleteSelectedNodes: () => void;
  moveSelectedNodes: (deltaX: number, deltaY: number) => void;

  // 노드 관리
  addNode: (node: EditorNodeWrapper) => void;
  updateNode: (nodeKey: string, updates: Partial<EditorNodeWrapper>) => void;
  deleteNode: (nodeKey: string) => void;
  moveNode: (nodeKey: string, position: { x: number; y: number }) => void;

  // 대화 내용 수정 (실제 텍스트 기반)
  updateDialogue: (nodeKey: string, dialogue: Partial<Dialogue>) => void;
  updateNodeText: (nodeKey: string, speakerText?: string, contentText?: string) => void;
  updateChoiceText: (nodeKey: string, choiceKey: string, choiceText: string) => void;

  // 자동 노드 생성 (실제 텍스트 기반)
  createTextNode: (contentText?: string, speakerText?: string) => string;
  createChoiceNode: (contentText?: string, speakerText?: string) => string;

  // 선택지 관리 (실제 텍스트 기반)
  addChoice: (nodeKey: string, choiceKey: string, choiceText: string, nextNodeKey?: string) => void;
  removeChoice: (nodeKey: string, choiceKey: string) => void;

  // 노드 연결 관리
  connectNodes: (fromNodeKey: string, toNodeKey: string, choiceKey?: string) => void;
  disconnectNodes: (fromNodeKey: string, choiceKey?: string) => void;

  // 자식 노드 생성 및 연결
  createAndConnectChoiceNode: (fromNodeKey: string, choiceKey: string, nodeType?: "text" | "choice") => string;
  createAndConnectTextNode: (fromNodeKey: string, nodeType?: "text" | "choice") => string;

  // 유틸리티 액션들
  generateNodeKey: () => string;
  getCurrentNodeCount: () => number;
  canCreateNewNode: () => boolean;

  // 키 참조 업데이트 액션들
  updateNodeKeyReference: (nodeKey: string, keyType: "speaker" | "text", newKeyRef: string) => void;
  updateChoiceKeyReference: (nodeKey: string, choiceKey: string, newKeyRef: string) => void;

  // 노드 업데이트 함수
  updateNodeVisibility: (nodeKey: string, hidden: boolean) => void;
  updateNodePositionAndVisibility: (nodeKey: string, position: { x: number; y: number }, hidden: boolean) => void;

  // === NODE OPERATIONS DOMAIN 관련 헬퍼들은 해당 도메인으로 이동 완료 ===

  // 노드 이동 헬퍼 메서드들
  _validateNodeMovement: (nodeKey: string, position: { x: number; y: number }) => { isValid: boolean; currentNode: EditorNodeWrapper | null; hasPositionChanged: boolean };
  _checkContinuousDrag: (nodeKey: string, currentTime: number) => boolean;
  _performNodeMove: (nodeKey: string, position: { x: number; y: number }, currentTime: number) => void;
  _handleContinuousDrag: (nodeKey: string, currentTime: number) => void;
  _addMoveHistory: (nodeKey: string) => void;

  // 노드 공통 유틸리티 헬퍼들
  _validateNodeCountLimit: (options?: { endCompoundAction?: boolean }) => { isValid: boolean };

  // === HISTORY DOMAIN ===
  // Undo/Redo 상태
  history: HistoryState[];
  historyIndex: number;
  isUndoRedoInProgress: boolean;

  // 복합 액션 그룹 관리
  currentCompoundActionId: string | null;
  compoundActionStartState: HistoryState | null;

  // 복합 액션 그룹 관리
  startCompoundAction: (actionName: string) => string;
  endCompoundAction: () => void;

  // Undo/Redo 액션들
  pushToHistory: (action: string) => void;
  pushToHistoryWithTextEdit: (action: string) => void; // 텍스트 편집 전용 히스토리
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // === LAYOUT DOMAIN
  // 위치 계산 액션들
  getNextNodePosition: () => { x: number; y: number };
  calculateChildNodePosition: (parentNodeKey: string, choiceKey?: string) => { x: number; y: number };

  // 노드 자동 정렬 (기존)
  arrangeChildNodesAsTree: (rootNodeKey: string) => void;
  arrangeAllNodesAsTree: () => void;
  arrangeNodesWithDagre: () => void;

  // 새로운 레이아웃 시스템 (즉시 배치)
  arrangeAllNodes: (internal?: boolean) => Promise<void>;
  arrangeSelectedNodeChildren: (nodeKey: string, internal?: boolean) => Promise<void>;
  arrangeSelectedNodeDescendants: (nodeKey: string, internal?: boolean) => Promise<void>;

  // 노드 정렬 헬퍼 메서드들
  _buildNodeRelationMaps: (currentScene: Scene, allNodeKeys: string[]) => { childrenMap: Map<string, string[]>; parentMap: Map<string, string[]> };
  _buildNodeLevelMap: (rootNodeKey: string, childrenMap: Map<string, string[]>) => Map<number, string[]>;
  _updateLevelNodePositions: (levelMap: Map<number, string[]>, startX: number, rootY: number) => void;
  _updateChildNodePositions: (levelMap: Map<number, string[]>, rootNodeKey: string, startX: number, startY: number) => void;
  _findRootNodeForLayout: (currentScene: Scene, allNodeKeys: string[]) => string;
  _runGlobalLayoutSystem: (currentScene: Scene, rootNodeKey: string) => Promise<void>;
  _runLayoutSystem: (currentScene: Scene, rootNodeId: string, layoutType: "global" | "descendant" | "child") => Promise<void>;
  _handleLayoutResult: (beforePositions: Map<string, { x: number; y: number }>, allNodeKeys: string[]) => void;
  _handleLayoutSystemResult: (beforePositions: Map<string, { x: number; y: number }>, nodeKeys: string[], layoutType: "global" | "descendant" | "child", nodeCount: number) => void;

  // 위치 계산 헬퍼 메서드들 (private)
  _initializePositionCalculation: () => any;
  _calculateCandidatePosition: (initData: any) => { x: number; y: number };
  _findNonOverlappingPosition: (candidatePosition: { x: number; y: number }, initData: any) => { x: number; y: number };
  _getFallbackPosition: (lastNodePosition: { x: number; y: number }) => { x: number; y: number };

  // 후손/자식 정렬 헬퍼 메서드들 (private)
  _findRelatedNodes: (nodeKey: string, currentScene: Scene, maxDepth?: number) => Set<string>;
  _findDescendantNodes: (nodeKey: string, currentScene: Scene) => Set<string>;
  _runDescendantLayoutSystem: (nodeKey: string, currentScene: Scene, affectedNodeKeys: string[]) => Promise<void>;
  _handleDescendantLayoutResult: (beforePositions: Map<string, { x: number; y: number }>, affectedNodeKeys: string[], descendantCount: number) => void;
  _findChildNodes: (nodeKey: string, currentScene: Scene) => Set<string>;
  _runChildLayoutSystem: (nodeKey: string, currentScene: Scene, affectedNodeKeys: string[]) => Promise<void>;
  _handleChildLayoutResult: (beforePositions: Map<string, { x: number; y: number }>, affectedNodeKeys: string[], childCount: number) => void;

  // === UI DOMAIN ===
  // 전역 토스트 함수
  showToast?: (message: string, type?: "success" | "info" | "warning") => void;
}

// 타입 안전한 헬퍼 함수들
const createEmptyScene = (): Scene => ({});

const createEmptyTemplate = (): TemplateDialogues => ({
  default: {
    main: createEmptyScene(),
  },
});

const ensureTemplateExists = (templateData: TemplateDialogues, templateKey: string): TemplateDialogues => {
  if (!templateData[templateKey]) {
    return {
      ...templateData,
      [templateKey]: { main: createEmptyScene() },
    };
  }
  return templateData;
};

const ensureSceneExists = (templateData: TemplateDialogues, templateKey: string, sceneKey: string): TemplateDialogues => {
  const updatedData = ensureTemplateExists(templateData, templateKey);
  if (!updatedData[templateKey][sceneKey]) {
    return {
      ...updatedData,
      [templateKey]: {
        ...updatedData[templateKey],
        [sceneKey]: createEmptyScene(),
      },
    };
  }
  return updatedData;
};

// 타입 안전한 Scene 접근 헬퍼
const getNode = (scene: Scene, nodeKey: string): EditorNodeWrapper | undefined => {
  return scene[nodeKey];
};

const setNode = (scene: Scene, nodeKey: string, node: EditorNodeWrapper): Scene => {
  return {
    ...scene,
    [nodeKey]: node,
  };
};

const deleteNodeFromScene = (scene: Scene, nodeKey: string): Scene => {
  const newScene = { ...scene };
  delete newScene[nodeKey];

  // 댕글링 참조 정리: 삭제된 노드를 참조하는 모든 노드들의 참조를 제거
  Object.values(newScene).forEach((nodeWrapper) => {
    const { dialogue } = nodeWrapper;

    // TextDialogue의 nextNodeKey 정리
    if (dialogue.type === "text" && dialogue.nextNodeKey === nodeKey) {
      dialogue.nextNodeKey = undefined;
    }

    // ChoiceDialogue의 선택지들 정리
    if (dialogue.type === "choice" && dialogue.choices) {
      Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
        if (choice.nextNodeKey === nodeKey) {
          dialogue.choices[choiceKey].nextNodeKey = "";
        }
      });
    }
  });

  return newScene;
};

// === 기본 상태 (도메인별 그룹화) ===
const initialState: EditorState = {
  // PROJECT DOMAIN
  currentTemplate: "default",
  templateData: createEmptyTemplate(),
  currentScene: "main",

  // NODE DOMAIN
  selectedNodeKey: undefined,

  // LAYOUT DOMAIN
  lastNodePosition: { x: 250, y: 100 },
};

// 노드 생성 공통 함수들
const createBaseTextDialogue = (speakerText: string = "", contentText: string = "", speakerKeyRef?: string, textKeyRef?: string, nextNodeKey?: string): TextDialogue => ({
  type: "text" as const,
  speakerText,
  contentText,
  speakerKeyRef,
  textKeyRef,
  nextNodeKey,
  speed: DialogueSpeed.NORMAL,
});

const createBaseChoiceDialogue = (
  speakerText: string = "",
  contentText: string = "",
  speakerKeyRef?: string,
  textKeyRef?: string,
  choices: ChoiceDialogue["choices"] = {}
): ChoiceDialogue => ({
  type: "choice" as const,
  speakerText,
  contentText,
  speakerKeyRef,
  textKeyRef,
  choices,
  speed: DialogueSpeed.NORMAL,
  shuffle: false,
});

const createNodeWrapper = (nodeKey: string, dialogue: Dialogue, position: { x: number; y: number }, hidden: boolean = false): EditorNodeWrapper => ({
  nodeKey,
  dialogue,
  position,
  hidden,
});

const getDefaultChoices = (): ChoiceDialogue["choices"] => ({
  A: { choiceText: "선택지 A", nextNodeKey: "", textKeyRef: undefined },
  B: { choiceText: "선택지 B", nextNodeKey: "", textKeyRef: undefined },
});

// 클립보드 저장소 (메모리에만 저장)
let clipboardData: EditorNodeWrapper[] = [];

// 위치 비교 유틸리티 함수들
const captureNodePositions = (scene: Scene, nodeKeys: string[]): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  nodeKeys.forEach((nodeKey) => {
    const node = getNode(scene, nodeKey);
    if (node) {
      positions.set(nodeKey, { ...node.position });
    }
  });
  return positions;
};

const comparePositions = (beforePositions: Map<string, { x: number; y: number }>, afterPositions: Map<string, { x: number; y: number }>): boolean => {
  // 키 개수가 다르면 변화 있음
  if (beforePositions.size !== afterPositions.size) return true;

  // 각 노드의 위치 비교
  for (const [nodeKey, beforePos] of beforePositions) {
    const afterPos = afterPositions.get(nodeKey);
    if (!afterPos) return true; // 노드가 사라진 경우

    // 위치 차이가 1픽셀 이상이면 변화로 판정 (부동소수점 오차 고려)
    if (Math.abs(beforePos.x - afterPos.x) > 0.5 || Math.abs(beforePos.y - afterPos.y) > 0.5) {
      return true;
    }
  }

  return false; // 변화 없음
};

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => {
      // LocalizationStore 참조 업데이트 헬퍼
      const updateLocalizationStoreRef = () => {
        const localizationStore = useLocalizationStore.getState();
        localizationStore._setEditorStore(get());
      };

      // Core Services 인스턴스 생성
      const coreServices: ICoreServices = createCoreServices(get, set);

      // History Domain 인스턴스 생성
      const historyDomain = createHistoryDomain(get, set, coreServices, updateLocalizationStoreRef);

      // Project Domain 인스턴스 생성
      const projectDomain = createProjectDomain(get, set, coreServices, updateLocalizationStoreRef, initialState);

      // Node Domain 인스턴스 생성
      const nodeDomain = createNodeDomain(get, set, coreServices);

      // Layout Domain 인스턴스 생성
      const layoutDomain = createLayoutDomain(get, set, coreServices);

      // Node Operations Domain 인스턴스 생성
      const nodeOperationsDomain = createNodeOperationsDomain(get, set, coreServices, updateLocalizationStoreRef, nodeDomain, layoutDomain, historyDomain);

      return {
        ...initialState,

        // Undo/Redo 상태 초기화 - 초기 상태를 히스토리에 포함
        history: [
          {
            templateData: JSON.parse(JSON.stringify(initialState.templateData)),
            localizationData: useLocalizationStore.getState().exportLocalizationData(),
            timestamp: Date.now(),
            action: "초기 상태",
          },
        ],
        historyIndex: 0,
        isUndoRedoInProgress: false,

        // 복합 액션 그룹 관리 초기화
        currentCompoundActionId: null,
        compoundActionStartState: null,

        // 연속 드래그 감지용 상태 초기화
        lastDraggedNodeKey: null,
        lastDragActionTime: 0,

        // 다중 선택 상태 초기화
        selectedNodeKeys: new Set<string>(),

        // 기본 설정
        setCurrentTemplate: (templateKey) => {
          projectDomain.setCurrentTemplate(templateKey);
        },

        setCurrentScene: (sceneKey) => {
          projectDomain.setCurrentScene(sceneKey);
        },

        setSelectedNode: (nodeKey) => {
          nodeDomain.setSelectedNode(nodeKey);
          updateLocalizationStoreRef();
        },

        // 다중 선택 액션들
        toggleNodeSelection: (nodeKey) => {
          nodeDomain.toggleNodeSelection(nodeKey);
        },

        clearSelection: () => {
          nodeDomain.clearSelection();
        },

        selectMultipleNodes: (nodeKeys) => {
          nodeDomain.selectMultipleNodes(nodeKeys);
        },

        // 복합 액션 그룹 관리
        startCompoundAction: (actionName) => {
          return historyDomain.startCompoundAction(actionName);
        },

        endCompoundAction: () => {
          coreServices.endCompoundAction();
        },

        // Undo/Redo 액션들
        pushToHistory: (action) => {
          coreServices.pushToHistory(action);
        },

        pushToHistoryWithTextEdit: (action) => {
          historyDomain.pushToHistoryWithTextEdit(action);
        },

        undo: () => {
          historyDomain.undo();
        },

        redo: () => {
          historyDomain.redo();
        },

        canUndo: () => {
          return historyDomain.canUndo();
        },

        canRedo: () => {
          return historyDomain.canRedo();
        },

        // 복사/붙여넣기
        copySelectedNodes: () => {
          nodeOperationsDomain.copySelectedNodes();
        },

        pasteNodes: (position) => {
          nodeOperationsDomain.pasteNodes(position);
        },

        duplicateNode: (nodeKey) => {
          return nodeOperationsDomain.duplicateNode(nodeKey);
        },



        // 다중 조작 - 선택된 노드들 삭제 (리팩터링됨)
        deleteSelectedNodes: () => {
          nodeOperationsDomain.deleteSelectedNodes();
        },

        moveSelectedNodes: (deltaX, deltaY) => {
          nodeOperationsDomain.moveSelectedNodes(deltaX, deltaY);
        },

        // 노드 관리
        addNode: (node) => {
          nodeDomain.addNode(node);
          updateLocalizationStoreRef();
        },

        updateNode: (nodeKey, updates) => {
          nodeDomain.updateNode(nodeKey, updates);
          updateLocalizationStoreRef();
        },

        deleteNode: (nodeKey) => {
          nodeDomain.deleteNode(nodeKey);
        },





        moveNode: (nodeKey, position) => {
          nodeDomain.moveNode(nodeKey, position);
        },

        // 노드 이동 유효성 검사
        _validateNodeMovement: (nodeKey: string, position: { x: number; y: number }) => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

          if (!currentScene) {
            return { isValid: false, currentNode: null, hasPositionChanged: false };
          }

          const currentNode = getNode(currentScene, nodeKey);
          if (!currentNode) {
            return { isValid: false, currentNode: null, hasPositionChanged: false };
          }

          // 위치 변경 여부 확인 (소수점 반올림 고려)
          const oldPosition = currentNode.position;
          const hasPositionChanged = Math.round(oldPosition.x) !== Math.round(position.x) || Math.round(oldPosition.y) !== Math.round(position.y);

          return {
            isValid: hasPositionChanged,
            currentNode,
            hasPositionChanged,
          };
        },

        // 연속 드래그 여부 확인
        _checkContinuousDrag: (nodeKey: string, currentTime: number): boolean => {
          const state = get();
          const CONTINUOUS_DRAG_THRESHOLD = 1000; // 1초 이내면 연속 드래그로 간주

          return state.lastDraggedNodeKey === nodeKey && currentTime - state.lastDragActionTime <= CONTINUOUS_DRAG_THRESHOLD;
        },

        // 실제 노드 위치 업데이트
        _performNodeMove: (nodeKey: string, position: { x: number; y: number }, currentTime: number) => {
          set((currentState) => {
            const currentScene = currentState.templateData[currentState.currentTemplate]?.[currentState.currentScene];
            if (!currentScene) return currentState;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode) return currentState;

            const updatedNode = { ...currentNode, position };
            const updatedScene = setNode(currentScene, nodeKey, updatedNode);

            return {
              ...currentState,
              templateData: {
                ...currentState.templateData,
                [currentState.currentTemplate]: {
                  ...currentState.templateData[currentState.currentTemplate],
                  [currentState.currentScene]: updatedScene,
                },
              },
              lastNodePosition: position,
              lastDraggedNodeKey: nodeKey,
              lastDragActionTime: currentTime,
            };
          });
        },

        // 연속 드래그 히스토리 처리 (덮어쓰기)
        _handleContinuousDrag: (nodeKey: string, currentTime: number) => {
          const currentState = get();
          const lastHistory = currentState.history[currentState.historyIndex];

          if (lastHistory && lastHistory.action === `노드 이동 (${nodeKey})` && currentTime - lastHistory.timestamp < 2000) {
            // 기존 히스토리의 최종 상태만 업데이트 (덮어쓰기)
            set((state) => {
              const updatedHistory = [...state.history];
              updatedHistory[state.historyIndex] = {
                ...lastHistory,
                templateData: JSON.parse(JSON.stringify(state.templateData)),
                localizationData: useLocalizationStore.getState().exportLocalizationData(),
                timestamp: currentTime,
              };

              return {
                history: updatedHistory,
              };
            });
          } else {
            // 연속 드래그가 아니라면 새 히스토리 추가
            get()._addMoveHistory(nodeKey);
          }
        },

        // 일반 이동 히스토리 추가
        _addMoveHistory: (nodeKey: string) => {
          get().pushToHistory(`노드 이동 (${nodeKey})`);
        },

        // 대화 내용 수정 (실제 텍스트 기반)
        updateDialogue: (nodeKey, dialogue) => {
          nodeDomain.updateDialogue(nodeKey, dialogue);
        },

        updateNodeText: (nodeKey, speakerText, contentText) => {
          nodeDomain.updateNodeText(nodeKey, speakerText, contentText);
        },

        updateChoiceText: (nodeKey, choiceKey, choiceText) => {
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode || currentNode.dialogue.type !== "choice") return state;

            // LocalizationStore와 연동하여 키 생성 및 텍스트 저장
            const localizationStore = useLocalizationStore.getState();

            let textKeyRef: string | undefined;

            if (choiceText && choiceText.trim()) {
              const currentChoice = currentNode.dialogue.choices[choiceKey];
              const currentChoiceKey = currentChoice?.textKeyRef;
              const currentUsageCount = currentChoiceKey ? localizationStore.getKeyUsageCount(currentChoiceKey) : 0;

              if (currentChoiceKey && currentUsageCount === 1) {
                // 단일 사용 키: 기존 키 유지, 텍스트만 업데이트
                localizationStore.setText(currentChoiceKey, choiceText);
                textKeyRef = currentChoiceKey;
              } else {
                // 다중 사용 키 또는 새 키: 기존 로직 사용
                const choiceKeyResult = localizationStore.generateChoiceKey(choiceText);
                localizationStore.setText(choiceKeyResult.key, choiceText);
                textKeyRef = choiceKeyResult.key;
              }
            } else {
              // 빈 문자열인 경우: 단일 사용 키만 삭제
              const existingChoice = currentNode.dialogue.choices[choiceKey];
              if (existingChoice?.textKeyRef) {
                const currentUsageCount = localizationStore.getKeyUsageCount(existingChoice.textKeyRef);
                if (currentUsageCount === 1) {
                  // 단일 사용 키만 삭제
                  localizationStore.deleteKey(existingChoice.textKeyRef);
                }
                // 다중 사용 키는 삭제하지 않고 현재 노드의 참조만 제거
              }
              textKeyRef = undefined;
            }

            const updatedDialogue = { ...currentNode.dialogue };
            if (updatedDialogue.choices[choiceKey]) {
              updatedDialogue.choices[choiceKey] = {
                ...updatedDialogue.choices[choiceKey],
                choiceText,
                textKeyRef,
              };
            }

            const updatedNode = { ...currentNode, dialogue: updatedDialogue };
            const updatedScene = setNode(currentScene, nodeKey, updatedNode);

            return {
              templateData: {
                ...state.templateData,
                [state.currentTemplate]: {
                  ...state.templateData[state.currentTemplate],
                  [state.currentScene]: updatedScene,
                },
              },
            };
          });
          updateLocalizationStoreRef();
        },

        // 자동 노드 생성 (실제 텍스트 기반)
        createTextNode: (contentText = "", speakerText = "") => {
          return nodeOperationsDomain.createTextNode(contentText, speakerText);
        },

        createChoiceNode: (contentText = "", speakerText = "") => {
          return nodeOperationsDomain.createChoiceNode(contentText, speakerText);
        },

        // 선택지 관리 (실제 텍스트 기반)
        addChoice: (nodeKey, choiceKey, choiceText, nextNodeKey = "") => {
          nodeOperationsDomain.addChoice(nodeKey, choiceKey, choiceText, nextNodeKey);
        },

        removeChoice: (nodeKey, choiceKey) => {
          nodeOperationsDomain.removeChoice(nodeKey, choiceKey);
        },

        // 연결 관리
        connectNodes: (fromNodeKey, toNodeKey, choiceKey) => {
          nodeDomain.connectNodes(fromNodeKey, toNodeKey, choiceKey);
        },

        // 연결 끊기
        disconnectNodes: (fromNodeKey, choiceKey) => {
          nodeDomain.disconnectNodes(fromNodeKey, choiceKey);
        },

        // AC-02: 선택지별 새 노드 자동 생성 및 연결 (리팩터링됨)
        createAndConnectChoiceNode: (fromNodeKey, choiceKey, nodeType = "text") => {
          return nodeOperationsDomain.createAndConnectChoiceNode(fromNodeKey, choiceKey, nodeType);
        },

        // 텍스트 노드에서 새 노드 자동 생성 및 연결
        createAndConnectTextNode: (fromNodeKey, nodeType = "text") => {
          return nodeOperationsDomain.createAndConnectTextNode(fromNodeKey, nodeType);
        },

        // 템플릿/씬 관리
        createTemplate: (templateKey) => {
          projectDomain.createTemplate(templateKey);
        },

        createScene: (templateKey, sceneKey) => {
          projectDomain.createScene(templateKey, sceneKey);
        },

        // 유틸리티 - 안정적인 노드 위치 계산
        getNextNodePosition: () => {
          return layoutDomain.getNextNodePosition();
        },

        // 기본 설정 및 초기화
        _initializePositionCalculation: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

          return {
            currentScene,
            allNodes: currentScene ? Object.values(currentScene) : [],
            lastNodePosition: state.lastNodePosition,
            constants: {
              DEFAULT_NODE_WIDTH: 200,
              DEFAULT_NODE_HEIGHT: 120,
              SPACING_X: 60,
              SPACING_Y: 40,
              MAX_ATTEMPTS: 20,
              MAX_ROWS_PER_COLUMN: 4,
            },
          };
        },

        // 후보 위치 계산 (이전 노드 기준)
        _calculateCandidatePosition: (initData: any) => {
          const { lastNodePosition, constants } = initData;

          return {
            x: lastNodePosition.x + constants.DEFAULT_NODE_WIDTH + constants.SPACING_X,
            y: lastNodePosition.y,
          };
        },

        // 겹치지 않는 위치 찾기
        _findNonOverlappingPosition: (candidatePosition: { x: number; y: number }, initData: any) => {
          const { allNodes, lastNodePosition, constants } = initData;
          let { x: candidateX, y: candidateY } = candidatePosition;

          // 겹치는 노드가 있는지 확인하는 함수 (고정 크기 기반)
          const isPositionOccupied = (x: number, y: number, newNodeWidth: number, newNodeHeight: number) => {
            return allNodes.some((node: any) => {
              // 기본 노드 크기 사용 (더 안정적)
              const existingDimensions = { width: constants.DEFAULT_NODE_WIDTH, height: constants.DEFAULT_NODE_HEIGHT };

              // AABB (Axis-Aligned Bounding Box) 충돌 감지
              const overlap = !(
                x + newNodeWidth + constants.SPACING_X < node.position.x ||
                x > node.position.x + existingDimensions.width + constants.SPACING_X ||
                y + newNodeHeight + constants.SPACING_Y < node.position.y ||
                y > node.position.y + existingDimensions.height + constants.SPACING_Y
              );

              return overlap;
            });
          };

          // 새 노드의 예상 크기
          const estimatedNewNodeDimensions = { width: 200, height: 120 };

          // 겹치지 않는 위치 찾기
          let attempts = 0;

          while (isPositionOccupied(candidateX, candidateY, estimatedNewNodeDimensions.width, estimatedNewNodeDimensions.height) && attempts < constants.MAX_ATTEMPTS) {
            candidateY += estimatedNewNodeDimensions.height + constants.SPACING_Y;

            // Y가 너무 아래로 가면 다음 열로 이동
            if (candidateY > lastNodePosition.y + (estimatedNewNodeDimensions.height + constants.SPACING_Y) * constants.MAX_ROWS_PER_COLUMN) {
              candidateX += estimatedNewNodeDimensions.width + constants.SPACING_X;
              candidateY = lastNodePosition.y;
            }

            attempts++;
          }

          // 최대 시도 횟수에 도달하면 폴백 위치 사용
          if (attempts >= constants.MAX_ATTEMPTS) {
            return get()._getFallbackPosition(lastNodePosition);
          }

          return { x: candidateX, y: candidateY };
        },

        // 최대 시도 후 폴백 위치
        _getFallbackPosition: (lastNodePosition: { x: number; y: number }) => {
          return {
            x: lastNodePosition.x + 250,
            y: lastNodePosition.y + 150,
          };
        },



        // 개선된 자식 노드 위치 계산 - 실제 동적 크기 기반 (리팩터링됨)
        calculateChildNodePosition: (parentNodeKey, choiceKey) => {
          return layoutDomain.calculateChildNodePosition(parentNodeKey, choiceKey);
        },

        generateNodeKey: () => {
          return nodeDomain.generateNodeKey();
        },

        getCurrentNodeCount: () => {
          return nodeDomain.getCurrentNodeCount();
        },

        canCreateNewNode: () => {
          return nodeDomain.canCreateNewNode();
        },

        // Dagre 기반 자동 정렬 (향상된 버전)
        arrangeNodesWithDagre: () => {
          layoutDomain.arrangeNodesWithDagre();
        },

        // 헬퍼 메서드: 자식 노드 위치 계산 및 업데이트 (루트 노드 고정)
        _updateChildNodePositions: (levelMap: Map<number, string[]>, rootNodeKey: string, startX: number, startY: number) => {
          const levelSpacing = 320; // 레벨 간 X축 간격

          // 동적 노드 크기 계산 함수
          const getNodeDimensions = (nodeKey: string) => {
            const nodeElement = document.querySelector(`[data-id="${nodeKey}"]`);
            if (nodeElement) {
              const rect = nodeElement.getBoundingClientRect();
              return { width: rect.width, height: rect.height };
            }
            return { width: 200, height: 120 }; // 기본값
          };

          levelMap.forEach((nodesInLevel, level) => {
            const levelX = startX + level * levelSpacing;
            let cumulativeY = startY;

            nodesInLevel.forEach((nodeKey, index) => {
              const nodeDimensions = getNodeDimensions(nodeKey);
              const dynamicSpacing = nodeDimensions.height + 30; // 동적 간격

              const newY = index === 0 ? startY : cumulativeY;

              // 루트 노드가 아닌 경우에만 위치 업데이트 (직접 업데이트하여 히스토리 중복 방지)
              if (nodeKey !== rootNodeKey) {
                const newPosition = { x: levelX, y: newY };

                // 직접 위치 업데이트 (히스토리 중복 방지)
                const currentState = get();
                const currentScene = currentState.templateData[currentState.currentTemplate]?.[currentState.currentScene];
                if (currentScene) {
                  const currentNode = getNode(currentScene, nodeKey);
                  if (currentNode) {
                    const updatedNode = { ...currentNode, position: newPosition };
                    const updatedScene = setNode(currentScene, nodeKey, updatedNode);

                    set((state) => ({
                      ...state,
                      templateData: {
                        ...state.templateData,
                        [state.currentTemplate]: {
                          ...state.templateData[state.currentTemplate],
                          [state.currentScene]: updatedScene,
                        },
                      },
                      lastNodePosition: newPosition,
                    }));
                  }
                }
              }

              // 다음 노드를 위한 Y 위치 누적
              if (index < nodesInLevel.length - 1) {
                cumulativeY = newY + dynamicSpacing;
              }
            });
          });
        },

        // 노드 자동 정렬 - 선택된 노드를 루트로 하여 자식 노드들을 트리 형태로 배치 (리팩터링됨)
        arrangeChildNodesAsTree: (rootNodeKey) => {
          layoutDomain.arrangeChildNodesAsTree(rootNodeKey);
        },

        // 헬퍼 메서드: 노드 관계 매핑 생성
        _buildNodeRelationMaps: (currentScene: Scene, allNodeKeys: string[]) => {
          const childrenMap = new Map<string, string[]>();
          const parentMap = new Map<string, string[]>();

          allNodeKeys.forEach((nodeKey) => {
            const node = getNode(currentScene, nodeKey);
            if (!node) return;

            const children: string[] = [];

            if (node.dialogue.type === "text" && node.dialogue.nextNodeKey) {
              children.push(node.dialogue.nextNodeKey);
            } else if (node.dialogue.type === "choice") {
              Object.values(node.dialogue.choices).forEach((choice) => {
                if (choice.nextNodeKey) {
                  children.push(choice.nextNodeKey);
                }
              });
            }

            if (children.length > 0) {
              childrenMap.set(nodeKey, children);
              // 부모 관계도 매핑
              children.forEach((childKey) => {
                if (!parentMap.has(childKey)) {
                  parentMap.set(childKey, []);
                }
                parentMap.get(childKey)!.push(nodeKey);
              });
            }
          });

          return { childrenMap, parentMap };
        },

        // 헬퍼 메서드: BFS 기반 노드 레벨 매핑 생성
        _buildNodeLevelMap: (rootNodeKey: string, childrenMap: Map<string, string[]>) => {
          const nodeLevels = new Map<string, number>();
          const levelMap = new Map<number, string[]>();
          const queue: { nodeKey: string; level: number }[] = [{ nodeKey: rootNodeKey, level: 0 }];

          nodeLevels.set(rootNodeKey, 0);

          while (queue.length > 0) {
            const { nodeKey, level } = queue.shift()!;

            // 이미 더 높은 레벨로 처리된 노드는 건너뜀
            if (nodeLevels.has(nodeKey) && nodeLevels.get(nodeKey)! > level) {
              continue;
            }

            // 레벨 업데이트 (더 높은 레벨 우선)
            const currentLevel = Math.max(nodeLevels.get(nodeKey) || 0, level);
            nodeLevels.set(nodeKey, currentLevel);

            // levelMap 구성
            if (!levelMap.has(currentLevel)) {
              levelMap.set(currentLevel, []);
            }
            if (!levelMap.get(currentLevel)!.includes(nodeKey)) {
              levelMap.get(currentLevel)!.push(nodeKey);
            }

            // 자식 노드들을 다음 레벨에 추가
            const children = childrenMap.get(nodeKey) || [];
            children.forEach((childKey) => {
              const childNextLevel = currentLevel + 1;
              const existingLevel = nodeLevels.get(childKey);

              // 자식 노드가 더 높은 레벨로 갱신되거나 처음 방문하는 경우
              if (!existingLevel || childNextLevel > existingLevel) {
                nodeLevels.set(childKey, childNextLevel);
                queue.push({ nodeKey: childKey, level: childNextLevel });
              }
            });
          }

          return levelMap;
        },

        // 헬퍼 메서드: 레벨별 노드 위치 계산 및 업데이트
        _updateLevelNodePositions: (levelMap: Map<number, string[]>, startX: number, rootY: number) => {
          const levelSpacing = 320; // 레벨 간 X축 간격

          // 동적 노드 크기 계산 함수
          const getNodeDimensions = (nodeKey: string) => {
            const nodeElement = document.querySelector(`[data-id="${nodeKey}"]`);
            if (nodeElement) {
              const rect = nodeElement.getBoundingClientRect();
              return { width: rect.width, height: rect.height };
            }
            return { width: 200, height: 120 }; // 기본값
          };

          levelMap.forEach((nodesInLevel, level) => {
            const levelX = startX + level * levelSpacing;
            let cumulativeY = rootY;

            nodesInLevel.forEach((nodeKey, index) => {
              const nodeDimensions = getNodeDimensions(nodeKey);
              const dynamicSpacing = nodeDimensions.height + 30; // 동적 간격

              const newY = index === 0 ? rootY : cumulativeY;
              const newPosition = { x: levelX, y: newY };

              // 직접 위치 업데이트 (히스토리 중복 방지)
              const currentState = get();
              const currentScene = currentState.templateData[currentState.currentTemplate]?.[currentState.currentScene];
              if (currentScene) {
                const currentNode = getNode(currentScene, nodeKey);
                if (currentNode) {
                  const updatedNode = { ...currentNode, position: newPosition };
                  const updatedScene = setNode(currentScene, nodeKey, updatedNode);

                  set((state) => ({
                    ...state,
                    templateData: {
                      ...state.templateData,
                      [state.currentTemplate]: {
                        ...state.templateData[state.currentTemplate],
                        [state.currentScene]: updatedScene,
                      },
                    },
                    lastNodePosition: newPosition,
                  }));
                }
              }

              // 다음 노드를 위한 Y 위치 누적
              if (index < nodesInLevel.length - 1) {
                cumulativeY = newY + dynamicSpacing;
              }
            });
          });
        },

        // 전체 노드 자동 정렬 - 모든 노드를 계층적으로 배치 (리팩터링됨)
        arrangeAllNodesAsTree: () => {
          layoutDomain.arrangeAllNodesAsTree();
        },

        // 검증
        validateCurrentScene: () => {
          return projectDomain.validateCurrentScene();
        },

        validateAllData: () => {
          return projectDomain.validateAllData();
        },

        // Import/Export - LocalizationStore 연동
        exportToJSON: () => {
          return projectDomain.exportToJSON();
        },

        exportToCSV: () => {
          return projectDomain.exportToCSV();
        },

        importFromJSON: (jsonString: string) => {
          projectDomain.importFromJSON(jsonString);
        },

        // 데이터 초기화/로드/마이그레이션
        resetEditor: () => {
          projectDomain.resetEditor();
        },

        loadFromLocalStorage: () => {
          projectDomain.loadFromLocalStorage();
        },

        migrateToNewArchitecture: () => {
          projectDomain.migrateToNewArchitecture();
        },

        // 키 참조 업데이트
        updateNodeKeyReference: (nodeKey, keyType, newKeyRef) => {
          nodeDomain.updateNodeKeyReference(nodeKey, keyType, newKeyRef);
        },

        updateChoiceKeyReference: (nodeKey, choiceKey, newKeyRef) => {
          nodeDomain.updateChoiceKeyReference(nodeKey, choiceKey, newKeyRef);
        },

        // 헬퍼 메서드: 레이아웃을 위한 루트 노드 찾기
        _findRootNodeForLayout: (currentScene: Scene, allNodeKeys: string[]) => {
          const parentMap = new Map<string, string[]>();

          // 각 노드의 부모-자식 관계 매핑
          allNodeKeys.forEach((nodeKey) => {
            const node = getNode(currentScene, nodeKey);
            if (!node) return;

            const children: string[] = [];

            if (node.dialogue.type === "text" && node.dialogue.nextNodeKey) {
              children.push(node.dialogue.nextNodeKey);
            } else if (node.dialogue.type === "choice") {
              Object.values(node.dialogue.choices).forEach((choice) => {
                if (choice.nextNodeKey) {
                  children.push(choice.nextNodeKey);
                }
              });
            }

            // 부모 관계 매핑
            children.forEach((childKey) => {
              if (!parentMap.has(childKey)) {
                parentMap.set(childKey, []);
              }
              parentMap.get(childKey)!.push(nodeKey);
            });
          });

          // 루트 노드들 찾기 (부모가 없는 노드들)
          const rootNodes = allNodeKeys.filter((nodeKey) => !parentMap.has(nodeKey));

          // 루트 노드가 없으면 첫 번째 노드를 루트로 사용
          return rootNodes.length > 0 ? rootNodes[0] : allNodeKeys[0];
        },

        // 헬퍼 메서드: 글로벌 레이아웃 시스템 실행
        _runGlobalLayoutSystem: async (currentScene: Scene, rootNodeKey: string) => {
          await get()._runLayoutSystem(currentScene, rootNodeKey, "global");
        },

        // 통합 레이아웃 시스템 실행 헬퍼
        _runLayoutSystem: async (currentScene: Scene, rootNodeId: string, layoutType: "global" | "descendant" | "child") => {
          await coreServices.runLayoutSystem(currentScene, rootNodeId, layoutType);
        },

        // 헬퍼 메서드: 레이아웃 결과 처리 (위치 변화 감지 및 히스토리)
        _handleLayoutResult: (beforePositions: Map<string, { x: number; y: number }>, allNodeKeys: string[]) => {
          get()._handleLayoutSystemResult(beforePositions, allNodeKeys, "global", allNodeKeys.length);
        },

        // 통합 레이아웃 결과 처리 헬퍼
        _handleLayoutSystemResult: (
          beforePositions: Map<string, { x: number; y: number }>,
          nodeKeys: string[],
          layoutType: "global" | "descendant" | "child",
          nodeCount: number
        ) => {
          const afterState = get();
          const afterScene = afterState.templateData[afterState.currentTemplate]?.[afterState.currentScene];
          if (!afterScene) return;

          const afterPositions = captureNodePositions(afterScene, nodeKeys);
          const hasChanged = comparePositions(beforePositions, afterPositions);

          if (hasChanged) {
            // 레이아웃 타입별 히스토리 메시지
            const messages = {
              global: `전체 캔버스 정렬 (${nodeCount}개 노드)`,
              descendant: `후손 노드 정렬 (${nodeCount}개 노드)`,
              child: `자식 노드 정렬 (${nodeCount}개 노드)`,
            };
            get().pushToHistory(messages[layoutType]);
          } else {
            // 변화가 없으면 토스트 메시지 표시
            const showToast = get().showToast;
            if (showToast) {
              showToast("이미 정렬된 상태입니다", "info");
            }
          }
        },

        // 새로운 레이아웃 시스템 (즉시 배치) - 리팩터링됨
        arrangeAllNodes: async (internal = false) => {
          return await layoutDomain.arrangeAllNodes(internal);
        },

        arrangeSelectedNodeChildren: async (nodeKey, internal = false) => {
          return await layoutDomain.arrangeSelectedNodeChildren(nodeKey, internal);
        },

        arrangeSelectedNodeDescendants: async (nodeKey, internal = false) => {
          return await layoutDomain.arrangeSelectedNodeDescendants(nodeKey, internal);
        },

        // 노드 숨김 상태 업데이트 함수 추가
        updateNodeVisibility: (nodeKey: string, hidden: boolean) => {
          nodeDomain.updateNodeVisibility(nodeKey, hidden);
        },

        // 노드 위치와 숨김 상태 동시 업데이트 함수 추가
        updateNodePositionAndVisibility: (nodeKey: string, position: { x: number; y: number }, hidden: boolean) => {
          nodeDomain.updateNodePositionAndVisibility(nodeKey, position, hidden);
        },

        // 통합 헬퍼 메서드: 관련 노드 탐색 (depth 제한 지원)
        _findRelatedNodes: (nodeKey: string, currentScene: Scene, maxDepth: number = Infinity) => {
          const relatedNodeKeys = new Set<string>();

          const findNodes = (currentNodeKey: string, currentDepth: number) => {
            if (currentDepth >= maxDepth) return;

            const node = getNode(currentScene, currentNodeKey);
            if (!node) return;

            if (node.dialogue.type === "text" && node.dialogue.nextNodeKey) {
              relatedNodeKeys.add(node.dialogue.nextNodeKey);
              findNodes(node.dialogue.nextNodeKey, currentDepth + 1);
            } else if (node.dialogue.type === "choice") {
              Object.values(node.dialogue.choices).forEach((choice) => {
                if (choice.nextNodeKey) {
                  relatedNodeKeys.add(choice.nextNodeKey);
                  findNodes(choice.nextNodeKey, currentDepth + 1);
                }
              });
            }
          };

          findNodes(nodeKey, 0);
          return relatedNodeKeys;
        },

        // 헬퍼 메서드: 후손 노드 탐색 (통합 함수 호출)
        _findDescendantNodes: (nodeKey: string, currentScene: Scene) => {
          return get()._findRelatedNodes(nodeKey, currentScene, Infinity);
        },

        _runDescendantLayoutSystem: async (nodeKey: string, currentScene: Scene, affectedNodeKeys: string[]) => {
          await get()._runLayoutSystem(currentScene, nodeKey, "descendant");
        },

        _handleDescendantLayoutResult: (beforePositions: Map<string, { x: number; y: number }>, affectedNodeKeys: string[], descendantCount: number) => {
          get()._handleLayoutSystemResult(beforePositions, affectedNodeKeys, "descendant", descendantCount);
        },



        // 헬퍼 메서드: 직접 자식 노드 탐색 (통합 함수 호출)
        _findChildNodes: (nodeKey: string, currentScene: Scene) => {
          return get()._findRelatedNodes(nodeKey, currentScene, 1);
        },

        _runChildLayoutSystem: async (nodeKey: string, currentScene: Scene, affectedNodeKeys: string[]) => {
          await get()._runLayoutSystem(currentScene, nodeKey, "child");
        },

        _handleChildLayoutResult: (beforePositions: Map<string, { x: number; y: number }>, affectedNodeKeys: string[], childCount: number) => {
          get()._handleLayoutSystemResult(beforePositions, affectedNodeKeys, "child", childCount);
        },

        // 노드 개수 제한 검증 공통 유틸리티
        _validateNodeCountLimit: (options?: { endCompoundAction?: boolean }) => {
          return coreServices.validateNodeCountLimit(options);
        },
      };
    },
    {
      name: "script-weaver-editor", // localStorage key
      version: 1,
      onRehydrateStorage: () => (state) => {
        // LocalizationStore에 EditorStore 참조 설정
        if (state) {
          // selectedNodeKeys가 Set이 아닌 경우 안전하게 변환
          if (!(state.selectedNodeKeys instanceof Set)) {
            state.selectedNodeKeys = new Set(Array.isArray(state.selectedNodeKeys) ? state.selectedNodeKeys : []);
          }

          const localizationStore = useLocalizationStore.getState();
          localizationStore._setEditorStore(state);
        }
      },
    }
  )
);

// 초기 참조 설정
setTimeout(() => {
  const localizationStore = useLocalizationStore.getState();
  localizationStore._setEditorStore(useEditorStore.getState());
}, 0);
