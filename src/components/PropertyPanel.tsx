import React, { useState, useEffect } from "react";
import { useEditorStore } from "../store/editorStore";
import { useLocalizationStore } from "../store/localizationStore";
import { DialogueSpeed } from "../types/dialogue";

// 키 편집 상태 타입
interface KeyEditState {
  isEditing: boolean;
  keyType: "speaker" | "text" | "choice";
  originalKey: string;
  originalText: string;
  newKey: string; // 키값 편집을 위해 추가
  newText: string;
  usageNodes: string[];
  choiceKey?: string; // 선택지 키 편집 시 사용
}

// 로컬 텍스트 상태 (키 생성 전)
interface LocalTextState {
  speakerText: string;
  contentText: string;
  choiceTexts: Record<string, string>;
}

interface PropertyPanelProps {
  showToast?: (message: string, type?: "success" | "info" | "warning") => void;
}

export default function PropertyPanel({ showToast }: PropertyPanelProps = {}) {
  const {
    selectedNodeKey,
    selectedNodeKeys,
    templateData,
    currentTemplate,
    currentScene,
    updateNodeText,
    updateChoiceText,
    addChoice,
    removeChoice,
    updateDialogue,
    updateNodeKeyReference,
    updateChoiceKeyReference,
    setSelectedNode,
    pushToHistoryWithTextEdit,
  } = useEditorStore();

  const { getText, findNodesUsingKey, getKeyUsageCount, updateKeyText } = useLocalizationStore();

  const [keyEditState, setKeyEditState] = useState<KeyEditState | null>(null);
  const [localTextState, setLocalTextState] = useState<LocalTextState>({
    speakerText: "",
    contentText: "",
    choiceTexts: {},
  });

  // IME 상태 추적 (한국어 입력 문제 해결용)
  const [isComposing, setIsComposing] = useState({
    speaker: false,
    content: false,
    choices: {} as Record<string, boolean>,
  });

  // 키 편집 모달 ESC 키 처리
  useEffect(() => {
    if (!keyEditState) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setKeyEditState(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [keyEditState]);

  // 전역 토스트 사용 (더 이상 로컬 토스트 상태 불필요)

  // 현재 선택된 노드 가져오기
  const currentSceneData = templateData[currentTemplate]?.[currentScene];
  const selectedNode = selectedNodeKey ? currentSceneData?.[selectedNodeKey] : undefined;

  // 다중 선택 상태 확인
  const safeSelectedNodeKeys = selectedNodeKeys instanceof Set ? selectedNodeKeys : new Set(Array.isArray(selectedNodeKeys) ? selectedNodeKeys : []);
  const isMultipleSelection = safeSelectedNodeKeys.size > 1;

  // 선택된 노드가 변경될 때 로컬 상태 초기화
  useEffect(() => {
    if (selectedNode) {
      const newLocalState = {
        speakerText: selectedNode.dialogue.speakerText || "",
        contentText: selectedNode.dialogue.contentText || "",
        choiceTexts:
          selectedNode.dialogue.type === "choice" ? Object.fromEntries(Object.entries(selectedNode.dialogue.choices).map(([key, choice]) => [key, choice.choiceText])) : {},
      };

      setLocalTextState(newLocalState);
    } else {
      setLocalTextState({
        speakerText: "",
        contentText: "",
        choiceTexts: {},
      });
    }
  }, [selectedNode]);

  // 로컬 상태 변경 핸들러들 (키 생성 없음)
  const handleLocalSpeakerChange = (value: string) => {
    setLocalTextState((prev) => ({ ...prev, speakerText: value }));
  };

  const handleLocalContentTextChange = (value: string) => {
    setLocalTextState((prev) => ({ ...prev, contentText: value }));
  };

  const handleLocalChoiceTextChange = (choiceKey: string, choiceText: string) => {
    setLocalTextState((prev) => ({
      ...prev,
      choiceTexts: { ...prev.choiceTexts, [choiceKey]: choiceText },
    }));
  };

  // 완료 시점에서 키 처리 (onBlur, onEnter 등) - 중복 텍스트 자동 처리
  const commitSpeakerText = () => {
    if (!selectedNodeKey || isComposing.speaker) return;
    const trimmedText = localTextState.speakerText.trim();

    const currentNode = selectedNode;
    const currentSpeakerKey = currentNode?.dialogue.speakerKeyRef;
    const currentSpeakerText = currentNode?.dialogue.speakerText || "";

    // 변경사항이 없으면 히스토리 추가하지 않음
    if (trimmedText === currentSpeakerText) return;

    // 중복 텍스트 체크 (기존 키와 다른 키에 동일한 텍스트가 있는지)
    if (trimmedText) {
      const existingKey = useLocalizationStore.getState().findExistingKey(trimmedText);

      if (existingKey && existingKey !== currentSpeakerKey) {
        // 기존 키 자동 사용을 위해 토스트 메시지 표시
        showToast?.(`기존 키 "${existingKey}"를 자동으로 사용했습니다`, "info");
      }
    }

    // 모든 경우에 updateNodeText 호출 (중복 키 처리 포함)
    updateNodeText(selectedNodeKey, trimmedText, undefined);

    // 히스토리 추가
    pushToHistoryWithTextEdit(`화자 텍스트 수정: "${trimmedText}"`);
  };

  const commitContentText = () => {
    if (!selectedNodeKey || isComposing.content) return;
    const trimmedText = localTextState.contentText.trim();

    const currentNode = selectedNode;
    const currentTextKey = currentNode?.dialogue.textKeyRef;
    const currentContentText = currentNode?.dialogue.contentText || "";

    // 변경사항이 없으면 히스토리 추가하지 않음
    if (trimmedText === currentContentText) return;

    // 중복 텍스트 체크 (기존 키와 다른 키에 동일한 텍스트가 있는지)
    if (trimmedText) {
      const existingKey = useLocalizationStore.getState().findExistingKey(trimmedText);
      if (existingKey && existingKey !== currentTextKey) {
        // 기존 키 자동 사용을 위해 토스트 메시지 표시
        showToast?.(`기존 키 "${existingKey}"를 자동으로 사용했습니다`, "info");
      }
    }

    // 모든 경우에 updateNodeText 호출 (중복 키 처리 포함)
    updateNodeText(selectedNodeKey, undefined, trimmedText);

    // 히스토리 추가
    pushToHistoryWithTextEdit(`대사 텍스트 수정: "${trimmedText}"`);
  };

  const commitChoiceText = (choiceKey: string) => {
    if (!selectedNodeKey || isComposing.choices[choiceKey]) return;
    const trimmedText = localTextState.choiceTexts[choiceKey]?.trim() || "";

    const currentNode = selectedNode;
    const currentChoice = currentNode?.dialogue.type === "choice" ? currentNode.dialogue.choices[choiceKey] : null;
    const currentChoiceKey = currentChoice?.textKeyRef;
    const currentChoiceText = currentChoice?.choiceText || "";

    // 변경사항이 없으면 히스토리 추가하지 않음
    if (trimmedText === currentChoiceText) return;

    // 중복 텍스트 체크 (기존 키와 다른 키에 동일한 텍스트가 있는지)
    if (trimmedText) {
      const existingKey = useLocalizationStore.getState().findExistingKey(trimmedText);
      if (existingKey && existingKey !== currentChoiceKey) {
        // 기존 키 자동 사용을 위해 토스트 메시지 표시
        showToast?.(`기존 키 "${existingKey}"를 자동으로 사용했습니다`, "info");
      }
    }

    // 모든 경우에 updateChoiceText 호출 (중복 키 처리 포함)
    updateChoiceText(selectedNodeKey, choiceKey, trimmedText);

    // 히스토리 추가 (한 번만)
    pushToHistoryWithTextEdit(`선택지 텍스트 수정: "${trimmedText}"`);
  };

  // IME 이벤트 핸들러들
  const handleSpeakerCompositionStart = () => {
    setIsComposing((prev) => ({ ...prev, speaker: true }));
  };

  const handleSpeakerCompositionEnd = () => {
    setIsComposing((prev) => ({ ...prev, speaker: false }));
  };

  const handleContentCompositionStart = () => {
    setIsComposing((prev) => ({ ...prev, content: true }));
  };

  const handleContentCompositionEnd = () => {
    setIsComposing((prev) => ({ ...prev, content: false }));
  };

  const handleChoiceCompositionStart = (choiceKey: string) => () => {
    setIsComposing((prev) => ({
      ...prev,
      choices: { ...prev.choices, [choiceKey]: true },
    }));
  };

  const handleChoiceCompositionEnd = (choiceKey: string) => () => {
    setIsComposing((prev) => ({
      ...prev,
      choices: { ...prev.choices, [choiceKey]: false },
    }));
  };

  // Enter 키 처리 핸들러들
  const handleSpeakerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isComposing.speaker) {
      e.preventDefault();
      commitSpeakerText();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing.content) {
      e.preventDefault();
      commitContentText();
      (e.target as HTMLTextAreaElement).blur();
    }
  };

  const handleChoiceKeyDown = (choiceKey: string) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isComposing.choices[choiceKey]) {
      e.preventDefault();
      commitChoiceText(choiceKey);
      (e.target as HTMLInputElement).blur();
    }
  };

  // 기존 핸들러들 제거 (더 이상 사용하지 않음)
  const handleSpeedChange = (value: keyof typeof DialogueSpeed) => {
    if (!selectedNodeKey) return;
    updateDialogue(selectedNodeKey, { speed: value });
  };

  // 선택지 추가 (실제 텍스트 기반)
  const handleAddChoice = () => {
    if (!selectedNodeKey || selectedNode?.dialogue.type !== "choice") return;

    const choiceKey = `choice_${Date.now()}`;
    addChoice(selectedNodeKey, choiceKey, "", "");
  };

  // 선택지 제거
  const handleRemoveChoice = (choiceKey: string) => {
    if (!selectedNodeKey || !selectedNode || selectedNode.dialogue.type !== "choice") return;

    // 선택지의 키를 LocalizationStore에서도 삭제
    const choice = selectedNode.dialogue.choices[choiceKey];
    if (choice && choice.textKeyRef) {
      const localizationStore = useLocalizationStore.getState();
      localizationStore.deleteKey(choice.textKeyRef);
    }

    removeChoice(selectedNodeKey, choiceKey);
  };

  // 직접 전체 템플릿 데이터에서 키를 사용하는 노드들을 찾는 함수
  const findDirectUsageNodes = (key: string): string[] => {
    const nodes: string[] = [];

    // 전체 템플릿 데이터에서 검색
    Object.entries(templateData).forEach(([templateKey, template]) => {
      Object.entries(template).forEach(([sceneKey, scene]) => {
        Object.entries(scene).forEach(([nodeKey, nodeWrapper]) => {
          const dialogue = nodeWrapper.dialogue;

          // 화자 키 검증
          if (dialogue.speakerKeyRef === key) {
            nodes.push(`${templateKey}/${sceneKey}/${nodeKey} (화자)`);
          }

          // 텍스트 키 검증
          if (dialogue.textKeyRef === key) {
            nodes.push(`${templateKey}/${sceneKey}/${nodeKey} (내용)`);
          }

          // 선택지 키 검증
          if (dialogue.type === "choice" && dialogue.choices) {
            Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
              if (choice.textKeyRef === key) {
                nodes.push(`${templateKey}/${sceneKey}/${nodeKey} (선택지: ${choiceKey})`);
              }
            });
          }
        });
      });
    });

    return nodes;
  };

  // 키 편집 시작
  const startKeyEdit = (keyType: "speaker" | "text" | "choice", key: string, choiceKey?: string) => {
    const text = getText(key) || "";
    const usageNodes = findNodesUsingKey(key);

    setKeyEditState({
      isEditing: true,
      keyType,
      originalKey: key,
      originalText: text,
      newKey: key,
      newText: text,
      usageNodes,
      choiceKey,
    });
  };

  // 키 편집 취소
  const cancelKeyEdit = () => {
    setKeyEditState(null);
  };

  // 키 편집 완료
  const confirmKeyEdit = (updateAll: boolean, changeType: "text" | "key" | "both") => {
    if (!keyEditState || !selectedNodeKey) return;

    const localizationStore = useLocalizationStore.getState();
    const isTextChanged = keyEditState.newText !== keyEditState.originalText;
    const isKeyChanged = keyEditState.newKey !== keyEditState.originalKey;

    if (updateAll) {
      // 모든 위치에서 함께 변경
      if (isTextChanged) {
        // 기존 키의 텍스트 업데이트
        localizationStore.setText(keyEditState.originalKey, keyEditState.newText);

        // 모든 노드의 실제 텍스트도 동기화
        const usageNodes = localizationStore.findNodesUsingKey(keyEditState.originalKey);

        // LocalizationStore에서 노드를 찾지 못한 경우, 직접 템플릿 데이터에서 찾기
        const directUsageNodes = usageNodes.length === 0 ? findDirectUsageNodes(keyEditState.originalKey) : [];

        // usageNodes 또는 directUsageNodes를 사용하여 노드 업데이트
        const nodesToUpdate = usageNodes.length > 0 ? usageNodes : directUsageNodes;

        if (nodesToUpdate.length > 0) {
          nodesToUpdate.forEach((nodeInfo) => {
            const match = nodeInfo.match(/^(.+)\/(.+)\/(.+) \((.+)\)$/);
            if (match) {
              const [, templateKey, sceneKey, nodeKey, nodeType] = match;

              // 노드의 실제 텍스트 필드도 업데이트
              if (nodeType === "화자") {
                updateNodeText(nodeKey, keyEditState.newText, undefined);
              } else if (nodeType === "내용") {
                updateNodeText(nodeKey, undefined, keyEditState.newText);
              } else if (nodeType.startsWith("선택지:")) {
                const choiceKey = nodeType.split(":")[1].trim();
                updateChoiceText(nodeKey, choiceKey, keyEditState.newText);
              }
            }
          });
        } else {
          // 노드를 찾지 못한 경우 현재 선택된 노드 직접 업데이트

          if (keyEditState.keyType === "speaker") {
            updateNodeText(selectedNodeKey, keyEditState.newText, undefined);
          } else if (keyEditState.keyType === "text") {
            updateNodeText(selectedNodeKey, undefined, keyEditState.newText);
          } else if (keyEditState.keyType === "choice" && keyEditState.choiceKey) {
            updateChoiceText(selectedNodeKey, keyEditState.choiceKey, keyEditState.newText);
          }
        }
      }

      if (isKeyChanged) {
        // 키값 변경: 모든 노드의 키 참조를 새 키로 업데이트
        // 텍스트가 변경되지 않았다면 원래 키의 텍스트를 사용, 변경되었다면 새 텍스트 사용
        const textToUse = isTextChanged ? keyEditState.newText : localizationStore.getText(keyEditState.originalKey) || keyEditState.originalText;

        // 새 키에 텍스트 설정
        localizationStore.setText(keyEditState.newKey, textToUse);

        // 기존 키를 사용하는 모든 노드의 키 참조 업데이트
        const usageNodes = localizationStore.findNodesUsingKey(keyEditState.originalKey);
        const directUsageNodes = findDirectUsageNodes(keyEditState.originalKey);

        // 더 많은 노드를 찾은 방법을 우선 사용
        const nodesToUpdateForKeyChange = directUsageNodes.length > usageNodes.length ? directUsageNodes : usageNodes;

        nodesToUpdateForKeyChange.forEach((nodeInfo) => {
          // nodeInfo 형식: "templateKey/sceneKey/nodeKey (타입)" 파싱
          const match = nodeInfo.match(/^(.+)\/(.+)\/(.+) \((.+)\)$/);
          if (match) {
            const [, templateKey, sceneKey, nodeKey, nodeType] = match;

            if (nodeType === "화자") {
              updateNodeKeyReference(nodeKey, "speaker", keyEditState.newKey);
            } else if (nodeType === "내용") {
              updateNodeKeyReference(nodeKey, "text", keyEditState.newKey);
            } else if (nodeType.startsWith("선택지:")) {
              const choiceKey = nodeType.split(":")[1].trim();
              updateChoiceKeyReference(nodeKey, choiceKey, keyEditState.newKey);
            }
          }
        });

        // 기존 키 삭제
        localizationStore.deleteKey(keyEditState.originalKey);
      }

      // 키 편집 시 히스토리 추가 (모든 위치 함께 변경)
      const actionName = keyEditState.keyType === "speaker" ? "화자 텍스트" : keyEditState.keyType === "text" ? "대화 텍스트" : "선택지 텍스트";
      pushToHistoryWithTextEdit(`${actionName} 일괄 수정: "${keyEditState.newText}"`);
    } else {
      // 현재 노드만 변경 (새 키로 분리)
      if (isTextChanged || isKeyChanged) {
        // 새 키 생성 또는 기존 키 찾기
        let targetKey = keyEditState.originalKey;

        if (isKeyChanged) {
          targetKey = keyEditState.newKey;
        } else if (isTextChanged) {
          // 동일한 텍스트를 가진 기존 키가 있는지 확인
          const existingKey = localizationStore.findExistingKey(keyEditState.newText);
          if (existingKey) {
            targetKey = existingKey;
          } else {
            // 새 키 생성
            if (keyEditState.keyType === "speaker") {
              targetKey = localizationStore.generateSpeakerKey(keyEditState.newText).key;
            } else if (keyEditState.keyType === "text") {
              targetKey = localizationStore.generateTextKey(keyEditState.newText).key;
            } else if (keyEditState.keyType === "choice") {
              targetKey = localizationStore.generateChoiceKey(keyEditState.newText).key;
            }
          }
        }

        // 새 키에 텍스트 설정
        localizationStore.setText(targetKey, keyEditState.newText);

        // 현재 노드의 키 참조 및 실제 텍스트 업데이트
        if (keyEditState.keyType === "speaker") {
          updateNodeKeyReference(selectedNodeKey, "speaker", targetKey);
          updateNodeText(selectedNodeKey, keyEditState.newText, undefined);
        } else if (keyEditState.keyType === "text") {
          updateNodeKeyReference(selectedNodeKey, "text", targetKey);
          updateNodeText(selectedNodeKey, undefined, keyEditState.newText);
        } else if (keyEditState.keyType === "choice" && keyEditState.choiceKey) {
          updateChoiceKeyReference(selectedNodeKey, keyEditState.choiceKey, targetKey);
          updateChoiceText(selectedNodeKey, keyEditState.choiceKey, keyEditState.newText);
        }

        // 키 편집 시 히스토리 추가 (현재 노드만 변경)
        const actionName = keyEditState.keyType === "speaker" ? "화자 텍스트" : keyEditState.keyType === "text" ? "대화 텍스트" : "선택지 텍스트";
        pushToHistoryWithTextEdit(`${actionName} 개별 수정: "${keyEditState.newText}"`);
      }
    }

    // 로컬 텍스트 상태 업데이트 (키 편집 완료 후 blur 방지)

    if (keyEditState.keyType === "choice" && keyEditState.choiceKey) {
      setLocalTextState((prev) => ({
        ...prev,
        choiceTexts: { ...prev.choiceTexts, [keyEditState.choiceKey!]: keyEditState.newText },
      }));
    } else if (keyEditState.keyType === "speaker") {
      setLocalTextState((prev) => ({ ...prev, speakerText: keyEditState.newText }));
    } else if (keyEditState.keyType === "text") {
      setLocalTextState((prev) => ({ ...prev, contentText: keyEditState.newText }));
    }

    setKeyEditState(null);
  };

  // 키 편집 UI 렌더링
  const renderKeyEditModal = () => {
    if (!keyEditState) return null;

    const usageCount = keyEditState.usageNodes.length;
    const isTextChanged = keyEditState.newText !== keyEditState.originalText;
    const isKeyChanged = keyEditState.newKey !== keyEditState.originalKey;
    const hasChanges = isTextChanged || isKeyChanged;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-full">
          <h3 className="text-lg font-semibold mb-4">키 편집</h3>

          {/* 키값 편집 필드 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">키 값</label>
            <input
              type="text"
              value={keyEditState.newKey}
              onChange={(e) =>
                setKeyEditState({
                  ...keyEditState,
                  newKey: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              placeholder="키 값 입력"
            />
          </div>

          {/* 텍스트 내용 편집 필드 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">텍스트 내용</label>
            <textarea
              value={keyEditState.newText}
              onChange={(e) => {
                let newText = e.target.value;

                // 화자와 선택지는 줄 바꿈 금지
                if (keyEditState.keyType === "speaker" || keyEditState.keyType === "choice") {
                  newText = newText.replace(/\n/g, "");
                }

                setKeyEditState({
                  ...keyEditState,
                  newText: newText,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
              placeholder={
                keyEditState.keyType === "speaker" ? "화자명 입력 (줄 바꿈 불가)" : keyEditState.keyType === "choice" ? "선택지 텍스트 입력 (줄 바꿈 불가)" : "대화 내용 입력"
              }
            />
            {(keyEditState.keyType === "speaker" || keyEditState.keyType === "choice") && (
              <p className="text-xs text-gray-500 mt-1">{keyEditState.keyType === "speaker" ? "화자명" : "선택지 텍스트"}에는 줄 바꿈을 사용할 수 없습니다.</p>
            )}
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">사용 현황:</span> {keyEditState.usageNodes.length}개 위치에서 사용
            </div>
            {keyEditState.usageNodes.length > 0 && (
              <div className="mt-1 text-xs text-gray-500 max-h-20 overflow-y-auto">
                {keyEditState.usageNodes.map((node, index) => (
                  <div key={index}>• {node}</div>
                ))}
              </div>
            )}
          </div>

          {/* 개선된 버튼 표시 로직 */}
          <div className="space-y-2">
            <button
              onClick={() => confirmKeyEdit(true, "both")}
              disabled={!hasChanges}
              className={`w-full px-4 py-2 text-white rounded text-sm transition-colors ${hasChanges ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}>
              {keyEditState.usageNodes.length > 1 ? `모든 위치 함께 변경 (${keyEditState.usageNodes.length}개 위치)` : "변경 적용"}
            </button>

            <button onClick={() => setKeyEditState(null)} className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
              취소
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 실시간 키 사용 개수 계산 함수
  const calculateKeyUsageCount = (keyRef: string): number => {
    let count = 0;

    // 현재 templateData에서 직접 계산
    Object.entries(templateData).forEach(([templateKey, template]) => {
      Object.entries(template).forEach(([sceneKey, scene]) => {
        Object.entries(scene).forEach(([nodeKey, nodeWrapper]: [string, any]) => {
          const dialogue = nodeWrapper.dialogue;

          // 화자 키 검증
          if (dialogue.speakerKeyRef === keyRef) {
            count++;
          }

          // 텍스트 키 검증
          if (dialogue.textKeyRef === keyRef) {
            count++;
          }

          // 선택지 키 검증
          if (dialogue.type === "choice" && dialogue.choices) {
            Object.entries(dialogue.choices).forEach(([choiceKey, choice]: [string, any]) => {
              if (choice.textKeyRef === keyRef) {
                count++;
              }
            });
          }
        });
      });
    });

    return count;
  };

  // 키 표시 컴포넌트 (클릭 가능)
  const KeyDisplay = ({ keyRef, keyType, choiceKey }: { keyRef: string; keyType: "speaker" | "text" | "choice"; choiceKey?: string }) => {
    // 로컬라이제이션 스토어와 에디터 스토어 모두 구독하여 실시간 업데이트 보장
    const localizationData = useLocalizationStore((state) => state.localizationData);
    const currentTemplateData = useEditorStore((state) => state.templateData);
    const usageCount = calculateKeyUsageCount(keyRef);

    return (
      <button onClick={() => startKeyEdit(keyType, keyRef, choiceKey)} className="mt-1 text-xs text-gray-500 hover:text-blue-600 hover:underline text-left">
        키: {keyRef} ({usageCount}개 사용)
      </button>
    );
  };

  // 노드가 선택되지 않은 경우
  if (!selectedNode) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">
              노드를 선택하면
              <br />
              속성을 편집할 수 있습니다
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // 다중 선택된 경우
  if (isMultipleSelection) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="space-y-2">
              <p className="text-sm font-medium">다중 선택됨</p>
              <p className="text-sm">{safeSelectedNodeKeys.size}개 노드가 선택되었습니다</p>
              <p className="text-xs text-gray-400 mt-4">
                단일 노드를 선택하면
                <br />
                속성을 편집할 수 있습니다
              </p>
            </div>

            {/* 선택된 노드 목록 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs font-medium text-gray-600 mb-2">선택된 노드:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Array.from(safeSelectedNodeKeys).map((nodeKey) => {
                  const node = currentSceneData?.[nodeKey];
                  return (
                    <div key={nodeKey} className="text-xs text-gray-500 flex items-center justify-between">
                      <span className="font-mono">{nodeKey}</span>
                      <span className="text-gray-400">{node?.dialogue.type === "text" ? "텍스트" : "선택지"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // 현재 속성값들 (로컬 상태 사용)
  const currentSpeed = selectedNode.dialogue.type === "text" || selectedNode.dialogue.type === "choice" ? selectedNode.dialogue.speed || "NORMAL" : "NORMAL";

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="space-y-6">
          {/* 노드 정보 헤더 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">노드 속성</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>노드 ID: {selectedNode.nodeKey}</p>
              <p>타입: {selectedNode.dialogue.type === "text" ? "텍스트" : "선택지"}</p>
            </div>
          </div>

          {/* 기본 속성 편집 - 실제 텍스트 기반 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">화자 (Speaker)</label>
              <input
                type="text"
                value={localTextState.speakerText}
                onChange={(e) => handleLocalSpeakerChange(e.target.value)}
                onBlur={commitSpeakerText}
                onKeyDown={handleSpeakerKeyDown}
                onCompositionStart={handleSpeakerCompositionStart}
                onCompositionEnd={handleSpeakerCompositionEnd}
                placeholder="화자명을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {/* 자동생성된 키값 표시 */}
              {selectedNode.dialogue.speakerKeyRef && <KeyDisplay keyRef={selectedNode.dialogue.speakerKeyRef} keyType="speaker" />}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{selectedNode.dialogue.type === "choice" ? "선택지 질문" : "대화 내용"}</label>
              <textarea
                value={localTextState.contentText}
                onChange={(e) => handleLocalContentTextChange(e.target.value)}
                onBlur={commitContentText}
                onKeyDown={handleContentKeyDown}
                onCompositionStart={handleContentCompositionStart}
                onCompositionEnd={handleContentCompositionEnd}
                placeholder={selectedNode.dialogue.type === "choice" ? "선택지 질문을 입력하세요" : "대화 내용을 입력하세요"}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              {/* 자동생성된 키값 표시 */}
              {selectedNode.dialogue.textKeyRef && <KeyDisplay keyRef={selectedNode.dialogue.textKeyRef} keyType="text" />}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">출력 속도</label>
              <select
                value={currentSpeed}
                onChange={(e) => handleSpeedChange(e.target.value as keyof typeof DialogueSpeed)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="SLOW">느림</option>
                <option value="NORMAL">보통</option>
                <option value="FAST">빠름</option>
              </select>
            </div>
          </div>

          {/* 선택지 노드 전용 영역 */}
          {selectedNode.dialogue.type === "choice" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900">선택지</h4>
                <button onClick={handleAddChoice} className="px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors">
                  + 추가
                </button>
              </div>

              <div className="space-y-3">
                {Object.entries(selectedNode.dialogue.choices).map(([choiceKey, choice]) => (
                  <div key={choiceKey} className="p-3 border border-gray-200 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-700">{choiceKey}</span>
                      <button onClick={() => handleRemoveChoice(choiceKey)} className="text-red-500 hover:text-red-700 text-sm">
                        삭제
                      </button>
                    </div>

                    {/* 실제 텍스트 입력 */}
                    <input
                      type="text"
                      value={localTextState.choiceTexts[choiceKey] || ""}
                      onChange={(e) => handleLocalChoiceTextChange(choiceKey, e.target.value)}
                      onBlur={() => commitChoiceText(choiceKey)}
                      onKeyDown={handleChoiceKeyDown(choiceKey)}
                      onCompositionStart={handleChoiceCompositionStart(choiceKey)}
                      onCompositionEnd={handleChoiceCompositionEnd(choiceKey)}
                      placeholder="선택지 텍스트"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    {/* 자동생성된 키값 표시 */}
                    {choice.textKeyRef && <KeyDisplay keyRef={choice.textKeyRef} keyType="choice" choiceKey={choiceKey} />}

                    <div className="mt-2 text-xs text-gray-500">다음 노드: {choice.nextNodeKey || "미연결"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 실시간 저장 상태 표시 */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>변경사항이 실시간으로 저장됩니다</span>
              </div>
            </div>

            {/* 키 관리 힌트 */}
            <div className="mt-2 text-xs text-gray-400 text-center">키는 자동으로 생성되며 로컬라이제이션에서 관리됩니다</div>
          </div>
        </div>
      </div>

      {/* 키 편집 모달 */}
      {renderKeyEditModal()}
    </aside>
  );
}
