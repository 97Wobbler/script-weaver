import type { TemplateDialogues, DialogueCSVRow, LocalizationCSVRow, ValidationResult, EditorNodeWrapper, Dialogue } from "../types/dialogue";
import type { LocalizationData } from "../store/localizationStore";
import { TemplateDialoguesSchema, FlexibleTemplateDialoguesSchema, ValidationResultSchema } from "../schemas/dialogue";

// 새로운 통합 내보내기 형식
export interface ScriptWeaverExport {
  version: string;
  templateData: TemplateDialogues;
  localizationData: LocalizationData;
  metadata: {
    exportedAt: string;
    totalNodes: number;
    totalKeys: number;
  };
}

// JSON Export 함수 (LocalizationStore 포함)
export const exportToJSON = (templateData: TemplateDialogues, localizationData?: LocalizationData): string => {
  try {
    // 노드 수 계산
    const totalNodes = Object.values(templateData).reduce((sum, template) => sum + Object.values(template).reduce((sceneSum, scene) => sceneSum + Object.keys(scene).length, 0), 0);

    const exportData: ScriptWeaverExport = {
      version: "2.0.0", // 컨텐츠-키 분리 아키텍처 버전
      templateData,
      localizationData: localizationData || {},
      metadata: {
        exportedAt: new Date().toISOString(),
        totalNodes,
        totalKeys: Object.keys(localizationData || {}).length,
      },
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    throw new Error(`JSON 내보내기 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }
};

// JSON Import 함수 - 새로운 형식과 레거시 형식 모두 지원
export const importFromJSON = (
  jsonString: string
): {
  templateData: TemplateDialogues;
  localizationData: LocalizationData;
  needsMigration: boolean;
} => {
  try {
    const parsed = JSON.parse(jsonString);

    // 새로운 형식인지 확인 (version과 localizationData 존재)
    if (parsed.version && parsed.templateData && parsed.localizationData !== undefined) {
      return {
        templateData: parsed.templateData,
        localizationData: parsed.localizationData,
        needsMigration: false,
      };
    }

    // 레거시 형식 처리
    try {
      const validated = TemplateDialoguesSchema.parse(parsed);
      return {
        templateData: validated as unknown as TemplateDialogues,
        localizationData: {},
        needsMigration: true,
      };
    } catch (strictError) {
      const flexibleValidated = FlexibleTemplateDialoguesSchema.parse(parsed);
      return {
        templateData: flexibleValidated as unknown as TemplateDialogues,
        localizationData: {},
        needsMigration: true,
      };
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("올바르지 않은 JSON 형식입니다.");
    }
    console.error("JSON Import 상세 오류:", error);
    throw new Error(`JSON 가져오기 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }
};

// CSV Export 함수 - 새로운 데이터 구조 지원
export const exportToCSV = (templateData: TemplateDialogues, localizationData: LocalizationData = {}): { dialogue: string; localization: string } => {
  const dialogueRows: DialogueCSVRow[] = [];
  const localizationRows: LocalizationCSVRow[] = [];

  // 모든 노드를 순회하여 CSV 행 생성
  Object.entries(templateData).forEach(([templateKey, scenes]) => {
    Object.entries(scenes).forEach(([sceneKey, scene]) => {
      Object.entries(scene).forEach(([nodeKey, nodeWrapper]) => {
        const { dialogue } = nodeWrapper;

        // Dialogue CSV 행 생성 (새로운 필드 포함)
        const dialogueRow: DialogueCSVRow = {
          templateKey,
          sceneKey,
          nodeKey,
          textKey: dialogue.textKeyRef || "",
          speakerKey: dialogue.speakerKeyRef || "",
          // 실제 텍스트 필드 추가
          speakerText: dialogue.speakerText || "",
          contentText: dialogue.contentText || "",
          type: dialogue.type,
          choices_textKeys: "",
          choices_texts: "", // 실제 선택지 텍스트
          choices_nextKeys: "",
        };

        // 선택지 정보 추가 (ChoiceDialogue인 경우)
        if (dialogue.type === "choice") {
          const choices = dialogue.choices || {};
          const textKeys = Object.values(choices).map((choice) => choice.textKeyRef || "");
          const choiceTexts = Object.values(choices).map((choice) => choice.choiceText || "");
          const nextKeys = Object.values(choices).map((choice) => choice.nextNodeKey);

          dialogueRow.choices_textKeys = textKeys.join(";");
          dialogueRow.choices_texts = choiceTexts.join(";");
          dialogueRow.choices_nextKeys = nextKeys.join(";");
        }

        dialogueRows.push(dialogueRow);
      });
    });
  });

  // LocalizationData를 LocalizationCSVRow로 변환
  Object.entries(localizationData).forEach(([key, text]) => {
    localizationRows.push({
      key,
      ko: text,
    });
  });

  // CSV 문자열 생성
  const dialogueCSV = convertToCSVString(dialogueRows, [
    "templateKey",
    "sceneKey",
    "nodeKey",
    "textKey",
    "speakerKey",
    "speakerText",
    "contentText",
    "type",
    "choices_textKeys",
    "choices_texts",
    "choices_nextKeys",
  ]);

  const localizationCSV = convertToCSVString(localizationRows, ["key", "ko"]);

  return {
    dialogue: dialogueCSV,
    localization: localizationCSV,
  };
};

// CSV 문자열 변환 헬퍼
const convertToCSVString = <T extends Record<string, any>>(data: T[], headers: (keyof T)[]): string => {
  const headerRow = headers.join(",");
  const dataRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        const stringValue = value !== undefined && value !== null ? String(value) : "";
        // CSV 이스케이프 처리 (쉼표, 줄바꿈, 인용부호 포함 시 인용부호로 감싸기)
        if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",")
  );

  return [headerRow, ...dataRows].join("\n");
};

