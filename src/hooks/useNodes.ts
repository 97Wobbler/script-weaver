import { useCallback, useEffect } from 'react';
import { useNodeStore } from '../store/nodeStore';
import { useProjectStore } from '../store/projectStore';
import type { EditorNodeWrapper, Scene } from '../types/dialogue';

// useNodes Hook 반환 타입
export interface UseNodesReturn {
  // 상태
  nodes: Scene;
  selectedNodeKey?: string;
  selectedNodeKeys: Set<string>;
  
  // 노드 관리
  addNode: (node: EditorNodeWrapper) => void;
  updateNode: (nodeKey: string, updates: Partial<EditorNodeWrapper>) => void;
  deleteNode: (nodeKey: string) => void;
  getNode: (nodeKey: string) => EditorNodeWrapper | undefined;
  
  // 선택 관리
  setSelectedNode: (nodeKey?: string) => void;
  toggleNodeSelection: (nodeKey: string) => void;
  clearSelection: () => void;
  selectMultipleNodes: (nodeKeys: string[]) => void;
  getSelectedNodes: () => EditorNodeWrapper[];
  
  // 유틸리티
  hasNode: (nodeKey: string) => boolean;
  getNodeCount: () => number;
  getAllNodeKeys: () => string[];
  
  // 현재 씬의 노드들 가져오기
  getCurrentScene: () => Scene;
}

/**
 * 노드 관련 기능을 통합 제공하는 Hook
 * 기존 editorStore와 새로운 nodeStore를 조합하여 사용
 */
export const useNodes = (): UseNodesReturn => {
  const nodeStore = useNodeStore();
  const projectStore = useProjectStore();
  
  // 현재 씬의 노드들 가져오기
  const getCurrentScene = useCallback((): Scene => {
    const templateData = projectStore.templateData;
    const currentTemplate = projectStore.currentTemplate;
    const currentScene = projectStore.currentScene;
    
    return templateData[currentTemplate]?.[currentScene] || {};
  }, [projectStore.templateData, projectStore.currentTemplate, projectStore.currentScene]);
  
  // 현재 씬이 변경될 때만 nodeStore 동기화 (무한 루프 방지)
  useEffect(() => {
    const currentScene = getCurrentScene();
    // 현재 씬이 변경된 경우에만 동기화 (데이터가 다를 때만)
    if (JSON.stringify(nodeStore.nodes) !== JSON.stringify(currentScene)) {
      nodeStore.setNodes(currentScene);
      
      // 선택 상태 동기화 (필요한 경우)
      if (nodeStore.selectedNodeKey && !currentScene[nodeStore.selectedNodeKey]) {
        nodeStore.setSelectedNode(undefined);
      }
    }
  }, [projectStore.currentTemplate, projectStore.currentScene]); // getCurrentScene 의존성 제거
  
  // 노드 변경 시 projectStore에 반영 (디바운스 필요)
  useEffect(() => {
    const currentTemplate = projectStore.currentTemplate;
    const currentScene = projectStore.currentScene;
    
    // 타이머를 사용해 디바운스 처리 (무한 루프 방지)
    const timer = setTimeout(() => {
      const currentSceneData = projectStore.templateData[currentTemplate]?.[currentScene] || {};
      // 데이터가 실제로 다를 때만 업데이트
      if (JSON.stringify(currentSceneData) !== JSON.stringify(nodeStore.nodes)) {
        projectStore.updateTemplateData({
          ...projectStore.templateData,
          [currentTemplate]: {
            ...projectStore.templateData[currentTemplate],
            [currentScene]: nodeStore.nodes,
          },
        });
      }
    }, 100); // 100ms 디바운스
    
    return () => clearTimeout(timer);
  }, [nodeStore.nodes]);
  
  // 노드 관련 액션들
  const addNode = useCallback((node: EditorNodeWrapper) => {
    nodeStore.addNode(node);
  }, [nodeStore]);
  
  const updateNode = useCallback((nodeKey: string, updates: Partial<EditorNodeWrapper>) => {
    nodeStore.updateNode(nodeKey, updates);
  }, [nodeStore]);
  
  const deleteNode = useCallback((nodeKey: string) => {
    nodeStore.deleteNode(nodeKey);
  }, [nodeStore]);
  
  const setSelectedNode = useCallback((nodeKey?: string) => {
    nodeStore.setSelectedNode(nodeKey);
  }, [nodeStore]);
  
  const toggleNodeSelection = useCallback((nodeKey: string) => {
    nodeStore.toggleNodeSelection(nodeKey);
  }, [nodeStore]);
  
  const clearSelection = useCallback(() => {
    nodeStore.clearSelection();
  }, [nodeStore]);
  
  const selectMultipleNodes = useCallback((nodeKeys: string[]) => {
    nodeStore.selectMultipleNodes(nodeKeys);
  }, [nodeStore]);
  
  return {
    // 상태
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
    getCurrentScene,
  };
}; 