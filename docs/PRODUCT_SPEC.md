# PRODUCT SPEC (MVP)

## 1) Weekly Loop
1. Admin/Setter가 문제 생성 (`scheduled`)
2. 공개 시각 도달 또는 Admin 전환 → `open`
3. 유저 제출/수정
4. 마감 시각 도달 또는 Admin 전환 → `closed`
5. Setter 익명 채점 → `grading`
6. Admin 결과 공개 → `published`
7. Admin rating 업데이트 실행(문제당 1회)

## 2) 상태별 권한
- `scheduled`: 문제 본문은 비공개(운영진/담당 setter만 조회)
- `open`: 로그인 유저 제출 가능
- `closed`: 제출 잠금, 채점 대기
- `grading`: 제출 잠금, setter 채점
- `published`: 결과/공개 제출/토론 공개

## 3) 엔티티 요약
- users
- roles
- problems
- submissions
- gradingRecords
- comments
- ratingEvents

## 4) 공개 정책
- published 이전: 타인 제출/점수/리더보드 비공개
- published 이후: isPublic=true 제출만 본문 공개
- 비공개 제출: 점수/레이팅 반영, 본문 비공개

## 5) AI/부정행위
- AI-assisted 금지 조항 표시
- 자동 검출 없음 (MVP)
- 운영진 수동 판단 프로세스
