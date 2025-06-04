# 대화 시스템 타입 정의 문서 (TypeScript)

## 1. 열거형 `DialogueSpeed`

| 값        | 설명            |
| -------- | ------------- |
| `SLOW`   | 느린 속도로 글자를 출력 |
| `NORMAL` | 기본 속도         |
| `FAST`   | 빠른 속도         |

> 출력 속도를 선택지·텍스트·입력 노드에서 **선택적**으로 지정할 수 있습니다.

---

## 2. 공통 구조 `BaseDialogue`

| 필드                   | 타입                              | 필수 | 설명                              |
| -------------------- | ------------------------------- | -- | ------------------------------- |
| `type`               | `"text" \| "choice" \| "input"` | ✅  | 노드 종류 식별자 (Discriminated Union) |
| `speakerKey`         | `string`                        | –  | 발화 캐릭터의 로컬라이징 키                 |
| `textKey`            | `string`                        | –  | 화면에 표시할 텍스트의 로컬라이징 키            |
| `onEnterCallbackKey` | `string`                        | –  | 노드 진입 시 호출할 콜백 식별자              |
| `onExitCallbackKey`  | `string`                        | –  | 노드 종료 시 호출할 콜백 식별자              |
| `isSkippable`        | `boolean`                       | –  | 플레이어가 스킵(자동 진행) 가능 여부           |

> **모든** 대화 노드는 `BaseDialogue` 속성을 공유합니다.

---

## 3. 노드별 세부 타입

### 3-1. `TextDialogue`

```ts
export interface TextDialogue extends BaseDialogue {
  type: "text";
  nextNodeKey?: string;
  speed?: DialogueSpeed;
}
```

* **용도**: 텍스트 한 줄(또는 여러 줄)을 보여준 뒤 자동으로 다음 노드로 넘어감.
* **주요 필드**

  * `nextNodeKey` – 이어질 노드의 키. 없으면 대화 종료 또는 외부에서 제어.
  * `speed` – 글자 출력 속도(선택).

---

### 3-2. `ChoiceDialogue`

```ts
export interface ChoiceDialogue extends BaseDialogue {
  type: "choice";
  choices: {
    [choiceKey: string]: {
      textKey: string;
      nextNodeKey: string;
      onSelectedCallbackKey?: string;
    };
  };
  speed?: DialogueSpeed;
  shuffle?: boolean;
}
```

* **용도**: 여러 선택지를 제시하고, 선택 결과에 따라 분기.
* **주요 필드**

  * `choices` – 선택지 집합.

    * `textKey` - 선택지에 표시될 문장.
    * `nextNodeKey` - 해당 선택 시 이동할 노드.
    * `onSelectedCallbackKey` - 선택 직후 실행할 콜백.
  * `shuffle` – `true`일 경우 선택지 순서를 무작위로 섞어 표시.
  * `speed` – (선택) 본문 텍스트 출력 속도.

---

### 3-3. `InputDialogue`

```ts
export interface InputDialogue extends BaseDialogue {
  type: "input";
  onSuccessCallbackKey?: string;
  onFailedCallbackKey?: string;
  inputResultActions?: {
    onSuccess: DialogueAction;
    onFailed: DialogueAction;
  };
}
```

* **용도**: 플레이어 텍스트 입력, 퍼즐 답안 입력 등 **정답/오답**을 판별해야 할 때 사용.
* **주요 필드**

  * `onSuccessCallbackKey`, `onFailedCallbackKey`
    입력 결과에 따라 호출할 콜백.
  * `inputResultActions`

    * `onSuccess` – 성공 시 다음 노드·추가 콜백.
    * `onFailed`  – 실패 시 다음 노드·추가 콜백.

---

## 4. 액션 타입 `DialogueAction`

```ts
export interface DialogueAction {
  nextNodeKey?: string;
  callbackKey?: string;
}
```

* **nextNodeKey** – 분기 후 이동할 노드.
* **callbackKey** – 분기 직후 수행할 별도 로직.

---

## 5. 상위 집합 타입들

```ts
export type Dialogue = TextDialogue | ChoiceDialogue | InputDialogue;
```

* **Dialogue** – 3가지 노드 타입으로만 구성되는 합집합(Discriminated Union).

```ts
type Scene = {
  [nodeKey: string]: Dialogue;
};
```

* **Scene** – 하나의 씬(또는 대화 트리).
  *key*는 노드 식별자이며 값은 `Dialogue`.

```ts
type TemplateDialogues = {
  [sceneKey: string]: Scene;
};
```

* **TemplateDialogues** – 다수의 **씬**을 묶은 템플릿.
  각각의 *sceneKey*는 특정 스토리 파트, 챕터 등을 의미.

---

## 6. 사용 예시 스케치

```ts
const introScene: Scene = {
  start: {
    type: "text",
    speakerKey: "hero",
    textKey: "intro.line1",
    nextNodeKey: "askName",
    speed: DialogueSpeed.NORMAL,
  },
  askName: {
    type: "input",
    speakerKey: "hero",
    textKey: "intro.askName",
    inputResultActions: {
      onSuccess: { nextNodeKey: "greet" },
      onFailed:  { nextNodeKey: "nameRetry" },
    },
  },
  // ...
};
```

---

## 7. 요약

* **Discriminated Union** + **로컬라이징 키** 조합으로
  타입 안정성과 다국어 지원을 모두 확보.
* `CallbackKey`로 **게임 로직**(애니메이션, 변수 갱신 등)을
  대화 진행 흐름과 느슨하게 결합.
* `speed`, `shuffle`, `isSkippable` 같은 **품질-of-라이프 옵션**으로
  플레이 경험을 세밀하게 조정 가능.