import React, { useState } from "react";
import { useEditorStore } from "../store/editorStore";
import { useLocalizationStore } from "../store/localizationStore";

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

export default function LocalizationTab({ showToast }: LocalizationTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("dialogue");
  const [editingRows, setEditingRows] = useState<Record<string, EditableRow>>({});
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

  // CSV 복사 기능
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${type} CSV가 클립보드에 복사되었습니다.`, "success");
    } catch (error) {
      showToast("클립보드 복사에 실패했습니다.", "warning");
    }
  };

  // 편집 모드 시작
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

  // 편집 모드 종료
  const stopEditing = (key: string) => {
    setEditingRows(prev => {
      const newRows = { ...prev };
      delete newRows[key];
      return newRows;
    });
  };

  // 편집 내용 저장
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

  // 편집 취소
  const cancelEditing = (key: string) => {
    stopEditing(key);
  };

  // 키 삭제
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

  const csvData = getCSVData();
  const localizationEntries = Object.entries(localizationData);

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
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Dialogue CSV 편집 기능이 곧 구현됩니다...</p>
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
                              <div className="max-w-md truncate" title={text}>
                                {text}
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