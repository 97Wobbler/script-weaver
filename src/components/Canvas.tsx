import React, { useMemo, useCallback, useRef, useEffect } from 'react';
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
  type Connection
} from 'reactflow';
import 'reactflow/dist/style.css';
import TextNode from './nodes/TextNode';
import ChoiceNode from './nodes/ChoiceNode';
import { useEditorStore } from '../store/editorStore';
import type { EditorNodeWrapper } from '../types/dialogue';

// React Flow nodeTypes는 컴포넌트 외부에서 정의하여 재생성 방지
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
        sourceHandle: 'text-output', // 명시적 source handle ID
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
            sourceHandle: `choice-${choiceKey}`, // ChoiceNode에서 정의한 핸들 ID와 일치
            style: { stroke: '#22c55e', strokeWidth: 2 },
            label: (choice.choiceText || choice.textKeyRef || choiceKey).length > 20 
              ? `${(choice.choiceText || choice.textKeyRef || choiceKey).substring(0, 20)}...` 
              : (choice.choiceText || choice.textKeyRef || choiceKey),
            labelStyle: { fontSize: 10, fill: '#22c55e' },
            labelBgStyle: { fill: '#f0fdf4', fillOpacity: 0.8 },
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
    selectedNodeKey,
    connectNodes,
    deleteNode
  } = useEditorStore();

  // Canvas 영역 참조
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isCanvasFocused, setIsCanvasFocused] = React.useState(false);

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
  const handleNodeClick = useCallback((_event: any, node: any) => {
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
  const handleNodeDragStop = useCallback((_event: any, node: any) => {
    console.log(`노드 드래그 완료: ${node.id}`, node.position);
    moveNode(node.id, node.position);
  }, [moveNode]);

  // 패널 클릭 핸들러 (배경 클릭 시 선택 해제)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(undefined);
  }, [setSelectedNode]);

  // React Flow 드래그 연결 핸들러
  const handleConnect = useCallback((connection: Connection) => {
    console.log('새 연결:', connection);
    
    if (!connection.source || !connection.target) return;
    
    // 기존 노드와 연결
    if (connection.sourceHandle?.startsWith('choice-')) {
      // 선택지 연결
      const choiceKey = connection.sourceHandle.replace('choice-', '');
      connectNodes(connection.source, connection.target, choiceKey);
    } else if (connection.sourceHandle === 'text-output') {
      // 텍스트 노드 연결
      connectNodes(connection.source, connection.target);
    } else {
      // 기본 처리 (sourceHandle이 없는 경우)
      connectNodes(connection.source, connection.target);
    }
  }, [connectNodes]);

  // 키보드 이벤트 핸들러 (노드 삭제) - 개선된 버전
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Canvas에 focus가 없거나 텍스트 입력 중이면 무시
    if (!isCanvasFocused) return;
    
    // 텍스트 입력 요소에 focus가 있는지 확인
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true'
    )) {
      return; // 텍스트 입력 중이면 노드 삭제 동작 안 함
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeKey) {
      event.preventDefault();
      
      // 현재 씬 데이터 가져오기
      const currentSceneData = templateData[currentTemplate]?.[currentScene];
      if (!currentSceneData) return;
      
      // 삭제할 노드를 참조하는 다른 노드들 찾기
      const referencingNodes: string[] = [];
      Object.entries(currentSceneData).forEach(([key, nodeWrapper]) => {
        if (key === selectedNodeKey) return; // 자기 자신은 제외
        
        const { dialogue } = nodeWrapper;
        
        // TextDialogue 참조 확인
        if (dialogue.type === 'text' && dialogue.nextNodeKey === selectedNodeKey) {
          referencingNodes.push(`${key} (텍스트 노드)`);
        }
        
        // ChoiceDialogue 참조 확인
        if (dialogue.type === 'choice' && dialogue.choices) {
          Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
            if (choice.nextNodeKey === selectedNodeKey) {
              referencingNodes.push(`${key} (선택지 "${choice.choiceText || choice.textKeyRef || choiceKey}")`);
            }
          });
        }
      });
      
      // 확인 메시지 구성
      let confirmMessage = `노드 "${selectedNodeKey}"를 삭제하시겠습니까?`;
      if (referencingNodes.length > 0) {
        confirmMessage += `\n\n⚠️ 이 노드를 참조하는 ${referencingNodes.length}개의 연결이 함께 제거됩니다:\n• ${referencingNodes.join('\n• ')}`;
      }
      
      if (confirm(confirmMessage)) {
        deleteNode(selectedNodeKey);
        setSelectedNode(undefined);
      }
    }
  }, [isCanvasFocused, selectedNodeKey, deleteNode, setSelectedNode, templateData, currentTemplate, currentScene]);

  // Canvas focus 관리
  const handleCanvasMouseDown = () => {
    if (canvasRef.current) {
      canvasRef.current.focus();
      setIsCanvasFocused(true);
    }
  };

  const handleCanvasFocus = () => {
    setIsCanvasFocused(true);
  };

  const handleCanvasBlur = () => {
    setIsCanvasFocused(false);
  };

  // 키보드 이벤트 리스너 등록
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div 
      ref={canvasRef}
      className="h-full w-full outline-none" 
      tabIndex={0}
      onMouseDown={handleCanvasMouseDown}
      onFocus={handleCanvasFocus}
      onBlur={handleCanvasBlur}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        onConnect={handleConnect}
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