import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorState, EditorNodeWrapper, Dialogue, TextDialogue, ChoiceDialogue, InputDialogue, Scene, TemplateDialogues, ValidationResult } from "../types/dialogue";
import type { LocalizationData } from "./localizationStore";
import { DialogueSpeed } from "../types/dialogue";
import { exportToJSON as exportToJSONUtil, exportToCSV as exportToCSVUtil, importFromJSON as importFromJSONUtil, validateTemplateData } from "../utils/importExport";
import { useLocalizationStore } from "./localizationStore";
import { migrateTemplateData, needsMigration } from "../utils/migration";
import { globalAsyncOperationManager } from "./asyncOperationManager";
import dagre from "@dagrejs/dagre";

// Undo/Redo를 위한 히스토리 상태 타입
interface HistoryState {
  templateData: TemplateDialogues;
  localizationData: LocalizationData; // LocalizationStore 데이터 포함
  timestamp: number;
  action: string;
  groupId?: string; // 복합 액션 그룹 식별자
}

interface EditorStore extends EditorState {
  // Undo/Redo 상태
  history: HistoryState[];
  historyIndex: number;
  isUndoRedoInProgress: boolean;

  // 복합 액션 그룹 관리
  currentCompoundActionId: string | null;
  compoundActionStartState: HistoryState | null;

  // 연속 드래그 감지용 상태
  lastDraggedNodeKey: string | null;
  lastDragActionTime: number;

  // 다중 선택 상태
  selectedNodeKeys: Set<string>;

  // 기본 액션들
  setCurrentTemplate: (templateKey: string) => void;
  setCurrentScene: (sceneKey: string) => void;
  setSelectedNode: (nodeKey?: string) => void;

  // 다중 선택 액션들
  toggleNodeSelection: (nodeKey: string) => void;
  clearSelection: () => void;
  selectMultipleNodes: (nodeKeys: string[]) => void;

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

  // 복사/붙여넣기
  copySelectedNodes: () => void;
  pasteNodes: (position?: { x: number; y: number }) => void;
  duplicateNode: (nodeKey: string) => string;

  // 다중 조작
  deleteSelectedNodes: () => void;
  moveSelectedNodes: (deltaX: number, deltaY: number) => void;

  // 전역 토스트 함수
  showToast?: (message: string, type?: "success" | "info" | "warning") => void;

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

  // 연결 관리
  connectNodes: (fromNodeKey: string, toNodeKey: string, choiceKey?: string) => void;
  disconnectNodes: (fromNodeKey: string, choiceKey?: string) => void;

  // AC-02: 선택지별 새 노드 자동 생성 및 연결
  createAndConnectChoiceNode: (fromNodeKey: string, choiceKey: string, nodeType?: "text" | "choice") => string;

  // 텍스트 노드에서 새 노드 자동 생성 및 연결
  createAndConnectTextNode: (fromNodeKey: string, nodeType?: "text" | "choice") => string;

  // 템플릿/씬 관리
  createTemplate: (templateKey: string) => void;
  createScene: (templateKey: string, sceneKey: string) => void;

  // 유틸리티
  getNextNodePosition: () => { x: number; y: number };
  calculateChildNodePosition: (parentNodeKey: string, choiceKey?: string) => { x: number; y: number };
  generateNodeKey: () => string;
  getCurrentNodeCount: () => number;
  canCreateNewNode: () => boolean;

  // 노드 자동 정렬 (기존)
  arrangeChildNodesAsTree: (rootNodeKey: string) => void;
  arrangeAllNodesAsTree: () => void;
  arrangeNodesWithDagre: () => void;

  // 새로운 레이아웃 시스템 (즉시 배치)
  arrangeAllNodes: (internal?: boolean) => Promise<void>;
  arrangeSelectedNodeChildren: (nodeKey: string, internal?: boolean) => Promise<void>;
  arrangeSelectedNodeDescendants: (nodeKey: string, internal?: boolean) => Promise<void>;

  // 검증
  validateCurrentScene: () => { isValid: boolean; errors: string[] };
  validateAllData: () => ValidationResult;

  // Import/Export
  exportToJSON: () => string;
  exportToCSV: () => { dialogue: string; localization: string };
  importFromJSON: (jsonString: string) => void;

  // 데이터 초기화/로드/마이그레이션
  resetEditor: () => void;
  loadFromLocalStorage: () => void;
  migrateToNewArchitecture: () => void;

  // 키 참조 업데이트
  updateNodeKeyReference: (nodeKey: string, keyType: "speaker" | "text", newKeyRef: string) => void;
  updateChoiceKeyReference: (nodeKey: string, choiceKey: string, newKeyRef: string) => void;

  // 노드 숨김 상태 업데이트 함수 추가
  updateNodeVisibility: (nodeKey: string, hidden: boolean) => void;

  // 노드 위치와 숨김 상태 동시 업데이트 함수 추가
  updateNodePositionAndVisibility: (nodeKey: string, position: { x: number; y: number }, hidden: boolean) => void;
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

// 기본 상태
const initialState: EditorState = {
  currentTemplate: "default",
  templateData: createEmptyTemplate(),
  currentScene: "main",
  selectedNodeKey: undefined,
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
          set(() => ({ currentTemplate: templateKey }));
          updateLocalizationStoreRef();
        },

        setCurrentScene: (sceneKey) => {
          set(() => ({ currentScene: sceneKey }));
          updateLocalizationStoreRef();
        },

        setSelectedNode: (nodeKey) => {
          set(() => ({ selectedNodeKey: nodeKey }));
          updateLocalizationStoreRef();
        },

        // 다중 선택 액션들
        toggleNodeSelection: (nodeKey) => {
          set((state) => {
            const newSelection = new Set(state.selectedNodeKeys);

            // 현재 단일 선택된 노드가 있지만 다중 선택에 없는 경우, 먼저 추가
            if (state.selectedNodeKey && !newSelection.has(state.selectedNodeKey)) {
              newSelection.add(state.selectedNodeKey);
            }

            if (newSelection.has(nodeKey)) {
              newSelection.delete(nodeKey);
            } else {
              newSelection.add(nodeKey);
            }
            return { selectedNodeKeys: newSelection };
          });
        },

        clearSelection: () => {
          set(() => ({ selectedNodeKeys: new Set<string>() }));
        },

        selectMultipleNodes: (nodeKeys) => {
          set(() => ({ selectedNodeKeys: new Set(nodeKeys) }));
        },

