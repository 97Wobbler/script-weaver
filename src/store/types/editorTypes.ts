/**
 * Script Weaver - 에디터 스토어 공통 타입 정의
 * 
 * Phase 3.1.1: CORE SERVICES 인터페이스 설계
 * 생성일: 2025-06-21
 * 
 * 이 파일은 7개 도메인 분할을 위한 공통 타입들을 정의합니다.
 */

import type { Scene } from '../../types/dialogue';

// ===== CORE SERVICES 관련 타입 =====

/**
 * 레이아웃 시스템 실행 타입
 */
export type LayoutType = "global" | "descendant" | "child";

/**
 * 노드 개수 제한 검증 옵션
 */
export interface NodeCountValidationOptions {
  endCompoundAction?: boolean;
}

/**
 * 노드 개수 제한 검증 결과
 */
export interface NodeCountValidationResult {
  isValid: boolean;
}

// ===== CORE SERVICES 인터페이스 =====

/**
 * 핵심 서비스 인터페이스
 * 
 * 도메인 간 공통으로 사용되는 5개 메서드를 정의합니다.
 * 순환 의존성 방지를 위해 독립적으로 구현됩니다.
 */
export interface ICoreServices {
  /**
   * 히스토리에 액션을 기록합니다.
   * 
   * @param action - 기록할 액션 설명
   * 
   * **사용 빈도**: 9회 호출됨
   * **호출 도메인**: PROJECT, NODE, LAYOUT
   */
  pushToHistory(action: string): void;

  /**
   * 고유한 노드 키를 생성합니다.
   * 
   * @returns 생성된 고유 노드 키
   * 
   * **사용 빈도**: 5회 호출됨
   * **호출 도메인**: NODE OPERATIONS
   */
  generateNodeKey(): string;

  /**
   * 노드 개수 제한을 검증합니다.
   * 
   * @param options - 검증 옵션
   * @returns 검증 결과
   * 
   * **사용 빈도**: 4회 호출됨
   * **호출 도메인**: NODE OPERATIONS
   */
  validateNodeCountLimit(options?: NodeCountValidationOptions): NodeCountValidationResult;

  /**
   * 현재 진행 중인 복합 액션을 종료합니다.
   * 
   * **사용 빈도**: 4회 호출됨
   * **호출 도메인**: NODE OPERATIONS
   */
  endCompoundAction(): void;

  /**
   * 레이아웃 시스템을 실행합니다.
   * 
   * @param currentScene - 현재 씬
   * @param rootNodeId - 루트 노드 ID
   * @param layoutType - 레이아웃 유형
   * 
   * **사용 빈도**: 3회 호출됨
   * **호출 도메인**: LAYOUT
   */
  runLayoutSystem(
    currentScene: Scene, 
    rootNodeId: string, 
    layoutType: LayoutType
  ): Promise<void>;
}

// ===== 의존성 주입 관련 타입 =====

/**
 * 의존성 주입 컨테이너 인터페이스
 * 
 * 순환 의존성 방지를 위한 DI 패턴을 지원합니다.
 */
export interface IDependencyContainer {
  /**
   * 핵심 서비스를 등록합니다.
   */
  registerCoreServices(services: ICoreServices): void;

  /**
   * 핵심 서비스를 조회합니다.
   */
  getCoreServices(): ICoreServices;
}

// ===== 유틸리티 타입 =====

/**
 * 선택적 매개변수를 위한 유틸리티 타입
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 메서드 실행 결과를 나타내는 기본 타입
 */
export interface ExecutionResult {
  success: boolean;
  message?: string;
  data?: any;
} 