# DATA MODEL (Firestore)

## users/{uid}
- nickname: string
- bio: string
- school?: string
- cohort?: string
- rating: number (default 1200)
- peakRating: number
- createdAt: timestamp
- updatedAt: timestamp

## roles/{uid}
- isAdmin: boolean
- isSetter: boolean
- setterProblemIds: string[]

## problems/{problemId}
- weekNumber: number
- title: string
- statementMd: string
- setterUid: string
- setterName: string
- tags: string[]
- status: "scheduled"|"open"|"closed"|"grading"|"published"
- openAt: timestamp
- closeAt: timestamp
- publishedAt?: timestamp
- officialSolutionMd?: string
- bestSubmissionId?: string
- ratingUpdated: boolean
- stats: {
  participants: number,
  avgScore: number,
  scoreHistogram: map<string, number>
 }

## submissions/{submissionId}
- problemId: string
- authorUid: string
- anonymousCode: string
- contentMd: string
- isPublic: boolean
- createdAt: timestamp
- updatedAt: timestamp
- score?: number (0..7)
- graderComment?: string
- gradedAt?: timestamp

## ratingEvents/{eventId}
- problemId: string
- executedBy: string (admin uid)
- executedAt: timestamp
- deltas: map<uid, number>
- version: number

## comments/{commentId}
- problemId: string
- submissionId?: string
- authorUid: string
- authorNickname: string
- body: string
- createdAt: timestamp
- updatedAt?: timestamp
