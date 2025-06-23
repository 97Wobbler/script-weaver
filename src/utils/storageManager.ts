/**
 * localStorage 관리 및 용량 계산 유틸리티
 */

export interface StorageInfo {
  totalSize: number;
  categories: {
    editorData: number;
    localizationData: number;
  };
  formatted: {
    total: string;
    editorData: string;
    localizationData: string;
  };
}

/**
 * 문자열의 바이트 크기를 계산합니다.
 */
function getStringSize(str: string): number {
  return new Blob([str]).size;
}

/**
 * 용량을 사람이 읽기 쉬운 형태로 포맷팅합니다.
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * localStorage 사용량을 분석합니다.
 */
export function getStorageInfo(): StorageInfo {
  const editorStoreKey = 'script-weaver-editor';
  const localizationStoreKey = 'script-weaver-localization';
  
  const editorData = localStorage.getItem(editorStoreKey) || '{}';
  const localizationData = localStorage.getItem(localizationStoreKey) || '{}';
  
  const editorSize = getStringSize(editorData);
  const localizationSize = getStringSize(localizationData);
  const totalSize = editorSize + localizationSize;
  
  return {
    totalSize,
    categories: {
      editorData: editorSize,
      localizationData: localizationSize,
    },
    formatted: {
      total: formatSize(totalSize),
      editorData: formatSize(editorSize),
      localizationData: formatSize(localizationSize),
    },
  };
}

/**
 * 히스토리 데이터를 정리합니다. (최근 10개만 유지)
 */
export function cleanupHistory(): boolean {
  try {
    console.log('[히스토리 정리] 시작');
    const editorStoreKey = 'script-weaver-editor';
    const editorData = localStorage.getItem(editorStoreKey);
    
    if (!editorData) {
      console.log('[히스토리 정리] localStorage에 에디터 데이터가 없음');
      return false;
    }
    
    console.log('[히스토리 정리] localStorage 데이터 크기:', editorData.length, 'bytes');
    
    const parsedData = JSON.parse(editorData);
    const state = parsedData.state;
    
    console.log('[히스토리 정리] 파싱된 state 구조:', {
      hasHistory: !!state?.history,
      historyType: Array.isArray(state?.history) ? 'array' : typeof state?.history,
      historyLength: state?.history?.length,
      currentHistoryIndex: state?.historyIndex
    });
    
    if (state?.history && Array.isArray(state.history) && state.history.length > 10) {
      console.log('[히스토리 정리] 정리 전 - 히스토리 개수:', state.history.length, '현재 인덱스:', state.historyIndex);
      
      // 최근 10개 히스토리만 유지
      const recentHistory = state.history.slice(-10);
      const newHistoryIndex = Math.min(state.historyIndex, recentHistory.length - 1);
      
      console.log('[히스토리 정리] 정리 후 - 히스토리 개수:', recentHistory.length, '새 인덱스:', newHistoryIndex);
      
      const updatedData = {
        ...parsedData,
        state: {
          ...state,
          history: recentHistory,
          historyIndex: newHistoryIndex,
        },
      };
      
      const updatedJsonString = JSON.stringify(updatedData);
      console.log('[히스토리 정리] 저장할 데이터 크기:', updatedJsonString.length, 'bytes');
      
      localStorage.setItem(editorStoreKey, updatedJsonString);
      
      // 저장 후 검증
      const verifyData = localStorage.getItem(editorStoreKey);
      if (verifyData) {
        const verifyParsed = JSON.parse(verifyData);
        console.log('[히스토리 정리] 저장 검증 완료 - 히스토리 개수:', verifyParsed.state.history.length, '인덱스:', verifyParsed.state.historyIndex);
      }
      
      console.log('[히스토리 정리] 성공적으로 완료');
      return true;
    }
    
    console.log('[히스토리 정리] 정리할 히스토리가 없음 (10개 이하)');
    return false;
  } catch (error) {
    console.error('[히스토리 정리] 오류 발생:', error);
    return false;
  }
}

/**
 * 미사용 로컬라이제이션 키를 정리합니다.
 */
export function cleanupUnusedKeys(): boolean {
  try {
    // 이 기능은 useLocalizationStore의 cleanupUnusedKeys와 연동
    // 실제 구현은 localizationStore에서 처리
    console.log('미사용 키 정리 - 구현 예정');
    return true;
  } catch (error) {
    console.error('미사용 키 정리 중 오류:', error);
    return false;
  }
}

/**
 * 전체 데이터를 초기화합니다. (백업 후)
 */
export function resetAllData(): boolean {
  try {
    const confirmed = window.confirm(
      '모든 데이터가 삭제됩니다.\n\n' +
      '이 작업은 되돌릴 수 없습니다.\n' +
      '계속하시겠습니까?'
    );
    
    if (!confirmed) return false;
    
    // 백업 생성
    const backup = {
      editor: localStorage.getItem('script-weaver-editor'),
      localization: localStorage.getItem('script-weaver-localization'),
      timestamp: new Date().toISOString(),
    };
    
    const backupData = JSON.stringify(backup);
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-weaver-backup-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 데이터 삭제
    localStorage.removeItem('script-weaver-editor');
    localStorage.removeItem('script-weaver-localization');
    
    // 페이지 새로고침으로 초기 상태로 복원
    window.location.reload();
    
    return true;
  } catch (error) {
    console.error('데이터 초기화 중 오류:', error);
    return false;
  }
} 