        // 복합 액션 그룹 관리
        startCompoundAction: (actionName) => {
          // 다른 비동기 작업 중이면 차단
          if (!globalAsyncOperationManager.startOperation(`복합 액션: ${actionName}`)) {
            return `blocked-${Date.now()}`;
          }

          const state = get();

          // 시작 전 상태 저장
          const startState: HistoryState = {
            templateData: JSON.parse(JSON.stringify(state.templateData)),
            localizationData: useLocalizationStore.getState().exportLocalizationData(),
            timestamp: Date.now(),
            action: `복합 액션 시작: ${actionName}`,
            groupId: undefined,
          };

          const groupId = `compound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          set(() => ({
            currentCompoundActionId: groupId,
            compoundActionStartState: startState,
          }));

          return groupId;
        },

        endCompoundAction: () => {
          const state = get();
          if (!state.currentCompoundActionId || !state.compoundActionStartState) {
            console.warn("[복합 액션] 종료 시도했으나 진행중인 복합 액션이 없음");
            return;
          }

          // 최종 상태로 단일 히스토리 저장
          const finalAction = state.compoundActionStartState.action.replace("복합 액션 시작:", "복합 액션:");

          set((currentState) => {
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
              history: newHistory,
              historyIndex: newHistory.length - 1,
              currentCompoundActionId: null,
              compoundActionStartState: null,
            };
          });

          // 비동기 작업 완료
          globalAsyncOperationManager.endOperation();
        },

        // Undo/Redo 액션들
        pushToHistory: (action) => {
          const state = get();
          if (state.isUndoRedoInProgress) return;

          // 복합 액션 진행 중에는 중간 히스토리 저장하지 않음
          if (state.currentCompoundActionId) {
            return;
          }

          // 즉시 최신 상태를 가져와서 인덱스 충돌 방지
          const currentState = get();

          set(() => {
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
              history: newHistory,
              historyIndex: newHistory.length - 1,
            };
          });
        },

        pushToHistoryWithTextEdit: (action) => {
          // 텍스트 편집의 경우 LocalizationStore와 함께 히스토리 추가
          get().pushToHistory(action);
        },

        undo: () => {
          // 비동기 작업 진행 중이면 차단
          if (!globalAsyncOperationManager.canPerformUndoRedo()) {
            return;
          }

          const state = get();
          if (!get().canUndo()) return;

          set(() => ({ isUndoRedoInProgress: true }));

          const previousState = state.history[state.historyIndex - 1];
          const currentState = state.history[state.historyIndex]; // 취소되는 액션

          if (previousState) {
            set(() => ({
              templateData: JSON.parse(JSON.stringify(previousState.templateData)),
              historyIndex: state.historyIndex - 1,
              isUndoRedoInProgress: false,
            }));

            // LocalizationStore 데이터도 함께 복원
            const localizationStore = useLocalizationStore.getState();
            localizationStore.importLocalizationData(previousState.localizationData);

            if (state.showToast && currentState) {
              state.showToast(`되돌리기: ${currentState.action}`, "info");
            }
          } else {
            set(() => ({ isUndoRedoInProgress: false }));
          }

          updateLocalizationStoreRef();
        },

        redo: () => {
          // 비동기 작업 진행 중이면 차단
          if (!globalAsyncOperationManager.canPerformUndoRedo()) {
            return;
          }

          const state = get();
          if (!get().canRedo()) return;

          set(() => ({ isUndoRedoInProgress: true }));

          const nextState = state.history[state.historyIndex + 1];

          if (nextState) {
            set(() => ({
              templateData: JSON.parse(JSON.stringify(nextState.templateData)),
              historyIndex: state.historyIndex + 1,
              isUndoRedoInProgress: false,
            }));

            // LocalizationStore 데이터도 함께 복원
            const localizationStore = useLocalizationStore.getState();
            localizationStore.importLocalizationData(nextState.localizationData);

            if (state.showToast) {
              state.showToast(`다시실행: ${nextState.action}`, "info");
            }
          } else {
            set(() => ({ isUndoRedoInProgress: false }));
          }

          updateLocalizationStoreRef();
        },

        canUndo: () => {
          const state = get();
          return state.historyIndex > 0;
        },

        canRedo: () => {
          const state = get();
          return state.historyIndex < state.history.length - 1;
        },

        // 복사/붙여넣기
        copySelectedNodes: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return;

          const nodesToCopy: EditorNodeWrapper[] = [];

          // 선택된 노드가 있으면 선택된 노드들을, 없으면 현재 선택된 단일 노드를 복사
          const targetKeys = state.selectedNodeKeys.size > 0 ? Array.from(state.selectedNodeKeys) : state.selectedNodeKey ? [state.selectedNodeKey] : [];

          targetKeys.forEach((nodeKey) => {
            const node = getNode(currentScene, nodeKey);
            if (node) {
              nodesToCopy.push(JSON.parse(JSON.stringify(node)));
            }
          });

          clipboardData = nodesToCopy;

          if (state.showToast && nodesToCopy.length > 0) {
            state.showToast(`${nodesToCopy.length}개 노드를 복사했습니다.`, "success");
          }
        },

        pasteNodes: (position) => {
          if (clipboardData.length === 0) return;

          const state = get();

          // 현재 노드 수 + 붙여넣을 노드 수가 100개를 초과하는지 체크
          const currentNodeCount = get().getCurrentNodeCount();
          const nodesToPaste = clipboardData.length;
          const totalAfterPaste = currentNodeCount + nodesToPaste;

          if (totalAfterPaste > 100) {
            if (state.showToast) {
              state.showToast(`노드 개수 제한 초과: 현재 ${currentNodeCount}개 + 붙여넣기 ${nodesToPaste}개 = ${totalAfterPaste}개 (최대 100개)`, "warning");
            }
            return;
          }

          const startX = position?.x ?? state.lastNodePosition.x + 50;
          const startY = position?.y ?? state.lastNodePosition.y + 50;

          const newNodeKeys: string[] = [];
          const newNodes: EditorNodeWrapper[] = [];

          // 새 노드들을 준비
          clipboardData.forEach((originalNode, index) => {
            const newNodeKey = get().generateNodeKey();
            const newNode: EditorNodeWrapper = {
              ...JSON.parse(JSON.stringify(originalNode)),
              nodeKey: newNodeKey,
              position: {
                x: startX + index * 20,
                y: startY + index * 20,
              },
            };

            // 새로운 localization 키 생성
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

            newNodes.push(newNode);
            newNodeKeys.push(newNodeKey);
          });

          // 모든 노드를 한 번에 추가
          set((currentState) => {
            let updatedState = { ...currentState };

            newNodes.forEach((node) => {
              const newTemplateData = ensureSceneExists(updatedState.templateData, updatedState.currentTemplate, updatedState.currentScene);

              const currentScene = newTemplateData[updatedState.currentTemplate][updatedState.currentScene];
              const updatedScene = setNode(currentScene, node.nodeKey, node);

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

          // 상태 변경 후에 히스토리에 추가
          get().pushToHistory("노드 붙여넣기");
          updateLocalizationStoreRef();

          if (state.showToast) {
            state.showToast(`${clipboardData.length}개 노드를 붙여넣었습니다.`, "success");
          }
        },

        duplicateNode: (nodeKey) => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return "";

          const originalNode = getNode(currentScene, nodeKey);
          if (!originalNode) return "";

          // 임시로 클립보드에 저장하고 붙여넣기
          const originalClipboard = [...clipboardData];
          clipboardData = [originalNode];

          get().pasteNodes({
            x: originalNode.position.x + 50,
            y: originalNode.position.y + 50,
          });

          // 클립보드 복원
          clipboardData = originalClipboard;

          return state.selectedNodeKeys.size > 0 ? Array.from(state.selectedNodeKeys)[0] : "";
        },

        // 다중 조작
        deleteSelectedNodes: () => {
          const state = get();
          const targetKeys = state.selectedNodeKeys.size > 0 ? Array.from(state.selectedNodeKeys) : state.selectedNodeKey ? [state.selectedNodeKey] : [];

          if (targetKeys.length === 0) return;

          // 삭제 전에 모든 대상 노드의 단독 사용 키들 수집
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return;

          const localizationStore = useLocalizationStore.getState();
          const allKeysToCleanup: string[] = [];

          targetKeys.forEach((nodeKey) => {
            const nodeToDelete = getNode(currentScene, nodeKey);
            if (!nodeToDelete) return;

            // 삭제될 노드에서 단독으로 사용하는 키들 수집
            if (nodeToDelete.dialogue.speakerKeyRef) {
              const usageCount = localizationStore.getKeyUsageCount(nodeToDelete.dialogue.speakerKeyRef);
              if (usageCount === 1) {
                allKeysToCleanup.push(nodeToDelete.dialogue.speakerKeyRef);
              }
            }

            if (nodeToDelete.dialogue.textKeyRef) {
              const usageCount = localizationStore.getKeyUsageCount(nodeToDelete.dialogue.textKeyRef);
              if (usageCount === 1) {
                allKeysToCleanup.push(nodeToDelete.dialogue.textKeyRef);
              }
            }

            // ChoiceNode인 경우 선택지 키들도 확인
            if (nodeToDelete.dialogue.type === "choice") {
              const choiceDialogue = nodeToDelete.dialogue as ChoiceDialogue;
              Object.values(choiceDialogue.choices).forEach((choice) => {
                if (choice.textKeyRef) {
                  const usageCount = localizationStore.getKeyUsageCount(choice.textKeyRef);
                  if (usageCount === 1) {
                    allKeysToCleanup.push(choice.textKeyRef);
                  }
                }
              });
            }
          });

          // 여러 노드를 한 번에 삭제하는 로직
          set((currentState) => {
            let updatedState = { ...currentState };

            targetKeys.forEach((nodeKey) => {
              const currentScene = updatedState.templateData[updatedState.currentTemplate]?.[updatedState.currentScene];
              if (!currentScene) return;

              // 삭제할 노드를 참조하는 다른 노드들 찾기
              const referencingNodes: string[] = [];
              Object.entries(currentScene).forEach(([key, nodeWrapper]) => {
                if (key === nodeKey) return; // 자기 자신은 제외

                const { dialogue } = nodeWrapper;

                // TextDialogue 참조 확인
                if (dialogue.type === "text" && dialogue.nextNodeKey === nodeKey) {
                  referencingNodes.push(`${key} (텍스트 노드)`);
                }

                // ChoiceDialogue 참조 확인
                if (dialogue.type === "choice" && dialogue.choices) {
                  Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
                    if (choice.nextNodeKey === nodeKey) {
                      referencingNodes.push(`${key} (선택지 "${choice.choiceText || choice.textKeyRef || choiceKey}")`);
                    }
                  });
                }
              });

              const updatedScene = deleteNodeFromScene(currentScene, nodeKey);

              updatedState = {
                ...updatedState,
                templateData: {
                  ...updatedState.templateData,
                  [updatedState.currentTemplate]: {
                    ...updatedState.templateData[updatedState.currentTemplate],
                    [updatedState.currentScene]: updatedScene,
                  },
                },
                selectedNodeKey: updatedState.selectedNodeKey === nodeKey ? undefined : updatedState.selectedNodeKey,
              };
            });

            return {
              ...updatedState,
              selectedNodeKeys: new Set<string>(),
            };
          });

          // 노드 삭제 성공 후 단독 사용 키들 정리
          allKeysToCleanup.forEach((key) => {
            localizationStore.deleteKey(key);
          });

          // 상태 변경 후에 히스토리에 추가
          get().pushToHistory(`${targetKeys.length}개 노드 삭제`);

          if (state.showToast) {
            state.showToast(`${targetKeys.length}개 노드를 삭제했습니다.`, "success");
          }
        },

        moveSelectedNodes: (deltaX, deltaY) => {
          const state = get();
          const targetKeys = state.selectedNodeKeys.size > 0 ? Array.from(state.selectedNodeKeys) : state.selectedNodeKey ? [state.selectedNodeKey] : [];

          if (targetKeys.length === 0) return;

          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return;

          targetKeys.forEach((nodeKey) => {
            const node = getNode(currentScene, nodeKey);
            if (node) {
              get().moveNode(nodeKey, {
                x: node.position.x + deltaX,
                y: node.position.y + deltaY,
              });
            }
          });
        },

        // 노드 관리
        addNode: (node) => {
          set((state) => {
            const newTemplateData = ensureSceneExists(state.templateData, state.currentTemplate, state.currentScene);

            const currentScene = newTemplateData[state.currentTemplate][state.currentScene];
            const updatedScene = setNode(currentScene, node.nodeKey, node);

            return {
              templateData: {
                ...newTemplateData,
                [state.currentTemplate]: {
                  ...newTemplateData[state.currentTemplate],
                  [state.currentScene]: updatedScene,
                },
              },
              lastNodePosition: node.position,
              selectedNodeKey: node.nodeKey,
            };
          });

          // 상태 변경 후에 히스토리에 추가
          get().pushToHistory("노드 추가");
          updateLocalizationStoreRef();
        },

        updateNode: (nodeKey, updates) => {
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode) return state;

            const updatedNode = { ...currentNode, ...updates };
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

        deleteNode: (nodeKey) => {
          // 노드 삭제 전에 해당 노드의 키들을 먼저 수집하고 사용 개수 확인
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return;

          const nodeToDelete = getNode(currentScene, nodeKey);
          if (!nodeToDelete) return;

          const localizationStore = useLocalizationStore.getState();
          const keysToCleanup: string[] = [];

          // 삭제될 노드에서 단독으로 사용하는 키들 수집
          if (nodeToDelete.dialogue.speakerKeyRef) {
            const usageCount = localizationStore.getKeyUsageCount(nodeToDelete.dialogue.speakerKeyRef);
            if (usageCount === 1) {
              keysToCleanup.push(nodeToDelete.dialogue.speakerKeyRef);
            }
          }

          if (nodeToDelete.dialogue.textKeyRef) {
            const usageCount = localizationStore.getKeyUsageCount(nodeToDelete.dialogue.textKeyRef);
            if (usageCount === 1) {
              keysToCleanup.push(nodeToDelete.dialogue.textKeyRef);
            }
          }

          // ChoiceNode인 경우 선택지 키들도 확인
          if (nodeToDelete.dialogue.type === "choice") {
            const choiceDialogue = nodeToDelete.dialogue as ChoiceDialogue;
            Object.values(choiceDialogue.choices).forEach((choice) => {
              if (choice.textKeyRef) {
                const usageCount = localizationStore.getKeyUsageCount(choice.textKeyRef);
                if (usageCount === 1) {
                  keysToCleanup.push(choice.textKeyRef);
                }
              }
            });
          }

          set((currentState) => {
            const currentScene = currentState.templateData[currentState.currentTemplate]?.[currentState.currentScene];
            if (!currentScene) return currentState;

            // 삭제할 노드를 참조하는 다른 노드들 찾기
            const referencingNodes: string[] = [];
            Object.entries(currentScene).forEach(([key, nodeWrapper]) => {
              if (key === nodeKey) return; // 자기 자신은 제외

              const { dialogue } = nodeWrapper;

              // TextDialogue 참조 확인
              if (dialogue.type === "text" && dialogue.nextNodeKey === nodeKey) {
                referencingNodes.push(`${key} (텍스트 노드)`);
              }

              // ChoiceDialogue 참조 확인
              if (dialogue.type === "choice" && dialogue.choices) {
                Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
                  if (choice.nextNodeKey === nodeKey) {
                    referencingNodes.push(`${key} (선택지 "${choice.choiceText || choice.textKeyRef || choiceKey}")`);
                  }
                });
              }
            });

            const updatedScene = deleteNodeFromScene(currentScene, nodeKey);

            return {
              templateData: {
                ...currentState.templateData,
                [currentState.currentTemplate]: {
                  ...currentState.templateData[currentState.currentTemplate],
                  [currentState.currentScene]: updatedScene,
                },
              },
              selectedNodeKey: currentState.selectedNodeKey === nodeKey ? undefined : currentState.selectedNodeKey,
            };
          });

          // 노드 삭제 성공 후 단독 사용 키들 정리
          keysToCleanup.forEach((key) => {
            localizationStore.deleteKey(key);
          });

          // 상태 변경 후에 히스토리에 추가
          get().pushToHistory("노드 삭제");
        },

        moveNode: (nodeKey, position) => {
          const state = get();
          const currentTime = Date.now();
          const CONTINUOUS_DRAG_THRESHOLD = 1000; // 1초 이내면 연속 드래그로 간주

          // 현재 노드의 위치 확인
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) {
            return;
          }

          const currentNode = getNode(currentScene, nodeKey);
          if (!currentNode) {
            return;
          }

          // 위치 변경 여부 확인 (소수점 반올림 고려)
          const oldPosition = currentNode.position;
          const hasPositionChanged = Math.round(oldPosition.x) !== Math.round(position.x) || Math.round(oldPosition.y) !== Math.round(position.y);

          // 위치가 실제로 변경되지 않았으면 히스토리 추가 없이 종료
          if (!hasPositionChanged) {
            return;
          }

          // 연속 드래그 여부 확인 (같은 노드 && 1초 이내)
          const isContinuousDrag = state.lastDraggedNodeKey === nodeKey && currentTime - state.lastDragActionTime <= CONTINUOUS_DRAG_THRESHOLD;

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

          // 덮어쓰기 방식으로 연속 드래그 처리
          const currentState = get();
          const lastHistory = currentState.history[currentState.historyIndex];

          if (isContinuousDrag && lastHistory && lastHistory.action === `노드 이동 (${nodeKey})` && currentTime - lastHistory.timestamp < 2000) {
            // 2초 이내

            // 기존 히스토리의 최종 상태만 업데이트 (덮어쓰기)
            set((state) => {
              const updatedHistory = [...state.history];
              updatedHistory[state.historyIndex] = {
                ...lastHistory,
                templateData: JSON.parse(JSON.stringify(state.templateData)),
                localizationData: useLocalizationStore.getState().exportLocalizationData(),
                timestamp: currentTime, // 타임스탬프 업데이트
              };

              return {
                history: updatedHistory,
              };
            });
          } else {
            get().pushToHistory(`노드 이동 (${nodeKey})`);
          }
        },

        // 대화 내용 수정 (실제 텍스트 기반)
        updateDialogue: (nodeKey, dialogue) =>
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode) return state;

            let updatedDialogue: Dialogue;

            if (currentNode.dialogue.type === "text") {
              updatedDialogue = {
                ...currentNode.dialogue,
                ...dialogue,
              } as TextDialogue;
            } else if (currentNode.dialogue.type === "choice") {
              updatedDialogue = {
                ...currentNode.dialogue,
                ...dialogue,
              } as ChoiceDialogue;
            } else {
              updatedDialogue = {
                ...currentNode.dialogue,
                ...dialogue,
              } as InputDialogue;
            }

            const updatedNode = {
              ...currentNode,
              dialogue: updatedDialogue,
            };
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
          }),

        updateNodeText: (nodeKey, speakerText, contentText) => {
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode) return state;

            // LocalizationStore와 연동하여 키 생성 및 텍스트 저장
            const localizationStore = useLocalizationStore.getState();

            let speakerKeyRef = currentNode.dialogue.speakerKeyRef;
            let textKeyRef = currentNode.dialogue.textKeyRef;

            // 화자 텍스트 처리
            if (speakerText !== undefined) {
              if (speakerText && speakerText.trim()) {
                const currentSpeakerKey = currentNode.dialogue.speakerKeyRef;
                const currentUsageCount = currentSpeakerKey ? localizationStore.getKeyUsageCount(currentSpeakerKey) : 0;

                if (currentSpeakerKey && currentUsageCount === 1) {
                  // 단일 사용 키: 기존 키 유지, 텍스트만 업데이트
                  localizationStore.setText(currentSpeakerKey, speakerText);
                  speakerKeyRef = currentSpeakerKey;
                } else {
                  // 다중 사용 키 또는 새 키: 기존 로직 사용
                  const speakerKeyResult = localizationStore.generateSpeakerKey(speakerText);
                  speakerKeyRef = speakerKeyResult.key;
                  localizationStore.setText(speakerKeyResult.key, speakerText);
                }
              } else {
                // 빈 문자열인 경우: 단일 사용 키만 삭제
                if (currentNode.dialogue.speakerKeyRef) {
                  const currentUsageCount = localizationStore.getKeyUsageCount(currentNode.dialogue.speakerKeyRef);
                  if (currentUsageCount === 1) {
                    // 단일 사용 키만 삭제
                    localizationStore.deleteKey(currentNode.dialogue.speakerKeyRef);
                  }
                  // 다중 사용 키는 삭제하지 않고 현재 노드의 참조만 제거
                }
                speakerKeyRef = undefined;
              }
            }

            // 내용 텍스트 처리
            if (contentText !== undefined) {
              if (contentText?.trim()) {
                const currentTextKey = currentNode.dialogue.textKeyRef;
                const currentUsageCount = currentTextKey ? localizationStore.getKeyUsageCount(currentTextKey) : 0;

                if (currentTextKey && currentUsageCount === 1) {
                  // 단일 사용 키: 기존 키 유지, 텍스트만 업데이트
                  localizationStore.setText(currentTextKey, contentText);
                  textKeyRef = currentTextKey;
                } else {
                  // 다중 사용 키 또는 새 키: 기존 로직 사용
                  const textKeyResult = localizationStore.generateTextKey(contentText);
                  textKeyRef = textKeyResult.key;
                  localizationStore.setText(textKeyResult.key, contentText);
                }
              } else {
                // 빈 문자열인 경우: 단일 사용 키만 삭제
                if (currentNode.dialogue.textKeyRef) {
                  const currentUsageCount = localizationStore.getKeyUsageCount(currentNode.dialogue.textKeyRef);
                  if (currentUsageCount === 1) {
                    // 단일 사용 키만 삭제
                    localizationStore.deleteKey(currentNode.dialogue.textKeyRef);
                  }
                  // 다중 사용 키는 삭제하지 않고 현재 노드의 참조만 제거
                }
                textKeyRef = undefined;
              }
            }

            const updatedDialogue = {
              ...currentNode.dialogue,
              speakerText: speakerText !== undefined ? speakerText : currentNode.dialogue.speakerText,
              contentText: contentText !== undefined ? contentText : currentNode.dialogue.contentText,
              speakerKeyRef,
              textKeyRef,
            };

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
          // 노드 개수 제한 체크
          if (!get().canCreateNewNode()) {
            const state = get();
            if (state.showToast) {
              state.showToast(`노드 개수가 최대 100개 제한에 도달했습니다. (현재: ${get().getCurrentNodeCount()}개)`, "warning");
            }
            return "";
          }

          const nodeKey = get().generateNodeKey();
          const position = get().getNextNodePosition();

          // LocalizationStore와 연동하여 키 생성 및 텍스트 저장
          const localizationStore = useLocalizationStore.getState();

          let speakerKeyRef: string | undefined;
          let textKeyRef: string | undefined;

          if (speakerText && speakerText.trim()) {
            const speakerKeyResult = localizationStore.generateSpeakerKey(speakerText);
            speakerKeyRef = speakerKeyResult.key;
            localizationStore.setText(speakerKeyResult.key, speakerText);
          }

          if (contentText && contentText.trim()) {
            const textKeyResult = localizationStore.generateTextKey(contentText);
            textKeyRef = textKeyResult.key;
            localizationStore.setText(textKeyResult.key, contentText);
          }

          const dialogue = createBaseTextDialogue(speakerText, contentText, speakerKeyRef, textKeyRef);
          const node = createNodeWrapper(nodeKey, dialogue, position);

          get().addNode(node);
          return nodeKey;
        },

        createChoiceNode: (contentText = "", speakerText = "") => {
          // 노드 개수 제한 체크
          if (!get().canCreateNewNode()) {
            const state = get();
            if (state.showToast) {
              state.showToast(`노드 개수가 최대 100개 제한에 도달했습니다. (현재: ${get().getCurrentNodeCount()}개)`, "warning");
            }
            return "";
          }

          const nodeKey = get().generateNodeKey();
          const position = get().getNextNodePosition();

          // LocalizationStore와 연동하여 키 생성 및 텍스트 저장
          const localizationStore = useLocalizationStore.getState();

          let speakerKeyRef: string | undefined;
          let textKeyRef: string | undefined;

          if (speakerText && speakerText.trim()) {
            const speakerKeyResult = localizationStore.generateSpeakerKey(speakerText);
            speakerKeyRef = speakerKeyResult.key;
            localizationStore.setText(speakerKeyResult.key, speakerText);
          }

          if (contentText && contentText.trim()) {
            const textKeyResult = localizationStore.generateTextKey(contentText);
            textKeyRef = textKeyResult.key;
            localizationStore.setText(textKeyResult.key, contentText);
          }

          const dialogue = createBaseChoiceDialogue(speakerText, contentText, speakerKeyRef, textKeyRef, getDefaultChoices());
          const node = createNodeWrapper(nodeKey, dialogue, position);

          get().addNode(node);
          return nodeKey;
        },

        // 선택지 관리 (실제 텍스트 기반)
        addChoice: (nodeKey, choiceKey, choiceText, nextNodeKey = "") =>
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode || currentNode.dialogue.type !== "choice") return state;

            // LocalizationStore와 연동하여 키 생성 및 텍스트 저장
            const localizationStore = useLocalizationStore.getState();

            let textKeyRef: string | undefined;

            // 빈 텍스트가 아닐 때만 키 생성
            if (choiceText && choiceText.trim()) {
              const choiceKeyResult = localizationStore.generateChoiceKey(choiceText);
              localizationStore.setText(choiceKeyResult.key, choiceText);
              textKeyRef = choiceKeyResult.key;
            }

            const updatedDialogue = { ...currentNode.dialogue };
            updatedDialogue.choices[choiceKey] = {
              choiceText,
              textKeyRef,
              nextNodeKey,
            };

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
          }),

        removeChoice: (nodeKey, choiceKey) =>
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode || currentNode.dialogue.type !== "choice") return state;

            const updatedDialogue = { ...currentNode.dialogue };
            delete updatedDialogue.choices[choiceKey];

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
          }),

        // 연결 관리
        connectNodes: (fromNodeKey, toNodeKey, choiceKey) =>
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const fromNode = getNode(currentScene, fromNodeKey);
            if (!fromNode) return state;

            let updatedNode: EditorNodeWrapper;

            if (fromNode.dialogue.type === "text") {
              // 텍스트 노드의 경우 nextNodeKey 설정
              const updatedDialogue = { ...fromNode.dialogue };
              updatedDialogue.nextNodeKey = toNodeKey;
              updatedNode = { ...fromNode, dialogue: updatedDialogue };
            } else if (fromNode.dialogue.type === "choice" && choiceKey) {
              // 선택지 노드의 경우 특정 선택지의 nextNodeKey 설정
              const updatedDialogue = { ...fromNode.dialogue };
              if (updatedDialogue.choices[choiceKey]) {
                updatedDialogue.choices[choiceKey] = {
                  ...updatedDialogue.choices[choiceKey],
                  nextNodeKey: toNodeKey,
                };
              }
              updatedNode = { ...fromNode, dialogue: updatedDialogue };
            } else {
              return state;
            }

            const updatedScene = setNode(currentScene, fromNodeKey, updatedNode);

            return {
              templateData: {
                ...state.templateData,
                [state.currentTemplate]: {
                  ...state.templateData[state.currentTemplate],
                  [state.currentScene]: updatedScene,
                },
              },
            };
          }),

        // 연결 끊기
        disconnectNodes: (fromNodeKey, choiceKey) =>
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const fromNode = getNode(currentScene, fromNodeKey);
            if (!fromNode) return state;

            let updatedNode: EditorNodeWrapper;

            if (fromNode.dialogue.type === "text") {
              // 텍스트 노드의 경우 nextNodeKey 제거
              const updatedDialogue = { ...fromNode.dialogue };
              delete updatedDialogue.nextNodeKey;
              updatedNode = { ...fromNode, dialogue: updatedDialogue };
            } else if (fromNode.dialogue.type === "choice" && choiceKey) {
              // 선택지 노드의 경우 특정 선택지의 nextNodeKey 제거
              const updatedDialogue = { ...fromNode.dialogue };
              if (updatedDialogue.choices[choiceKey]) {
                updatedDialogue.choices[choiceKey] = {
                  ...updatedDialogue.choices[choiceKey],
                  nextNodeKey: "",
                };
              }
              updatedNode = { ...fromNode, dialogue: updatedDialogue };
            } else {
              return state;
            }

            const updatedScene = setNode(currentScene, fromNodeKey, updatedNode);

            return {
              templateData: {
                ...state.templateData,
                [state.currentTemplate]: {
                  ...state.templateData[state.currentTemplate],
                  [state.currentScene]: updatedScene,
                },
              },
            };
          }),

        // AC-02: 선택지별 새 노드 자동 생성 및 연결
        createAndConnectChoiceNode: (fromNodeKey, choiceKey, nodeType = "text") => {
          // 복합 액션 시작
          get().startCompoundAction("선택지 노드 생성 및 연결");

          // 노드 개수 제한 체크
          if (!get().canCreateNewNode()) {
            get().endCompoundAction(); // 복합 액션 종료
            const state = get();
            if (state.showToast) {
              state.showToast(`노드 개수가 최대 100개 제한에 도달했습니다. (현재: ${get().getCurrentNodeCount()}개)`, "warning");
            }
            return "";
          }

          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) {
            get().endCompoundAction(); // 복합 액션 종료
            return "";
          }

          const fromNode = getNode(currentScene, fromNodeKey);
          if (!fromNode || fromNode.dialogue.type !== "choice") {
            get().endCompoundAction(); // 복합 액션 종료
            return "";
          }

          const choice = fromNode.dialogue.choices[choiceKey];
          if (!choice) {
            get().endCompoundAction(); // 복합 액션 종료
            return "";
          }

          // 새 노드 생성
          const newNodeKey = get().generateNodeKey();

          // 임시 위치 계산 (정확한 위치는 나중에 계산)
          const tempPosition = get().calculateChildNodePosition(fromNodeKey, choiceKey);

          // 화자 자동 복사: 부모 노드에 화자가 있으면 자동으로 복사
          const parentSpeakerText = fromNode.dialogue.speakerText || "";
          const parentSpeakerKeyRef = fromNode.dialogue.speakerKeyRef;

          let newNode: EditorNodeWrapper;

          if (nodeType === "choice") {
            // 선택지 노드 생성
            const dialogue = createBaseChoiceDialogue(parentSpeakerText, "", parentSpeakerKeyRef, undefined, getDefaultChoices());
            newNode = createNodeWrapper(newNodeKey, dialogue, tempPosition, true);
          } else {
            // 텍스트 노드 생성 (기본값)
            const dialogue = createBaseTextDialogue(parentSpeakerText, "", parentSpeakerKeyRef);
            newNode = createNodeWrapper(newNodeKey, dialogue, tempPosition, true);
          }

          // 부모 노드의 선택지 연결 업데이트
          const updatedFromNode = { ...fromNode };
          (updatedFromNode.dialogue as ChoiceDialogue).choices[choiceKey] = {
            ...choice,
            nextNodeKey: newNodeKey,
          };

          // 스토어 업데이트
          set((currentState) => {
            const newTemplateData = ensureSceneExists(currentState.templateData, currentState.currentTemplate, currentState.currentScene);

            const currentScene = newTemplateData[currentState.currentTemplate][currentState.currentScene];
            const updatedSceneWithNew = setNode(currentScene, newNodeKey, newNode);
            const updatedSceneWithParent = setNode(updatedSceneWithNew, fromNodeKey, updatedFromNode);

            return {
              ...currentState,
              templateData: {
                ...newTemplateData,
                [currentState.currentTemplate]: {
                  ...newTemplateData[currentState.currentTemplate],
                  [currentState.currentScene]: updatedSceneWithParent,
                },
              },
              lastNodePosition: tempPosition,
              selectedNodeKey: newNodeKey,
            };
          });

          // 복합 액션 중이므로 개별 히스토리 추가하지 않음
          updateLocalizationStoreRef();

          // Dagre 레이아웃을 사용하여 정확한 위치 계산 및 배치 (DOM 렌더링 후)
          setTimeout(async () => {
            try {
              // 부모 노드의 자식들을 정렬 (새로 생성된 노드 포함)
              await get().arrangeSelectedNodeChildren(fromNodeKey, true);

              // 정렬 완료 후 숨김 해제
              get().updateNodeVisibility(newNodeKey, false);
            } catch (error) {
              get().updateNodeVisibility(newNodeKey, false);
            } finally {
              // 복합 액션 종료
              get().endCompoundAction();
            }
          }, 100); // DOM 렌더링 후 정렬하기 위한 지연

          return newNodeKey;
        },

        // 텍스트 노드에서 새 노드 자동 생성 및 연결
        createAndConnectTextNode: (fromNodeKey, nodeType = "text") => {
          // 복합 액션 시작
          get().startCompoundAction("텍스트 노드 생성 및 연결");

          // 노드 개수 제한 체크
          if (!get().canCreateNewNode()) {
            get().endCompoundAction(); // 복합 액션 종료
            const state = get();
            if (state.showToast) {
              state.showToast(`노드 개수가 최대 100개 제한에 도달했습니다. (현재: ${get().getCurrentNodeCount()}개)`, "warning");
            }
            return "";
          }

          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) {
            get().endCompoundAction(); // 복합 액션 종료
            return "";
          }

          const fromNode = getNode(currentScene, fromNodeKey);
          if (!fromNode || fromNode.dialogue.type !== "text") {
            get().endCompoundAction(); // 복합 액션 종료
            return "";
          }

          // 이미 연결된 노드가 있으면 생성하지 않음
          if (fromNode.dialogue.nextNodeKey) {
            get().endCompoundAction(); // 복합 액션 종료
            return "";
          }

          // 새 노드 생성
          const newNodeKey = get().generateNodeKey();

          // 임시 위치 계산 (정확한 위치는 나중에 계산)
          const tempPosition = get().calculateChildNodePosition(fromNodeKey);

          // 화자 자동 복사: 부모 노드에 화자가 있으면 자동으로 복사
          const parentSpeakerText = fromNode.dialogue.speakerText || "";
          const parentSpeakerKeyRef = fromNode.dialogue.speakerKeyRef;

          let newNode: EditorNodeWrapper;

          if (nodeType === "choice") {
            // 선택지 노드 생성
            const dialogue = createBaseChoiceDialogue(parentSpeakerText, "", parentSpeakerKeyRef, undefined, getDefaultChoices());
            newNode = createNodeWrapper(newNodeKey, dialogue, tempPosition, true);
          } else {
            // 텍스트 노드 생성 (기본값)
            const dialogue = createBaseTextDialogue(parentSpeakerText, "", parentSpeakerKeyRef);
            newNode = createNodeWrapper(newNodeKey, dialogue, tempPosition, true);
          }

          // 부모 노드의 nextNodeKey 업데이트
          const updatedFromNode = { ...fromNode };
          (updatedFromNode.dialogue as TextDialogue).nextNodeKey = newNodeKey;

          // 스토어 업데이트
          set((currentState) => {
            const newTemplateData = ensureSceneExists(currentState.templateData, currentState.currentTemplate, currentState.currentScene);

            const currentScene = newTemplateData[currentState.currentTemplate][currentState.currentScene];
            const updatedSceneWithNew = setNode(currentScene, newNodeKey, newNode);
            const updatedSceneWithParent = setNode(updatedSceneWithNew, fromNodeKey, updatedFromNode);

            return {
              ...currentState,
              templateData: {
                ...newTemplateData,
                [currentState.currentTemplate]: {
                  ...newTemplateData[currentState.currentTemplate],
                  [currentState.currentScene]: updatedSceneWithParent,
                },
              },
              lastNodePosition: tempPosition,
              selectedNodeKey: newNodeKey,
            };
          });

          // 복합 액션 중이므로 개별 히스토리 추가하지 않음
          updateLocalizationStoreRef();

          // Dagre 레이아웃을 사용하여 정확한 위치 계산 및 배치 (DOM 렌더링 후)
          setTimeout(async () => {
            try {
              // 부모 노드의 자식들을 정렬 (새로 생성된 노드 포함)
              await get().arrangeSelectedNodeChildren(fromNodeKey, true);

              // 정렬 완료 후 숨김 해제
              get().updateNodeVisibility(newNodeKey, false);
            } catch (error) {
              get().updateNodeVisibility(newNodeKey, false);
            } finally {
              // 복합 액션 종료
              get().endCompoundAction();
            }
          }, 100); // DOM 렌더링 후 정렬하기 위한 지연

          return newNodeKey;
        },

        // 템플릿/씬 관리
        createTemplate: (templateKey) =>
          set((state) => ({
            templateData: ensureTemplateExists(state.templateData, templateKey),
          })),

        createScene: (templateKey, sceneKey) =>
          set((state) => ({
            templateData: ensureSceneExists(state.templateData, templateKey, sceneKey),
          })),

        // 유틸리티 - 안정적인 노드 위치 계산
        getNextNodePosition: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

          if (!currentScene) {
            return { x: 100, y: 100 };
          }

          // 현재 씬의 모든 노드 위치 확인
          const allNodes = Object.values(currentScene);

          // 기본 노드 크기 (더 안정적인 고정값 사용)
          const DEFAULT_NODE_WIDTH = 200;
          const DEFAULT_NODE_HEIGHT = 120;

          // 기본 간격 설정
          const SPACING_X = 60;
          const SPACING_Y = 40;

          // 새 위치 후보 계산 (이전 노드 기준)
          let candidateX = state.lastNodePosition.x + DEFAULT_NODE_WIDTH + SPACING_X;
          let candidateY = state.lastNodePosition.y;

          // 겹치는 노드가 있는지 확인하는 함수 (고정 크기 기반)
          const isPositionOccupied = (x: number, y: number, newNodeWidth: number, newNodeHeight: number) => {
            return allNodes.some((node) => {
              // 기본 노드 크기 사용 (더 안정적)
              const existingDimensions = { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };

              // AABB (Axis-Aligned Bounding Box) 충돌 감지
              const overlap = !(
                x + newNodeWidth + SPACING_X < node.position.x ||
                x > node.position.x + existingDimensions.width + SPACING_X ||
                y + newNodeHeight + SPACING_Y < node.position.y ||
                y > node.position.y + existingDimensions.height + SPACING_Y
              );

              return overlap;
            });
          };

          // 새 노드의 예상 크기 (타입에 따라 다름)
          const estimatedNewNodeDimensions = { width: 200, height: 120 };

          // 겹치지 않는 위치 찾기
          let attempts = 0;
          const maxAttempts = 20;

          while (isPositionOccupied(candidateX, candidateY, estimatedNewNodeDimensions.width, estimatedNewNodeDimensions.height) && attempts < maxAttempts) {
            candidateY += estimatedNewNodeDimensions.height + SPACING_Y;

            // Y가 너무 아래로 가면 다음 열로 이동
            if (candidateY > state.lastNodePosition.y + (estimatedNewNodeDimensions.height + SPACING_Y) * 4) {
              candidateX += estimatedNewNodeDimensions.width + SPACING_X;
              candidateY = state.lastNodePosition.y;
            }

            attempts++;
          }

          // 최대 시도 횟수에 도달하면 강제로 위치 지정
          if (attempts >= maxAttempts) {
            candidateX = state.lastNodePosition.x + 250;
            candidateY = state.lastNodePosition.y + 150;
          }

          return {
            x: candidateX,
            y: candidateY,
          };
        },

        // 개선된 자식 노드 위치 계산 - 실제 동적 크기 기반
        calculateChildNodePosition: (parentNodeKey, choiceKey) => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];

          if (!currentScene) {
            return { x: 100, y: 100 };
          }

          const parentNode = getNode(currentScene, parentNodeKey);
          if (!parentNode) {
            return { x: 100, y: 100 };
          }

          // 실제 노드 크기 가져오기 (여러 측정 방법 시도)
          const getRealNodeDimensions = (nodeKey: string) => {
            // React Flow는 노드를 .react-flow__node 클래스로 감싸고, data-id 속성을 설정
            const nodeElement = document.querySelector(`.react-flow__node[data-id="${nodeKey}"]`) as HTMLElement;

            if (nodeElement) {
              // 방법 1: getBoundingClientRect (현재 화면상 크기 - 확대/축소 영향받음)
              const rect = nodeElement.getBoundingClientRect();

              // 방법 2: offsetWidth/Height (실제 CSS 크기 - 확대/축소 영향 안받음)
              const offsetDimensions = {
                width: nodeElement.offsetWidth,
                height: nodeElement.offsetHeight,
              };

              // 방법 3: computedStyle (CSS에서 계산된 크기)
              const computedStyle = window.getComputedStyle(nodeElement);
              const computedDimensions = {
                width: parseFloat(computedStyle.width),
                height: parseFloat(computedStyle.height),
              };

              // offsetWidth가 가장 정확할 가능성이 높음 (CSS 기준, 확대/축소 무관)
              if (offsetDimensions.width > 0 && offsetDimensions.height > 0) {
                return offsetDimensions;
              }

              // 폴백: boundingClientRect
              if (rect.width > 0 && rect.height > 0) {
                return { width: rect.width, height: rect.height };
              }
            }

            // DOM에서 측정할 수 없는 경우 폴백 (예상 크기)
            return getEstimatedNodeDimensions();
          };

          // 폴백용 예상 크기 계산 함수 (CSS 기반)
          const getEstimatedNodeDimensions = () => {
            // TextNode CSS: min-w-[200px] max-w-[300px]
            // 실제 측정이 불가능한 경우 CSS 최대값 + 여유공간 사용
            return { width: 300, height: 120 }; // CSS 최대값 기준
          };

          const parentDimensions = getRealNodeDimensions(parentNodeKey);
          const parentPosition = parentNode.position;

          // 가로 간격 (사용자 요구사항: 30px)
          const HORIZONTAL_SPACING = 50; // 30px → 50px로 변경
          const VERTICAL_SPACING = 30;

          // 새 노드 X 위치: 부모 노드 우측 끝 + 50px
          const newNodeX = parentPosition.x + parentDimensions.width + HORIZONTAL_SPACING;

          if (parentNode.dialogue.type === "text" || !choiceKey) {
            // TextNode의 경우 (단일 자식): 부모 중앙과 자식 중앙의 Y 좌표가 동일하도록 배치
            const parentCenterY = parentPosition.y + parentDimensions.height / 2;
            const newNodeDimensions = { width: 200, height: 120 }; // 새 노드 예상 크기
            const newNodeY = parentCenterY - newNodeDimensions.height / 2;

            return { x: newNodeX, y: newNodeY };
          } else {
            // ChoiceNode의 경우 (다중 자식): 선택지별 개별 배치
            if (parentNode.dialogue.type !== "choice") {
              return { x: newNodeX, y: parentPosition.y };
            }

            const choiceDialogue = parentNode.dialogue as ChoiceDialogue;
            const choices = Object.keys(choiceDialogue.choices);
            const choiceIndex = choices.indexOf(choiceKey);

            if (choiceIndex === -1) {
              return { x: newNodeX, y: parentPosition.y };
            }

            // 이미 연결된 자식 노드들의 위치 확인
            const connectedChildren = choices
              .map((key) => choiceDialogue.choices[key].nextNodeKey)
              .filter(Boolean)
              .map((nodeKey) => getNode(currentScene, nodeKey!))
              .filter(Boolean);

            if (connectedChildren.length === 0) {
              // 첫 번째 자식인 경우: 부모 중앙과 자식 중앙의 Y 좌표가 동일하도록 배치
              const parentCenterY = parentPosition.y + parentDimensions.height / 2;
              const newNodeDimensions = { width: 200, height: 120 }; // 새 노드 예상 크기
              const newNodeY = parentCenterY - newNodeDimensions.height / 2;

              return { x: newNodeX, y: newNodeY };
            } else {
              // 기존 자식들이 있는 경우: 가장 아래 자식 아래에 배치
              const existingYPositions = connectedChildren.map((child) => child!.position.y);
              const lowestY = Math.max(...existingYPositions);
              const newNodeY = lowestY + 120 + VERTICAL_SPACING; // 120은 예상 노드 높이

              return { x: newNodeX, y: newNodeY };
            }
          }
        },

        generateNodeKey: () => {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substr(2, 5);
          return `node_${timestamp}_${random}`;
        },

        getCurrentNodeCount: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          return currentScene ? Object.keys(currentScene).length : 0;
        },

        canCreateNewNode: () => {
          const MAX_NODES = 100;
          return get().getCurrentNodeCount() < MAX_NODES;
        },

        // Dagre 기반 자동 정렬 (향상된 버전)
        arrangeNodesWithDagre: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return;

          const allNodeKeys = Object.keys(currentScene);
          if (allNodeKeys.length === 0) return;

          // Dagre 그래프 생성
          const dagreGraph = new dagre.graphlib.Graph();
          dagreGraph.setDefaultEdgeLabel(() => ({}));
          dagreGraph.setGraph({
            rankdir: "LR", // 좌우 배치
            nodesep: 20, // 노드 간격
            ranksep: 120, // 레벨 간격
            marginx: 50,
            marginy: 50,
          });

          // 노드들을 Dagre에 추가
          allNodeKeys.forEach((nodeKey) => {
            dagreGraph.setNode(nodeKey, {
              width: 200,
              height: 120,
            });
          });

          // 엣지들을 Dagre에 추가
          allNodeKeys.forEach((nodeKey) => {
            const node = getNode(currentScene, nodeKey);
            if (!node) return;

            if (node.dialogue.type === "text" && node.dialogue.nextNodeKey) {
              dagreGraph.setEdge(nodeKey, node.dialogue.nextNodeKey);
            } else if (node.dialogue.type === "choice") {
              Object.values(node.dialogue.choices).forEach((choice) => {
                if (choice.nextNodeKey) {
                  dagreGraph.setEdge(nodeKey, choice.nextNodeKey);
                }
              });
            }
          });

          // 레이아웃 계산
          dagre.layout(dagreGraph);

          // 계산된 위치를 적용 (moveNode 대신 직접 업데이트하여 히스토리 중복 방지)
          allNodeKeys.forEach((nodeKey) => {
            const nodeWithPosition = dagreGraph.node(nodeKey);
            if (nodeWithPosition) {
              // Dagre는 중앙 좌표를 반환하므로 좌상단 좌표로 변환
              const newPosition = {
                x: nodeWithPosition.x - nodeWithPosition.width / 2,
                y: nodeWithPosition.y - nodeWithPosition.height / 2,
              };

              // 직접 위치 업데이트 (히스토리 중복 방지)
              const currentState = get();
              const currentScene = currentState.templateData[currentState.currentTemplate]?.[currentState.currentScene];
              if (!currentScene) return;

              const currentNode = getNode(currentScene, nodeKey);
              if (!currentNode) return;

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
          });

          // 정렬 완료 후 히스토리 추가
          get().pushToHistory(`Dagre 레이아웃 정렬 (${allNodeKeys.length}개 노드)`);
        },

        // 노드 자동 정렬 - 선택된 노드를 루트로 하여 자식 노드들을 트리 형태로 배치
        arrangeChildNodesAsTree: (rootNodeKey) => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return;

          const rootNode = getNode(currentScene, rootNodeKey);
          if (!rootNode) return;

          // 트리 구조 분석을 위한 노드 관계 매핑
          const childrenMap = new Map<string, string[]>();
          const allNodeKeys = Object.keys(currentScene);

          // 각 노드의 자식 노드들을 찾아서 매핑
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
            }
          });

          // 개선된 BFS: 다중 부모의 경우 더 높은 depth 우선
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

          // levelMap 구성
          nodeLevels.forEach((level, nodeKey) => {
            if (!levelMap.has(level)) {
              levelMap.set(level, []);
            }
            levelMap.get(level)!.push(nodeKey);
          });

          // 동적 노드 크기를 고려한 레벨별 위치 계산
          const startX = rootNode.position.x;
          const startY = rootNode.position.y;
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

          // 정렬 완료 후 히스토리 추가
          const affectedNodeCount = Array.from(levelMap.values())
            .flat()
            .filter((nodeKey) => nodeKey !== rootNodeKey).length;
          get().pushToHistory(`자식 트리 정렬 (${affectedNodeCount}개 노드)`);
        },

        // 전체 노드 자동 정렬 - 모든 노드를 계층적으로 배치
        arrangeAllNodesAsTree: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return;

          const allNodeKeys = Object.keys(currentScene);
          if (allNodeKeys.length === 0) return;

          // 트리 구조 분석을 위한 노드 관계 매핑
          const childrenMap = new Map<string, string[]>();
          const parentMap = new Map<string, string[]>();

          // 각 노드의 자식 노드들을 찾아서 매핑
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

          // 루트 노드들 찾기 (부모가 없는 노드들)
          const rootNodes = allNodeKeys.filter((nodeKey) => !parentMap.has(nodeKey));

          // 루트 노드가 없으면 첫 번째 노드를 루트로 사용
          if (rootNodes.length === 0 && allNodeKeys.length > 0) {
            rootNodes.push(allNodeKeys[0]);
          }

          // 각 루트 노드별로 트리 배치
          const startX = 100;
          const startY = 100;
          const rootSpacing = 400; // 루트 노드 간 수직 간격

          rootNodes.forEach((rootNodeKey, rootIndex) => {
            const rootY = startY + rootIndex * rootSpacing;

            // 개선된 BFS: 다중 부모의 경우 더 높은 depth 우선
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

            // levelMap 구성
            nodeLevels.forEach((level, nodeKey) => {
              if (!levelMap.has(level)) {
                levelMap.set(level, []);
              }
              levelMap.get(level)!.push(nodeKey);
            });

            // 동적 노드 크기를 고려한 레벨별 위치 계산
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
          });

          // 정렬 완료 후 히스토리 추가
          get().pushToHistory(`전체 트리 정렬 (${allNodeKeys.length}개 노드)`);
        },

        // 검증
        validateCurrentScene: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          const errors: string[] = [];

          if (!currentScene) {
            return { isValid: false, errors: ["현재 씬이 존재하지 않습니다."] };
          }

          Object.entries(currentScene).forEach(([nodeKey, node]) => {
            const dialogue = node.dialogue;

            // 기본 필드 검증
            if (!dialogue.contentText?.trim() && !dialogue.textKeyRef?.trim()) {
              errors.push(`노드 ${nodeKey}: 내용 텍스트가 비어있습니다.`);
            }

            // 타입별 검증
            if (dialogue.type === "text") {
              // 텍스트 노드는 nextNodeKey가 있어야 함 (또는 마지막 노드)
              if (dialogue.nextNodeKey && !getNode(currentScene, dialogue.nextNodeKey)) {
                errors.push(`노드 ${nodeKey}: 존재하지 않는 노드 '${dialogue.nextNodeKey}'를 참조합니다.`);
              }
            } else if (dialogue.type === "choice") {
              // 선택지 노드는 최소 1개의 선택지가 있어야 함
              const choiceCount = Object.keys(dialogue.choices).length;
              if (choiceCount === 0) {
                errors.push(`노드 ${nodeKey}: 선택지가 없습니다.`);
              }

              // 각 선택지의 nextNodeKey 검증
              Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
                if (!choice.nextNodeKey) {
                  errors.push(`노드 ${nodeKey}, 선택지 ${choiceKey}: nextNodeKey가 비어있습니다.`);
                } else if (!getNode(currentScene, choice.nextNodeKey)) {
                  errors.push(`노드 ${nodeKey}, 선택지 ${choiceKey}: 존재하지 않는 노드 '${choice.nextNodeKey}'를 참조합니다.`);
                }
              });
            }
          });

          return {
            isValid: errors.length === 0,
            errors,
          };
        },

        validateAllData: () => {
          const state = get();
          return validateTemplateData(state.templateData);
        },

        // Import/Export - LocalizationStore 연동
        exportToJSON: () => {
          const state = get();
          const localizationStore = useLocalizationStore.getState();
          const localizationData = localizationStore.exportLocalizationData();
          return exportToJSONUtil(state.templateData, localizationData);
        },

        exportToCSV: () => {
          const state = get();
          const localizationStore = useLocalizationStore.getState();
          const localizationData = localizationStore.exportLocalizationData();
          return exportToCSVUtil(state.templateData, localizationData);
        },

        importFromJSON: (jsonString: string) => {
          try {
            const importResult = importFromJSONUtil(jsonString);

            // EditorStore 업데이트 및 히스토리 초기화
            set({
              templateData: importResult.templateData,
              currentTemplate: Object.keys(importResult.templateData)[0] || "default",
              currentScene: "main",
              selectedNodeKey: undefined,
              selectedNodeKeys: new Set<string>(),
              // 히스토리 초기화 - 새로운 프로젝트 시작점 설정
              history: [
                {
                  templateData: JSON.parse(JSON.stringify(importResult.templateData)),
                  localizationData: useLocalizationStore.getState().exportLocalizationData(),
                  timestamp: Date.now(),
                  action: "JSON 파일 Import",
                },
              ],
              historyIndex: 0,
              isUndoRedoInProgress: false,
            });

            // LocalizationStore 업데이트
            const localizationStore = useLocalizationStore.getState();
            localizationStore.importLocalizationData(importResult.localizationData);

            // 마이그레이션이 필요한 경우 실행
            if (importResult.needsMigration) {
              get().migrateToNewArchitecture();
            }
          } catch (error) {
            throw error; // 에러를 호출자에게 전파
          }
        },

        // 데이터 초기화/로드/마이그레이션
        resetEditor: () => set(initialState),

        loadFromLocalStorage: () => {
          // persist 미들웨어가 자동으로 처리하므로 별도 구현 불필요
        },

        migrateToNewArchitecture: () => {
          const state = get();

          // 마이그레이션 필요 여부 체크
          if (!needsMigration(state.templateData)) {
            return;
          }

          // LocalizationStore 가져오기
          const localizationStore = useLocalizationStore.getState();
          const existingLocalizationData = localizationStore.exportLocalizationData();

          // 마이그레이션 실행
          const migrationResult = migrateTemplateData(state.templateData, existingLocalizationData);

          if (migrationResult.result.success) {
            // 성공적으로 마이그레이션된 경우 데이터 업데이트
            set({
              templateData: migrationResult.migratedData,
            });

            // LocalizationStore에 새 데이터 적용
            localizationStore.importLocalizationData(migrationResult.localizationData);
          } else {
            console.error("마이그레이션 실패:", migrationResult.result.errors);
          }
        },

        // 키 참조 업데이트
        updateNodeKeyReference: (nodeKey, keyType, newKeyRef) =>
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode) return state;

            const localizationStore = useLocalizationStore.getState();
            const newText = localizationStore.getText(newKeyRef) || "";

            const updatedDialogue = { ...currentNode.dialogue };
            if (keyType === "speaker") {
              updatedDialogue.speakerKeyRef = newKeyRef;
              updatedDialogue.speakerText = newText; // 실제 텍스트도 동기화
            } else if (keyType === "text") {
              updatedDialogue.textKeyRef = newKeyRef;
              updatedDialogue.contentText = newText; // 실제 텍스트도 동기화
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
          }),

        updateChoiceKeyReference: (nodeKey, choiceKey, newKeyRef) =>
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode || currentNode.dialogue.type !== "choice") return state;

            const localizationStore = useLocalizationStore.getState();
            const newText = localizationStore.getText(newKeyRef) || "";

            const updatedDialogue = { ...currentNode.dialogue };
            if (updatedDialogue.choices[choiceKey]) {
              updatedDialogue.choices[choiceKey] = {
                ...updatedDialogue.choices[choiceKey],
                textKeyRef: newKeyRef,
                choiceText: newText, // 실제 텍스트도 동기화
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
          }),

        // 새로운 레이아웃 시스템 (즉시 배치)
        arrangeAllNodes: async (internal = false) => {
          // 내부 호출이 아닐 때만 AsyncOperationManager 사용
          if (!internal && !globalAsyncOperationManager.startOperation("전체 캔버스 정렬")) {
            return;
          }

          try {
            const state = get();
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return;

            const allNodeKeys = Object.keys(currentScene);
            if (allNodeKeys.length === 0) return;

            // 정렬 전 위치 캡처
            const beforePositions = captureNodePositions(currentScene, allNodeKeys);

            // 그래프 구조 분석을 통한 올바른 루트 노드 찾기
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
            const rootNodeKey = rootNodes.length > 0 ? rootNodes[0] : allNodeKeys[0];

            const { globalLayoutSystem } = await import("../utils/layoutEngine");

            await globalLayoutSystem.runLayout(
              currentScene,
              {
                rootNodeId: rootNodeKey,
                depth: null, // 무제한 깊이
                includeRoot: true,
                direction: "LR",
                nodeSpacing: 50,
                rankSpacing: 100,
                // 전체 정렬에서는 앵커 없음 (모든 노드 자유롭게 배치)
                anchorNodeId: undefined,
              },
              (nodeId, position) => {
                // moveNode를 직접 호출하지 않고 위치만 업데이트 (히스토리 중복 방지)
                const currentState = get();
                const currentScene = currentState.templateData[currentState.currentTemplate]?.[currentState.currentScene];
                if (!currentScene) return;

                const currentNode = getNode(currentScene, nodeId);
                if (!currentNode) return;

                const updatedNode = { ...currentNode, position };
                const updatedScene = setNode(currentScene, nodeId, updatedNode);

                set((state) => ({
                  ...state,
                  templateData: {
                    ...state.templateData,
                    [state.currentTemplate]: {
                      ...state.templateData[state.currentTemplate],
                      [state.currentScene]: updatedScene,
                    },
                  },
                  lastNodePosition: position,
                }));
              }
            );

            // 정렬 후 위치 캡처 및 변화 감지
            const afterState = get();
            const afterScene = afterState.templateData[afterState.currentTemplate]?.[afterState.currentScene];
            if (!afterScene) return;

            const afterPositions = captureNodePositions(afterScene, allNodeKeys);
            const hasChanged = comparePositions(beforePositions, afterPositions);

            if (hasChanged) {
              // 변화가 있을 때만 히스토리 저장
              get().pushToHistory(`전체 캔버스 정렬 (${allNodeKeys.length}개 노드)`);
            } else {
              // 변화가 없으면 토스트 메시지 표시
              const showToast = get().showToast;
              if (showToast) {
                showToast("이미 정렬된 상태입니다", "info");
              }
            }
          } catch (error) {
            console.error("[정렬 시스템] 전체 캔버스 정렬 중 오류:", error);
            if (!internal) {
              globalAsyncOperationManager.showError("정렬 중 오류가 발생했습니다");
            }
          } finally {
            if (!internal) {
              globalAsyncOperationManager.endOperation();
            }
          }
        },

        arrangeSelectedNodeChildren: async (nodeKey, internal = false) => {
          // 내부 호출이 아닐 때만 AsyncOperationManager 사용
          if (!internal && !globalAsyncOperationManager.startOperation("자식 노드 정렬")) {
            return;
          }

          try {
            const state = get();
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return;

            const parentNode = getNode(currentScene, nodeKey);
            if (!parentNode) return;

            // 자식 노드들 찾기
            const childNodeKeys = new Set<string>();
            if (parentNode.dialogue.type === "text" && parentNode.dialogue.nextNodeKey) {
              childNodeKeys.add(parentNode.dialogue.nextNodeKey);
            } else if (parentNode.dialogue.type === "choice") {
              Object.values(parentNode.dialogue.choices).forEach((choice) => {
                if (choice.nextNodeKey) {
                  childNodeKeys.add(choice.nextNodeKey);
                }
              });
            }

            // 정렬할 노드들 (부모 + 자식)
            const affectedNodeKeys = [nodeKey, ...Array.from(childNodeKeys)];

            // 정렬 전 위치 캡처
            const beforePositions = captureNodePositions(currentScene, affectedNodeKeys);

            const { globalLayoutSystem } = await import("../utils/layoutEngine");

            await globalLayoutSystem.runLayout(
              currentScene,
              {
                rootNodeId: nodeKey,
                depth: 1, // 직접 자식만
                includeRoot: true,
                direction: "LR",
                nodeSpacing: 50,
                rankSpacing: 100,
                anchorNodeId: nodeKey, // 선택된 노드를 앵커로 고정
              },
              (nodeId, position) => {
                // moveNode를 직접 호출하지 않고 위치만 업데이트 (히스토리 중복 방지)
                const currentState = get();
                const currentScene = currentState.templateData[currentState.currentTemplate]?.[currentState.currentScene];
                if (!currentScene) return;

                const currentNode = getNode(currentScene, nodeId);
                if (!currentNode) return;

                const updatedNode = { ...currentNode, position };
                const updatedScene = setNode(currentScene, nodeId, updatedNode);

                set((state) => ({
                  ...state,
                  templateData: {
                    ...state.templateData,
                    [state.currentTemplate]: {
                      ...state.templateData[state.currentTemplate],
                      [state.currentScene]: updatedScene,
                    },
                  },
                  lastNodePosition: position,
                }));
              }
            );

            // 정렬 후 위치 캡처 및 변화 감지
            const afterState = get();
            const afterScene = afterState.templateData[afterState.currentTemplate]?.[afterState.currentScene];
            if (!afterScene) return;

            const afterPositions = captureNodePositions(afterScene, affectedNodeKeys);
            const hasChanged = comparePositions(beforePositions, afterPositions);

            if (hasChanged) {
              // 변화가 있을 때만 히스토리 저장
              get().pushToHistory(`자식 노드 정렬 (${childNodeKeys.size}개 노드)`);
            } else {
              // 변화가 없으면 토스트 메시지 표시
              const showToast = get().showToast;
              if (showToast) {
                showToast("이미 정렬된 상태입니다", "info");
              }
            }
          } catch (error) {
            console.error("[정렬 시스템] 자식 노드 정렬 중 오류:", error);
            if (!internal) {
              globalAsyncOperationManager.showError("정렬 중 오류가 발생했습니다");
            }
          } finally {
            if (!internal) {
              globalAsyncOperationManager.endOperation();
            }
          }
        },

        arrangeSelectedNodeDescendants: async (nodeKey, internal = false) => {
          // 내부 호출이 아닐 때만 AsyncOperationManager 사용
          if (!internal && !globalAsyncOperationManager.startOperation("후손 노드 정렬")) {
            return;
          }

          try {
            const state = get();
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return;

            const parentNode = getNode(currentScene, nodeKey);
            if (!parentNode) return;

            // 후손 노드들 찾기
            const descendantNodeKeys = new Set<string>();
            const findDescendants = (currentNodeKey: string) => {
              const node = getNode(currentScene, currentNodeKey);
              if (!node) return;

              if (node.dialogue.type === "text" && node.dialogue.nextNodeKey) {
                descendantNodeKeys.add(node.dialogue.nextNodeKey);
                findDescendants(node.dialogue.nextNodeKey);
              } else if (node.dialogue.type === "choice") {
                Object.values(node.dialogue.choices).forEach((choice) => {
                  if (choice.nextNodeKey) {
                    descendantNodeKeys.add(choice.nextNodeKey);
                    findDescendants(choice.nextNodeKey);
                  }
                });
              }
            };
            findDescendants(nodeKey);

            // 정렬할 노드들 (부모 + 후손)
            const affectedNodeKeys = [nodeKey, ...Array.from(descendantNodeKeys)];

            // 정렬 전 위치 캡처
            const beforePositions = captureNodePositions(currentScene, affectedNodeKeys);

            const { globalLayoutSystem } = await import("../utils/layoutEngine");

            await globalLayoutSystem.runLayout(
              currentScene,
              {
                rootNodeId: nodeKey,
                depth: null, // 무제한 깊이
                includeRoot: true,
                direction: "LR",
                nodeSpacing: 50,
                rankSpacing: 100,
                anchorNodeId: nodeKey, // 선택된 노드를 앵커로 고정
              },
              (nodeId, position) => {
                // moveNode를 직접 호출하지 않고 위치만 업데이트 (히스토리 중복 방지)
                const currentState = get();
                const currentScene = currentState.templateData[currentState.currentTemplate]?.[currentState.currentScene];
                if (!currentScene) return;

                const currentNode = getNode(currentScene, nodeId);
                if (!currentNode) return;

                const updatedNode = { ...currentNode, position };
                const updatedScene = setNode(currentScene, nodeId, updatedNode);

                set((state) => ({
                  ...state,
                  templateData: {
                    ...state.templateData,
                    [state.currentTemplate]: {
                      ...state.templateData[state.currentTemplate],
                      [state.currentScene]: updatedScene,
                    },
                  },
                  lastNodePosition: position,
                }));
              }
            );

            // 정렬 후 위치 캡처 및 변화 감지
            const afterState = get();
            const afterScene = afterState.templateData[afterState.currentTemplate]?.[afterState.currentScene];
            if (!afterScene) return;

            const afterPositions = captureNodePositions(afterScene, affectedNodeKeys);
            const hasChanged = comparePositions(beforePositions, afterPositions);

            if (hasChanged) {
              // 변화가 있을 때만 히스토리 저장
              get().pushToHistory(`후손 노드 정렬 (${descendantNodeKeys.size}개 노드)`);
            } else {
              // 변화가 없으면 토스트 메시지 표시
              const showToast = get().showToast;
              if (showToast) {
                showToast("이미 정렬된 상태입니다", "info");
              }
            }
          } catch (error) {
            console.error("[정렬 시스템] 후손 노드 정렬 중 오류:", error);
            if (!internal) {
              globalAsyncOperationManager.showError("정렬 중 오류가 발생했습니다");
            }
          } finally {
            if (!internal) {
              globalAsyncOperationManager.endOperation();
            }
          }
        },

        // 노드 숨김 상태 업데이트 함수 추가
        updateNodeVisibility: (nodeKey: string, hidden: boolean) =>
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode) return state;

            const updatedNode = { ...currentNode, hidden };
            const updatedScene = setNode(currentScene, nodeKey, updatedNode);

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
          }),

        // 노드 위치와 숨김 상태 동시 업데이트 함수 추가
        updateNodePositionAndVisibility: (nodeKey: string, position: { x: number; y: number }, hidden: boolean) =>
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;

            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode) return state;

            const updatedNode = { ...currentNode, position, hidden };
            const updatedScene = setNode(currentScene, nodeKey, updatedNode);

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
          }),
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
