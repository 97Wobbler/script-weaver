/**
 * Script Weaver - 에디터 스토어 공통 타입 정의
 * 
 * Phase 3.1.1: CORE SERVICES 인터페이스 설계
 * 생성일: 2025-06-21
 * 
 * 이 파일은 7개 도메인 분할을 위한 공통 타입들을 정의합니다.
 */

import type { Scene, ValidationResult, TemplateDialogues, EditorNodeWrapper, Dialogue } from '../../types/dialogue';
import type { LocalizationData } from '../localizationStore';

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

  /**
   * 씬에서 노드를 조회합니다.
   * 
   * @param scene - 대상 씬
   * @param nodeKey - 노드 키
   * @returns 노드 또는 undefined
   * 
   * **사용 빈도**: 공통 헬퍼 함수
   * **호출 도메인**: NODE OPERATIONS
   */
  getNode(scene: Scene, nodeKey: string): any;

  /**
   * 씬에 노드를 설정합니다 (불변성 유지).
   * 
   * @param scene - 대상 씬
   * @param nodeKey - 노드 키
   * @param node - 설정할 노드
   * @returns 새로운 씬
   * 
   * **사용 빈도**: 공통 헬퍼 함수
   * **호출 도메인**: NODE OPERATIONS
   */
  setNode(scene: Scene, nodeKey: string, node: any): Scene;
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

// ===== HISTORY DOMAIN 인터페이스 =====

/**
 * 히스토리 상태 타입
 * 
 * Undo/Redo를 위한 히스토리 엔트리 정의
 */
export interface HistoryState {
  templateData: TemplateDialogues;
  localizationData: LocalizationData;
  timestamp: number;
  action: string;
  groupId?: string; // 복합 액션 그룹 식별자
}

/**
 * 히스토리 도메인 인터페이스
 * 
 * 실행취소/재실행 및 복합 액션 관리를 담당합니다.
 * 독립적으로 운영되며 다른 도메인과 의존성이 없습니다.
 */
export interface IHistoryDomain {
  // ===== 상태 =====
  
  /**
   * 히스토리 스택
   */
  history: HistoryState[];

  /**
   * 현재 히스토리 인덱스
   */
  historyIndex: number;

  /**
   * 실행취소/재실행 진행 중 플래그
   */
  isUndoRedoInProgress: boolean;

  /**
   * 현재 복합 액션 ID
   */
  currentCompoundActionId: string | null;

  /**
   * 복합 액션 시작 상태
   */
  compoundActionStartState: HistoryState | null;

  // ===== 복합 액션 관리 =====

  /**
   * 복합 액션을 시작합니다.
   * 
   * @param actionName - 복합 액션 이름
   * @returns 복합 액션 ID (차단된 경우 blocked- 접두사)
   * 
   * **의존성**: AsyncOperationManager (내부적)
   */
  startCompoundAction(actionName: string): string;

  /**
   * 현재 진행 중인 복합 액션을 종료합니다.
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  endCompoundAction(): void;

  // ===== 히스토리 관리 =====

  /**
   * 히스토리에 액션을 기록합니다.
   * 
   * @param action - 기록할 액션 설명
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  pushToHistory(action: string): void;

  /**
   * 텍스트 편집 전용 히스토리를 기록합니다.
   * 
   * @param action - 기록할 액션 설명
   * 
   * **의존성**: pushToHistory
   */
  pushToHistoryWithTextEdit(action: string): void;

  // ===== Undo/Redo 액션 =====

  /**
   * 마지막 액션을 되돌립니다.
   * 
   * **의존성**: AsyncOperationManager, LocalizationStore (내부적)
   */
  undo(): void;

  /**
   * 되돌린 액션을 다시 실행합니다.
   * 
   * **의존성**: AsyncOperationManager, LocalizationStore (내부적)
   */
  redo(): void;

