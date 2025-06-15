import type { TemplateDialogues, EditorNodeWrapper, Dialogue, TextDialogue, ChoiceDialogue, MigrationResult } from "../types/dialogue";
import type { LocalizationData } from "../store/localizationStore";

// 기존 데이터 구조 (마이그레이션 전)
interface LegacyBaseDialogue {
  type: "text" | "choice" | "input";
  speakerKey?: string;
  textKey?: string;
  onEnterCallbackKey?: string;
  onExitCallbackKey?: string;
  isSkippable?: boolean;
}

interface LegacyTextDialogue extends LegacyBaseDialogue {
  type: "text";
  nextNodeKey?: string;
  speed?: any;
}

interface LegacyChoiceDialogue extends LegacyBaseDialogue {
  type: "choice";
  choices: {
    [choiceKey: string]: {
      textKey: string;
      nextNodeKey: string;
      onSelectedCallbackKey?: string;
    };
  };
  speed?: any;
  shuffle?: boolean;
}

interface LegacyInputDialogue extends LegacyBaseDialogue {
  type: "input";
  onSuccessCallbackKey?: string;
  onFailedCallbackKey?: string;
  inputResultActions?: any;
}

type LegacyDialogue = LegacyTextDialogue | LegacyChoiceDialogue | LegacyInputDialogue;

interface LegacyEditorNodeWrapper {
  nodeKey: string;
  dialogue: LegacyDialogue;
  position: { x: number; y: number };
}

// 마이그레이션 함수
export const migrateTemplateData = (
  legacyData: any,
  existingLocalizationData?: LocalizationData
): { migratedData: TemplateDialogues; localizationData: LocalizationData; result: MigrationResult } => {
  const result: MigrationResult = {
    success: true,
    migratedNodes: 0,
    errors: [],
  };

  const newLocalizationData: LocalizationData = { ...existingLocalizationData };
  const migratedTemplates: TemplateDialogues = {};

  try {
    for (const [templateKey, templateValue] of Object.entries(legacyData)) {
      if (typeof templateValue === "object" && templateValue !== null) {
        migratedTemplates[templateKey] = {};

        for (const [sceneKey, sceneValue] of Object.entries(templateValue as any)) {
          if (typeof sceneValue === "object" && sceneValue !== null) {
            migratedTemplates[templateKey][sceneKey] = {};

            for (const [nodeKey, nodeWrapper] of Object.entries(sceneValue as any)) {
              try {
                const legacyNode = nodeWrapper as LegacyEditorNodeWrapper;
                const migratedNode = migrateNode(legacyNode, templateKey, sceneKey, newLocalizationData);

                migratedTemplates[templateKey][sceneKey][nodeKey] = migratedNode;
                result.migratedNodes++;
              } catch (error) {
                result.errors.push(`노드 ${nodeKey} 마이그레이션 실패: ${error}`);
                result.success = false;
              }
            }
          }
        }
      }
    }
  } catch (error) {
    result.errors.push(`템플릿 데이터 마이그레이션 실패: ${error}`);
    result.success = false;
  }

  return {
    migratedData: migratedTemplates,
    localizationData: newLocalizationData,
    result,
  };
};

// 개별 노드 마이그레이션
const migrateNode = (legacyNode: LegacyEditorNodeWrapper, templateKey: string, sceneKey: string, localizationData: LocalizationData): EditorNodeWrapper => {
  const { dialogue: legacyDialogue } = legacyNode;

  let migratedDialogue: Dialogue;

  switch (legacyDialogue.type) {
    case "text":
      migratedDialogue = migrateTextDialogue(legacyDialogue as LegacyTextDialogue, templateKey, sceneKey, localizationData);
      break;
    case "choice":
      migratedDialogue = migrateChoiceDialogue(legacyDialogue as LegacyChoiceDialogue, templateKey, sceneKey, localizationData);
      break;
    case "input":
      migratedDialogue = migrateInputDialogue(legacyDialogue as LegacyInputDialogue);
      break;
    default:
      throw new Error(`알 수 없는 대화 타입: ${(legacyDialogue as any).type}`);
  }

  return {
    nodeKey: legacyNode.nodeKey,
    dialogue: migratedDialogue,
    position: legacyNode.position,
  };
};

