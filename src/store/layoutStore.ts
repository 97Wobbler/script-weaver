import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorNodeWrapper, Scene } from "../types/dialogue";

// 레이아웃 관련 상태 타입
export interface LayoutState {
  // 마지막 노드 위치 (새 노드 생성 시 참조)
  lastNodePosition: { x: number; y: number };
  
  // 레이아웃 진행 상태 (비동기 정렬 작업 중 중복 방지)
  layoutInProgress: boolean;
  
  // 레이아웃 설정
  nodeSpacing: {
    horizontal: number; // 노드 간 가로 간격
    vertical: number;   // 노드 간 세로 간격
    levelSpacing: number; // 레벨 간 간격 (트리 정렬 시)
  };
  
  // 기본 노드 크기 (위치 계산 시 사용)
  defaultNodeSize: {
    width: number;
    height: number;
  };
}

// 레이아웃 관련 액션 타입
export interface LayoutActions {
  // 기본 상태 관리
  setLastNodePosition: (position: { x: number; y: number }) => void;
  setLayoutInProgress: (inProgress: boolean) => void;
  
  // 위치 계산 유틸리티
  getNextNodePosition: (currentScene: Scene) => { x: number; y: number };
  calculateChildNodePosition: (
    currentScene: Scene, 
    parentNodeKey: string, 
    choiceKey?: string
  ) => { x: number; y: number };
  
  // 노드 크기 계산
  getNodeDimensions: (nodeKey: string) => { width: number; height: number };
  getEstimatedNodeDimensions: () => { width: number; height: number };
  
  // 위치 충돌 감지
  isPositionOccupied: (
    scene: Scene,
    x: number,
    y: number,
    nodeWidth: number,
    nodeHeight: number
  ) => boolean;
  
  // 설정 관리
  updateSpacing: (spacing: Partial<LayoutState['nodeSpacing']>) => void;
  updateDefaultNodeSize: (size: Partial<LayoutState['defaultNodeSize']>) => void;
  
  // 초기화
  resetLayout: () => void;
}

// 전체 LayoutStore 타입
export type LayoutStore = LayoutState & LayoutActions;

// 초기 상태
const initialState: LayoutState = {
  lastNodePosition: { x: 250, y: 100 },
  layoutInProgress: false,
  nodeSpacing: {
    horizontal: 50,   // 노드 간 가로 간격
    vertical: 30,     // 노드 간 세로 간격
    levelSpacing: 320 // 레벨 간 간격 (트리 정렬 시)
  },
  defaultNodeSize: {
    width: 200,
    height: 120
  }
};