// CSV Import 함수 (기본 구현)
export const importFromCSV = (
  dialogueCSV: string,
  localizationCSV: string
): {
  templateData: TemplateDialogues;
  localizationData: LocalizationData;
} => {
  // TODO: CSV 파싱 로직 구현
  // 현재는 기본 구조만 반환
  throw new Error("CSV 가져오기 기능은 아직 구현되지 않았습니다.");
};

// 검증 함수 - 새로운 데이터 구조 지원
export const validateTemplateData = (templateData: TemplateDialogues): ValidationResult => {
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  Object.entries(templateData).forEach(([templateKey, scenes]) => {
    Object.entries(scenes).forEach(([sceneKey, scene]) => {
      Object.entries(scene).forEach(([nodeKey, nodeWrapper]) => {
        const { dialogue } = nodeWrapper;

        // 실제 텍스트 또는 키 참조 검증
        if (!dialogue.contentText && !dialogue.textKeyRef) {
          errors.push({
            nodeKey,
            field: "contentText",
            message: "실제 텍스트 또는 키 참조가 필요합니다.",
          });
        }

        // nextNodeKey 댕글링 참조 검증
        if (dialogue.type === "text" && dialogue.nextNodeKey) {
          const targetExists = Object.values(templateData).some((template) => Object.values(template).some((s) => s[dialogue.nextNodeKey!]));
          if (!targetExists) {
            errors.push({
              nodeKey,
              field: "nextNodeKey",
              message: `참조하는 노드 '${dialogue.nextNodeKey}'를 찾을 수 없습니다.`,
            });
          }
        }

        // 선택지 검증
        if (dialogue.type === "choice") {
          if (!dialogue.choices || Object.keys(dialogue.choices).length === 0) {
            errors.push({
              nodeKey,
              field: "choices",
              message: "선택지가 하나도 정의되지 않았습니다.",
            });
          } else {
            Object.entries(dialogue.choices || {}).forEach(([choiceKey, choice]) => {
              // 선택지 텍스트 검증
              if (!choice.choiceText && !choice.textKeyRef) {
                errors.push({
                  nodeKey,
                  field: `choices.${choiceKey}.choiceText`,
                  message: "선택지 텍스트 또는 키 참조가 필요합니다.",
                });
              }

              // 선택지 nextNodeKey 검증
              if (!choice.nextNodeKey) {
                warnings.push({
                  nodeKey,
                  field: `choices.${choiceKey}.nextNodeKey`,
                  message: "선택지의 다음 노드가 설정되지 않았습니다.",
                });
              } else {
                const targetExists = Object.values(templateData).some((template) => Object.values(template).some((s) => s[choice.nextNodeKey]));
                if (!targetExists) {
                  errors.push({
                    nodeKey,
                    field: `choices.${choiceKey}.nextNodeKey`,
                    message: `참조하는 노드 '${choice.nextNodeKey}'를 찾을 수 없습니다.`,
                  });
                }
              }
            });
          }
        }
      });
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// 파일 다운로드 헬퍼
export const downloadFile = (content: string, filename: string, mimeType: string = "text/plain") => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 파일 업로드 헬퍼
export const uploadFile = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error("파일이 선택되지 않았습니다."));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error("파일 읽기 실패"));
      reader.readAsText(file);
    };

    input.click();
  });
};
