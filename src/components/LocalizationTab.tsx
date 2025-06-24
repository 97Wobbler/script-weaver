import React, { useState } from "react";
import { useEditorStore } from "../store/editorStore";
import { useLocalizationStore } from "../store/localizationStore";
import type { DialogueCSVRow } from "../types/dialogue";

interface LocalizationTabProps {
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

type SubTabType = "dialogue" | "localization";

interface EditableRow {
  key: string;
  text: string;
  isEditing: boolean;
  originalKey: string;
  originalText: string;
}

interface EditableDialogueRow {
  nodeKey: string;
  isEditing: boolean;
  originalData: DialogueCSVRow;
  currentData: DialogueCSVRow;
}

export default function LocalizationTab({ showToast }: LocalizationTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("dialogue");
  const [editingRows, setEditingRows] = useState<Record<string, EditableRow>>({});
  const [editingDialogueRows, setEditingDialogueRows] = useState<Record<string, EditableDialogueRow>>({});
  const { templateData, exportToCSV, updateNodeText, updateNode } = useEditorStore();
  const { localizationData, setText, deleteKey } = useLocalizationStore();

  // 검색 및 필터링 상태 추가
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "speaker" | "text" | "choice">("all");

  // 키보드 단축키 처리
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        cancelAllEditing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 모든 편집 상태 취소
  const cancelAllEditing = () => {
    setEditingRows({});
    setEditingDialogueRows({});
    showToast("모든 편집이 취소되었습니다.", "info");
  };

  // 편집 중인 항목이 있는지 확인
  const hasEditingItems = Object.keys(editingRows).length > 0 || Object.keys(editingDialogueRows).length > 0;

  // 탭 전환 시 데이터 동기화
  const handleTabChange = (newTab: SubTabType) => {
    if (hasEditingItems) {
      if (confirm("편집 중인 내용이 있습니다. 탭을 전환하면 편집 내용이 사라집니다. 계속하시겠습니까?")) {
        setActiveSubTab(newTab);
        setEditingRows({});
        setEditingDialogueRows({});
        showToast("탭이 전환되었습니다.", "info");
      }
    } else {
      setActiveSubTab(newTab);
    }
  };

  // 유효성 검사
  const validateData = () => {
    const issues: string[] = [];
    
    // 중복 키 검사
    const keys = Object.keys(localizationData);
    const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
    if (duplicateKeys.length > 0) {
      issues.push(`중복된 키 발견: ${duplicateKeys.join(', ')}`);
    }
    
    // 중복 텍스트 검사
    const texts = Object.values(localizationData);
    const textCounts: Record<string, string[]> = {};
    texts.forEach((text, index) => {
      if (text && text.trim()) {
        if (!textCounts[text]) {
          textCounts[text] = [];
        }
        textCounts[text].push(keys[index]);
      }
    });
    
    const duplicateTexts = Object.entries(textCounts)
      .filter(([text, keyList]) => keyList.length > 1)
      .map(([text, keyList]) => `"${text}" (${keyList.join(', ')})`);
    
    if (duplicateTexts.length > 0) {
      issues.push(`중복된 텍스트 발견: ${duplicateTexts.join('; ')}`);
    }
    
    // 빈 값 검사
    const emptyKeys = keys.filter(key => !localizationData[key] || !localizationData[key].trim());
    if (emptyKeys.length > 0) {
      issues.push(`빈 값 키 발견: ${emptyKeys.join(', ')}`);
    }
    
    if (issues.length > 0) {
      showToast(`유효성 검사 결과: ${issues.length}개 문제 발견`, "warning");
      console.warn("유효성 검사 결과:", issues);
      return issues;
    } else {
      showToast("유효성 검사 완료: 문제 없음", "success");
      return [];
    }
  };

  // CSV 데이터 가져오기
  const getCSVData = () => {
    try {
      return exportToCSV();
    } catch (error) {
      showToast("CSV 데이터 생성에 실패했습니다.", "warning");
      return { dialogue: "", localization: "" };
    }
  };

  // CSV 문자열을 DialogueCSVRow 배열로 파싱
  const parseDialogueCSV = (csvString: string): DialogueCSVRow[] => {
    if (!csvString.trim()) return [];
    
    // 전체 CSV를 한 번에 파싱
    const lines = parseCSVWithQuotes(csvString);
    if (lines.length < 2) return [];
    
    const headerLine = lines[0];
    const dataLines = lines.slice(1);
    
    const rows: DialogueCSVRow[] = [];
    
    // 각 데이터 라인을 파싱
    for (let i = 0; i < dataLines.length; i++) {
      const values = dataLines[i];
      
      if (values.length < 11) {
        continue;
      }
      
      const row: DialogueCSVRow = {
        templateKey: values[0] || "",
        sceneKey: values[1] || "",
        nodeKey: values[2] || "",
        textKey: values[3] || "",
        speakerKey: values[4] || "",
        speakerText: values[5] || "",
        contentText: values[6] || "",
        type: values[7] || "",
        choices_textKeys: values[8] || "",
        choices_texts: values[9] || "",
        choices_nextKeys: values[10] || "",
      };
      
      rows.push(row);
    }
    
    return rows;
  };

  // 인용부호를 고려한 전체 CSV 파싱
  const parseCSVWithQuotes = (csvString: string): string[][] => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = "";
    let inQuotes = false;
    let i = 0;
    
    while (i < csvString.length) {
      const char = csvString[i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < csvString.length && csvString[i + 1] === '"') {
          // 이스케이프된 인용부호
          currentField += '"';
          i += 2;
        } else {
          // 인용부호 시작/종료
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // 필드 구분자
        currentLine.push(currentField);
        currentField = "";
        i++;
      } else if (char === '\n' && !inQuotes) {
        // 행 구분자 (인용부호 밖에서만)
        currentLine.push(currentField);
        if (currentLine.length > 0) {
          lines.push([...currentLine]);
        }
        currentLine = [];
        currentField = "";
        i++;
      } else {
        // 일반 문자 (개행문자 포함)
        currentField += char;
        i++;
      }
    }
    
    // 마지막 필드와 행 추가
    currentLine.push(currentField);
    if (currentLine.length > 0) {
      lines.push([...currentLine]);
    }
    
    return lines;
  };

