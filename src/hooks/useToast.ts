import { useCallback } from 'react';

// 전역 토스트 함수 타입
type ToastFunction = (message: string, type?: "success" | "info" | "warning") => void;

// 전역 토스트 함수 저장소
let globalToastFunction: ToastFunction | null = null;

export const useToast = () => {
  // 전역 토스트 함수 등록
  const registerToast = useCallback((toastFn: ToastFunction) => {
    globalToastFunction = toastFn;
  }, []);

  // 토스트 표시
  const showToast = useCallback((message: string, type: "success" | "info" | "warning" = "info") => {
    if (globalToastFunction) {
      globalToastFunction(message, type);
    } else {
      // 폴백: console.log
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }, []);

  return {
    registerToast,
    showToast,
  };
};

// 전역 토스트 함수 직접 접근 (editorStore 등에서 사용)
export const getGlobalToast = (): ToastFunction | null => {
  return globalToastFunction;
};

export const setGlobalToast = (toastFn: ToastFunction) => {
  globalToastFunction = toastFn;
}; 