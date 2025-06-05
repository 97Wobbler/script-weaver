import { useEditorStore } from '../store/editorStore';
import { DialogueSpeed } from '../types/dialogue';

export default function PropertyPanel() {
  const { 
    selectedNodeKey, 
    templateData, 
    currentTemplate, 
    currentScene,
    updateDialogue,
    addChoice,
    removeChoice
  } = useEditorStore();

  // 현재 선택된 노드 가져오기
  const currentSceneData = templateData[currentTemplate]?.[currentScene];
  const selectedNode = selectedNodeKey ? currentSceneData?.[selectedNodeKey] : undefined;

  // 실시간 속성 업데이트 핸들러들
  const handleSpeakerChange = (value: string) => {
    if (!selectedNodeKey) return;
    updateDialogue(selectedNodeKey, { speakerKey: value });
  };

  const handleTextChange = (value: string) => {
    if (!selectedNodeKey) return;
    updateDialogue(selectedNodeKey, { textKey: value });
  };

  const handleSpeedChange = (value: keyof typeof DialogueSpeed) => {
    if (!selectedNodeKey) return;
    updateDialogue(selectedNodeKey, { speed: value });
  };

  // 선택지 추가
  const handleAddChoice = () => {
    if (!selectedNodeKey || selectedNode?.dialogue.type !== 'choice') return;
    
    const choiceKey = `choice_${Date.now()}`;
    addChoice(selectedNodeKey, choiceKey, {
      textKey: '새 선택지',
      nextNodeKey: ''
    });
  };

  // 선택지 제거
  const handleRemoveChoice = (choiceKey: string) => {
    if (!selectedNodeKey) return;
    removeChoice(selectedNodeKey, choiceKey);
  };

  // 선택지 편집
  const handleChoiceTextChange = (choiceKey: string, textKey: string) => {
    if (!selectedNodeKey || selectedNode?.dialogue.type !== 'choice') return;
    
    const currentChoice = selectedNode.dialogue.choices[choiceKey];
    if (!currentChoice) return;

    addChoice(selectedNodeKey, choiceKey, {
      ...currentChoice,
      textKey
    });
  };

  // 노드가 선택되지 않은 경우
  if (!selectedNode) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">노드를 선택하면<br />속성을 편집할 수 있습니다</p>
          </div>
        </div>
      </aside>
    );
  }

  // 현재 속성값들 (직접 스토어에서 가져와서 실시간 반영)
  const currentSpeaker = selectedNode.dialogue.speakerKey || '';
  const currentText = selectedNode.dialogue.textKey || '';
  const currentSpeed = (selectedNode.dialogue.type === 'text' || selectedNode.dialogue.type === 'choice') 
    ? selectedNode.dialogue.speed || 'NORMAL' 
    : 'NORMAL';

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="space-y-6">
          {/* 노드 정보 헤더 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">노드 속성</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>노드 ID: {selectedNode.nodeKey}</p>
              <p>타입: {selectedNode.dialogue.type === 'text' ? '텍스트' : '선택지'}</p>
            </div>
          </div>

          {/* 기본 속성 편집 - 실시간 반영 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                화자 (Speaker)
              </label>
              <input
                type="text"
                value={currentSpeaker}
                onChange={(e) => handleSpeakerChange(e.target.value)}
                placeholder="화자명을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                텍스트 내용
              </label>
              <textarea
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="대화 내용을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                출력 속도
              </label>
              <select
                value={currentSpeed}
                onChange={(e) => handleSpeedChange(e.target.value as keyof typeof DialogueSpeed)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="SLOW">느림</option>
                <option value="NORMAL">보통</option>
                <option value="FAST">빠름</option>
              </select>
            </div>
          </div>

          {/* 선택지 노드 전용 영역 */}
          {selectedNode.dialogue.type === 'choice' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900">선택지</h4>
                <button
                  onClick={handleAddChoice}
                  className="px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                >
                  + 추가
                </button>
              </div>

              <div className="space-y-3">
                {Object.entries(selectedNode.dialogue.choices).map(([choiceKey, choice]) => (
                  <div key={choiceKey} className="p-3 border border-gray-200 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-700">{choiceKey}</span>
                      <button
                        onClick={() => handleRemoveChoice(choiceKey)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                    <input
                      type="text"
                      value={choice.textKey}
                      onChange={(e) => handleChoiceTextChange(choiceKey, e.target.value)}
                      placeholder="선택지 텍스트"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      다음 노드: {choice.nextNodeKey || '미연결'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 실시간 저장 상태 표시 (저장 버튼 대체) */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>변경사항이 실시간으로 저장됩니다</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
} 