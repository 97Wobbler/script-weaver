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
  const { templateData, exportToCSV } = useEditorStore();
  const { localizationData, setText, deleteKey } = useLocalizationStore();

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
      }
      
      setText(newKey, newText);
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
    if (confirm(`키 "${key}"를 삭제하시겠습니까?`)) {
      try {
        deleteKey(key);
        showToast(`키 "${key}"가 삭제되었습니다.`, "success");
      } catch (error) {
        showToast("삭제에 실패했습니다.", "warning");
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
    if (!editingRow) return;

    // TODO: EditorStore와 연동하여 실제 노드 데이터 업데이트
    showToast("Dialogue 편집 기능은 아직 구현 중입니다.", "info");
    stopEditingDialogue(nodeKey);
  };

  const cancelEditingDialogue = (nodeKey: string) => {
    stopEditingDialogue(nodeKey);
  };

  const csvData = getCSVData();
  const localizationEntries = Object.entries(localizationData);
  const dialogueRows = parseDialogueCSV(csvData.dialogue);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 서브탭 헤더 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveSubTab("dialogue")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === "dialogue"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}>
            Dialogue CSV
          </button>
          <button
            onClick={() => setActiveSubTab("localization")}
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
                            <div className="max-w-xs truncate" title={row.speakerText}>
                              {row.speakerText || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <div className="max-w-md whitespace-pre-line" title={row.contentText}>
                              {row.contentText || "-"}
                            </div>
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
                    {localizationEntries.map(([key, text]) => {
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
              
              {localizationEntries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>로컬라이제이션 데이터가 없습니다.</p>
                  <p className="text-sm">에디터에서 노드를 추가하면 키가 자동으로 생성됩니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 