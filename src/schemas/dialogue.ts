import { z } from 'zod';
import { DialogueSpeed } from '../types/dialogue';

// 열거형 스키마
export const DialogueSpeedSchema = z.nativeEnum(DialogueSpeed);

// 액션 스키마
export const DialogueActionSchema = z.object({
  nextNodeKey: z.string().optional(),
  callbackKey: z.string().optional(),
});

// 기본 대화 스키마
export const BaseDialogueSchema = z.object({
  type: z.enum(["text", "choice", "input"]),
  speakerKey: z.string().optional(),
  textKey: z.string().optional(),
  onEnterCallbackKey: z.string().optional(),
  onExitCallbackKey: z.string().optional(),
  isSkippable: z.boolean().optional(),
});

// 텍스트 노드 스키마
export const TextDialogueSchema = BaseDialogueSchema.extend({
  type: z.literal("text"),
  nextNodeKey: z.string().optional(),
  speed: DialogueSpeedSchema.optional(),
});

// 선택지 노드 스키마
export const ChoiceDialogueSchema = BaseDialogueSchema.extend({
  type: z.literal("choice"),
  choices: z.record(z.object({
    textKey: z.string(),
    nextNodeKey: z.string(),
    onSelectedCallbackKey: z.string().optional(),
  })),
  speed: DialogueSpeedSchema.optional(),
  shuffle: z.boolean().optional(),
});

// 입력 노드 스키마
export const InputDialogueSchema = BaseDialogueSchema.extend({
  type: z.literal("input"),
  onSuccessCallbackKey: z.string().optional(),
  onFailedCallbackKey: z.string().optional(),
  inputResultActions: z.object({
    onSuccess: DialogueActionSchema,
    onFailed: DialogueActionSchema,
  }).optional(),
});

// 합집합 스키마 (Discriminated Union)
export const DialogueSchema = z.discriminatedUnion("type", [
  TextDialogueSchema,
  ChoiceDialogueSchema,
  InputDialogueSchema,
]);

// 에디터 노드 래퍼 스키마
export const EditorNodeWrapperSchema = z.object({
  nodeKey: z.string(),
  dialogue: DialogueSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

// 씬 스키마
export const SceneSchema = z.record(EditorNodeWrapperSchema);

// 템플릿 스키마
export const TemplateDialoguesSchema = z.record(SceneSchema);

// 에디터 상태 스키마
export const EditorStateSchema = z.object({
  currentTemplate: z.string(),
  templateData: TemplateDialoguesSchema,
  currentScene: z.string(),
  selectedNodeKey: z.string().optional(),
  lastNodePosition: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

// CSV 관련 스키마
export const DialogueCSVRowSchema = z.object({
  templateKey: z.string(),
  sceneKey: z.string(),
  nodeKey: z.string(),
  textKey: z.string(),
  speakerKey: z.string(),
  type: z.string(),
  choices_textKeys: z.string(),
  choices_nextKeys: z.string(),
});

export const LocalizationCSVRowSchema = z.object({
  key: z.string(),
  ko: z.string(),
});

// 유효성 검사 결과 스키마
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    nodeKey: z.string(),
    field: z.string(),
    message: z.string(),
  })),
  warnings: z.array(z.object({
    nodeKey: z.string(),
    field: z.string(),
    message: z.string(),
  })),
});

// 타입 추론
export type DialogueSchemaType = z.infer<typeof DialogueSchema>;
export type EditorNodeWrapperSchemaType = z.infer<typeof EditorNodeWrapperSchema>;
export type SceneSchemaType = z.infer<typeof SceneSchema>;
export type TemplateDialoguesSchemaType = z.infer<typeof TemplateDialoguesSchema>;
export type EditorStateSchemaType = z.infer<typeof EditorStateSchema>; 