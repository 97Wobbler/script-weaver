import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorNodeWrapper, Scene } from "../types/dialogue";

// 노드 Store 상태 인터페이스
export interface NodeState {
  // 현재 활성 씬의 노드들
  nodes: Scene;
  
  // 선택 상태
  selectedNodeKey?: string;
  selectedNodeKeys: Set<string>;
  
  // 드래그 관련 상태
  lastDraggedNodeKey: string | null;
  lastDragActionTime: number;
  
  // 복사/붙여넣기를 위한 클립보드
  clipboard: EditorNodeWrapper[];
  
  // 노드 위치 관리
  lastNodePosition: { x: number; y: number };
}

// 노드 Store 액션 인터페이스
export interface NodeActions {
  // 노드 데이터 관리
  setNodes: (nodes: Scene) => void;
  clearNodes: () => void;
  
  // 기본 CRUD 액션
  addNode: (node: EditorNodeWrapper) => void;
  updateNode: (nodeKey: string, updates: Partial<EditorNodeWrapper>) => void;
  deleteNode: (nodeKey: string) => void;
  getNode: (nodeKey: string) => EditorNodeWrapper | undefined;
  
  // 선택 관리 액션
  setSelectedNode: (nodeKey?: string) => void;
  toggleNodeSelection: (nodeKey: string) => void;
  clearSelection: () => void;
  selectMultipleNodes: (nodeKeys: string[]) => void;
  getSelectedNodes: () => EditorNodeWrapper[];
  
  // 드래그 상태 관리
  setLastDraggedNode: (nodeKey: string | null) => void;
  updateDragActionTime: () => void;
  
  // 유틸리티
  hasNode: (nodeKey: string) => boolean;
  getNodeCount: () => number;
  getAllNodeKeys: () => string[];
  
  // 위치 관리
  setLastNodePosition: (position: { x: number; y: number }) => void;
}

export interface NodeStore extends NodeState, NodeActions {}

// 초기 상태
const initialState: NodeState = {
  nodes: {},
  selectedNodeKey: undefined,
  selectedNodeKeys: new Set<string>(),
  lastDraggedNodeKey: null,
  lastDragActionTime: 0,
  clipboard: [],
  lastNodePosition: { x: 100, y: 100 },
};

// 노드 Store 생성
export const useNodeStore = create<NodeStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 노드 데이터 관리
      setNodes: (nodes: Scene) => {
        set({ nodes });
      },
      
      clearNodes: () => {
        set({ 
          nodes: {},
          selectedNodeKey: undefined,
          selectedNodeKeys: new Set<string>(),
        });
      },
      
      // 기본 CRUD 액션
      addNode: (node: EditorNodeWrapper) => {
        set((state) => ({
          nodes: {
            ...state.nodes,
            [node.nodeKey]: node,
          },
        }));
      },
      
      updateNode: (nodeKey: string, updates: Partial<EditorNodeWrapper>) => {
        set((state) => {
          const existingNode = state.nodes[nodeKey];
          if (!existingNode) return state;
          
          return {
            nodes: {
              ...state.nodes,
              [nodeKey]: {
                ...existingNode,
                ...updates,
              },
            },
          };
        });
      },
      
      deleteNode: (nodeKey: string) => {
        set((state) => {
          if (!state.nodes[nodeKey]) return state;
          
          const newNodes = { ...state.nodes };
          delete newNodes[nodeKey];
          
          // 선택 상태도 정리
          const newSelectedNodeKeys = new Set(state.selectedNodeKeys);
          newSelectedNodeKeys.delete(nodeKey);
          
          return {
            nodes: newNodes,
            selectedNodeKey: state.selectedNodeKey === nodeKey ? undefined : state.selectedNodeKey,
            selectedNodeKeys: newSelectedNodeKeys,
          };
        });
      },
      
      getNode: (nodeKey: string) => {
        return get().nodes[nodeKey];
      },
      
      // 선택 관리 액션
      setSelectedNode: (nodeKey?: string) => {
        set({ selectedNodeKey: nodeKey });
      },
      
      toggleNodeSelection: (nodeKey: string) => {
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
        set({ 
          selectedNodeKey: undefined,
          selectedNodeKeys: new Set<string>() 
        });
      },
      
      selectMultipleNodes: (nodeKeys: string[]) => {
        set({ 
          selectedNodeKeys: new Set(nodeKeys)
        });
      },
      
      getSelectedNodes: () => {
        const state = get();
        const selectedKeys = Array.from(state.selectedNodeKeys);
        return selectedKeys.map(key => state.nodes[key]).filter(Boolean);
      },
      
      // 드래그 상태 관리
      setLastDraggedNode: (nodeKey: string | null) => {
        set({ lastDraggedNodeKey: nodeKey });
      },
      
      updateDragActionTime: () => {
        set({ lastDragActionTime: Date.now() });
      },
      
      // 유틸리티
      hasNode: (nodeKey: string) => {
        return get().nodes[nodeKey] !== undefined;
      },
      
      getNodeCount: () => {
        return Object.keys(get().nodes).length;
      },
      
      getAllNodeKeys: () => {
        return Object.keys(get().nodes);
      },
      
      // 위치 관리
      setLastNodePosition: (position: { x: number; y: number }) => {
        set({ lastNodePosition: position });
      },
    }),
    {
      name: "script-weaver-node-store",
      version: 1,
      partialize: (state) => ({
        // localStorage에는 선택 상태는 저장하지 않음 (세션별로 초기화)
        nodes: state.nodes,
        lastNodePosition: state.lastNodePosition,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Set 객체들을 다시 초기화
          state.selectedNodeKeys = new Set<string>();
          state.clipboard = [];
        }
      },
    }
  )
);

// 편의를 위한 export
export const nodeStore = useNodeStore.getState(); 