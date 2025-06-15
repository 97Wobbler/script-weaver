import { useCallback, useEffect } from "react";
import { useUIStore } from "../store/uiStore";
import { useEditorStore } from "../store/editorStore";
import type { ToastType, SystemStatus, ModalState, LoadingState, ErrorState } from "../store/uiStore";

// useUI Hook 반환 타입
export interface UseUIReturn {
  // 토스트 상태 및 관리
  toast: {
    isVisible: boolean;
    message: string;
    type: ToastType;
    duration?: number;
  };
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
  
  // 시스템 상태 관리
  systemStatus: SystemStatus;
  updateSystemStatus: (type: "idle" | "working" | "error" | "success", message: string) => void;
  
  // 모달 관리
  modal: ModalState;
  showModal: (config: Partial<ModalState>) => void;
  hideModal: () => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  showAlert: (title: string, message: string, onConfirm?: () => void) => void;
  
  // 로딩 관리
  loading: LoadingState;
  setLoading: (isLoading: boolean, message?: string, progress?: number) => void;
  updateLoadingProgress: (progress: number) => void;
  
  // 에러 관리
  error: ErrorState;
  showError: (message: string, details?: string) => void;
  clearError: () => void;
  
  // 비동기 작업 관리
  isOperationInProgress: boolean;
  currentOperation: string | null;
  startOperation: (operationType: string) => boolean;
  endOperation: () => void;
  canStartOperation: (operationType: string) => boolean;
  isWorking: () => boolean;
  getCurrentOperation: () => string | null;
  canPerformUndoRedo: () => boolean;
  
  // 통합 기능
  showSuccess: (message: string) => void;
  
  // 동기화 함수 (테스트용)
  syncFromEditor: () => void;
  syncToEditor: () => void;
  
  // 유틸리티
  resetUI: () => void;
}

/**
 * UI 관련 기능을 통합 제공하는 Hook
 * 기존 editorStore와 새로운 uiStore를 조합하여 사용
 */
export const useUI = (): UseUIReturn => {
  // Store 훅들
  const uiStore = useUIStore();
  const editorStore = useEditorStore();
  
  // editorStore → uiStore 동기화
  const syncFromEditor = useCallback(() => {
    // editorStore의 showToast 함수를 uiStore의 showToast로 연결
    // 이미 editorStore에서 showToast를 사용하고 있으므로 연결만 하면 됨
  }, []);
  
  // uiStore → editorStore 동기화
  const syncToEditor = useCallback(() => {
    // uiStore의 showToast 함수를 editorStore에 연결
    editorStore.showToast = uiStore.showToast;
  }, [uiStore.showToast, editorStore]);
  
  // 컴포넌트 마운트 시 초기 동기화
  useEffect(() => {
    // editorStore의 showToast 함수를 uiStore로 연결
    editorStore.showToast = uiStore.showToast;
  }, [uiStore.showToast, editorStore]);
  
  // 성공 메시지 표시 (토스트 + 시스템 상태) - uiStore의 showSuccess 사용
  const showSuccess = useCallback((message: string) => {
    uiStore.showSuccess(message);
  }, [uiStore]);
  
  return {
    // 토스트 상태 및 관리
    toast: uiStore.toast,
    showToast: uiStore.showToast,
    hideToast: uiStore.hideToast,
    
    // 시스템 상태 관리
    systemStatus: uiStore.systemStatus,
    updateSystemStatus: uiStore.updateSystemStatus,
    
    // 모달 관리
    modal: uiStore.modal,
    showModal: uiStore.showModal,
    hideModal: uiStore.hideModal,
    showConfirm: uiStore.showConfirm,
    showAlert: uiStore.showAlert,
    
    // 로딩 관리
    loading: uiStore.loading,
    setLoading: uiStore.setLoading,
    updateLoadingProgress: uiStore.updateLoadingProgress,
    
    // 에러 관리
    error: uiStore.error,
    showError: uiStore.showError,
    clearError: uiStore.clearError,
    
    // 비동기 작업 관리
    isOperationInProgress: uiStore.isOperationInProgress,
    currentOperation: uiStore.currentOperation,
    startOperation: uiStore.startOperation,
    endOperation: uiStore.endOperation,
    canStartOperation: uiStore.canStartOperation,
    isWorking: uiStore.isWorking,
    getCurrentOperation: uiStore.getCurrentOperation,
    canPerformUndoRedo: uiStore.canPerformUndoRedo,
    
    // 통합 기능
    showSuccess,
    
    // 동기화 (테스트/디버깅용)
    syncFromEditor,
    syncToEditor,
    
    // 유틸리티
    resetUI: uiStore.resetUI,
  };
}; 