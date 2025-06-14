// 대화 출력 속도 상수
export const DialogueSpeed = {
  SLOW: "SLOW",
  NORMAL: "NORMAL",
  FAST: "FAST",
} as const;

export type DialogueSpeed = typeof DialogueSpeed[keyof typeof DialogueSpeed];

// 액션 타입 (분기 후 동작 정의)
export interface DialogueAction {
  nextNodeKey?: string;
  callbackKey?: string;
}

// 기본 대화 구조 (모든 노드가 공유) - 컨텐츠-키 분리 아키텍처 적용
export interface BaseDialogue {
  type: "text" | "choice" | "input";
  
  // 실제 텍스트 (사용자가 입력하는 내용)
  speakerText?: string;
  contentText?: string;
  
  // 키 참조 (LocalizationStore와 연동)
  speakerKeyRef?: string;
  textKeyRef?: string;
  
  // 기존 콜백 키들
  onEnterCallbackKey?: string;
  onExitCallbackKey?: string;
  isSkippable?: boolean;
}

// 텍스트 노드 (단순 텍스트 표시 후 자동 진행)
export interface TextDialogue extends BaseDialogue {
  type: "text";
  nextNodeKey?: string;
  speed?: DialogueSpeed;
}

// 선택지 노드 (여러 선택지 제시 및 분기) - 선택지에도 실제 텍스트 추가
export interface ChoiceDialogue extends BaseDialogue {
  type: "choice";
  choices: {
    [choiceKey: string]: {
      // 실제 텍스트 (사용자가 입력하는 내용)
      choiceText: string;
      // 키 참조 (LocalizationStore와 연동)
      textKeyRef?: string;
      nextNodeKey: string;
      onSelectedCallbackKey?: string;
    };
  };
  speed?: DialogueSpeed;
  shuffle?: boolean;
}

// 입력 노드 (사용자 입력 처리)
export interface InputDialogue extends BaseDialogue {
  type: "input";
  onSuccessCallbackKey?: string;
  onFailedCallbackKey?: string;
  inputResultActions?: {
    onSuccess: DialogueAction;
    onFailed: DialogueAction;
  };
}

// 합집합 타입 (Discriminated Union)
export type Dialogue = TextDialogue | ChoiceDialogue | InputDialogue;

// 에디터에서 사용할 노드 래퍼 (위치 정보 포함)
export interface EditorNodeWrapper {
  nodeKey: string;
  dialogue: Dialogue;
  position: { x: number; y: number };
  hidden?: boolean;  // 노드 숨김 상태
}

// 씬 타입 (노드들의 집합) - 빈 객체도 허용
export type Scene = { [nodeKey: string]: EditorNodeWrapper };

// 템플릿 타입 (씬들의 집합) - 빈 객체도 허용
export type TemplateDialogues = { [templateKey: string]: { [sceneKey: string]: Scene } };

// 에디터 상태
export interface EditorState {
  currentTemplate: string;
  templateData: TemplateDialogues;
  currentScene: string;
  selectedNodeKey?: string;
  lastNodePosition: { x: number; y: number };
}

// CSV Export용 타입 - 실제 텍스트와 키 참조 모두 포함
export interface DialogueCSVRow {
  templateKey: string;
  sceneKey: string;
  nodeKey: string;
  textKey: string;
  speakerKey: string;
  // 실제 텍스트 필드 추가
  speakerText: string;
  contentText: string;
  type: string;
  choices_textKeys: string; // 세미콜론으로 구분
  choices_texts: string; // 실제 선택지 텍스트들 (세미콜론으로 구분)
  choices_nextKeys: string; // 세미콜론으로 구분
}

export interface LocalizationCSVRow {
  key: string;
  ko: string; // 한국어 원문
}

// 유효성 검사 결과
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    nodeKey: string;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    nodeKey: string;
    field: string;
    message: string;
  }>;
}

// 데이터 마이그레이션 관련 타입
export interface MigrationResult {
  success: boolean;
  migratedNodes: number;
  errors: string[];
} 