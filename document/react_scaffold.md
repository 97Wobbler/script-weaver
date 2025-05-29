# React 기반 대화 노드 에디터 스캐폴딩

## 프로젝트 구조

```

/src
/components
NodeRenderer.tsx
TextNode.tsx
ChoiceNode.tsx
ChoiceInput.tsx
/hooks
useDialogueStore.ts
/utils
localizer.ts
export.ts
App.tsx

```

---

## 주요 라이브러리

```bash
npm install react-flow-renderer zustand tailwindcss
```

---

## 주요 컴포넌트 설명

### `TextNode.tsx`

```tsx
function TextNode({ data }) {
    return (
        <div className="p-2 border rounded bg-white">
            <div className="text-sm font-bold">{data.title}</div>
            <div>화자: {data.speaker_key}</div>
            <div>미리보기: {getLocalizedText(data.text_key)}</div>
        </div>
    );
}
```

### `ChoiceNode.tsx`

```tsx
function ChoiceNode({ data }) {
    return (
        <div className="p-2 border rounded bg-white">
            <div className="text-sm font-bold">{data.title}</div>
            <div>화자: {data.speaker_key}</div>
            <div>선택지:</div>
            {data.choices.map((choice) => (
                <div key={choice.choice_key}>
                    {choice.choice_key} → {choice.next_node_key || "종료"}
                </div>
            ))}
        </div>
    );
}
```

---

## 상태 관리 예시 (Zustand)

```ts
const useDialogueStore = create((set) => ({
    nodes: [],
    language: "ko",
    localizer: {},
    addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
}));
```

---

## 미리보기 유틸

```ts
export function getLocalizedText(key: string, lang = "ko") {
    return store.localizer[lang]?.[key] || "[미번역]";
}
```

---

## 추후 고려사항

-   연결선 드래그 → 자동 `next_node_key` 지정
-   Mermaid.js로 플로우 export
-   CSV 내보내기 포맷
