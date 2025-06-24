import React, { useState } from "react";
import { useLocalizationStore } from "../store/localizationStore";

interface LocalizationToolsProps {
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

export default function LocalizationTools({ showToast }: LocalizationToolsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "speaker" | "text" | "choice">("all");
  const { localizationData, deleteKey, getAllKeys } = useLocalizationStore();

  // 검색 및 필터링
  const filteredKeys = getAllKeys().filter((key) => {
    const text = localizationData[key] || "";
    const matchesSearch = searchTerm === "" || 
      key.toLowerCase().includes(searchTerm.toLowerCase()) || 
      text.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || key.startsWith(filterType === "speaker" ? "npc_" : 
      filterType === "text" ? "line_" : "choice_");
    
    return matchesSearch && matchesFilter;
  });

  // 키 추가
  const handleAddKey = () => {
    // TODO: 키 추가 모달 또는 인라인 편집 구현
    showToast("키 추가 기능이 곧 구현됩니다.", "info");
  };

  // 키 삭제
  const handleDeleteKey = (key: string) => {
    if (confirm(`키 "${key}"를 삭제하시겠습니까?`)) {
      deleteKey(key);
      showToast(`키 "${key}"가 삭제되었습니다.`, "success");
    }
  };

  // 일괄 수정
  const handleBulkEdit = () => {
    // TODO: 일괄 수정 기능 구현
    showToast("일괄 수정 기능이 곧 구현됩니다.", "info");
  };

  // 유효성 검사
  const handleValidate = () => {
    // TODO: 유효성 검사 기능 구현
    showToast("유효성 검사 기능이 곧 구현됩니다.", "info");
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">검색 & 필터</h3>
        <div className="space-y-2">
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
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">키 관리</h3>
        <div className="space-y-2">
          <button
            onClick={handleAddKey}
            className="w-full px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors">
            + 새 키 추가
          </button>
          <button
            onClick={handleBulkEdit}
            className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors">
            일괄 수정
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">검증</h3>
        <div className="space-y-2">
          <button
            onClick={handleValidate}
            className="w-full px-3 py-2 text-sm bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors">
            유효성 검사
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">통계</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <p>전체 키: {getAllKeys().length}개</p>
          <p>화자 키: {getAllKeys().filter(k => k.startsWith("npc_")).length}개</p>
          <p>텍스트 키: {getAllKeys().filter(k => k.startsWith("line_")).length}개</p>
          <p>선택지 키: {getAllKeys().filter(k => k.startsWith("choice_")).length}개</p>
          <p>검색 결과: {filteredKeys.length}개</p>
        </div>
      </div>

      {/* 검색 결과 미리보기 */}
      {searchTerm && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">검색 결과</h3>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredKeys.slice(0, 5).map((key) => (
              <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <span className="truncate">{key}</span>
                <button
                  onClick={() => handleDeleteKey(key)}
                  className="text-red-600 hover:text-red-800 text-xs">
                  삭제
                </button>
              </div>
            ))}
            {filteredKeys.length > 5 && (
              <p className="text-xs text-gray-500">... 외 {filteredKeys.length - 5}개</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 