// TextDialogue 마이그레이션
const migrateTextDialogue = (legacy: LegacyTextDialogue, templateKey: string, sceneKey: string, localizationData: LocalizationData): TextDialogue => {
  // 기존 키에서 실제 텍스트 추출 또는 기본값 설정
  const speakerText = legacy.speakerKey ? localizationData[legacy.speakerKey] || legacy.speakerKey || "화자" : "";
  const contentText = legacy.textKey ? localizationData[legacy.textKey] || legacy.textKey || "대사 내용" : "";

  // 실제 텍스트를 LocalizationData에 저장
  if (legacy.speakerKey && speakerText) {
    localizationData[legacy.speakerKey] = speakerText;
  }
  if (legacy.textKey && contentText) {
    localizationData[legacy.textKey] = contentText;
  }

  return {
    type: "text",
    speakerText,
    contentText,
    speakerKeyRef: legacy.speakerKey,
    textKeyRef: legacy.textKey,
    nextNodeKey: legacy.nextNodeKey,
    speed: legacy.speed,
    onEnterCallbackKey: legacy.onEnterCallbackKey,
    onExitCallbackKey: legacy.onExitCallbackKey,
    isSkippable: legacy.isSkippable,
  };
};

// ChoiceDialogue 마이그레이션
const migrateChoiceDialogue = (legacy: LegacyChoiceDialogue, templateKey: string, sceneKey: string, localizationData: LocalizationData): ChoiceDialogue => {
  // 기존 키에서 실제 텍스트 추출 또는 기본값 설정
  const speakerText = legacy.speakerKey ? localizationData[legacy.speakerKey] || legacy.speakerKey || "화자" : "";
  const contentText = legacy.textKey ? localizationData[legacy.textKey] || legacy.textKey || "선택지 질문" : "";

  // 실제 텍스트를 LocalizationData에 저장
  if (legacy.speakerKey && speakerText) {
    localizationData[legacy.speakerKey] = speakerText;
  }
  if (legacy.textKey && contentText) {
    localizationData[legacy.textKey] = contentText;
  }

  // 선택지들 마이그레이션
  const migratedChoices: ChoiceDialogue["choices"] = {};
  for (const [choiceKey, choice] of Object.entries(legacy.choices)) {
    const choiceText = localizationData[choice.textKey] || choice.textKey || "선택지";

    // 선택지 텍스트를 LocalizationData에 저장
    if (choice.textKey && choiceText) {
      localizationData[choice.textKey] = choiceText;
    }

    migratedChoices[choiceKey] = {
      choiceText,
      textKeyRef: choice.textKey,
      nextNodeKey: choice.nextNodeKey,
      onSelectedCallbackKey: choice.onSelectedCallbackKey,
    };
  }

  return {
    type: "choice",
    speakerText,
    contentText,
    speakerKeyRef: legacy.speakerKey,
    textKeyRef: legacy.textKey,
    choices: migratedChoices,
    speed: legacy.speed,
    shuffle: legacy.shuffle,
    onEnterCallbackKey: legacy.onEnterCallbackKey,
    onExitCallbackKey: legacy.onExitCallbackKey,
    isSkippable: legacy.isSkippable,
  };
};

// InputDialogue 마이그레이션 (변경사항 없음)
const migrateInputDialogue = (legacy: LegacyInputDialogue): any => {
  return {
    type: "input",
    speakerText: legacy.speakerKey || "",
    contentText: legacy.textKey || "",
    speakerKeyRef: legacy.speakerKey,
    textKeyRef: legacy.textKey,
    onSuccessCallbackKey: legacy.onSuccessCallbackKey,
    onFailedCallbackKey: legacy.onFailedCallbackKey,
    inputResultActions: legacy.inputResultActions,
    onEnterCallbackKey: legacy.onEnterCallbackKey,
    onExitCallbackKey: legacy.onExitCallbackKey,
    isSkippable: legacy.isSkippable,
  };
};

// 마이그레이션 필요 여부 검사
export const needsMigration = (data: any): boolean => {
  try {
    for (const templateValue of Object.values(data)) {
      if (typeof templateValue === "object" && templateValue !== null) {
        for (const sceneValue of Object.values(templateValue as any)) {
          if (typeof sceneValue === "object" && sceneValue !== null) {
            for (const nodeWrapper of Object.values(sceneValue as any)) {
              const node = nodeWrapper as any;
              // 새로운 구조에는 speakerText가 있고, 기존 구조에는 없음
              if (node.dialogue && node.dialogue.speakerText === undefined && node.dialogue.contentText === undefined) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  } catch {
    return true; // 에러가 발생하면 마이그레이션 필요
  }
};
