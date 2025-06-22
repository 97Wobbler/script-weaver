// 레이아웃 엔진 시스템 - 노드 "튀는 문제" 해결
// 3단계 방식: DOM 실측 → 실측값 레이아웃 → 부드러운 이동

import dagre from "dagre";
import type { EditorNodeWrapper } from "../types/dialogue";

// 레이아웃 엔진 인터페이스 (확장성을 위한 추상화)
export interface LayoutEngine {
  name: string;
  version: string;
  layout(nodes: LayoutNode[], edges: LayoutEdge[], options?: LayoutOptions): Promise<LayoutResult>;
}

// 레이아웃 입력 데이터 타입
export interface LayoutNode {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  data?: any;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  data?: any;
}

export interface LayoutOptions {
  direction?: "LR" | "RL" | "TB" | "BT";
  nodeSpacing?: number;
  rankSpacing?: number;
  marginX?: number;
  marginY?: number;
  align?: "UL" | "UR" | "DL" | "DR";
}

export interface LayoutResult {
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  edges: Array<{
    id: string;
    points?: Array<{ x: number; y: number }>;
  }>;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Dagre 기반 레이아웃 엔진 구현
export class DagreLayoutEngine implements LayoutEngine {
  name = "Dagre";
  version = "0.8.5";

  async layout(nodes: LayoutNode[], edges: LayoutEdge[], options: LayoutOptions = {}): Promise<LayoutResult> {
    const { direction = "LR", nodeSpacing = 30, rankSpacing = 80, marginX = 50, marginY = 50, align = "UL" } = options;

    // Dagre 그래프 생성
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: direction,
      nodesep: nodeSpacing,
      ranksep: rankSpacing,
      marginx: marginX,
      marginy: marginY,
      align: align,
    });

    // 노드 추가 (실제 측정된 크기 사용)
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, {
        width: node.width,
        height: node.height,
      });
    });

    // 엣지 추가
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // 레이아웃 계산
    dagre.layout(dagreGraph);

    // 결과 변환
    const layoutNodes = nodes.map((node) => {
      const dagreNode = dagreGraph.node(node.id);
      return {
        id: node.id,
        x: dagreNode.x - dagreNode.width / 2, // Dagre는 중앙 좌표 반환
        y: dagreNode.y - dagreNode.height / 2,
        width: dagreNode.width,
        height: dagreNode.height,
      };
    });

    const layoutEdges = edges.map((edge) => ({
      id: edge.id,
      points: dagreGraph.edge(edge.source, edge.target)?.points,
    }));

    // 바운딩 박스 계산
    const bounds = this.calculateBounds(layoutNodes);

    return {
      nodes: layoutNodes,
      edges: layoutEdges,
      bounds,
    };
  }

  private calculateBounds(nodes: Array<{ x: number; y: number; width: number; height: number }>) {
    if (nodes.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}

// 노드 크기 측정 시스템
export class NodeMeasurementSystem {
  private resizeObserver: ResizeObserver | null = null;
  private measurements = new Map<string, { width: number; height: number }>();
  private callbacks = new Map<string, Array<(size: { width: number; height: number }) => void>>();

  constructor() {
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
    }
  }

  // 노드 크기 측정 시작
  observeNode(nodeId: string, callback?: (size: { width: number; height: number }) => void): void {
    const element = document.querySelector(`.react-flow__node[data-id="${nodeId}"]`) as HTMLElement;

    if (!element) {
      console.warn(`[NodeMeasurement] 노드 엘리먼트를 찾을 수 없음: ${nodeId}`);
      return;
    }

    // 즉시 측정
    const size = this.measureElement(element);
    this.measurements.set(nodeId, size);

    // 콜백 등록
    if (callback) {
      if (!this.callbacks.has(nodeId)) {
        this.callbacks.set(nodeId, []);
      }
      this.callbacks.get(nodeId)!.push(callback);
    }

    // ResizeObserver 등록
    if (this.resizeObserver) {
      this.resizeObserver.observe(element);
    }
  }

  // 노드 크기 측정 중단
  unobserveNode(nodeId: string): void {
    const element = document.querySelector(`.react-flow__node[data-id="${nodeId}"]`) as HTMLElement;

    if (element && this.resizeObserver) {
      this.resizeObserver.unobserve(element);
    }

    this.measurements.delete(nodeId);
    this.callbacks.delete(nodeId);
  }

  // 현재 측정된 크기 반환
  getNodeSize(nodeId: string): { width: number; height: number } | null {
    return this.measurements.get(nodeId) || null;
  }

  // 모든 노드 크기 반환
  getAllSizes(): Map<string, { width: number; height: number }> {
    return new Map(this.measurements);
  }

  // 엘리먼트 크기 측정
  private measureElement(element: HTMLElement): { width: number; height: number } {
    // offsetWidth/Height 사용 (CSS 기반, zoom 무관)
    const width = element.offsetWidth;
    const height = element.offsetHeight;

    // 폴백: getBoundingClientRect
    if (width === 0 || height === 0) {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }

    return { width, height };
  }

  // ResizeObserver 콜백
  private handleResize(entries: ResizeObserverEntry[]): void {
    entries.forEach((entry) => {
      const element = entry.target as HTMLElement;
      const nodeId = element.getAttribute("data-id");

      if (!nodeId) return;

      const size = this.measureElement(element);
      this.measurements.set(nodeId, size);

      // 콜백 실행
      const callbacks = this.callbacks.get(nodeId);
      if (callbacks) {
        callbacks.forEach((callback) => callback(size));
      }
    });
  }

  // 정리
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.measurements.clear();
    this.callbacks.clear();
  }
}

