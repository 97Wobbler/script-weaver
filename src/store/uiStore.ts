import { create } from "zustand";
import { persist } from "zustand/middleware";

// 토스트 관련 타입
export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastState {
  isVisible: boolean;
  message: string;
  type: ToastType;
  duration?: number; // 자동 숨김 시간 (ms)
}

// 시스템 상태 관련 타입
export type OperationStatus = "idle" | "working" | "error" | "success";

export interface SystemStatus {
  type: OperationStatus;
  message: string;
  timestamp: number;
}

// 모달 관련 타입
export interface ModalState {
  isOpen: boolean;
  type?: "confirm" | "alert" | "custom";
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  customContent?: React.ReactNode;
}

// 로딩 관련 타입
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number; // 0-100 진행률
}

// 에러 관련 타입
export interface ErrorState {
  hasError: boolean;
  message?: string;
  details?: string;
  timestamp?: number;
}

// UI 상태 타입
export interface UIState {
  // 토스트 상태
  toast: ToastState;
  
  // 시스템 상태 (AsyncOperationManager 통합)
  systemStatus: SystemStatus;
  
  // 모달 상태
  modal: ModalState;
  
  // 로딩 상태
  loading: LoadingState;
  
  // 에러 상태
  error: ErrorState;
  
  // 비동기 작업 관리 (AsyncOperationManager 기능 통합)
  isOperationInProgress: boolean;
  currentOperation: string | null;
}

// UI 액션 타입
export interface UIActions {
  // 토스트 관리
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
  
  // 시스템 상태 관리
  setSystemStatus: (status: SystemStatus) => void;
  updateSystemStatus: (type: OperationStatus, message: string) => void;
  
  // 모달 관리
  showModal: (config: Partial<ModalState>) => void;
  hideModal: () => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  showAlert: (title: string, message: string, onConfirm?: () => void) => void;
  
  // 로딩 관리
  setLoading: (isLoading: boolean, message?: string, progress?: number) => void;
  updateLoadingProgress: (progress: number) => void;
  
  // 에러 관리
  showError: (message: string, details?: string) => void;
  clearError: () => void;
  
  // 성공 관리 (시스템 상태 + 토스트)
  showSuccess: (message: string) => void;
  
  // 비동기 작업 관리 (AsyncOperationManager 통합)
  startOperation: (operationType: string) => boolean;
  endOperation: () => void;
  canStartOperation: (operationType: string) => boolean;
  isWorking: () => boolean;
  getCurrentOperation: () => string | null;
  canPerformUndoRedo: () => boolean;
  
  // 초기화
  resetUI: () => void;
}

// 전체 UIStore 타입
export type UIStore = UIState & UIActions;

// 초기 상태
const initialState: UIState = {
  toast: {
    isVisible: false,
    message: "",
    type: "info",
    duration: 3000,
  },
  systemStatus: {
    type: "idle",
    message: "자동 저장됨",
    timestamp: Date.now(),
  },
  modal: {
    isOpen: false,
  },
  loading: {
    isLoading: false,
  },
  error: {
    hasError: false,
  },
  isOperationInProgress: false,
  currentOperation: null,
};

// 토스트 타이머 관리
let toastTimer: number | null = null;

// 시스템 상태 복원 타이머 관리
let systemStatusTimer: number | null = null;

