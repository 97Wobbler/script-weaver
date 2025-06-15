import { useCallback, useEffect } from "react";
import { useNodeStore } from "../store/nodeStore";
import { useEditorStore } from "../store/editorStore";
import type { EditorNodeWrapper, Scene } from "../types/dialogue";

// useNodes Hook 반환 타입
export interface UseNodesReturn {
  // 상태 (새 nodeStore 기반)
  nodes: Scene;
  selectedNodeKey?: string;
  selectedNodeKeys: Set<string>;
  
  // 기본 노드 관리 (새 nodeStore + editorStore 조합)
  addNode: (node: EditorNodeWrapper) => void;
  updateNode: (nodeKey: string, updates: Partial<EditorNodeWrapper>) => void;
  deleteNode: (nodeKey: string) => void;
  getNode: (nodeKey: string) => EditorNodeWrapper | undefined;
  
  // 선택 관리 (새 nodeStore 기반)
  setSelectedNode: (nodeKey?: string) => void;
  toggleNodeSelection: (nodeKey: string) => void;
  clearSelection: () => void;
  selectMultipleNodes: (nodeKeys: string[]) => void;
  getSelectedNodes: () => EditorNodeWrapper[];
  
  // 유틸리티
  hasNode: (nodeKey: string) => boolean;
  getNodeCount: () => number;
  getAllNodeKeys: () => string[];
  
  // 동기화 함수 (테스트용)
  syncFromEditor: () => void;
  syncToEditor: () => void;
}

/**
 * 노드 관련 기능을 통합 제공하는 Hook
 * 기존 editorStore와 새로운 nodeStore를 조합하여 사용
 */
export const useNodes = (): UseNodesReturn => {
  // Store 훅들
  const nodeStore = useNodeStore();
  const editorStore = useEditorStore();
  
  // 현재 활성 씬 가져오기
  const getCurrentScene = useCallback(() => {
    return editorStore.templateData[editorStore.currentTemplate]?.[editorStore.currentScene] || {};
  }, [editorStore.templateData, editorStore.currentTemplate, editorStore.currentScene]);
  
  // editorStore → nodeStore 동기화
  const syncFromEditor = useCallback(() => {
    const currentScene = getCurrentScene();
    nodeStore.setNodes(currentScene);
    
    // 선택 상태도 동기화
    if (editorStore.selectedNodeKey) {
      nodeStore.setSelectedNode(editorStore.selectedNodeKey);
    }
    
    nodeStore.selectMultipleNodes(Array.from(editorStore.selectedNodeKeys));
  }, [getCurrentScene, nodeStore, editorStore.selectedNodeKey, editorStore.selectedNodeKeys]);
  
  // nodeStore → editorStore 동기화
  const syncToEditor = useCallback(() => {
    // templateData 업데이트
    editorStore.setCurrentTemplate(editorStore.currentTemplate);
    editorStore.setCurrentScene(editorStore.currentScene);
    
    // 각 노드를 editorStore에 업데이트
    Object.values(nodeStore.nodes).forEach(node => {
      editorStore.updateNode(node.nodeKey, node);
    });
    
    // 선택 상태 동기화
    if (nodeStore.selectedNodeKey) {
      editorStore.setSelectedNode(nodeStore.selectedNodeKey);
    }
    
    nodeStore.selectedNodeKeys.forEach(nodeKey => {
      editorStore.toggleNodeSelection(nodeKey);
    });
  }, [nodeStore, editorStore]);
  
  // 컴포넌트 마운트 시 초기 동기화
  useEffect(() => {
    const currentScene = editorStore.templateData[editorStore.currentTemplate]?.[editorStore.currentScene] || {};
    nodeStore.setNodes(currentScene);
    
    // 선택 상태도 동기화
    if (editorStore.selectedNodeKey) {
      nodeStore.setSelectedNode(editorStore.selectedNodeKey);
    }
    
    nodeStore.selectMultipleNodes(Array.from(editorStore.selectedNodeKeys));
  }, [editorStore.currentTemplate, editorStore.currentScene]); // template과 scene 변경 시만 실행
  
  // 노드 추가 (양쪽 Store에 모두 반영)
  const addNode = useCallback((node: EditorNodeWrapper) => {
    // nodeStore에 추가
    nodeStore.addNode(node);
    
    // editorStore에도 추가
    editorStore.addNode(node);
    
    // 히스토리에 기록
    editorStore.pushToHistory(`노드 추가: ${node.nodeKey}`);
  }, [nodeStore, editorStore]);
  
  // 노드 업데이트 (양쪽 Store에 모두 반영)
  const updateNode = useCallback((nodeKey: string, updates: Partial<EditorNodeWrapper>) => {
    // nodeStore 업데이트
    nodeStore.updateNode(nodeKey, updates);
    
    // editorStore 업데이트
    editorStore.updateNode(nodeKey, updates);
    
    // 히스토리에 기록
    editorStore.pushToHistory(`노드 수정: ${nodeKey}`);
  }, [nodeStore, editorStore]);
  
  // 노드 삭제 (양쪽 Store에 모두 반영)
  const deleteNode = useCallback((nodeKey: string) => {
    // nodeStore에서 삭제
    nodeStore.deleteNode(nodeKey);
    
    // editorStore에서 삭제
    editorStore.deleteNode(nodeKey);
    
    // 히스토리에 기록
    editorStore.pushToHistory(`노드 삭제: ${nodeKey}`);
  }, [nodeStore, editorStore]);
  
  // 선택 관리 (nodeStore 기반)
  const setSelectedNode = useCallback((nodeKey?: string) => {
    nodeStore.setSelectedNode(nodeKey);
    editorStore.setSelectedNode(nodeKey);
  }, [nodeStore, editorStore]);
  
  const toggleNodeSelection = useCallback((nodeKey: string) => {
    nodeStore.toggleNodeSelection(nodeKey);
    editorStore.toggleNodeSelection(nodeKey);
  }, [nodeStore, editorStore]);
  
  const clearSelection = useCallback(() => {
    nodeStore.clearSelection();
    editorStore.clearSelection();
  }, [nodeStore, editorStore]);
  
  const selectMultipleNodes = useCallback((nodeKeys: string[]) => {
    nodeStore.selectMultipleNodes(nodeKeys);
    editorStore.selectMultipleNodes(nodeKeys);
  }, [nodeStore, editorStore]);
  
  return {
    // 상태 (nodeStore 기반)
    nodes: nodeStore.nodes,
    selectedNodeKey: nodeStore.selectedNodeKey,
    selectedNodeKeys: nodeStore.selectedNodeKeys,
    
    // 노드 관리
    addNode,
    updateNode,
    deleteNode,
    getNode: nodeStore.getNode,
    
    // 선택 관리
    setSelectedNode,
    toggleNodeSelection,
    clearSelection,
    selectMultipleNodes,
    getSelectedNodes: nodeStore.getSelectedNodes,
    
    // 유틸리티
    hasNode: nodeStore.hasNode,
    getNodeCount: nodeStore.getNodeCount,
    getAllNodeKeys: nodeStore.getAllNodeKeys,
    
    // 동기화 (테스트/디버깅용)
    syncFromEditor,
    syncToEditor,
  };
}; 