  /**
   * 되돌리기가 가능한지 확인합니다.
   * 
   * @returns 되돌리기 가능 여부
   * 
   * **의존성**: 없음 (독립적)
   */
  canUndo(): boolean;

  /**
   * 다시실행이 가능한지 확인합니다.
   * 
   * @returns 다시실행 가능 여부
   * 
   * **의존성**: 없음 (독립적)
   */
  canRedo(): boolean;
}

// ===== HISTORY DOMAIN 관련 타입 =====

/**
 * 복합 액션 시작 결과
 */
export interface CompoundActionResult {
  actionId: string;
  isBlocked: boolean;
}

/**
 * 히스토리 작업 옵션
 */
export interface HistoryOperationOptions {
  skipCompoundAction?: boolean;
  maxHistorySize?: number;
}

// ===== NODE CORE DOMAIN 인터페이스 =====

/**
 * 노드 핵심 도메인 인터페이스
 * 
 * 노드의 기본 CRUD, 선택 관리, 내용 수정, 연결 관리 등 핵심 기능을 담당합니다.
 * CORE SERVICES와 HISTORY DOMAIN에 의존합니다.
 */
export interface INodeDomain {
  // ===== 상태 =====
  
  /**
   * 연속 드래그 감지용 - 마지막 드래그된 노드 키
   */
  lastDraggedNodeKey: string | null;

  /**
   * 연속 드래그 감지용 - 마지막 드래그 액션 시간
   */
  lastDragActionTime: number;

  /**
   * 다중 선택된 노드 키들
   */
  selectedNodeKeys: Set<string>;

  // ===== 선택 관리 =====

  /**
   * 단일 노드를 선택합니다.
   * 
   * @param nodeKey - 선택할 노드 키 (undefined시 선택 해제)
   * 
   * **의존성**: 없음 (독립적)
   */
  setSelectedNode(nodeKey?: string): void;

  /**
   * 노드 선택을 토글합니다.
   * 
   * @param nodeKey - 토글할 노드 키
   * 
   * **의존성**: 없음 (독립적)
   */
  toggleNodeSelection(nodeKey: string): void;

  /**
   * 모든 선택을 해제합니다.
   * 
   * **의존성**: 없음 (독립적)
   */
  clearSelection(): void;

  /**
   * 여러 노드를 한번에 선택합니다.
   * 
   * @param nodeKeys - 선택할 노드 키 배열
   * 
   * **의존성**: 없음 (독립적)
   */
  selectMultipleNodes(nodeKeys: string[]): void;

  // ===== 기본 CRUD =====

  /**
   * 새 노드를 추가합니다.
   * 
   * @param node - 추가할 노드 래퍼
   * 
   * **의존성**: CORE SERVICES (pushToHistory)
   */
  addNode(node: EditorNodeWrapper): void;

  /**
   * 기존 노드를 업데이트합니다.
   * 
   * @param nodeKey - 업데이트할 노드 키
   * @param updates - 업데이트할 속성들
   * 
   * **의존성**: 없음 (독립적)
   */
  updateNode(nodeKey: string, updates: Partial<EditorNodeWrapper>): void;

  /**
   * 노드를 삭제합니다.
   * 
   * @param nodeKey - 삭제할 노드 키
   * 
   * **의존성**: CORE SERVICES (pushToHistory), LocalizationStore (내부적)
   */
  deleteNode(nodeKey: string): void;

  /**
   * 노드를 이동합니다.
   * 
   * @param nodeKey - 이동할 노드 키
   * @param position - 새 위치
   * 
   * **의존성**: CORE SERVICES (pushToHistory)
   */
  moveNode(nodeKey: string, position: { x: number; y: number }): void;

  // ===== 내용 수정 =====

  /**
   * 노드의 대화 내용을 업데이트합니다.
   * 
   * @param nodeKey - 업데이트할 노드 키
   * @param dialogue - 업데이트할 대화 내용
   * 
   * **의존성**: 없음 (독립적)
   */
  updateDialogue(nodeKey: string, dialogue: Partial<Dialogue>): void;

