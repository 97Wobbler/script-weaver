import { useCallback, useEffect } from "react";
import { useLayoutStore } from "../store/layoutStore";
import { useEditorStore } from "../store/editorStore";
import type { EditorNodeWrapper, Scene } from "../types/dialogue";

// useLayout Hook 반환 타입
export interface UseLayoutReturn {
  // 상태 (layoutStore 기반)
  lastNodePosition: { x: number; y: number };
  layoutInProgress: boolean;
  nodeSpacing: {
    horizontal: number;
    vertical: number;
    levelSpacing: number;
  };
  defaultNodeSize: {
    width: number;
    height: number;
  };
  
  // 위치 계산 (layoutStore + editorStore 조합)
  getNextNodePosition: () => { x: number; y: number };
  calculateChildNodePosition: (parentNodeKey: string, choiceKey?: string) => { x: number; y: number };
  
  // 노드 위치 관리 (editorStore 기반)
  moveNode: (nodeKey: string, position: { x: number; y: number }) => void;
  updateNodePosition: (nodeKey: string, position: { x: number; y: number }) => void;
  
  // 노드 크기 계산 (layoutStore 기반)
  getNodeDimensions: (nodeKey: string) => { width: number; height: number };
  getEstimatedNodeDimensions: () => { width: number; height: number };
  
  // 위치 충돌 감지 (layoutStore 기반)
  isPositionOccupied: (x: number, y: number, nodeWidth: number, nodeHeight: number) => boolean;
  
  // 자동 정렬 (editorStore 기반)
  arrangeChildNodesAsTree: (rootNodeKey: string) => void;
  arrangeAllNodesAsTree: () => void;
  arrangeNodesWithDagre: () => void;
  arrangeAllNodes: (internal?: boolean) => Promise<void>;
  arrangeSelectedNodeChildren: (nodeKey: string, internal?: boolean) => Promise<void>;
  arrangeSelectedNodeDescendants: (nodeKey: string, internal?: boolean) => Promise<void>;
  
  // 설정 관리 (layoutStore 기반)
  updateSpacing: (spacing: Partial<UseLayoutReturn['nodeSpacing']>) => void;
  updateDefaultNodeSize: (size: Partial<UseLayoutReturn['defaultNodeSize']>) => void;
  setLayoutInProgress: (inProgress: boolean) => void;
  
  // 동기화 함수 (테스트용)
  syncFromEditor: () => void;
  syncToEditor: () => void;
  
  // 유틸리티
  resetLayout: () => void;
}

/**
 * 레이아웃 관련 기능을 통합 제공하는 Hook
 * 기존 editorStore와 새로운 layoutStore를 조합하여 사용
 */
export const useLayout = (): UseLayoutReturn => {
  // Store 훅들
  const layoutStore = useLayoutStore();
  const editorStore = useEditorStore();
  
  // 현재 활성 씬 가져오기
  const getCurrentScene = useCallback((): Scene => {
    return editorStore.templateData[editorStore.currentTemplate]?.[editorStore.currentScene] || {};
  }, [editorStore.templateData, editorStore.currentTemplate, editorStore.currentScene]);
  
  // editorStore → layoutStore 동기화
  const syncFromEditor = useCallback(() => {
    // editorStore의 lastNodePosition을 layoutStore에 동기화
    layoutStore.setLastNodePosition(editorStore.lastNodePosition);
  }, [layoutStore, editorStore.lastNodePosition]);
  
  // layoutStore → editorStore 동기화
  const syncToEditor = useCallback(() => {
    // layoutStore의 lastNodePosition을 editorStore에 반영
    // editorStore에는 직접 lastNodePosition 설정 메서드가 없으므로
    // 노드 이동 시 자동으로 동기화됨
  }, []);
  
  // 컴포넌트 마운트 시 초기 동기화
  useEffect(() => {
    syncFromEditor();
  }, [editorStore.currentTemplate, editorStore.currentScene]);
  
  // 다음 노드 위치 계산 (layoutStore + 현재 씬)
  const getNextNodePosition = useCallback(() => {
    const currentScene = getCurrentScene();
    return layoutStore.getNextNodePosition(currentScene);
  }, [layoutStore, getCurrentScene]);
  
  // 자식 노드 위치 계산 (layoutStore + 현재 씬)
  const calculateChildNodePosition = useCallback((parentNodeKey: string, choiceKey?: string) => {
    const currentScene = getCurrentScene();
    return layoutStore.calculateChildNodePosition(currentScene, parentNodeKey, choiceKey);
  }, [layoutStore, getCurrentScene]);
  
  // 노드 이동 (editorStore + layoutStore 동기화)
  const moveNode = useCallback((nodeKey: string, position: { x: number; y: number }) => {
    // editorStore에서 노드 이동
    editorStore.moveNode(nodeKey, position);
    
    // layoutStore의 lastNodePosition 업데이트
    layoutStore.setLastNodePosition(position);
  }, [editorStore, layoutStore]);
  
  // 노드 위치 업데이트 (moveNode와 동일하지만 히스토리 없이)
  const updateNodePosition = useCallback((nodeKey: string, position: { x: number; y: number }) => {
    // editorStore에서 노드 업데이트
    editorStore.updateNode(nodeKey, { position });
    
    // layoutStore의 lastNodePosition 업데이트
    layoutStore.setLastNodePosition(position);
  }, [editorStore, layoutStore]);
  
  // 위치 충돌 감지 (현재 씬 기반)
  const isPositionOccupied = useCallback((x: number, y: number, nodeWidth: number, nodeHeight: number) => {
    const currentScene = getCurrentScene();
    return layoutStore.isPositionOccupied(currentScene, x, y, nodeWidth, nodeHeight);
  }, [layoutStore, getCurrentScene]);
  
  return {
    // 상태 (layoutStore 기반)
    lastNodePosition: layoutStore.lastNodePosition,
    layoutInProgress: layoutStore.layoutInProgress,
    nodeSpacing: layoutStore.nodeSpacing,
    defaultNodeSize: layoutStore.defaultNodeSize,
    
    // 위치 계산
    getNextNodePosition,
    calculateChildNodePosition,
    
    // 노드 위치 관리
    moveNode,
    updateNodePosition,
    
    // 노드 크기 계산
    getNodeDimensions: layoutStore.getNodeDimensions,
    getEstimatedNodeDimensions: layoutStore.getEstimatedNodeDimensions,
    
    // 위치 충돌 감지
    isPositionOccupied,
    
    // 자동 정렬 (editorStore 기반)
    arrangeChildNodesAsTree: editorStore.arrangeChildNodesAsTree,
    arrangeAllNodesAsTree: editorStore.arrangeAllNodesAsTree,
    arrangeNodesWithDagre: editorStore.arrangeNodesWithDagre,
    arrangeAllNodes: editorStore.arrangeAllNodes,
    arrangeSelectedNodeChildren: editorStore.arrangeSelectedNodeChildren,
    arrangeSelectedNodeDescendants: editorStore.arrangeSelectedNodeDescendants,
    
    // 설정 관리
    updateSpacing: layoutStore.updateSpacing,
    updateDefaultNodeSize: layoutStore.updateDefaultNodeSize,
    setLayoutInProgress: layoutStore.setLayoutInProgress,
    
    // 동기화 (테스트/디버깅용)
    syncFromEditor,
    syncToEditor,
    
    // 유틸리티
    resetLayout: layoutStore.resetLayout,
  };
}; 