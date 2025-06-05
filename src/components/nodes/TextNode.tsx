import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { TextDialogue } from '../../types/dialogue';

interface TextNodeData {
  dialogue: TextDialogue;
  nodeKey: string;
}

export default function TextNode({ data, selected }: NodeProps<TextNodeData>) {
  const { dialogue, nodeKey } = data;

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
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
    </div>
  );
} 