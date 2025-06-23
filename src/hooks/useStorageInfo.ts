import { useState, useEffect } from 'react';
import { getStorageInfo, type StorageInfo } from '../utils/storageManager';

/**
 * localStorage 사용량을 실시간으로 추적하는 훅
 */
export function useStorageInfo() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>(getStorageInfo());

  useEffect(() => {
    const updateStorageInfo = () => {
      setStorageInfo(getStorageInfo());
    };

    // 초기 로드
    updateStorageInfo();

    // localStorage 변경 감지 (다른 탭에서의 변경)
    window.addEventListener('storage', updateStorageInfo);

    // 주기적 업데이트 (현재 탭에서의 변경 감지)
    const interval = setInterval(updateStorageInfo, 2000);

    return () => {
      window.removeEventListener('storage', updateStorageInfo);
      clearInterval(interval);
    };
  }, []);

  return storageInfo;
} 