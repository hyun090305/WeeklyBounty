# WeeklyBounty (Korean Math Olympiad Weekly Proof Competition)

한국 수학올림피아드 커뮤니티용 Weekly Proof Competition 플랫폼입니다.

## 구현 범위 (현재)

- Public 페이지
  - 현재 주차 문제 표시 (status / setter / tags / 마감 정보)
  - Google 로그인/로그아웃
  - Markdown+LaTeX 텍스트 기반 제출 저장/수정 (open 상태에서만)
  - 전체 리더보드 조회
  - 문제 아카이브 조회
- Admin/Setter 페이지
  - 문제 생성/수정 (문제 본문, 태그, 해설, setter 정보)
  - 문제 상태 전환 (scheduled/open/closed/grading/published)
  - 제출 익명 목록 기반 채점 (0~7 정수점)
  - Best Solution 지정
  - rating 업데이트 Cloud Function 실행
- Backend/Rules
  - rating 업데이트 1회성(idempotent) 보장
  - 일반 유저의 rating/role/문제 상태 수정 차단
  - 제출은 1인 1문제 1제출(docId=`{problemId}_{uid}`)
  - 코멘트는 published 문제에서만 허용, submission 댓글은 공개 제출만 허용

## 디렉터리

- `web/`: public + admin/setter UI
- `firebase/`: Firestore 보안 규칙/인덱스
- `functions/`: rating 업데이트 callable function
- `docs/`: 기획/데이터모델 문서

## 실행 전 설정

`web/app.js`, `web/admin.js`의 `WEEKLY_BOUNTY_FIREBASE_CONFIG` 또는 전역 변수 주입으로 Firebase 설정을 넣어야 합니다.

## 배포

```bash
firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
```
