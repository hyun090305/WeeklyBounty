# WeeklyBounty (Korean Math Olympiad Weekly Proof Competition) MVP

이 저장소는 한국 수학올림피아드 커뮤니티용 **Weekly Bounty** 플랫폼의 MVP 구현 스켈레톤입니다.

## 핵심 목표

- 매주 1문제 공개 → 1주 제출 → 익명 채점 → 결과/레이팅 공개의 주간 루프를 안정적으로 운영
- 완성 풀이뿐 아니라 불완전/부분 풀이도 제출 가능
- 권한과 익명성(특히 채점 단계) 보장
- Firebase 기반 저비용 운영

## 기술 스택

- Firebase Hosting
- Firebase Authentication
- Cloud Firestore
- Cloud Functions (rating 업데이트/상태 전이 보조)
- 순수 HTML/CSS/JavaScript

## 디렉터리

- `docs/` : 제품/아키텍처/데이터모델/주간운영 플로우 문서
- `firebase/` : Firestore 보안 규칙, 인덱스, 시드 데이터
- `web/` : MVP 프론트엔드 (public site + admin/setter panel)
- `functions/` : rating 업데이트, 상태 전이 검증용 Cloud Functions

## 빠른 시작

1. Firebase 프로젝트 생성
2. `firebase/.firebaserc.example`를 복사해 프로젝트 ID 설정
3. Firebase CLI 로그인 후 배포

```bash
firebase use <your-project-id>
firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
```

## MVP 범위(포함)

- 문제 상태: `scheduled/open/closed/grading/published`
- 문제 등록/수정, 주간 공개 일정 필드
- 제출: Markdown + LaTeX 텍스트, 1인 1제출, 마감 전 수정
- 익명 채점 화면(anonymousCode 기반)
- 결과 공개 후: 해설, 점수 분포, 공개 제출 목록, 주간 리더보드
- 간단 Elo-유사 rating 업데이트(문제당 1회 idempotent)

## MVP 제외

- PDF/이미지/손글씨 제출
- appeal 시스템
- 고급 anti-cheat
- 시즌제, badge/achievement

## 보안 핵심

- 클라이언트 제어만으로는 불충분하므로 Firestore Rules에서 강제
- 일반 유저는 점수/권한/문제 상태 수정 불가
- setter는 담당 문제만 익명 채점 가능
- published 이전 제출물/점수 비공개
