# Script Weaver - TODO List

## 🎯 MVP 목표
웹 기반 Dialogue Editor (프론트엔드-Only) - Twine 느낌의 시각 편집 + 우측 폼 패널

---

## ✅ 완료된 작업

### 1-2주차: 기본 시스템 구축 ✅ **완료!**
- [x] **프로젝트 환경 설정**: React + Vite + TypeScript, Tailwind CSS 4.x, React Flow, Zustand
- [x] **데이터 모델**: Dialogue 타입, Zod 스키마, EditorStore 상태 관리
- [x] **기본 UI**: 에디터 레이아웃, Canvas, 툴바, 속성 패널, 상태바
- [x] **노드 시스템**: TextNode/ChoiceNode 생성, 편집, 위치 저장, localStorage 지속성
- [x] **속성 패널**: 실시간 편집, 선택지 관리, 노드 선택 연동
- [x] **연결 시스템**: React Flow Handle 기반 드래그 연결, 핸들 위치 정렬, 연결 해제

### 3주차: Import/Export 및 검증 시스템 ✅ **완료!**
- [x] **Export 기능**
  - [x] JSON 형식 내보내기
  - [x] CSV 형식 내보내기 (dialogue.csv + localization.csv)
  - [x] 사용자 포맷 선택 UI
- [x] **Import 기능**
  - [x] JSON 파일 업로드 및 파싱 (유연한 스키마 적용)
  - [x] CSV 파일 업로드 및 파싱 (기본 구조, 낮은 우선순위)
- [x] **검증 시스템 (Zod)**
  - [x] 스키마 정의 및 검증
  - [x] Export 시점 검증으로 UX 통합
  - [x] 댕글링 참조 감지 및 자동 정리
  - [x] 빈 프로젝트 상태 적절한 처리
- [x] **localStorage 자동 저장**
  - [x] Zustand persist 자동 저장
  - [x] 브라우저 새로고침 시 복원

---

## 📋 예정된 작업

### 4주차: 컨텐츠-키 분리 아키텍처 🎯 **진행 예정**
- [ ] **데이터 모델 확장**
  - [ ] LocalizationStore 구현 (key-value 매핑 저장소)
  - [ ] BaseDialogue 구조 변경: 실제 텍스트(speakerText, contentText) + 키 참조(speakerKeyRef, textKeyRef)
  - [ ] 기존 데이터 마이그레이션 로직
- [ ] **실제 텍스트 기반 UI**
  - [ ] PropertyPanel: 화자/대사 입력은 실제 텍스트만
  - [ ] 입력 필드 아래 자동생성된 키값 작게 표시
  - [ ] 노드 미리보기: 실제 텍스트 표시 (키값 숨김)
- [ ] **키 자동 생성 시스템**
  - [ ] speakerKey: `npc_{normalized_name}` 형식
  - [ ] textKey: `{templateKey}_{sceneKey}_line_{shortId}` 형식
  - [ ] choiceKey: `{templateKey}_{sceneKey}_choice_{shortId}_{index}` 형식
  - [ ] 중복 텍스트 감지 및 기존 키 재사용 제안
- [ ] **키 두 단계 편집 시스템**
  - [ ] 키 클릭 → 편집 모드 UI
  - [ ] "모든 텍스트 함께 변경" vs "새 키로 분리" 선택 옵션
  - [ ] 같은 키 사용 현황 표시 (사용하는 노드 개수 등)
- [ ] **일괄 수정 기능**
  - [ ] 같은 textKey를 가진 모든 텍스트 동시 수정
  - [ ] 키 변경시 연결된 모든 노드 업데이트
- [ ] **Export/Import 업데이트**
  - [ ] 새로운 데이터 구조에 맞춘 JSON/CSV 형식 수정
  - [ ] LocalizationStore 포함한 파일 구조

### 5주차: 폴리싱 & QA
- [ ] **UI/UX 개선**
  - [ ] 반응형 디자인
  - [ ] 키보드 접근성
  - [ ] 애니메이션 및 트랜지션
- [ ] **성능 최적화**
  - [ ] 100개 노드 제한 구현
  - [ ] 렌더링 최적화
- [ ] **QA 및 테스트**
  - [ ] Acceptance Criteria 검증
  - [ ] 브라우저 호환성 테스트
- [ ] **배포 준비**
  - [ ] GitHub Pages 설정
  - [ ] 빌드 최적화

---

## 🔮 향후 확장 계획 (Post-MVP)

### G-01: 한글 원문·key 동시 입력/수정용 로컬라이징 전용 탭 (우선순위 상승)
### G-02: 플로우 시뮬레이터 (플레이 모드)
### G-03: 콜백 키 CRUD 페이지 + 검색
### G-04: 커스텀 메타데이터(감정, 카메라, SFX) 확장
### G-05: 버전 관리(Git)·다중 사용자 협업
### G-06: InputDialogue 노드 생성 및 런타임 속성 지원
### G-07: 순환 참조 감지 및 경고 시스템

---

## 📋 메모 및 참고사항

### 현재 프로젝트 상태
- 🎉 **3주차 목표 100% 완료**: Import/Export 시스템 완전 구현, 모든 QA 이슈 해결
- ✅ **데이터 무결성 확보**: 댕글링 참조 자동 정리, 검증 시스템 완성
- 🔄 **4주차 기획 변경**: 자동 키 추천 → 컨텐츠-키 분리 아키텍처로 방향 전환
- 🚀 **4주차 시작 준비**: LocalizationStore 구조 및 실제 텍스트 기반 UI 개발

### 기술 스택 확정
- ✅ React + Vite + TypeScript
- ✅ React Flow (노드 시각화)
- ✅ Zustand (상태 관리)
- ✅ Tailwind CSS 4.x (스타일링) - 성공적으로 설정 완료
- ✅ Zod (스키마 검증)

### 주요 제약사항 (MVP)
- 템플릿당 100개 노드 제한
- TextDialogue, ChoiceDialogue만 생성 지원 (InputDialogue는 타입만)
- 순환 참조 허용 (루프 구조 지원)
- 서버 없는 SPA, localStorage만 사용
- **별도 키 관리 인터페이스는 MVP 제외** (G-01에서 구현)

### 새로운 핵심 설계 원칙
- **컨텐츠 작성과 키 관리의 완전 분리**: 기획자는 실제 텍스트에만 집중
- **실제 텍스트 우선**: 노드 미리보기, 편집 UI 모두 실제 텍스트 표시
- **백그라운드 키 관리**: LocalizationStore에서 key-value 매핑 자동 관리
- **두 단계 키 편집**: 키 수정시 전체 변경 vs 새 키 분리 명확히 구분

### Acceptance Criteria 체크리스트
- [x] AC-01: 새 텍스트 노드 추가 → JSON 저장 동일 내용 존재 ✅ **완료**
- [ ] AC-02: 선택지별 "+" 버튼으로 해당 선택지의 nextNodeKey로 새 노드 자동 연결
- [x] AC-03: nextNodeKey 비어있으면 Export 버튼 비활성화 → Export 시점 검증으로 변경 ✅ **완료**
- [x] AC-04: 브라우저 새로고침 후 Canvas 레이아웃 복원 ✅ **완료**
- [x] AC-05: JSON/CSV Export → Import 후 데이터 무손실 ✅ **완료**
- [ ] **AC-06**: 같은 텍스트 입력 → 키 재사용 제안, 키 수정 → 전체/분리 선택 (4주차 신규) 