  /**
   * 노드의 텍스트를 업데이트합니다.
   * 
   * @param nodeKey - 업데이트할 노드 키
   * @param speakerText - 화자 텍스트 (선택적)
   * @param contentText - 내용 텍스트 (선택적)
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  updateNodeText(nodeKey: string, speakerText?: string, contentText?: string): void;

  /**
   * 선택지 텍스트를 업데이트합니다.
   * 
   * @param nodeKey - 업데이트할 노드 키
   * @param choiceKey - 선택지 키
   * @param choiceText - 새 선택지 텍스트
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  updateChoiceText(nodeKey: string, choiceKey: string, choiceText: string): void;

  // ===== 연결 관리 =====

  /**
   * 두 노드를 연결합니다.
   * 
   * @param fromNodeKey - 출발 노드 키
   * @param toNodeKey - 도착 노드 키
   * @param choiceKey - 선택지 키 (선택지 노드인 경우)
   * 
   * **의존성**: 없음 (독립적)
   */
  connectNodes(fromNodeKey: string, toNodeKey: string, choiceKey?: string): void;

  /**
   * 노드 연결을 끊습니다.
   * 
   * @param fromNodeKey - 출발 노드 키
   * @param choiceKey - 선택지 키 (선택지 노드인 경우)
   * 
   * **의존성**: 없음 (독립적)
   */
  disconnectNodes(fromNodeKey: string, choiceKey?: string): void;

  // ===== 유틸리티 =====

  /**
   * 고유한 노드 키를 생성합니다.
   * 
   * @returns 생성된 노드 키
   * 
   * **의존성**: 없음 (독립적)
   */
  generateNodeKey(): string;

  /**
   * 현재 노드 개수를 반환합니다.
   * 
   * @returns 현재 노드 개수
   * 
   * **의존성**: 없음 (독립적)
   */
  getCurrentNodeCount(): number;

  /**
   * 새 노드 생성이 가능한지 확인합니다.
   * 
   * @returns 생성 가능 여부
   * 
   * **의존성**: getCurrentNodeCount
   */
  canCreateNewNode(): boolean;

  // ===== 참조/상태 업데이트 =====

  /**
   * 노드의 키 참조를 업데이트합니다.
   * 
   * @param nodeKey - 업데이트할 노드 키
   * @param keyType - 키 타입 ("speaker" | "text")
   * @param newKeyRef - 새 키 참조
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  updateNodeKeyReference(nodeKey: string, keyType: "speaker" | "text", newKeyRef: string): void;

  /**
   * 선택지의 키 참조를 업데이트합니다.
   * 
   * @param nodeKey - 업데이트할 노드 키
   * @param choiceKey - 선택지 키
   * @param newKeyRef - 새 키 참조
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  updateChoiceKeyReference(nodeKey: string, choiceKey: string, newKeyRef: string): void;

  /**
   * 노드의 가시성을 업데이트합니다.
   * 
   * @param nodeKey - 업데이트할 노드 키
   * @param hidden - 숨김 여부
   * 
   * **의존성**: 없음 (독립적)
   */
  updateNodeVisibility(nodeKey: string, hidden: boolean): void;

  /**
   * 노드의 위치와 가시성을 동시에 업데이트합니다.
   * 
   * @param nodeKey - 업데이트할 노드 키
   * @param position - 새 위치
   * @param hidden - 숨김 여부
   * 
   * **의존성**: 없음 (독립적)
   */
  updateNodePositionAndVisibility(nodeKey: string, position: { x: number; y: number }, hidden: boolean): void;
}

// ===== NODE CORE DOMAIN 관련 타입 =====

/**
 * 노드 위치 타입
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * 노드 선택 결과
 */
export interface NodeSelectionResult {
  selectedCount: number;
  selectedKeys: string[];
}

/**
 * 노드 업데이트 옵션
 */
