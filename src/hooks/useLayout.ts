import { useCallback } from "react";
import { useLayoutStore } from "../store/layoutStore";
import { useNodeStore } from "../store/nodeStore";
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
  
  // 위치 계산
  getNextNodePosition: () => { x: number; y: number };
  calculateChildNodePosition: (parentNodeKey: string, choiceKey?: string) => { x: number; y: number };
  
  // 노드 위치 관리
  moveNode: (nodeKey: string, position: { x: number; y: number }) => void;
  updateNodePosition: (nodeKey: string, position: { x: number; y: number }) => void;
  
  // 노드 크기 계산
  getNodeDimensions: (nodeKey: string) => { width: number; height: number };
  getEstimatedNodeDimensions: () => { width: number; height: number };
  
  // 위치 충돌 감지
  isPositionOccupied: (x: number, y: number, nodeWidth: number, nodeHeight: number) => boolean;
  
  // 설정 관리
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
 * layoutStore + nodeStore를 조합하여 사용
 */
export const useLayout = (): UseLayoutReturn => {
  // Store 훅들
  const layoutStore = useLayoutStore();
  const nodeStore = useNodeStore();
  
  // 현재 노드들 가져오기
  const getCurrentScene = useCallback((): Scene => {
    return nodeStore.nodes;
  }, [nodeStore.nodes]);
  
  // 동기화 함수들 (단순화)
  const syncFromEditor = useCallback(() => {
    // 더 이상 editorStore가 없으므로 nodeStore에서 lastNodePosition 사용
    layoutStore.setLastNodePosition(nodeStore.lastNodePosition);
  }, [layoutStore, nodeStore.lastNodePosition]);
  
  const syncToEditor = useCallback(() => {
    // 더 이상 editorStore가 없으므로 빈 함수
  }, []);
  
  // 다음 노드 위치 계산
  const getNextNodePosition = useCallback(() => {
    const currentScene = getCurrentScene();
    return layoutStore.getNextNodePosition(currentScene);
  }, [layoutStore, getCurrentScene]);
  
  // 자식 노드 위치 계산
  const calculateChildNodePosition = useCallback((parentNodeKey: string, choiceKey?: string) => {
    const currentScene = getCurrentScene();
    return layoutStore.calculateChildNodePosition(currentScene, parentNodeKey, choiceKey);
  }, [layoutStore, getCurrentScene]);
  
  // 노드 이동
  const moveNode = useCallback((nodeKey: string, position: { x: number; y: number }) => {
    // nodeStore에서 노드 위치 업데이트
    nodeStore.updateNode(nodeKey, { position });
    
    // layoutStore의 lastNodePosition 업데이트
    layoutStore.setLastNodePosition(position);
    nodeStore.setLastNodePosition(position);
  }, [nodeStore, layoutStore]);
  
  // 노드 위치 업데이트
  const updateNodePosition = useCallback((nodeKey: string, position: { x: number; y: number }) => {
    // nodeStore에서 노드 업데이트
    nodeStore.updateNode(nodeKey, { position });
    
    // layoutStore의 lastNodePosition 업데이트
    layoutStore.setLastNodePosition(position);
    nodeStore.setLastNodePosition(position);
  }, [nodeStore, layoutStore]);
  
  // 위치 충돌 감지
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