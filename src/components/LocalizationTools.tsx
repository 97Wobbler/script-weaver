import React from "react";
import { useLocalizationStore } from "../store/localizationStore";

interface LocalizationToolsProps {
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

export default function LocalizationTools({ showToast }: LocalizationToolsProps) {
  const { localizationData, deleteKey, getAllKeys } = useLocalizationStore();

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
        </div>
      </div>
    </div>
  );
} 