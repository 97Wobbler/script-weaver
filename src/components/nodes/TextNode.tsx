import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { TextDialogue } from '../../types/dialogue';
import { useEditorStore } from '../../store/editorStore';

interface TextNodeData {
  dialogue: TextDialogue;
  nodeKey: string;
}

export default function TextNode({ data, selected }: NodeProps<TextNodeData>) {
  const { dialogue, nodeKey } = data;
  const { disconnectNodes } = useEditorStore();
  const [isHovering, setIsHovering] = useState(false);

  // 연결 제거 핸들러
  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnectNodes(nodeKey);
  };

  return (
    <div className={`
      bg-white border-2 rounded-lg shadow-sm min-w-[200px] max-w-[300px]
      ${selected ? 'border-blue-500 shadow-md' : 'border-gray-300 hover:border-gray-400'}
      transition-colors
    `}>
      {/* Header */}
      <div className="bg-blue-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-blue-700">텍스트 노드</span>
          <span className="text-xs text-gray-500">{nodeKey}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Speaker */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">화자</span>
          <p className="text-sm font-medium text-gray-900">
            {dialogue.speakerKey || '(없음)'}
          </p>
        </div>

        {/* Text */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">내용</span>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
            {dialogue.textKey || '(내용 없음)'}
          </p>
        </div>

        {/* Speed indicator */}
        {dialogue.speed && (
          <div className="flex items-center text-xs text-gray-500">
            <span>속도: {dialogue.speed}</span>
          </div>
        )}
      </div>

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-gray-400 !border-2 !border-white"
        style={{ left: '-20px' }}
      />
      
      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="text-output"
        className={`
          !w-4 !h-4 !border-2 !border-white !transition-all !duration-200
          ${dialogue.nextNodeKey 
            ? `!cursor-pointer ${isHovering ? '!bg-red-500' : '!bg-blue-500'}` 
            : isHovering 
              ? '!bg-blue-500 !cursor-pointer' 
              : '!bg-gray-300'
          }
        `}
        style={{ right: '-20px' }}
        onClick={dialogue.nextNodeKey ? handleDisconnect : undefined}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      />
    </div>
  );
} 