export interface NodeUpdateOptions {
  skipHistory?: boolean;
  skipValidation?: boolean;
}

/**
 * 키 타입 정의
 */
export type KeyType = "speaker" | "text";

// ===== NODE OPERATIONS DOMAIN 인터페이스 =====

/**
 * 노드 연산 도메인 인터페이스
 * 
 * 노드의 복잡한 연산 (생성, 복사, 삭제, 자동 연결 등)을 담당합니다.
 * CORE SERVICES, HISTORY DOMAIN, NODE CORE DOMAIN에 의존합니다.
 */
export interface INodeOperationsDomain {
  // ===== 노드 생성 =====

  /**
   * 새 텍스트 노드를 생성합니다.
   * 
   * @param contentText - 내용 텍스트 (선택적)
   * @param speakerText - 화자 텍스트 (선택적)
   * @returns 생성된 노드 키
   * 
   * **의존성**: CORE SERVICES (validateNodeCountLimit, generateNodeKey), NODE CORE (getNextNodePosition, addNode)
   */
  createTextNode(contentText?: string, speakerText?: string): string;

  /**
   * 새 선택지 노드를 생성합니다.
   * 
   * @param contentText - 내용 텍스트 (선택적)
   * @param speakerText - 화자 텍스트 (선택적)
   * @returns 생성된 노드 키
   * 
   * **의존성**: CORE SERVICES (validateNodeCountLimit, generateNodeKey), NODE CORE (getNextNodePosition, addNode)
   */
  createChoiceNode(contentText?: string, speakerText?: string): string;

  // ===== 자동 생성/연결 =====

  /**
   * 선택지에 연결된 새 노드를 생성하고 자동 연결합니다.
   * 
   * @param fromNodeKey - 출발 노드 키
   * @param choiceKey - 선택지 키
   * @param nodeType - 생성할 노드 타입 (기본값: "text")
   * @returns 생성된 노드 키
   * 
   * **의존성**: CORE SERVICES (startCompoundAction, generateNodeKey, endCompoundAction), LAYOUT (calculateChildNodePosition, arrangeSelectedNodeChildren)
   */
  createAndConnectChoiceNode(fromNodeKey: string, choiceKey: string, nodeType?: "text" | "choice"): Promise<string>;

  /**
   * 텍스트 노드에 연결된 새 노드를 생성하고 자동 연결합니다.
   * 
   * @param fromNodeKey - 출발 노드 키
   * @param nodeType - 생성할 노드 타입 (기본값: "text")
   * @returns 생성된 노드 키
   * 
   * **의존성**: CORE SERVICES (startCompoundAction, generateNodeKey, endCompoundAction), LAYOUT (calculateChildNodePosition, arrangeSelectedNodeChildren)
   */
  createAndConnectTextNode(fromNodeKey: string, nodeType?: "text" | "choice"): Promise<string>;

  // ===== 복사/붙여넣기 =====

  /**
   * 선택된 노드들을 클립보드에 복사합니다.
   * 
   * **의존성**: 없음 (독립적)
   */
  copySelectedNodes(): void;

  /**
   * 클립보드의 노드들을 붙여넣습니다.
   * 
   * @param position - 붙여넣을 위치 (선택적)
   * 
   * **의존성**: CORE SERVICES (generateNodeKey, pushToHistory), LocalizationStore (내부적)
   */
  pasteNodes(position?: { x: number; y: number }): void;

  /**
   * 특정 노드를 복제합니다.
   * 
   * @param nodeKey - 복제할 노드 키
   * @returns 복제된 노드 키
   * 
   * **의존성**: pasteNodes
   */
  duplicateNode(nodeKey: string): string;

  // ===== 다중 작업 =====

  /**
   * 선택된 모든 노드를 삭제합니다.
   * 
   * **의존성**: CORE SERVICES (pushToHistory), LocalizationStore (내부적)
   */
  deleteSelectedNodes(): void;