// LayoutStore 생성
export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 기본 상태 관리
      setLastNodePosition: (position) => {
        set({ lastNodePosition: position });
      },
      
      setLayoutInProgress: (inProgress) => {
        set({ layoutInProgress: inProgress });
      },
      
      // 다음 노드 위치 계산 (editorStore의 getNextNodePosition 로직)
      getNextNodePosition: (currentScene) => {
        const state = get();
        
        if (!currentScene || Object.keys(currentScene).length === 0) {
          return { x: 100, y: 100 };
        }
        
        const allNodes = Object.values(currentScene);
        const { horizontal: SPACING_X, vertical: SPACING_Y } = state.nodeSpacing;
        const { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT } = state.defaultNodeSize;
        
        // 새 위치 후보 계산 (이전 노드 기준)
        let candidateX = state.lastNodePosition.x + DEFAULT_NODE_WIDTH + SPACING_X;
        let candidateY = state.lastNodePosition.y;
        
        // 새 노드의 예상 크기
        const estimatedNewNodeDimensions = { 
          width: DEFAULT_NODE_WIDTH, 
          height: DEFAULT_NODE_HEIGHT 
        };
        
        // 겹치지 않는 위치 찾기
        let attempts = 0;
        const maxAttempts = 20;
        
        while (
          state.isPositionOccupied(
            currentScene,
            candidateX,
            candidateY,
            estimatedNewNodeDimensions.width,
            estimatedNewNodeDimensions.height
          ) && attempts < maxAttempts
        ) {
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
      
      // 자식 노드 위치 계산 (editorStore의 calculateChildNodePosition 로직)
      calculateChildNodePosition: (currentScene, parentNodeKey, choiceKey) => {
        const state = get();
        
        if (!currentScene) {
          return { x: 100, y: 100 };
        }
        
        const parentNode = currentScene[parentNodeKey];
        if (!parentNode) {
          return { x: 100, y: 100 };
        }
        
        const parentDimensions = state.getNodeDimensions(parentNodeKey);
        const parentPosition = parentNode.position;
        const { horizontal: HORIZONTAL_SPACING, vertical: VERTICAL_SPACING } = state.nodeSpacing;
        
        // 새 노드 X 위치: 부모 노드 우측 끝 + 간격
        const newNodeX = parentPosition.x + parentDimensions.width + HORIZONTAL_SPACING;
        
        if (parentNode.dialogue.type === "text" || !choiceKey) {
          // TextNode의 경우 (단일 자식): 부모 중앙과 자식 중앙의 Y 좌표가 동일하도록 배치
          const parentCenterY = parentPosition.y + parentDimensions.height / 2;
          const newNodeDimensions = state.getEstimatedNodeDimensions();
          const newNodeY = parentCenterY - newNodeDimensions.height / 2;
          
          return { x: newNodeX, y: newNodeY };
        } else {
          // ChoiceNode의 경우 (다중 자식): 선택지별 개별 배치
          if (parentNode.dialogue.type !== "choice") {
            return { x: newNodeX, y: parentPosition.y };
          }
          
          const choiceDialogue = parentNode.dialogue as any; // ChoiceDialogue 타입
          const choices = Object.keys(choiceDialogue.choices);
          const choiceIndex = choices.indexOf(choiceKey);
          
          if (choiceIndex === -1) {
            return { x: newNodeX, y: parentPosition.y };
          }
          
          // 이미 연결된 자식 노드들의 위치 확인
          const connectedChildren = choices
            .map((key) => choiceDialogue.choices[key].nextNodeKey)
            .filter(Boolean)
            .map((nodeKey: string) => currentScene[nodeKey])
            .filter(Boolean);
          
          if (connectedChildren.length === 0) {
            // 첫 번째 자식인 경우: 부모 중앙과 자식 중앙의 Y 좌표가 동일하도록 배치
            const parentCenterY = parentPosition.y + parentDimensions.height / 2;
            const newNodeDimensions = state.getEstimatedNodeDimensions();
            const newNodeY = parentCenterY - newNodeDimensions.height / 2;
            
            return { x: newNodeX, y: newNodeY };
          } else {
            // 기존 자식들이 있는 경우: 가장 아래 자식 아래에 배치
            const existingYPositions = connectedChildren.map((child) => child!.position.y);
            const lowestY = Math.max(...existingYPositions);
            const newNodeY = lowestY + state.defaultNodeSize.height + VERTICAL_SPACING;
            
            return { x: newNodeX, y: newNodeY };
          }
        }
      },
      
      // 노드 크기 계산 (DOM 기반)
      getNodeDimensions: (nodeKey) => {
        const state = get();
        
        // React Flow는 노드를 .react-flow__node 클래스로 감싸고, data-id 속성을 설정
        const nodeElement = document.querySelector(`.react-flow__node[data-id="${nodeKey}"]`) as HTMLElement;
        
        if (nodeElement) {
          // offsetWidth/Height 사용 (실제 CSS 크기 - 확대/축소 영향 안받음)
          const offsetDimensions = {
            width: nodeElement.offsetWidth,
            height: nodeElement.offsetHeight,
          };
          
          if (offsetDimensions.width > 0 && offsetDimensions.height > 0) {
            return offsetDimensions;
          }
          
          // 폴백: boundingClientRect
          const rect = nodeElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { width: rect.width, height: rect.height };
          }
        }
        
        // DOM에서 측정할 수 없는 경우 기본값 반환
        return state.defaultNodeSize;
      },
      
      // 예상 노드 크기 계산
      getEstimatedNodeDimensions: () => {
        const state = get();
        // CSS 기반 예상 크기 (TextNode CSS: min-w-[200px] max-w-[300px])
        return { width: 300, height: 120 };
      },
      
      // 위치 충돌 감지
      isPositionOccupied: (scene, x, y, newNodeWidth, newNodeHeight) => {
        const state = get();
        const allNodes = Object.values(scene);
        const { horizontal: SPACING_X, vertical: SPACING_Y } = state.nodeSpacing;
        
        return allNodes.some((node) => {
          const existingDimensions = state.getNodeDimensions(node.nodeKey) || state.defaultNodeSize;
          
          // AABB (Axis-Aligned Bounding Box) 충돌 감지
          const overlap = !(
            x + newNodeWidth + SPACING_X < node.position.x ||
            x > node.position.x + existingDimensions.width + SPACING_X ||
            y + newNodeHeight + SPACING_Y < node.position.y ||
            y > node.position.y + existingDimensions.height + SPACING_Y
          );
          
          return overlap;
        });
      },
      
      // 설정 관리
      updateSpacing: (spacing) => {
        set((state) => ({
          nodeSpacing: { ...state.nodeSpacing, ...spacing }
        }));
      },
      
      updateDefaultNodeSize: (size) => {
        set((state) => ({
          defaultNodeSize: { ...state.defaultNodeSize, ...size }
        }));
      },
      
      // 초기화
      resetLayout: () => {
        set(initialState);
      },
    }),
    {
      name: "layout-store", // localStorage 키
      partialize: (state) => ({
        lastNodePosition: state.lastNodePosition,
        nodeSpacing: state.nodeSpacing,
        defaultNodeSize: state.defaultNodeSize,
        // layoutInProgress는 세션 상태이므로 저장하지 않음
      }),
    }
  )
); 