// 다중 그래프 지원을 위한 루트 노드들 수집
export function findAllRootNodes(scene: Record<string, EditorNodeWrapper>): string[] {
  const allNodeKeys = Object.keys(scene);
  const childNodeKeys = new Set<string>();

  // 모든 자식 노드들을 수집
  for (const nodeKey of allNodeKeys) {
    const node = scene[nodeKey];
    if (!node) continue;

    if (node.dialogue.type === "text" && node.dialogue.nextNodeKey) {
      childNodeKeys.add(node.dialogue.nextNodeKey);
    } else if (node.dialogue.type === "choice") {
      Object.values(node.dialogue.choices).forEach((choice) => {
        if (choice.nextNodeKey) {
          childNodeKeys.add(choice.nextNodeKey);
        }
      });
    }
  }

  // 자식이 아닌 노드들이 루트 노드들
  return allNodeKeys.filter((nodeKey) => !childNodeKeys.has(nodeKey));
}

// 다중 그래프를 가상 루트로 연결하여 수집
export function collectMultipleGraphs(
  scene: Record<string, EditorNodeWrapper>,
  options: Omit<NodeCollectionOptions, 'rootNodeId'>
): { nodes: EditorNodeWrapper[]; edges: Array<{ source: string; target: string; id: string }> } {
  const rootNodes = findAllRootNodes(scene);

  if (rootNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  if (rootNodes.length === 1) {
    // 단일 그래프면 기존 로직 사용
    return collectNodes(scene, { ...options, rootNodeId: rootNodes[0] });
  }

  // 다중 그래프 처리: 각 그래프를 개별 수집 후 통합
  const allNodes: EditorNodeWrapper[] = [];
  const allEdges: Array<{ source: string; target: string; id: string }> = [];
  const processedNodes = new Set<string>();

  for (const rootNodeId of rootNodes) {
    const { nodes, edges } = collectNodes(scene, { ...options, rootNodeId });
    
    // 중복 노드 제거
    for (const node of nodes) {
      if (!processedNodes.has(node.nodeKey)) {
        allNodes.push(node);
        processedNodes.add(node.nodeKey);
      }
    }

    // 엣지 추가
    allEdges.push(...edges);
  }

  return { nodes: allNodes, edges: allEdges };
}

// 노드 수집 시스템 (depth 기반)
export interface NodeCollectionOptions {
  rootNodeId: string;
  depth: number | null; // null = 무제한, 1 = 직접 자식만, n = n단계까지
  includeRoot?: boolean;
  anchorNodeId?: string; // 앵커 노드 ID (선택된 노드를 고정)
}

export function collectNodes(
  scene: Record<string, EditorNodeWrapper>,
  options: NodeCollectionOptions
): { nodes: EditorNodeWrapper[]; edges: Array<{ source: string; target: string; id: string }> } {
  const { rootNodeId, depth, includeRoot = true } = options;
  const visited = new Set<string>();
  const collectedNodes: EditorNodeWrapper[] = [];
  const collectedEdges: Array<{ source: string; target: string; id: string }> = [];

  function traverse(nodeId: string, currentDepth: number): void {
    // 순환 참조 방지
    if (visited.has(nodeId)) {
      console.warn(`[NodeCollection] 순환 참조 감지: ${nodeId}`);
      return;
    }

    // 깊이 제한 체크
    if (depth !== null && currentDepth > depth) {
      return;
    }

    const node = scene[nodeId];
    if (!node) {
      console.warn(`[NodeCollection] 노드를 찾을 수 없음: ${nodeId}`);
      return;
    }

    visited.add(nodeId);

    // 루트 노드 포함 여부 체크
    if (currentDepth > 0 || includeRoot) {
      collectedNodes.push(node);
    }

    // 자식 노드 탐색
    if (node.dialogue.type === "text" && node.dialogue.nextNodeKey) {
      const childId = node.dialogue.nextNodeKey;
      collectedEdges.push({
        source: nodeId,
        target: childId,
        id: `${nodeId}-${childId}`,
      });
      traverse(childId, currentDepth + 1);
    } else if (node.dialogue.type === "choice") {
      Object.entries(node.dialogue.choices).forEach(([choiceKey, choice]) => {
        if (choice.nextNodeKey) {
          const childId = choice.nextNodeKey;
          collectedEdges.push({
            source: nodeId,
            target: childId,
            id: `${nodeId}-${childId}-${choiceKey}`,
          });
          traverse(childId, currentDepth + 1);
        }
      });
    }
  }

  traverse(rootNodeId, 0);

  return { nodes: collectedNodes, edges: collectedEdges };
}

// 메인 레이아웃 시스템
export class LayoutSystem {
  private engine: LayoutEngine;
  private measurementSystem: NodeMeasurementSystem;

  constructor(engine: LayoutEngine = new DagreLayoutEngine()) {
    this.engine = engine;
    this.measurementSystem = new NodeMeasurementSystem();
  }

  // 3단계 레이아웃 실행
  async runLayout(
    scene: Record<string, EditorNodeWrapper>,
    options: NodeCollectionOptions & LayoutOptions,
    onPositionUpdate: (nodeId: string, position: { x: number; y: number }) => void
  ): Promise<void> {
    // 1단계: 대상 노드 수집
    const { nodes, edges } = collectNodes(scene, options);

    if (nodes.length === 0) {
      console.warn("[LayoutSystem] 레이아웃할 노드가 없음");
      return;
    }

    // 2단계: DOM 실측 (모든 노드 크기 측정)
    const layoutNodes = await this.measureNodes(nodes);

    // 3단계: 실측값으로 레이아웃 계산
    const layoutResult = await this.engine.layout(
      layoutNodes,
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
      options
    );

    // 4단계: 즉시 위치 업데이트
    this.applyLayoutImmediately(layoutResult, onPositionUpdate, options.anchorNodeId, nodes);
  }

  // 다중 그래프 레이아웃 실행
  async runMultiGraphLayout(
    scene: Record<string, EditorNodeWrapper>,
    options: Omit<NodeCollectionOptions, 'rootNodeId'> & LayoutOptions,
    onPositionUpdate: (nodeId: string, position: { x: number; y: number }) => void
  ): Promise<void> {
    // 1단계: 다중 그래프 수집
    const { nodes, edges } = collectMultipleGraphs(scene, options);

    if (nodes.length === 0) {
      console.warn("[LayoutSystem] 레이아웃할 노드가 없음");
      return;
    }

    // 2단계: DOM 실측 (모든 노드 크기 측정)
    const layoutNodes = await this.measureNodes(nodes);

    // 3단계: 실측값으로 레이아웃 계산
    const layoutResult = await this.engine.layout(
      layoutNodes,
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
      options
    );

    // 4단계: 즉시 위치 업데이트 (앵커 없이)
    this.applyLayoutImmediately(layoutResult, onPositionUpdate, undefined, nodes);
  }

  // 노드 크기 측정
  private async measureNodes(nodes: EditorNodeWrapper[]): Promise<LayoutNode[]> {
    const layoutNodes: LayoutNode[] = [];

    // 모든 노드 측정 시작
    for (const node of nodes) {
      this.measurementSystem.observeNode(node.nodeKey);
    }

    // 측정 완료까지 대기 (최대 500ms)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 측정된 크기로 LayoutNode 생성
    for (const node of nodes) {
      const size = this.measurementSystem.getNodeSize(node.nodeKey);

      layoutNodes.push({
        id: node.nodeKey,
        width: size?.width || 200, // 폴백 크기
        height: size?.height || 120,
        x: node.position.x,
        y: node.position.y,
        data: node,
      });
    }

    return layoutNodes;
  }

  // 즉시 위치 업데이트
  private applyLayoutImmediately(
    layoutResult: LayoutResult,
    onPositionUpdate: (nodeId: string, position: { x: number; y: number }) => void,
    anchorNodeId?: string,
    originalNodes?: EditorNodeWrapper[]
  ): void {
    // 앵커 노드 기준 오프셋 계산 (선택된 노드가 원래 위치에 고정되도록)
    let offsetX = 0;
    let offsetY = 0;

    if (anchorNodeId && originalNodes) {
      // 앵커 노드의 원래 위치 (editorStore에서)
      const originalAnchor = originalNodes.find((n) => n.nodeKey === anchorNodeId);
      // 앵커 노드의 Dagre 계산 결과 위치
      const layoutAnchor = layoutResult.nodes.find((n) => n.id === anchorNodeId);

      if (originalAnchor && layoutAnchor) {
        // 오프셋 = 원래위치 - 새위치 (앵커 노드를 원래 자리에 고정)
        offsetX = originalAnchor.position.x - layoutAnchor.x;
        offsetY = originalAnchor.position.y - layoutAnchor.y;
      }
    }

    // 위치 업데이트 즉시 적용
    layoutResult.nodes.forEach((node) => {
      onPositionUpdate(node.id, {
        x: node.x + offsetX,
        y: node.y + offsetY,
      });
    });
  }

  // 정리
  destroy(): void {
    this.measurementSystem.destroy();
  }
}

// 전역 레이아웃 시스템 인스턴스
export const globalLayoutSystem = new LayoutSystem();