// UIStore 생성
export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 토스트 관리
      showToast: (message, type = "info", duration = 3000) => {
        // 이전 타이머가 있다면 취소
        if (toastTimer) {
          clearTimeout(toastTimer);
          toastTimer = null;
        }
        
        set((state) => ({
          toast: {
            ...state.toast,
            isVisible: true,
            message,
            type,
            duration,
          },
        }));
        
        // 자동 숨김 타이머 설정
        if (duration > 0) {
          toastTimer = setTimeout(() => {
            get().hideToast();
          }, duration);
        }
      },
      
      hideToast: () => {
        if (toastTimer) {
          clearTimeout(toastTimer);
          toastTimer = null;
        }
        
        set((state) => ({
          toast: {
            ...state.toast,
            isVisible: false,
          },
        }));
      },
      
      // 시스템 상태 관리
      setSystemStatus: (status) => {
        set({ systemStatus: status });
      },
      
      updateSystemStatus: (type, message) => {
        set({
          systemStatus: {
            type,
            message,
            timestamp: Date.now(),
          },
        });
      },
      
      // 모달 관리
      showModal: (config) => {
        set((state) => ({
          modal: {
            ...state.modal,
            ...config,
            isOpen: true,
          },
        }));
      },
      
      hideModal: () => {
        set((state) => ({
          modal: {
            ...state.modal,
            isOpen: false,
            onConfirm: undefined,
            onCancel: undefined,
            customContent: undefined,
          },
        }));
      },
      
      showConfirm: (title, message, onConfirm, onCancel) => {
        get().showModal({
          type: "confirm",
          title,
          message,
          onConfirm,
          onCancel,
        });
      },
      
      showAlert: (title, message, onConfirm) => {
        get().showModal({
          type: "alert",
          title,
          message,
          onConfirm,
        });
      },
      
      // 로딩 관리
      setLoading: (isLoading, message, progress) => {
        set((state) => ({
          loading: {
            ...state.loading,
            isLoading,
            message,
            progress,
          },
        }));
      },
      
      updateLoadingProgress: (progress) => {
        set((state) => ({
          loading: {
            ...state.loading,
            progress,
          },
        }));
      },
      
      // 에러 관리
      showError: (message, details) => {
        set({
          error: {
            hasError: true,
            message,
            details,
            timestamp: Date.now(),
          },
        });
        
        // 에러를 토스트로도 표시
        get().showToast(message, "error", 5000);
        
        // 시스템 상태도 에러로 업데이트
        get().updateSystemStatus("error", message);
        
        // 이전 타이머가 있다면 취소
        if (systemStatusTimer) {
          clearTimeout(systemStatusTimer);
          systemStatusTimer = null;
        }
        
        // 3초 후 자동으로 idle 상태로 복원
        systemStatusTimer = setTimeout(() => {
          get().updateSystemStatus("idle", "자동 저장됨");
          systemStatusTimer = null;
        }, 3000);
      },
      
      clearError: () => {
        set({
          error: {
            hasError: false,
          },
        });
      },
      
      // 성공 관리 (시스템 상태 + 토스트)
      showSuccess: (message) => {
        // 성공 토스트 표시
        get().showToast(message, "success", 2000);
        
        // 시스템 상태를 성공으로 업데이트
        get().updateSystemStatus("success", message);
        
        // 이전 타이머가 있다면 취소
        if (systemStatusTimer) {
          clearTimeout(systemStatusTimer);
          systemStatusTimer = null;
        }
        
        // 2초 후 자동으로 idle 상태로 복원
        systemStatusTimer = setTimeout(() => {
          get().updateSystemStatus("idle", "자동 저장됨");
          systemStatusTimer = null;
        }, 2000);
      },
      
      // 비동기 작업 관리 (AsyncOperationManager 기능 통합)
      startOperation: (operationType) => {
        const state = get();
        
        if (state.isOperationInProgress) {
          return false;
        }
        
        set({
          isOperationInProgress: true,
          currentOperation: operationType,
        });
        
        // 시스템 상태 업데이트
        get().updateSystemStatus("working", `${operationType}...`);
        
        return true;
      },
      
      endOperation: () => {
        const state = get();
        
        if (!state.isOperationInProgress) {
          console.warn("[UIStore] 진행 중인 작업이 없으나 endOperation 호출됨");
          return;
        }
        
        set({
          isOperationInProgress: false,
          currentOperation: null,
        });
        
        // 시스템 상태를 idle로 복원
        get().updateSystemStatus("idle", "자동 저장됨");
      },
      
      canStartOperation: (operationType) => {
        const state = get();
        return !state.isOperationInProgress;
      },
      
      isWorking: () => {
        return get().isOperationInProgress;
      },
      
      getCurrentOperation: () => {
        return get().currentOperation;
      },
      
      canPerformUndoRedo: () => {
        const state = get();
        return !state.isOperationInProgress;
      },
      
      // 초기화
      resetUI: () => {
        // 타이머 정리
        if (toastTimer) {
          clearTimeout(toastTimer);
          toastTimer = null;
        }
        
        if (systemStatusTimer) {
          clearTimeout(systemStatusTimer);
          systemStatusTimer = null;
        }
        
        set(initialState);
      },
    }),
    {
      name: "ui-store", // localStorage 키
      partialize: (state) => ({
        // 세션 상태들은 저장하지 않음
        // toast, modal, loading, error는 임시 상태이므로 제외
        // systemStatus의 일부만 저장
        systemStatus: {
          type: "idle" as const,
          message: "자동 저장됨",
          timestamp: Date.now(),
        },
      }),
    }
  )
); 