  /**
   * 선택된 모든 노드를 이동합니다.
   * 
   * @param deltaX - X축 이동량
   * @param deltaY - Y축 이동량
   * 
   * **의존성**: NODE CORE (moveNode)
   */
  moveSelectedNodes(deltaX: number, deltaY: number): void;

  // ===== 선택지 관리 =====

  /**
   * 노드에 새 선택지를 추가합니다.
   * 
   * @param nodeKey - 대상 노드 키
   * @param choiceKey - 선택지 키
   * @param choiceText - 선택지 텍스트
   * @param nextNodeKey - 연결할 노드 키 (선택적)
   * 
   * **의존성**: LocalizationStore (내부적)
   */
  addChoice(nodeKey: string, choiceKey: string, choiceText: string, nextNodeKey?: string): void;

  /**
   * 노드에서 선택지를 제거합니다.
   * 
   * @param nodeKey - 대상 노드 키
   * @param choiceKey - 제거할 선택지 키
   * 
   * **의존성**: 없음 (독립적)
   */
  removeChoice(nodeKey: string, choiceKey: string): void;
}

// ===== NODE OPERATIONS DOMAIN 관련 타입 =====

/**
 * 노드 생성 옵션 타입
 */
export interface NodeCreationOptions {
  contentText?: string;
  speakerText?: string;
  position?: NodePosition;
  nodeType?: NodeType;
}

/**
 * 노드 연결 옵션 타입
 */
export interface NodeConnectionOptions {
  fromNodeKey: string;
  choiceKey?: string;
  nodeType?: NodeType;
  autoLayout?: boolean;
}

/**
 * 복사/붙여넣기 결과 타입
 */
export interface PasteResult {
  success: boolean;
  pastedNodeKeys: string[];
  errors?: string[];
}

/**
 * 다중 작업 결과 타입
 */
export interface MultiOperationResult {
  success: boolean;
  affectedNodeKeys: string[];
  operationType: 'delete' | 'move' | 'copy';
  errors?: string[];
}

/**
 * 선택지 정보 타입
 */
export interface ChoiceInfo {
  choiceKey: string;
  choiceText: string;
  nextNodeKey?: string;
  textKeyRef?: string;
}

/**
 * 노드 타입 정의
 */
export type NodeType = "text" | "choice";

// ===== LAYOUT DOMAIN 인터페이스 =====

/**
 * 레이아웃 도메인 인터페이스
 * 
 * 노드 배치, 위치 계산, 자동 정렬 등 레이아웃 관련 기능을 담당합니다.
 * CORE SERVICES와 HISTORY DOMAIN에 의존합니다.
 */
export interface ILayoutDomain {
  // ===== 상태 =====
  
  /**
   * 마지막 노드 위치 (새 노드 생성 시 참조)
   */
  lastNodePosition: NodePosition;

  // ===== 위치 계산 =====

  /**
   * 다음 노드 위치를 계산합니다.
   * 
   * @returns 새 노드의 위치
   * 
   * **의존성**: 없음 (독립적)
   */
  getNextNodePosition(): NodePosition;

  /**
   * 자식 노드의 위치를 계산합니다.
   * 
   * @param parentNodeKey - 부모 노드 키
   * @param choiceKey - 선택지 키 (선택지 노드인 경우)
   * @returns 자식 노드의 위치
   * 
   * **의존성**: 없음 (독립적)
   */
  calculateChildNodePosition(parentNodeKey: string, choiceKey?: string): NodePosition;

  // ===== 구 트리 정렬 시스템 =====

  /**
   * 자식 노드들을 트리 형태로 정렬합니다.
   * 
   * @param rootNodeKey - 루트 노드 키
   * 
   * **의존성**: CORE SERVICES (pushToHistory)
   */
  arrangeChildNodesAsTree(rootNodeKey: string): void;

  /**
   * 모든 노드를 트리 형태로 정렬합니다.
   * 
   * **의존성**: CORE SERVICES (pushToHistory)
   */
  arrangeAllNodesAsTree(): void;

