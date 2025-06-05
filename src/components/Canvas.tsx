import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import TextNode from './nodes/TextNode';
import ChoiceNode from './nodes/ChoiceNode';
import { useEditorStore } from '../store/editorStore';
import type { EditorNodeWrapper } from '../types/dialogue';

const nodeTypes = {
  textNode: TextNode,
  choiceNode: ChoiceNode,
};

// EditorNodeWrapper를 React Flow Node로 변환
const convertToReactFlowNode = (wrapper: EditorNodeWrapper, selectedKey?: string): Node => {
  const nodeType = wrapper.dialogue.type === 'text' ? 'textNode' : 'choiceNode';
  
  return {
    id: wrapper.nodeKey,
    type: nodeType,
    position: wrapper.position,
    selected: wrapper.nodeKey === selectedKey, // 선택 상태 설정
    data: {
      nodeKey: wrapper.nodeKey,
      dialogue: wrapper.dialogue,
    },
  };
};

// 연결선 생성 (nextNodeKey 기반)
const generateEdges = (nodeWrappers: EditorNodeWrapper[]): Edge[] => {
  const edges: Edge[] = [];
  
  nodeWrappers.forEach((wrapper) => {
    const { dialogue, nodeKey } = wrapper;
    
    if (dialogue.type === 'text' && dialogue.nextNodeKey) {
      // 텍스트 노드의 연결
      edges.push({
        id: `${nodeKey}-to-${dialogue.nextNodeKey}`,
        source: nodeKey,
        target: dialogue.nextNodeKey,
        style: { stroke: '#6b7280', strokeWidth: 2 },
      });
    } else if (dialogue.type === 'choice') {
      // 선택지 노드의 연결들
      Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
        if (choice.nextNodeKey) {
          edges.push({
            id: `${nodeKey}-${choiceKey}-to-${choice.nextNodeKey}`,
            source: nodeKey,
            target: choice.nextNodeKey,
            sourceHandle: choiceKey, // 선택지별 개별 연결점
            style: { stroke: '#22c55e', strokeWidth: 2 },
          });
        }
      });
    }
  });
  
  return edges;
};

export default function Canvas() {
  const { 
    templateData, 
    currentTemplate, 
    currentScene, 
    moveNode,
    setSelectedNode,
    selectedNodeKey
  } = useEditorStore();

  // 현재 씬의 노드들을 React Flow 형식으로 변환
  const { nodes: reactFlowNodes, edges: reactFlowEdges } = useMemo(() => {
    const currentSceneData = templateData[currentTemplate]?.[currentScene];
    
    if (!currentSceneData) {
      return { nodes: [], edges: [] };
    }
    
    const nodeWrappers = Object.values(currentSceneData);
    const nodes = nodeWrappers.map(wrapper => convertToReactFlowNode(wrapper, selectedNodeKey));
    const edges = generateEdges(nodeWrappers);
    
    return { nodes, edges };
  }, [templateData, currentTemplate, currentScene, selectedNodeKey]);

  const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  // 노드 변경 핸들러 (위치 이동 시 스토어 업데이트)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (change.type === 'position' && change.position) {
        // 드래그 중이 아닐 때만 스토어 업데이트 (드래그 완료시)
        if (!change.dragging) {
          console.log(`노드 위치 저장: ${change.id}`, change.position);
          moveNode(change.id, change.position);
        }
      }
      // select 이벤트는 onNodeClick에서 처리하도록 제거
    });
    
    onNodesChange(changes);
  }, [moveNode, onNodesChange]);

  // 노드 클릭 핸들러 (더 직접적인 선택 처리)
  const handleNodeClick = useCallback((event: any, node: any) => {
    console.log(`노드 클릭: ${node.id}`);
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  // React Flow nodes와 edges를 실시간으로 동기화
  React.useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);

  React.useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  // 노드 드래그 완료 핸들러 (더 확실한 위치 저장)
  const handleNodeDragStop = useCallback((event: any, node: any) => {
    console.log(`노드 드래그 완료: ${node.id}`, node.position);
    moveNode(node.id, node.position);
  }, [moveNode]);

  // 패널 클릭 핸들러 (배경 클릭 시 선택 해제)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(undefined);
  }, [setSelectedNode]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        multiSelectionKeyCode={null}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'textNode':
                return '#e3f2fd';
              case 'choiceNode':
                return '#e8f5e8';
              default:
                return '#f5f5f5';
            }
          }}
          className="bg-white border border-gray-200 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
} 