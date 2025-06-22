import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorState, Scene, TemplateDialogues } from "../types/dialogue";
import type { IEditorStore, ICoreServices } from "./types/editorTypes";
import { createCoreServices } from "./services/coreServices";
import { createHistoryDomain } from "./domains/historyDomain";
import { createProjectDomain } from "./domains/projectDomain";
import { createNodeDomain } from "./domains/nodeDomain";
import { createLayoutDomain } from "./domains/layoutDomain";
import { createNodeOperationsDomain } from "./domains/nodeOperationsDomain";
import { useLocalizationStore } from "./localizationStore";

// 타입 안전한 헬퍼 함수들
const createEmptyScene = (): Scene => ({});

const createEmptyTemplate = (): TemplateDialogues => ({
  default: {
    main: createEmptyScene(),
  },
});

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

export const useEditorStore = create<IEditorStore>()(
  persist(
    (set, get) => {
      const updateLocalizationStoreRef = () => {
        const localizationStore = useLocalizationStore.getState();
        localizationStore._setEditorStore(get());
      };

      const coreServices: ICoreServices = createCoreServices(get, set);
      const historyDomain = createHistoryDomain(get, set, coreServices, updateLocalizationStoreRef);
      const projectDomain = createProjectDomain(get, set, coreServices, updateLocalizationStoreRef, initialState);
      const nodeDomain = createNodeDomain(get, set, coreServices);
      const layoutDomain = createLayoutDomain(get, set, coreServices);
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

        // 대화 내용 수정 (실제 텍스트 기반)
        updateDialogue: (nodeKey, dialogue) => {
          nodeDomain.updateDialogue(nodeKey, dialogue);
        },

        updateNodeText: (nodeKey, speakerText, contentText) => {
          nodeDomain.updateNodeText(nodeKey, speakerText, contentText);
          updateLocalizationStoreRef(); // 즉시 동기화
        },

        updateChoiceText: (nodeKey, choiceKey, choiceText) => {
          nodeDomain.updateChoiceText(nodeKey, choiceKey, choiceText);
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
        createAndConnectChoiceNode: async (fromNodeKey, choiceKey, nodeType = "text") => {
          return await nodeOperationsDomain.createAndConnectChoiceNode(fromNodeKey, choiceKey, nodeType);
        },

        // 텍스트 노드에서 새 노드 자동 생성 및 연결
        createAndConnectTextNode: async (fromNodeKey, nodeType = "text") => {
          return await nodeOperationsDomain.createAndConnectTextNode(fromNodeKey, nodeType);
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

        // 노드 자동 정렬 - 선택된 노드를 루트로 하여 자식 노드들을 트리 형태로 배치 (리팩터링됨)
        arrangeChildNodesAsTree: (rootNodeKey) => {
          layoutDomain.arrangeChildNodesAsTree(rootNodeKey);
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
