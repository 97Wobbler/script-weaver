import type { 
  TemplateDialogues, 
  DialogueCSVRow, 
  LocalizationCSVRow,
  ValidationResult,
  EditorNodeWrapper,
  Dialogue
} from '../types/dialogue';
import { 
  TemplateDialoguesSchema, 
  FlexibleTemplateDialoguesSchema,
  ValidationResultSchema 
} from '../schemas/dialogue';

// JSON Export 함수
export const exportToJSON = (templateData: TemplateDialogues): string => {
  try {
    return JSON.stringify(templateData, null, 2);
  } catch (error) {
    throw new Error(`JSON 내보내기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

// JSON Import 함수 - 더 유연한 파싱
export const importFromJSON = (jsonString: string): TemplateDialogues => {
  try {
    const parsed = JSON.parse(jsonString);
    
    // 먼저 기본 스키마로 시도
    try {
      const validated = TemplateDialoguesSchema.parse(parsed);
      return validated as unknown as TemplateDialogues;
    } catch (strictError) {
      // 기본 스키마 실패 시 유연한 스키마로 시도
      console.log('기본 스키마 실패, 유연한 스키마로 재시도:', strictError);
      const flexibleValidated = FlexibleTemplateDialoguesSchema.parse(parsed);
      return flexibleValidated as unknown as TemplateDialogues;
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('올바르지 않은 JSON 형식입니다.');
    }
    console.error('JSON Import 상세 오류:', error);
    throw new Error(`JSON 가져오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

// CSV Export 함수들
export const exportToCSV = (templateData: TemplateDialogues): { dialogue: string; localization: string } => {
  const dialogueRows: DialogueCSVRow[] = [];
  const localizationRows: LocalizationCSVRow[] = [];
  const usedKeys = new Set<string>();

  // 모든 노드를 순회하여 CSV 행 생성
  Object.entries(templateData).forEach(([templateKey, scenes]) => {
    Object.entries(scenes).forEach(([sceneKey, scene]) => {
      Object.entries(scene).forEach(([nodeKey, nodeWrapper]) => {
        const { dialogue } = nodeWrapper;
        
        // Dialogue CSV 행 생성
        const dialogueRow: DialogueCSVRow = {
          templateKey,
          sceneKey,
          nodeKey,
          textKey: dialogue.textKey || '',
          speakerKey: dialogue.speakerKey || '',
          type: dialogue.type,
          choices_textKeys: '',
          choices_nextKeys: ''
        };

        // 선택지 정보 추가 (ChoiceDialogue인 경우)
        if (dialogue.type === 'choice') {
          const choices = dialogue.choices || {};
          const textKeys = Object.values(choices).map(choice => choice.textKey);
          const nextKeys = Object.values(choices).map(choice => choice.nextNodeKey);
          
          dialogueRow.choices_textKeys = textKeys.join(';');
          dialogueRow.choices_nextKeys = nextKeys.join(';');
        }

        dialogueRows.push(dialogueRow);

        // Localization 키 수집
        if (dialogue.textKey && !usedKeys.has(dialogue.textKey)) {
          localizationRows.push({
            key: dialogue.textKey,
            ko: dialogue.textKey // 기본값으로 key와 동일하게 설정
          });
          usedKeys.add(dialogue.textKey);
        }

        if (dialogue.speakerKey && !usedKeys.has(dialogue.speakerKey)) {
          localizationRows.push({
            key: dialogue.speakerKey,
            ko: dialogue.speakerKey
          });
          usedKeys.add(dialogue.speakerKey);
        }

        // 선택지 텍스트 키들도 추가
        if (dialogue.type === 'choice') {
          Object.values(dialogue.choices || {}).forEach(choice => {
            if (choice.textKey && !usedKeys.has(choice.textKey)) {
              localizationRows.push({
                key: choice.textKey,
                ko: choice.textKey
              });
              usedKeys.add(choice.textKey);
            }
          });
        }
      });
    });
  });

  // CSV 문자열 생성
  const dialogueCSV = convertToCSVString(dialogueRows, [
    'templateKey', 'sceneKey', 'nodeKey', 'textKey', 'speakerKey', 'type', 'choices_textKeys', 'choices_nextKeys'
  ]);

  const localizationCSV = convertToCSVString(localizationRows, ['key', 'ko']);

  return {
    dialogue: dialogueCSV,
    localization: localizationCSV
  };
};

// CSV 문자열 변환 헬퍼
const convertToCSVString = <T extends Record<string, any>>(data: T[], headers: (keyof T)[]): string => {
  const headerRow = headers.join(',');
  const dataRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      const stringValue = value !== undefined && value !== null ? String(value) : '';
      // CSV 이스케이프 처리 (쉼표, 줄바꿈, 인용부호 포함 시 인용부호로 감싸기)
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
};

// CSV Import 함수 (기본 구현)
export const importFromCSV = (dialogueCSV: string, localizationCSV: string): TemplateDialogues => {
  // TODO: CSV 파싱 로직 구현
  // 현재는 기본 구조만 반환
  throw new Error('CSV 가져오기 기능은 아직 구현되지 않았습니다.');
};

// 검증 함수
export const validateTemplateData = (templateData: TemplateDialogues): ValidationResult => {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  Object.entries(templateData).forEach(([templateKey, scenes]) => {
    Object.entries(scenes).forEach(([sceneKey, scene]) => {
      Object.entries(scene).forEach(([nodeKey, nodeWrapper]) => {
        const { dialogue } = nodeWrapper;

        // 필수 필드 검증
        if (!dialogue.textKey || dialogue.textKey.trim() === '') {
          errors.push({
            nodeKey,
            field: 'textKey',
            message: 'textKey는 필수이며 빈 값일 수 없습니다.'
          });
        }

        // nextNodeKey 댕글링 참조 검증
        if (dialogue.type === 'text' && dialogue.nextNodeKey) {
          const targetExists = Object.values(templateData).some(template =>
            Object.values(template).some(s => s[dialogue.nextNodeKey!])
          );
          if (!targetExists) {
            errors.push({
              nodeKey,
              field: 'nextNodeKey',
              message: `참조하는 노드 '${dialogue.nextNodeKey}'를 찾을 수 없습니다.`
            });
          }
        }

        // 선택지 nextNodeKey 댕글링 참조 검증
        if (dialogue.type === 'choice') {
          // 선택지가 하나도 없는 경우 오류
          if (!dialogue.choices || Object.keys(dialogue.choices).length === 0) {
            errors.push({
              nodeKey,
              field: 'choices',
              message: '선택지가 하나도 정의되지 않았습니다.'
            });
          } else {
            // 각 선택지 검증
            Object.entries(dialogue.choices || {}).forEach(([choiceKey, choice]) => {
              // 선택지 textKey 검증
              if (!choice.textKey || choice.textKey.trim() === '') {
                errors.push({
                  nodeKey,
                  field: `choices.${choiceKey}.textKey`,
                  message: `선택지 '${choiceKey}'의 textKey가 필요합니다.`
                });
              }

              // 선택지 nextNodeKey 검증 (빈 값은 대화 종료로 허용)
              if (choice.nextNodeKey && choice.nextNodeKey.trim() !== '') {
                const targetExists = Object.values(templateData).some(template =>
                  Object.values(template).some(s => s[choice.nextNodeKey])
                );
                if (!targetExists) {
                  errors.push({
                    nodeKey,
                    field: `choices.${choiceKey}.nextNodeKey`,
                    message: `선택지 '${choiceKey}'가 참조하는 노드 '${choice.nextNodeKey}'를 찾을 수 없습니다.`
                  });
                }
              }
              // nextNodeKey가 비어있으면 대화 종료 분기로 허용 (검증하지 않음)
            });
          }
        }
      });
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// 파일 다운로드 헬퍼
export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('파일이 선택되지 않았습니다.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => {
        reject(new Error('파일 읽기에 실패했습니다.'));
      };
      reader.readAsText(file);
    };

    input.click();
  });
}; 