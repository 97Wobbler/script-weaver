import React, { useState } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import type { ChoiceDialogue } from "../../types/dialogue";
import { useEditorStore } from "../../store/editorStore";

interface ChoiceNodeData {
  dialogue: ChoiceDialogue;
  nodeKey: string;
}

export default function ChoiceNode({ data, selected }: NodeProps<ChoiceNodeData>) {
  const { dialogue, nodeKey } = data;
  const choiceEntries = Object.entries(dialogue.choices);
  const { disconnectNodes, createAndConnectChoiceNode, canCreateNewNode, showToast } = useEditorStore();
  const [hoveredChoice, setHoveredChoice] = useState<string | null>(null);

  // 선택지 연결 제거 핸들러
  const handleDisconnectChoice = (choiceKey: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnectNodes(nodeKey, choiceKey);
  };

  // 빈 선택지 핸들 클릭 시 텍스트 노드 생성 및 연결
  const handleCreateTextNode = (choiceKey: string) => (e: React.MouseEvent) => {
    e.stopPropagation();

    const choice = dialogue.choices[choiceKey];
    if (choice?.nextNodeKey) {
      return; // 이미 연결되어 있으면 리턴
    }

    if (!canCreateNewNode()) {
      showToast?.(`노드 개수가 최대 100개 제한에 도달했습니다.`, "warning");
      return;
    }

    try {
      createAndConnectChoiceNode(nodeKey, choiceKey, "text");
    } catch (error) {
      console.error("노드 생성 중 오류:", error);
      showToast?.("노드 생성 중 오류가 발생했습니다.", "warning");
    }
  };

  return (
    <div
      className={`
      bg-white border-2 rounded-lg shadow-sm min-w-[250px] max-w-[350px]
      ${selected ? "border-green-500 shadow-md" : "border-gray-300 hover:border-gray-400"}
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
          <p className="text-sm font-medium text-gray-900">{dialogue.speakerText || "(없음)"}</p>
        </div>

        {/* Content Text - 실제 텍스트 */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">질문</span>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{dialogue.contentText || "(질문 없음)"}</p>
        </div>

        {/* Choices - 실제 텍스트 표시 */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">선택지 ({choiceEntries.length}개)</span>
          <div className="space-y-2 mt-1">
            {choiceEntries.map(([choiceKey, choice]) => (
              <div
                key={choiceKey}
                className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs relative"
                onMouseEnter={() => setHoveredChoice(choiceKey)}
                onMouseLeave={() => setHoveredChoice(null)}>
                {/* 실제 선택지 텍스트 표시 */}
                <span className="flex-1 truncate">{choice.choiceText || "(선택지 텍스트 없음)"}</span>

                {/* Handle을 각 선택지 항목 내에 배치 */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`choice-${choiceKey}`}
                  className={`
                    !w-4 !h-4 !border-2 !border-white !absolute !cursor-pointer
                    ${choice.nextNodeKey ? (hoveredChoice === choiceKey ? "!bg-red-500" : "!bg-green-500") : hoveredChoice === choiceKey ? "!bg-green-500" : "!bg-gray-300"}
                  `}
                  style={{
                    right: "-20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                  onClick={choice.nextNodeKey ? handleDisconnectChoice(choiceKey) : handleCreateTextNode(choiceKey)}
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
      <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-gray-400 !border-2 !border-white" style={{ left: "-20px" }} />
    </div>
  );
}
