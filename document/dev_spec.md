# 대화 노드 에디터 개발 문서

## 기술 스택

-   React
-   React Flow (노드 기반 시각화)
-   Zustand (상태 관리)
-   TypeScript
-   TailwindCSS
-   localizer 연동 API (외부 JSON 파일 또는 REST)

---

## 주요 데이터 구조

### DialogueNode

```ts
type DialogueNode = {
    node_key: string;
    type: "text" | "choice";
    title: string;
    speaker_key: string;
    text_key: string;
    next_node_key?: string;
    choices?: Choice[];
};
```

### Choice

```ts
type Choice = {
    choice_key: string;
    next_node_key?: string;
};
```

---

## 상태 구조

```ts
type DialogueEditorState = {
    nodes: DialogueNode[];
    language: string;
    localizer: Record<string, Record<string, string>>; // localizer[language][key]
};
```

---

## 기능 모듈

### 📌 노드 생성

-   React Flow 기반 노드 드래그 생성
-   각 노드는 type에 따라 다른 컴포넌트

### 📌 localizer 연동

-   text_key 입력 시 해당 언어로 localizer에서 텍스트 추출 및 표기

### 📌 저장 / 내보내기

-   전체 상태를 JSON/CSV로 export
-   React Flow 포지션 포함 저장

---

## 확장 포인트

-   조건 분기 노드 (`condition`)
-   감정 / 이펙트 노드
-   대사 노드 그룹화
