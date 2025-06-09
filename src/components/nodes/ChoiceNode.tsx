import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ChoiceDialogue } from '../../types/dialogue';
import { useEditorStore } from '../../store/editorStore';

interface ChoiceNodeData {
  dialogue: ChoiceDialogue;
  nodeKey: string;
}

export default function ChoiceNode({ data, selected }: NodeProps<ChoiceNodeData>) {
  const { dialogue, nodeKey } = data;
  const choiceEntries = Object.entries(dialogue.choices);
  const { disconnectNodes, createAndConnectChoiceNode, canCreateNewNode } = useEditorStore();
  const [hoveredChoice, setHoveredChoice] = useState<string | null>(null);

  // 선택지 연결 제거 핸들러
  const handleDisconnectChoice = (choiceKey: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnectNodes(nodeKey, choiceKey);
  };

  // AC-02: 선택지별 새 노드 생성 및 연결 핸들러
  const handleCreateAndConnectNode = (choiceKey: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      createAndConnectChoiceNode(nodeKey, choiceKey, 'text'); // 기본으로 텍스트 노드 생성
    } catch (error) {
      alert(error instanceof Error ? error.message : '노드 생성에 실패했습니다.');
    }
  };

  return (
    <div className={`
      bg-white border-2 rounded-lg shadow-sm min-w-[250px] max-w-[350px]
      ${selected ? 'border-green-500 shadow-md' : 'border-gray-300 hover:border-gray-400'}
      transition-colors
    `}>
      {/* Header */}
      <div className="bg-green-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-green-700">선택지 노드</span>
          <span className="text-xs text-gray-500">{nodeKey}</span>
        </div>
      </div>

      {/* Content - 실제 텍스트 표시 */}
      <div className="p-3 space-y-3">
        {/* Speaker - 실제 텍스트 */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">화자</span>
          <p className="text-sm font-medium text-gray-900">
            {dialogue.speakerText || '(없음)'}
          </p>
        </div>

        {/* Content Text - 실제 텍스트 */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">질문</span>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
            {dialogue.contentText || '(질문 없음)'}
          </p>
        </div>

        {/* Choices - 실제 텍스트 표시 */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            선택지 ({choiceEntries.length}개)
          </span>
          <div className="space-y-2 mt-1">
            {choiceEntries.map(([choiceKey, choice]) => (
              <div
                key={choiceKey}
                className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs relative"
                onMouseEnter={() => setHoveredChoice(choiceKey)}
                onMouseLeave={() => setHoveredChoice(null)}
              >
                {/* 실제 선택지 텍스트 표시 */}
                <span className="flex-1 truncate">{choice.choiceText || '(선택지 텍스트 없음)'}</span>
                
                {/* AC-02: '+' 버튼 추가 - 연결이 없을 때만 표시 */}
                <div className="ml-2 w-6 flex justify-center">
                  {!choice.nextNodeKey && (
                    <button
                      onClick={handleCreateAndConnectNode(choiceKey)}
                      disabled={!canCreateNewNode()}
                      className={`px-1 py-0.5 text-xs border rounded transition-colors ${
                        canCreateNewNode()
                          ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      }`}
                      title={canCreateNewNode() ? "새 노드 생성 및 연결" : "노드 개수 제한 도달"}
                    >
                      +
                    </button>
                  )}
                </div>
                
                {/* Handle을 각 선택지 항목 내에 배치 */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`choice-${choiceKey}`}
                  className={`
                    !w-4 !h-4 !border-2 !border-white !transition-all !duration-200 !absolute
                    ${choice.nextNodeKey 
                      ? `!cursor-pointer ${hoveredChoice === choiceKey ? '!bg-red-500' : '!bg-green-500'}` 
                      : hoveredChoice === choiceKey 
                        ? '!bg-green-500 !cursor-pointer' 
                        : '!bg-gray-300'
                    }
                  `}
                  style={{ 
                    right: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                  onClick={choice.nextNodeKey ? handleDisconnectChoice(choiceKey) : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Additional info */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {dialogue.speed && <span>속도: {dialogue.speed}</span>}
          {dialogue.shuffle && <span>셔플: 활성</span>}
        </div>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-gray-400 !border-2 !border-white"
        style={{ left: '-20px' }}
      />
    </div>
  );
} 