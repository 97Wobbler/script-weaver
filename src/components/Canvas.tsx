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
    deleteNode,
    selectedNodeKeys,
    toggleNodeSelection,
    clearSelection,
    selectMultipleNodes,
    undo,
    redo,
    canUndo,
    canRedo,
    copySelectedNodes,
    pasteNodes,
    deleteSelectedNodes,
    duplicateNode
  } = useEditorStore();

  // Canvas 영역 참조
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isCanvasFocused, setIsCanvasFocused] = React.useState(false);

  // 드래그 선택을 위한 상태
  const [isDragSelecting, setIsDragSelecting] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = React.useState<{ x: number; y: number } | null>(null);

  // 현재 씬의 노드들을 React Flow 형식으로 변환 (다중 선택 지원)
  const { nodes: reactFlowNodes, edges: reactFlowEdges } = useMemo(() => {
    const currentSceneData = templateData[currentTemplate]?.[currentScene];
    
    if (!currentSceneData) {
      return { nodes: [], edges: [] };
    }
    
    // selectedNodeKeys가 Set이 아닌 경우 안전하게 처리
    const safeSelectedNodeKeys = selectedNodeKeys instanceof Set 
      ? selectedNodeKeys 
      : new Set(Array.isArray(selectedNodeKeys) ? selectedNodeKeys : []);
    
    const nodeWrappers = Object.values(currentSceneData);
    const nodes = nodeWrappers.map(wrapper => {
      // 다중 선택이 있는 경우 selectedNodeKeys만 사용, 없으면 selectedNodeKey 사용
      const isSelected = safeSelectedNodeKeys.size > 0 
        ? safeSelectedNodeKeys.has(wrapper.nodeKey)
        : wrapper.nodeKey === selectedNodeKey;
      return {
        ...convertToReactFlowNode(wrapper, selectedNodeKey),
        selected: isSelected
      };
    });
    const edges = generateEdges(nodeWrappers);
    
    return { nodes, edges };
  }, [templateData, currentTemplate, currentScene, selectedNodeKey, selectedNodeKeys]);

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

  // 노드 클릭 핸들러 (다중 선택 지원)
  const handleNodeClick = useCallback((event: any, node: any) => {
    console.log(`노드 클릭: ${node.id}`);
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+클릭: 다중 선택 토글
      const wasSelected = selectedNodeKeys instanceof Set 
        ? selectedNodeKeys.has(node.id)
        : false;
      
      toggleNodeSelection(node.id);
      
      // 토글 후 노드가 선택된 상태라면 selectedNodeKey로 설정 (PropertyPanel 표시용)
      // 노드가 선택 해제된 상태라면 다른 선택된 노드 중 하나를 selectedNodeKey로 설정
      if (!wasSelected) {
        // 노드가 새로 선택됨
        setSelectedNode(node.id);
      } else {
        // 노드가 선택 해제됨 - 다른 선택된 노드가 있으면 그 중 하나를 selectedNodeKey로 설정
        // toggleNodeSelection 후의 상태를 확인하기 위해 setTimeout 사용
        setTimeout(() => {
          const currentSelectedKeys = useEditorStore.getState().selectedNodeKeys;
          if (currentSelectedKeys instanceof Set && currentSelectedKeys.size > 0) {
            // 첫 번째 선택된 노드를 selectedNodeKey로 설정
            const firstSelectedKey = Array.from(currentSelectedKeys)[0];
            setSelectedNode(firstSelectedKey);
          } else {
            setSelectedNode(undefined);
          }
        }, 0);
      }
    } else {
      // 일반 클릭: 단일 선택
      clearSelection();
      setSelectedNode(node.id);
    }
  }, [setSelectedNode, toggleNodeSelection, clearSelection, selectedNodeKeys]);

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

  // 패널 클릭 핸들러 (배경 클릭 시 모든 선택 해제)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(undefined);
    clearSelection();
  }, [setSelectedNode, clearSelection]);

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

  // 키보드 이벤트 핸들러 (단축키 지원) - 개선된 버전
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 텍스트 입력 요소에 focus가 있는지 확인
    const activeElement = document.activeElement;
    const isInputting = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true'
    );

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? event.metaKey : event.ctrlKey;

    // Undo/Redo는 텍스트 입력 중이 아닐 때 전역적으로 작동
    if (cmdKey && event.key === 'z' && !event.shiftKey) {
      if (!isInputting) {
        event.preventDefault();
        if (canUndo()) {
          undo();
        }
      }
      return;
    }

    if (cmdKey && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
      if (!isInputting) {
        event.preventDefault();
        if (canRedo()) {
          redo();
        }
      }
      return;
    }

    // 전체 선택 (Ctrl+A)는 텍스트 입력 중이 아닐 때 전역적으로 작동
    if (cmdKey && event.key === 'a') {
      if (!isInputting) {
        event.preventDefault();
        const currentSceneData = templateData[currentTemplate]?.[currentScene];
        if (currentSceneData) {
          const allNodeKeys = Object.keys(currentSceneData);
          if (allNodeKeys.length > 0) {
            selectMultipleNodes(allNodeKeys);
            // 다중 선택 시에도 PropertyPanel 표시를 위해 첫 번째 노드를 selectedNodeKey로 설정
            setSelectedNode(allNodeKeys[0]);
          }
        }
      }
      return;
    }

    // 선택 해제 (Escape)는 텍스트 입력 중이 아닐 때 전역적으로 작동
    if (event.key === 'Escape') {
      if (!isInputting) {
        event.preventDefault();
        setSelectedNode(undefined);
        clearSelection();
      }
      return;
    }

    // 노드 삭제 (Delete/Backspace)는 텍스트 입력 중이 아닐 때 전역적으로 작동
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!isInputting) {
        event.preventDefault();
        
        const safeSelectedNodeKeys = selectedNodeKeys instanceof Set 
          ? selectedNodeKeys 
          : new Set(Array.isArray(selectedNodeKeys) ? selectedNodeKeys : []);
        const targetKeys = safeSelectedNodeKeys.size > 0 
          ? Array.from(safeSelectedNodeKeys)
          : selectedNodeKey ? [selectedNodeKey] : [];
        
        if (targetKeys.length === 0) return;
        
        // 현재 씬 데이터 가져오기
        const currentSceneData = templateData[currentTemplate]?.[currentScene];
        if (!currentSceneData) return;
        
        // 삭제할 노드들을 참조하는 다른 노드들 찾기
        const referencingNodes: string[] = [];
        targetKeys.forEach(nodeKey => {
        Object.entries(currentSceneData).forEach(([key, nodeWrapper]) => {
            if (targetKeys.includes(key)) return; // 삭제 대상은 제외
          
          const { dialogue } = nodeWrapper;
          
          // TextDialogue 참조 확인
            if (dialogue.type === 'text' && dialogue.nextNodeKey === nodeKey) {
              referencingNodes.push(`${key} → ${nodeKey} (텍스트 연결)`);
          }
          
          // ChoiceDialogue 참조 확인
          if (dialogue.type === 'choice' && dialogue.choices) {
            Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
                if (choice.nextNodeKey === nodeKey) {
                  referencingNodes.push(`${key} → ${nodeKey} (선택지 "${choice.choiceText || choice.textKeyRef || choiceKey}")`);
              }
            });
          }
          });
        });
        
        // 확인 메시지 구성
        let confirmMessage = `${targetKeys.length}개 노드를 삭제하시겠습니까?\n삭제 대상: ${targetKeys.join(', ')}`;
        if (referencingNodes.length > 0) {
          confirmMessage += `\n\n⚠️ ${referencingNodes.length}개의 연결이 함께 제거됩니다:\n• ${referencingNodes.slice(0, 10).join('\n• ')}`;
          if (referencingNodes.length > 10) {
            confirmMessage += `\n• ... 외 ${referencingNodes.length - 10}개`;
          }
        }
        
        if (confirm(confirmMessage)) {
          deleteSelectedNodes();
        }
      }
      return;
    }

    // 복사는 텍스트 입력 중이 아닐 때 전역적으로 작동
    if (cmdKey && event.key === 'c') {
      if (!isInputting) {
        event.preventDefault();
        const safeSelectedNodeKeys = selectedNodeKeys instanceof Set 
          ? selectedNodeKeys 
          : new Set(Array.isArray(selectedNodeKeys) ? selectedNodeKeys : []);
        const hasSelection = safeSelectedNodeKeys.size > 0 || selectedNodeKey;
        if (hasSelection) {
          copySelectedNodes();
        }
      }
      return;
    }

    // 붙여넣기는 텍스트 입력 중이 아닐 때 전역적으로 작동
    if (cmdKey && event.key === 'v') {
      if (!isInputting) {
        event.preventDefault();
        // 마우스 위치 또는 기본 위치에 붙여넣기
        pasteNodes();
      }
      return;
    }

    // 복제는 텍스트 입력 중이 아닐 때 전역적으로 작동
    if (cmdKey && event.key === 'd') {
      if (!isInputting) {
        event.preventDefault();
        if (selectedNodeKey) {
          duplicateNode(selectedNodeKey);
        }
      }
      return;
    }

    // 나머지 단축키들은 Canvas에 focus가 있거나 텍스트 입력 중이 아닐 때만 작동
    if (!isCanvasFocused || isInputting) return;


  }, [
    isCanvasFocused, selectedNodeKey, selectedNodeKeys, deleteSelectedNodes, setSelectedNode, clearSelection,
    templateData, currentTemplate, currentScene, undo, redo, canUndo, canRedo,
    copySelectedNodes, pasteNodes, duplicateNode, selectMultipleNodes
  ]);

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