/**
 * Script Weaver - 에디터 스토어 공통 타입 정의
 * 
 * Phase 3.1.1: CORE SERVICES 인터페이스 설계
 * 생성일: 2025-06-21
 * 
 * 이 파일은 7개 도메인 분할을 위한 공통 타입들을 정의합니다.
 */

import type { Scene, ValidationResult } from '../../types/dialogue';

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

// ===== PROJECT DOMAIN 인터페이스 =====

/**
 * 프로젝트 도메인 인터페이스
 * 
 * 프로젝트/템플릿/씬 관리, 검증, Import/Export 기능을 담당합니다.
 * CORE SERVICES에만 의존하며 다른 도메인과 독립적입니다.
 */
export interface IProjectDomain {
  // ===== 기본 액션 =====
  
  /**
   * 현재 템플릿을 설정합니다.
   * 
   * @param templateKey - 설정할 템플릿 키
   * 
   * **의존성**: 없음 (독립적)
   */
  setCurrentTemplate(templateKey: string): void;

  /**
   * 현재 씬을 설정합니다.
   * 
   * @param sceneKey - 설정할 씬 키
   * 
   * **의존성**: 없음 (독립적)
   */
  setCurrentScene(sceneKey: string): void;

  // ===== 생성 액션 =====

  /**
   * 새 템플릿을 생성합니다.
   * 
   * @param templateKey - 생성할 템플릿 키
   * 
   * **의존성**: 없음 (독립적)
   */
  createTemplate(templateKey: string): void;

  /**
   * 새 씬을 생성합니다.
   * 
   * @param templateKey - 대상 템플릿 키
   * @param sceneKey - 생성할 씬 키
   * 
   * **의존성**: 없음 (독립적)
   */
  createScene(templateKey: string, sceneKey: string): void;

  // ===== 검증 액션 =====

  /**
   * 현재 씬의 유효성을 검증합니다.
   * 
   * @returns 검증 결과 (간단한 형태)
   * 
   * **의존성**: 없음 (독립적)
   */
  validateCurrentScene(): { isValid: boolean; errors: string[] };

  /**
   * 전체 데이터의 유효성을 검증합니다.
   * 
   * @returns 상세한 검증 결과
   * 
   * **의존성**: 없음 (독립적)
   */
  validateAllData(): ValidationResult;

  // ===== Import/Export 액션 =====

  /**
   * 데이터를 JSON 형식으로 내보냅니다.
   * 
   * @returns JSON 문자열
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  exportToJSON(): string;

  /**
   * 데이터를 CSV 형식으로 내보냅니다.
   * 
   * @returns dialogue와 localization CSV 문자열
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  exportToCSV(): { dialogue: string; localization: string };

  /**
   * JSON 데이터를 가져옵니다.
   * 
   * @param jsonString - 가져올 JSON 문자열
   * @throws 가져오기 실패 시 에러
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  importFromJSON(jsonString: string): void;

  // ===== 데이터 관리 액션 =====

  /**
   * 에디터를 초기 상태로 재설정합니다.
   * 
   * **의존성**: 없음 (독립적)
   */
  resetEditor(): void;

  /**
   * localStorage에서 데이터를 로드합니다.
   * 
   * **참고**: persist 미들웨어가 자동 처리
   * 
   * **의존성**: 없음 (독립적)
   */
  loadFromLocalStorage(): void;

  /**
   * 새로운 아키텍처로 데이터를 마이그레이션합니다.
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  migrateToNewArchitecture(): void;
}

// ===== PROJECT DOMAIN 관련 타입 =====

/**
 * 씬 검증 결과 (간단한 형태)
 */
export interface SceneValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * CSV 내보내기 결과
 */
export interface CSVExportResult {
  dialogue: string;
  localization: string;
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