# 개발 로그

## 2025/07/07 19:58 - 로컬 스트링 편집 버그 수정

**문제**: 에디터에서 한 곳에서만 사용되는 스트링의 내용을 변경할 때 기존 키값이 유지되지 않고 새로운 키값이 추가로 부여되는 문제

**원인**: `updateNodeText` 및 `updateChoiceText` 함수에서 텍스트 변경 시 항상 새로운 키를 생성하는 로직

**해결**: 
- 기존 키가 있고 한 곳에서만 사용되는 경우 기존 키를 재사용하도록 로직 수정
- `src/store/domains/nodeDomain.ts`의 `updateNodeText` 및 `updateChoiceText` 함수 수정
- 키 사용 횟수를 확인하여 1회 사용인 경우 기존 키의 텍스트만 업데이트

**수정된 동작**:
- 한 곳에서만 사용되는 키: 기존 키값 유지, 내용만 변경
- 여러 곳에서 사용되는 키: 새로운 키 생성 (기존 동작 유지)

**파일**: `src/store/domains/nodeDomain.ts`

## 2025/07/07 20:15 - TC-10 빈 텍스트 처리 버그 수정

**문제**: 에디터에서 한 곳에서만 쓰이는 노드의 텍스트를 빈 문자열로 변경했을 때, Dialogue CSV 및 Localization CSV에서 키 삭제가 되지 않는 문제

**원인**: 빈 텍스트 처리 시 키 참조만 제거하고 LocalizationStore에서 실제 키를 삭제하지 않는 로직

**해결**:
- 빈 텍스트로 변경할 때 한 곳에서만 사용되는 키의 경우 LocalizationStore에서 키를 완전히 삭제하도록 수정
- `updateNodeText` 및 `updateChoiceText` 함수에서 키 사용 횟수를 확인하여 1회 사용인 경우 `deleteKey` 호출

**수정된 동작**:
- 빈 텍스트로 변경 시 한 곳에서만 사용되는 키: 키 완전 삭제
- 빈 텍스트로 변경 시 여러 곳에서 사용되는 키: 키 참조만 제거 (기존 동작 유지)

**파일**: `src/store/domains/nodeDomain.ts` 

## 2025/07/07 20:39 - Localization CSV 사용 횟수 칼럼 추가

**요구사항**: Localization CSV 테이블에 각 키가 몇 개의 노드에서 사용되고 있는지 표시하는 칼럼 추가 필요

**구현**:
- Localization CSV 테이블 헤더에 "사용 횟수" 칼럼 추가
- 테이블 본문에 각 키의 사용 횟수를 표시하는 칼럼 추가
- `useLocalizationStore.getState().getKeyUsageCount(key)` 함수를 사용하여 실시간 사용 횟수 계산
- CSV 복사 기능은 기존 로직 유지 (사용 횟수 칼럼은 복사되지 않음)

**기술적 고려사항**:
- 기존 `getKeyUsageCount` 함수 활용으로 추가 로직 불필요
- 테이블 레이아웃 조정으로 4개 칼럼 구조 (키, 한국어 텍스트, 사용 횟수, 작업)
- 사용 횟수는 중앙 정렬로 가독성 향상

**파일**: `src/components/LocalizationTab.tsx`

## 2025/07/07 20:53 - 전체 초기화 시 LocalizationStore 유지 문제 수정

**문제**: [저장 공간] - [전체 초기화] 실행 시 LocalizationStore가 유지되는 문제

**원인**: 
- LocalizationStore의 Zustand persist 미들웨어가 페이지 새로고침 시 localStorage에서 데이터를 복원
- resetAllData에서 localStorage만 삭제하고 LocalizationStore의 메모리 상태는 초기화하지 않음
- persist 미들웨어가 localStorage에 기본값을 다시 저장하여 초기화가 무효화됨

**해결**:
- LocalizationStore의 메모리 상태를 먼저 초기화한 후 localStorage에 빈 상태를 명시적으로 저장
- LocalizationStore의 persist 설정에 onRehydrateStorage 콜백 추가로 초기화 시점 제어
- localStorage에 빈 상태를 저장하여 persist 미들웨어가 덮어쓰지 않도록 방지

**수정된 동작**:
- 전체 초기화 시 LocalizationStore가 완전히 초기화됨
- 페이지 새로고침 후에도 초기화된 상태가 유지됨
- EditorStore와 LocalizationStore 모두 완전히 초기화됨

**파일**: `src/utils/storageManager.ts`, `src/store/localizationStore.ts`