  /**
   * Dagre 라이브러리를 사용하여 노드를 정렬합니다.
   * 
   * **의존성**: CORE SERVICES (pushToHistory)
   */
  arrangeNodesWithDagre(): void;

  // ===== 신 레이아웃 시스템 =====

  /**
   * 전체 캔버스의 모든 노드를 정렬합니다.
   * 
   * @param internal - 내부 호출 여부 (AsyncOperationManager 사용 여부)
   * @returns Promise<void>
   * 
   * **의존성**: CORE SERVICES (runLayoutSystem), HISTORY DOMAIN (pushToHistory)
   */
  arrangeAllNodes(internal?: boolean): Promise<void>;

  /**
   * 선택된 노드의 직접 자식들을 정렬합니다.
   * 
   * @param nodeKey - 부모 노드 키
   * @param internal - 내부 호출 여부 (AsyncOperationManager 사용 여부)
   * @returns Promise<void>
   * 
   * **의존성**: CORE SERVICES (runLayoutSystem), HISTORY DOMAIN (pushToHistory)
   */
  arrangeSelectedNodeChildren(nodeKey: string, internal?: boolean): Promise<void>;

  /**
   * 선택된 노드의 모든 후손들을 정렬합니다.
   * 
   * @param nodeKey - 루트 노드 키
   * @param internal - 내부 호출 여부 (AsyncOperationManager 사용 여부)
   * @returns Promise<void>
   * 
   * **의존성**: CORE SERVICES (runLayoutSystem), HISTORY DOMAIN (pushToHistory)
   */
  arrangeSelectedNodeDescendants(nodeKey: string, internal?: boolean): Promise<void>;
}

// ===== LAYOUT DOMAIN 관련 타입 =====

/**
 * 레이아웃 옵션 타입
 */
export interface LayoutOptions {
  rootNodeId?: string;
  depth?: number | null;
  includeRoot?: boolean;
  direction?: "LR" | "TB" | "RL" | "BT";
  nodeSpacing?: number;
  rankSpacing?: number;
  anchorNodeId?: string;
}

/**
 * 레이아웃 결과 타입
 */
export interface LayoutResult {
  success: boolean;
  affectedNodeKeys: string[];
  layoutType: LayoutType;
  nodeCount: number;
  hasPositionChanged: boolean;
  errors?: string[];
}

/**
 * 노드 관계 매핑 타입
 */
export interface NodeRelationMaps {
  childrenMap: Map<string, string[]>;
  parentMap: Map<string, string[]>;
}

/**
 * 레벨 매핑 타입
 */
export type LevelMap = Map<number, string[]>;

/**
 * 위치 초기화 데이터 타입
 */
export interface PositionInitData {
  currentScene: any;
  allNodes: any[];
  lastNodePosition: NodePosition;
  constants: {
    DEFAULT_NODE_WIDTH: number;
    DEFAULT_NODE_HEIGHT: number;
    SPACING_X: number;
    SPACING_Y: number;
    MAX_ATTEMPTS: number;
    MAX_ROWS_PER_COLUMN: number;
  };
}

/**
 * 노드 크기 타입
 */
export interface NodeDimensions {
  width: number;
  height: number;
}

/**
 * 위치 캡처 결과 타입
 */
export type PositionMap = Map<string, NodePosition>;

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

// ===== 통합 스토어 인터페이스 =====

/**
 * 통합 에디터 스토어 인터페이스
 * 
 * 모든 도메인 인터페이스를 통합하여 단일 스토어 인터페이스를 제공합니다.
 * Zustand를 기반으로 하며 persist 미들웨어를 사용합니다.
 */
