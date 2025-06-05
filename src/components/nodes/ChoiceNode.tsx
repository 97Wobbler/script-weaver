import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { ChoiceDialogue } from '../../types/dialogue';

interface ChoiceNodeData {
  dialogue: ChoiceDialogue;
  nodeKey: string;
}

export default function ChoiceNode({ data, selected }: NodeProps<ChoiceNodeData>) {
  const { dialogue, nodeKey } = data;
  const choiceEntries = Object.entries(dialogue.choices);

  return (
    <div className={`
      bg-white border-2 rounded-lg shadow-sm min-w-[250px] max-w-[350px]
      ${selected ? 'border-green-500 shadow-md' : 'border-gray-300'}
      hover:border-gray-400 transition-colors
    `}>
      {/* Header */}
      <div className="bg-green-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-green-700">선택지 노드</span>
          <span className="text-xs text-gray-500">{nodeKey}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Speaker */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">화자</span>
          <p className="text-sm font-medium text-gray-900">
            {dialogue.speakerKey || '(없음)'}
          </p>
        </div>

        {/* Text */}
        {dialogue.textKey && (
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">내용</span>
            <p className="text-sm text-gray-700 leading-relaxed">
              {dialogue.textKey}
            </p>
          </div>
        )}

        {/* Choices */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            선택지 ({choiceEntries.length}개)
          </span>
          <div className="space-y-2 mt-1">
            {choiceEntries.map(([choiceKey, choice], index) => (
              <div
                key={choiceKey}
                className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs relative"
              >
                <span className="flex-1 truncate">{choice.textKey}</span>
                <button className="ml-2 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
                  +
                </button>
                {/* Individual choice handle */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`choice-${choiceKey}`}
                  style={{ 
                    top: `${70 + (index * 32) + 24}px`,
                    right: '-6px',
                    background: '#10b981',
                    width: '12px',
                    height: '12px'
                  }}
                  className="border-2 border-white"
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
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  );
} 