export type OperationStatus = "idle" | "working" | "error" | "success";

export interface SystemStatus {
  type: OperationStatus;
  message: string;
  timestamp: number;
}

export type StatusChangeCallback = (status: SystemStatus) => void;

/**
 * 비동기 작업 관리자
 * - 복합 액션, 정렬 등 비동기 작업의 중복 실행 방지
 * - 작업 진행 상태 관리 및 알림
 * - undo/redo 차단 기능
 */
export class AsyncOperationManager {
  private isOperationInProgress = false;
  private currentOperation: string | null = null;
  private onStatusChange?: StatusChangeCallback;

  constructor(onStatusChange?: StatusChangeCallback) {
    this.onStatusChange = onStatusChange;
  }

  /**
   * 새로운 작업을 시작할 수 있는지 확인
   */
  canStartOperation(operationType: string): boolean {
    if (this.isOperationInProgress) {
      return false;
    }
    return true;
  }

  /**
   * 비동기 작업 시작
   */
  startOperation(operationType: string): boolean {
    if (!this.canStartOperation(operationType)) {
      return false;
    }

    this.isOperationInProgress = true;
    this.currentOperation = operationType;

    this.notifyStatusChange("working", `${operationType}...`);

    return true;
  }

  /**
   * 비동기 작업 완료
   */
  endOperation(): void {
    if (!this.isOperationInProgress) {
      console.warn("[AsyncOperationManager] 진행 중인 작업이 없으나 endOperation 호출됨");
      return;
    }

    this.isOperationInProgress = false;
    this.currentOperation = null;

    this.notifyStatusChange("idle", "자동 저장됨");
  }

  /**
   * 작업 진행 중인지 확인
   */
  isWorking(): boolean {
    return this.isOperationInProgress;
  }

  /**
   * 현재 진행 중인 작업 이름 반환
   */
  getCurrentOperation(): string | null {
    return this.currentOperation;
  }

  /**
   * undo/redo 작업이 가능한지 확인
   */
  canPerformUndoRedo(): boolean {
    if (this.isOperationInProgress) {
      return false;
    }
    return true;
  }

  /**
   * 상태 변경 알림
   */
  private notifyStatusChange(type: OperationStatus, message: string): void {
    if (this.onStatusChange) {
      this.onStatusChange({
        type,
        message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 상태 변경 콜백 업데이트
   */
  setStatusChangeCallback(callback?: StatusChangeCallback): void {
    this.onStatusChange = callback;
  }

  /**
   * 에러 상태 표시
   */
  showError(message: string): void {
    console.error(`[AsyncOperationManager] 에러: ${message}`);
    this.notifyStatusChange("error", message);

    // 3초 후 자동으로 idle 상태로 복원
    setTimeout(() => {
      this.notifyStatusChange("idle", "자동 저장됨");
    }, 3000);
  }

  /**
   * 성공 상태 표시 (임시)
   */
  showSuccess(message: string): void {
    this.notifyStatusChange("success", message);

    // 2초 후 자동으로 idle 상태로 복원
    setTimeout(() => {
      this.notifyStatusChange("idle", "자동 저장됨");
    }, 2000);
  }
}

// 전역 인스턴스 (싱글톤 패턴)
export const globalAsyncOperationManager = new AsyncOperationManager();