export interface IEditorStore extends 
  IProjectDomain,
  IHistoryDomain, 
  INodeDomain,
  INodeOperationsDomain,
  ILayoutDomain {
  
  // ===== 추가 상태 (EditorState 기반) =====
  
  /**
   * 현재 선택된 템플릿 키
   */
  currentTemplate: string;
  
  /**
   * 전체 템플릿 데이터
   */
  templateData: TemplateDialogues;
  
  /**
   * 현재 선택된 씬 키
   */
  currentScene: string;
  
  /**
   * 단일 선택된 노드 키 (UI 상태)
   */
  selectedNodeKey?: string;
  
  /**
   * 전역 토스트 메시지 함수 (UI 도메인)
   */
  showToast?: (message: string, type?: "success" | "info" | "warning") => void;
}

/**
 * 에디터 상태 타입 (기본 상태만 포함)
 */
export interface EditorState {
  currentTemplate: string;
  templateData: TemplateDialogues;
  currentScene: string;
  selectedNodeKey?: string;
  lastNodePosition: NodePosition;
  
  // NODE DOMAIN 상태
  lastDraggedNodeKey: string | null;
  lastDragActionTime: number;
  selectedNodeKeys: Set<string>;
  
  // HISTORY DOMAIN 상태
  history: HistoryState[];
  historyIndex: number;
  isUndoRedoInProgress: boolean;
  currentCompoundActionId: string | null;
  compoundActionStartState: HistoryState | null;
  
  // UI DOMAIN 상태
  showToast?: (message: string, type?: "success" | "info" | "warning") => void;
}

/**
 * Zustand 스토어 설정 타입
 */
export interface StoreConfig {
  name: string;
  version: number;
  onRehydrateStorage?: () => (state: IEditorStore | null) => void;
}

/**
 * 스토어 미들웨어 옵션 타입
 */
export interface StoreMiddlewareOptions {
  persist?: {
    name: string;
    version: number;
    onRehydrateStorage?: () => (state: IEditorStore | null) => void;
  };
  devtools?: boolean;
}

// ===== 통합 스토어 관련 타입 =====

/**
 * 스토어 초기화 옵션 타입
 */
export interface StoreInitOptions {
  initialTemplate?: string;
  initialScene?: string;
  enablePersist?: boolean;
  enableDevtools?: boolean;
}

/**
 * 스토어 상태 변경 함수 타입
 */
export type StateUpdater<T> = (state: T) => T | Partial<T>;

/**
 * 스토어 액션 함수 타입
 */
export type StoreAction<T = void> = (...args: any[]) => T;

/**
 * 스토어 선택자 함수 타입
 */
export type StoreSelector<T, R> = (state: T) => R;

// ===== 도메인 통합 관련 타입 =====

/**
 * 도메인 서비스 컨테이너 타입
 */
export interface DomainServiceContainer {
  coreServices: ICoreServices;
  projectDomain: IProjectDomain;
  historyDomain: IHistoryDomain;
  nodeDomain: INodeDomain;
  nodeOperationsDomain: INodeOperationsDomain;
  layoutDomain: ILayoutDomain;
}

/**
 * 도메인 의존성 맵 타입
 */
export interface DomainDependencyMap {
  [domainName: string]: string[];
}

/**
 * 스토어 팩토리 옵션 타입
 */
export interface StoreFactoryOptions {
  domains: DomainServiceContainer;
  config: StoreConfig;
  middlewareOptions?: StoreMiddlewareOptions;
}

// ===== 타입 유틸리티 =====

/**
 * 실행 결과 타입
 */
export interface ExecutionResult {
  success: boolean;
  message?: string;
  data?: any;
  errors?: string[];
}

/**
 * 비동기 작업 결과 타입
 */
export interface AsyncOperationResult<T = any> extends ExecutionResult {
  data?: T;
  duration?: number;
}

// ===== Import 타입들 =====

/**
 * 외부 의존성 타입들을 재export
 */
export type { TemplateDialogues, EditorNodeWrapper, Dialogue, Scene, ValidationResult } from '../../types/dialogue';
export type { LocalizationData } from '../localizationStore'; 