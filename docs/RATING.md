# SIMPLE RATING (MVP)

목표: Elo-유사하면서도 구현 단순/설명 가능.

- baseK = 24
- 참가자 i의 normalized score s_i = score_i / 7
- 필드 평균 m = mean(s_i)
- 기대값 e_i = 1 / (1 + 10^((avgRating - rating_i)/400))
- 성과값 p_i = 0.25 + 0.75 * s_i  (참여 보상은 주되 0점 반복 상승 방지)
- delta_i = round(baseK * ((0.6 * (p_i - e_i)) + (0.4 * (s_i - m))))

보정:
- score_i = 0 이고 delta_i > 0 이면 delta_i = 0
- delta_i 하한 = -16, 상한 = +24
- 미참가자는 변화 없음
- 문제당 ratingEvents 1개만 허용(idempotent key = problemId)