  // 인용부호를 고려한 CSV 라인 파싱 (기존 함수는 유지)
  const parseCSVLineWithQuotes = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // 이스케이프된 인용부호
          current += '"';
          i += 2;
        } else {
          // 인용부호 시작/종료
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // 필드 구분자
        values.push(current);
        current = "";
        i++;
      } else {
        // 일반 문자 (개행문자 포함)
        current += char;
        i++;
      }
    }
    
    // 마지막 필드 추가
    values.push(current);
    
    return values;
  };

  // CSV 복사 기능
  const copyToClipboard = async (text: string, type: string) => {
    // CSV 복사 시에는 데이터 구분은 실제 줄바꿈으로 유지하고, 
    // 대사 내 줄바꿈만 \n으로 변환
    // 인용부호 내의 개행문자만 \n으로 변환
    let processedText = "";
    let inQuotes = false;
    let i = 0;
    
    while (i < text.length) {
      const char = text[i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
          // 이스케이프된 인용부호
          processedText += '""';
          i += 2;
        } else {
          // 인용부호 시작/종료
          inQuotes = !inQuotes;
          processedText += '"';
          i++;
        }
      } else if (char === '\n') {
        if (inQuotes) {
          // 인용부호 내의 개행문자는 \n으로 변환
          processedText += '\\n';
        } else {
          // 인용부호 밖의 개행문자는 실제 줄바꿈으로 유지
          processedText += '\n';
        }
        i++;
      } else {
        // 일반 문자
        processedText += char;
        i++;
      }
    }
    
    try {
      await navigator.clipboard.writeText(processedText);
      showToast(`${type} CSV가 클립보드에 복사되었습니다.`, "success");
    } catch (error) {
      showToast("클립보드 복사에 실패했습니다.", "warning");
    }
  };

  // Localization 편집 관련 함수들
  const startEditing = (key: string) => {
    setEditingRows(prev => ({
      ...prev,
      [key]: {
        key,
        text: localizationData[key] || "",
        isEditing: true,
        originalKey: key,
        originalText: localizationData[key] || ""
      }
    }));
  };

  const stopEditing = (key: string) => {
    setEditingRows(prev => {
      const newRows = { ...prev };
      delete newRows[key];
      return newRows;
    });
  };

  const saveEditing = (key: string) => {
    const editingRow = editingRows[key];
    if (!editingRow) return;

    const newKey = editingRow.key.trim();
    const newText = editingRow.text.trim();

    // 유효성 검사
    if (!newKey) {
      showToast("키는 비어있을 수 없습니다.", "warning");
      return;
    }

    if (!newText) {
      showToast("텍스트는 비어있을 수 없습니다.", "warning");
      return;
    }

    // 키가 변경된 경우 중복 체크
    if (newKey !== editingRow.originalKey && localizationData[newKey]) {
      showToast(`키 "${newKey}"가 이미 존재합니다.`, "warning");
      return;
    }

    try {
      // 키가 변경된 경우 기존 키 삭제 후 새 키 추가
      if (newKey !== editingRow.originalKey) {
        deleteKey(editingRow.originalKey);
        
        // 키가 변경된 경우, 해당 키를 사용하는 모든 노드의 키 참조 업데이트
        const { templateData, currentTemplate, currentScene } = useEditorStore.getState();
        const currentSceneData = templateData[currentTemplate]?.[currentScene];
        
        if (currentSceneData) {
          Object.entries(currentSceneData).forEach(([nodeKey, nodeWrapper]) => {
            const dialogue = nodeWrapper.dialogue;
            let needsUpdate = false;
            const updates: any = {};

            // 화자 키 참조 업데이트
            if (dialogue.speakerKeyRef === editingRow.originalKey) {
              updates.speakerKeyRef = newKey;
              needsUpdate = true;
            }

            // 텍스트 키 참조 업데이트
            if (dialogue.textKeyRef === editingRow.originalKey) {
              updates.textKeyRef = newKey;
              needsUpdate = true;
            }

            // 선택지 키 참조 업데이트
            if (dialogue.type === "choice" && dialogue.choices) {
              const updatedChoices: any = {};
              Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
                if (choice.textKeyRef === editingRow.originalKey) {
                  updatedChoices[choiceKey] = { ...choice, textKeyRef: newKey };
                } else {
                  updatedChoices[choiceKey] = choice;
                }
              });
              if (Object.keys(updatedChoices).length > 0) {
                updates.choices = updatedChoices;
                needsUpdate = true;
              }
            }

            // 노드 업데이트
            if (needsUpdate) {
              updateNode(nodeKey, { dialogue: { ...dialogue, ...updates } });
            }
          });
        }
      }
      
      setText(newKey, newText);
      
      // 텍스트가 변경된 경우, 해당 키를 사용하는 모든 노드의 실제 텍스트도 업데이트
      if (newText !== editingRow.originalText) {
        updateNodesWithTextChange(newKey, newText);
      }
      
      showToast("변경사항이 저장되었습니다.", "success");
      stopEditing(key);
    } catch (error) {
      showToast("저장에 실패했습니다.", "warning");
    }
  };

  const cancelEditing = (key: string) => {
    stopEditing(key);
  };

  const handleDeleteKey = (key: string) => {
    // 해당 키를 사용하는 노드들 찾기
    const { templateData, currentTemplate, currentScene } = useEditorStore.getState();
    const currentSceneData = templateData[currentTemplate]?.[currentScene];
    const affectedNodes: string[] = [];
    
    if (currentSceneData) {
      Object.entries(currentSceneData).forEach(([nodeKey, nodeWrapper]) => {
        const dialogue = nodeWrapper.dialogue;
        
        // 화자 키 참조 확인
        if (dialogue.speakerKeyRef === key) {
          affectedNodes.push(`${nodeKey} (화자)`);
        }
        
        // 텍스트 키 참조 확인
        if (dialogue.textKeyRef === key) {
          affectedNodes.push(`${nodeKey} (내용)`);
        }
        
        // 선택지 키 참조 확인
        if (dialogue.type === "choice" && dialogue.choices) {
          Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
            if (choice.textKeyRef === key) {
              affectedNodes.push(`${nodeKey} (선택지: ${choiceKey})`);
            }
          });
        }
      });
    }
    
    // 경고 메시지 생성
    let warningMessage = `키 "${key}"를 삭제하시겠습니까?\n\n`;
    warningMessage += `텍스트: "${localizationData[key]}"\n\n`;
    
    if (affectedNodes.length > 0) {
      warningMessage += `⚠️ 이 키를 사용하는 다음 노드들의 텍스트가 비워집니다:\n`;
      affectedNodes.forEach(node => {
        warningMessage += `• ${node}\n`;
      });
      warningMessage += `\n계속하시겠습니까?`;
    } else {
      warningMessage += `이 키는 현재 사용되지 않고 있습니다.\n\n계속하시겠습니까?`;
    }
    
    if (confirm(warningMessage)) {
      try {
        // 해당 키를 사용하는 모든 노드의 텍스트를 비우고 키 참조 제거
        if (currentSceneData && affectedNodes.length > 0) {
          Object.entries(currentSceneData).forEach(([nodeKey, nodeWrapper]) => {
            const dialogue = nodeWrapper.dialogue;
            let needsUpdate = false;
            const updates: any = {};

            // 화자 키 참조 제거
            if (dialogue.speakerKeyRef === key) {
              updates.speakerKeyRef = undefined;
              updates.speakerText = "";
              needsUpdate = true;
            }

            // 텍스트 키 참조 제거
            if (dialogue.textKeyRef === key) {
              updates.textKeyRef = undefined;
              updates.contentText = "";
              needsUpdate = true;
            }

            // 선택지 키 참조 제거
            if (dialogue.type === "choice" && dialogue.choices) {
              const updatedChoices: any = {};
              let choicesUpdated = false;
              
              Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
                if (choice.textKeyRef === key) {
                  updatedChoices[choiceKey] = { ...choice, textKeyRef: undefined, choiceText: "" };
                  choicesUpdated = true;
                } else {
                  updatedChoices[choiceKey] = choice;
                }
              });
              
              if (choicesUpdated) {
                updates.choices = updatedChoices;
                needsUpdate = true;
              }
            }

            // 노드 업데이트
            if (needsUpdate) {
              updateNode(nodeKey, { dialogue: { ...dialogue, ...updates } });
            }
          });
        }
        
        // LocalizationStore에서 키 삭제
        deleteKey(key);
        
        showToast(`키 "${key}"가 삭제되었습니다.`, "success");
      } catch (error) {
        console.error('❌ [LocalizationTab] 키 삭제 실패:', error);
        showToast("키 삭제에 실패했습니다.", "warning");
      }
    }
  };

  // Dialogue 편집 관련 함수들
  const startEditingDialogue = (nodeKey: string, row: DialogueCSVRow) => {
    setEditingDialogueRows(prev => ({
      ...prev,
      [nodeKey]: {
        nodeKey,
        isEditing: true,
        originalData: { ...row },
        currentData: { ...row }
      }
    }));
  };

  const stopEditingDialogue = (nodeKey: string) => {
    setEditingDialogueRows(prev => {
      const newRows = { ...prev };
      delete newRows[nodeKey];
      return newRows;
    });
  };

  const saveEditingDialogue = (nodeKey: string) => {
    const editingRow = editingDialogueRows[nodeKey];
    if (!editingRow) {
      return;
    }

    const { speakerText, contentText } = editingRow.currentData;

    try {
      // EditorStore를 통해 실제 노드 데이터 업데이트
      updateNodeText(nodeKey, speakerText, contentText);
      showToast("Dialogue가 성공적으로 업데이트되었습니다.", "success");
      stopEditingDialogue(nodeKey);
    } catch (error) {
      showToast("Dialogue 업데이트에 실패했습니다.", "warning");
    }
  };

  const cancelEditingDialogue = (nodeKey: string) => {
    stopEditingDialogue(nodeKey);
  };

  // 텍스트 변경 시 노드들을 업데이트하는 함수
  const updateNodesWithTextChange = (key: string, newText: string) => {
    const { templateData, currentTemplate, currentScene } = useEditorStore.getState();
    const currentSceneData = templateData[currentTemplate]?.[currentScene];
    
    if (currentSceneData) {
      Object.entries(currentSceneData).forEach(([nodeKey, nodeWrapper]) => {
        const dialogue = nodeWrapper.dialogue;
        let needsUpdate = false;
        const updates: any = {};

        // 화자 키 참조 업데이트
        if (dialogue.speakerKeyRef === key) {
          updates.speakerText = newText;
          needsUpdate = true;
        }

        // 텍스트 키 참조 업데이트
        if (dialogue.textKeyRef === key) {
          updates.contentText = newText;
          needsUpdate = true;
        }

        // 선택지 키 참조 업데이트
        if (dialogue.type === "choice" && dialogue.choices) {
          const updatedChoices: any = {};
          Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
            if (choice.textKeyRef === key) {
              updatedChoices[choiceKey] = { ...choice, choiceText: newText };
            } else {
              updatedChoices[choiceKey] = choice;
            }
          });
          if (Object.keys(updatedChoices).length > 0) {
            updates.choices = updatedChoices;
            needsUpdate = true;
          }
        }

        // 노드 업데이트
        if (needsUpdate) {
          updateNode(nodeKey, { dialogue: { ...dialogue, ...updates } });
        }
      });
    }
  };

  const csvData = getCSVData();
  const localizationEntries = Object.entries(localizationData);
  const dialogueRows = parseDialogueCSV(csvData.dialogue);

  // 검색 및 필터링된 로컬라이제이션 데이터
  const filteredLocalizationEntries = Object.entries(localizationData).filter(([key, text]) => {
    const matchesSearch = searchTerm === "" || 
      key.toLowerCase().includes(searchTerm.toLowerCase()) || 
      text.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || key.startsWith(filterType === "speaker" ? "npc_" : 
      filterType === "text" ? "line_" : "choice_");
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 서브탭 헤더 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => handleTabChange("dialogue")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === "dialogue"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}>
            Dialogue CSV
          </button>
          <button
            onClick={() => handleTabChange("localization")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === "localization"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}>
            Localization CSV
          </button>
        </nav>
      </div>

      {/* 서브탭 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === "dialogue" && (
          <div className="h-full p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Dialogue CSV 편집</h3>
                <p className="text-sm text-gray-600">노드 구조와 키 참조 정보를 편집합니다.</p>
              </div>
              <button
                onClick={() => copyToClipboard(csvData.dialogue, "Dialogue")}
                className="px-4 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors">
                CSV 복사
              </button>
            </div>
            
            {/* Dialogue 편집 테이블 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        노드 키
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        타입
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        화자
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        내용
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dialogueRows.map((row) => {
                      const isEditing = editingDialogueRows[row.nodeKey]?.isEditing;
                      const editingRow = editingDialogueRows[row.nodeKey];
                      
                      return (
                        <tr key={row.nodeKey} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.nodeKey}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              row.type === "text" ? "bg-blue-100 text-blue-800" :
                              row.type === "choice" ? "bg-green-100 text-green-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingRow.currentData.speakerText || ""}
                                onChange={(e) => setEditingDialogueRows(prev => ({
                                  ...prev,
                                  [row.nodeKey]: {
                                    ...editingRow,
                                    currentData: {
                                      ...editingRow.currentData,
                                      speakerText: e.target.value
                                    }
                                  }
                                }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="화자"
                              />
                            ) : (
                              <div className="max-w-xs truncate" title={row.speakerText}>
                                {row.speakerText || "-"}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {isEditing ? (
                              <textarea
                                value={editingRow.currentData.contentText || ""}
                                onChange={(e) => setEditingDialogueRows(prev => ({
                                  ...prev,
                                  [row.nodeKey]: {
                                    ...editingRow,
                                    currentData: {
                                      ...editingRow.currentData,
                                      contentText: e.target.value
                                    }
                                  }
                                }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                rows={3}
                                placeholder="대화 내용"
                              />
                            ) : (
                              <div className="max-w-md whitespace-pre-line" title={row.contentText}>
                                {row.contentText || "-"}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {isEditing ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => saveEditingDialogue(row.nodeKey)}
                                  className="text-green-600 hover:text-green-900 text-xs">
                                  저장
                                </button>
                                <button
                                  onClick={() => cancelEditingDialogue(row.nodeKey)}
                                  className="text-gray-600 hover:text-gray-900 text-xs">
                                  취소
                                </button>
                              </div>
                            ) : (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => startEditingDialogue(row.nodeKey, row)}
                                  className="text-blue-600 hover:text-blue-900 text-xs">
                                  편집
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {dialogueRows.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Dialogue 데이터가 없습니다.</p>
                  <p className="text-sm">에디터에서 노드를 추가하면 데이터가 표시됩니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === "localization" && (
          <div className="h-full p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Localization CSV 편집</h3>
                <p className="text-sm text-gray-600">키-한국어 텍스트 매핑을 편집합니다.</p>
              </div>
              <button
                onClick={() => copyToClipboard(csvData.localization, "Localization")}
                className="px-4 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors">
                CSV 복사
              </button>
            </div>
            
            {/* 검색 및 필터링 */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="키 또는 텍스트 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">모든 키</option>
                    <option value="speaker">화자 키 (npc_)</option>
                    <option value="text">텍스트 키 (line_)</option>
                    <option value="choice">선택지 키 (choice_)</option>
                  </select>
                </div>
                {hasEditingItems && (
                  <button
                    onClick={cancelAllEditing}
                    className="ml-4 px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                    title="Ctrl+Z로도 사용 가능">
                    모두 취소
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {searchTerm || filterType !== "all" ? (
                  <div className="text-sm text-gray-600">
                    검색 결과: {filteredLocalizationEntries.length}개 / 전체: {localizationEntries.length}개
                  </div>
                ) : null}
                <button
                  onClick={validateData}
                  className="px-3 py-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors">
                  유효성 검사
                </button>
              </div>
            </div>
            
            {/* Localization 편집 테이블 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        키
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        한국어 텍스트
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLocalizationEntries.map(([key, text]) => {
                      const isEditing = editingRows[key]?.isEditing;
                      const editingRow = editingRows[key];
                      
                      return (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingRow.key}
                                onChange={(e) => setEditingRows(prev => ({
                                  ...prev,
                                  [key]: { ...editingRow, key: e.target.value }
                                }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              key
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingRow.text}
                                onChange={(e) => setEditingRows(prev => ({
                                  ...prev,
                                  [key]: { ...editingRow, text: e.target.value }
                                }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <div className="max-w-md whitespace-pre-line" title={text}>
                                {text || ""}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {isEditing ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => saveEditing(key)}
                                  className="text-green-600 hover:text-green-900 text-xs">
                                  저장
                                </button>
                                <button
                                  onClick={() => cancelEditing(key)}
                                  className="text-gray-600 hover:text-gray-900 text-xs">
                                  취소
                                </button>
                              </div>
                            ) : (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => startEditing(key)}
                                  className="text-blue-600 hover:text-blue-900 text-xs">
                                  편집
                                </button>
                                <button
                                  onClick={() => handleDeleteKey(key)}
                                  className="text-red-600 hover:text-red-900 text-xs">
                                  삭제
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {filteredLocalizationEntries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm || filterType !== "all" ? (
                    <p>검색 조건에 맞는 로컬라이제이션 데이터가 없습니다.</p>
                  ) : (
                    <>
                      <p>로컬라이제이션 데이터가 없습니다.</p>
                      <p className="text-sm">에디터에서 노드를 추가하면 키가 자동으로 생성됩니다.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 