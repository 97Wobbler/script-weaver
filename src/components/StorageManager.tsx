import React, { useState } from "react";
import { useStorageInfo } from "../hooks/useStorageInfo";
import { cleanupHistory, cleanupUnusedKeys, resetAllData } from "../utils/storageManager";
import { useEditorStore } from "../store/editorStore";

interface StorageManagerProps {
  showToast?: (message: string, type?: "success" | "info" | "warning") => void;
}

export default function StorageManager({ showToast }: StorageManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const storageInfo = useStorageInfo();

  const handleCleanupHistory = () => {
    const result = cleanupHistory();
    
    if (result) {
      // localStorage 정리 성공 시, 메모리 상태도 직접 업데이트
      const currentEditorStore = useEditorStore.getState();
      if (currentEditorStore.history.length > 10) {
        const recentHistory = currentEditorStore.history.slice(-10);
        const newHistoryIndex = Math.min(currentEditorStore.historyIndex, recentHistory.length - 1);
        
        // Zustand setState를 통해 직접 상태 업데이트
        useEditorStore.setState({
          history: recentHistory,
          historyIndex: newHistoryIndex
        });
      }
      
      showToast?.("히스토리 데이터가 정리되었습니다.", "success");
    } else {
      showToast?.("정리할 히스토리가 없습니다.", "info");
    }
  };

  const handleCleanupUnusedKeys = () => {
    const result = cleanupUnusedKeys();
    if (result) {
      showToast?.("미사용 키가 정리되었습니다.", "success");
    } else {
      showToast?.("정리할 미사용 키가 없습니다.", "info");
    }
  };

  const handleResetAllData = () => {
    const result = resetAllData();
    if (result) {
      showToast?.("모든 데이터가 초기화되었습니다.", "success");
    }
  };



  // 용량에 따른 상태 결정
  const getStorageStatus = () => {
    const totalMB = storageInfo.totalSize / (1024 * 1024);
    if (totalMB > 4) return { color: "text-red-600", icon: "⚠️" };
    if (totalMB > 2) return { color: "text-yellow-600", icon: "⚡" };
    return { color: "text-green-600", icon: "💾" };
  };

  const status = getStorageStatus();

  return (
    <div>
      {/* 아코디언 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors ${
          isExpanded ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
        }`}>
        <div className="flex items-center space-x-2">
          <span>{status.icon}</span>
          <span>저장 공간</span>
          <span className={`text-xs ${status.color} font-medium`}>{storageInfo.formatted.total}</span>
        </div>
        <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 아코디언 내용 */}
      {isExpanded && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          {/* 카테고리별 용량 표시 */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">에디터 데이터:</span>
              <span className="font-medium">{storageInfo.formatted.editorData}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">로컬라이제이션:</span>
              <span className="font-medium">{storageInfo.formatted.localizationData}</span>
            </div>

            {/* 용량 프로그레스 바 */}
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    storageInfo.totalSize > 4 * 1024 * 1024 ? "bg-red-400" : storageInfo.totalSize > 2 * 1024 * 1024 ? "bg-yellow-400" : "bg-green-400"
                  }`}
                  style={{
                    width: `${Math.min((storageInfo.totalSize / (5 * 1024 * 1024)) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">{storageInfo.formatted.total} / 5MB (추정)</div>
            </div>
          </div>

          {/* 정리 버튼들 */}
          <div className="space-y-2">
            <button onClick={handleCleanupHistory} className="w-full px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
              🧹 히스토리 정리
            </button>

            <button
              onClick={handleCleanupUnusedKeys}
              className="w-full px-2 py-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors">
              🔧 미사용 키 정리
            </button>

            <button onClick={handleResetAllData} className="w-full px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors">
              🗑️ 전체 초기화
            </button>
          </div>

          {/* 도움말 */}
          <div className="mt-3 pt-2 border-t border-gray-300">
            <p className="text-xs text-gray-500 text-center">
              용량이 부족하면 히스토리나
              <br />
              미사용 키를 정리해보세요
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
