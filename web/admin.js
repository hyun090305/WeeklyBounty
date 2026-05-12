const firebaseConfig = window.WEEKLY_BOUNTY_FIREBASE_CONFIG || {
  apiKey: 'REPLACE_ME', authDomain: 'REPLACE_ME', projectId: 'REPLACE_ME', appId: 'REPLACE_ME'
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const fn = firebase.app().functions('us-central1');
const el = (id) => document.getElementById(id);

async function upsertProblem() {
  const id = el('problemId').value.trim();
  if (!id) return;
  await db.collection('problems').doc(id).set({
    weekLabel: el('weekLabel').value,
    setterName: el('setterName').value,
    setterUid: el('setterUid').value,
    tags: el('tags').value.split(',').map((x) => x.trim()).filter(Boolean),
    statement: el('statement').value,
    officialSolution: el('officialSolution').value,
    status: 'scheduled',
    ratingUpdated: false,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  alert('saved');
}

async function changeStatus() {
  await db.collection('problems').doc(el('targetProblemId').value.trim()).set({ status: el('nextStatus').value }, { merge: true });
}

async function pickBest() {
  await db.collection('problems').doc(el('targetProblemId').value.trim()).set({ bestSubmissionId: el('bestSubmissionId').value.trim() }, { merge: true });
}

async function runRating() {
  const callable = fn.httpsCallable('runRatingUpdate');
  const result = await callable({ problemId: el('targetProblemId').value.trim() });
  alert(JSON.stringify(result.data));
}

async function loadForGrading() {
  const problemId = el('gradingProblemId').value.trim();
  const snap = await db.collection('submissions').where('problemId', '==', problemId).get();
  el('gradingBody').innerHTML = snap.docs.map((d) => {
    const s = d.data();
    return `<tr>
      <td>${s.anonymousCode || d.id.slice(0,6)}</td>
      <td><pre>${(s.content || '').replace(/[<>]/g, '')}</pre></td>
      <td><input id="score_${d.id}" type="number" min="0" max="7" value="${s.score ?? ''}"/></td>
      <td><input id="comment_${d.id}" value="${s.graderComment ?? ''}"/></td>
      <td><button onclick="gradeSubmission('${d.id}')">저장</button></td>
    </tr>`;
  }).join('');
}

window.gradeSubmission = async (id) => {
  const score = Number(el(`score_${id}`).value);
  const graderComment = el(`comment_${id}`).value;
  await db.collection('submissions').doc(id).set({ score, graderComment, gradedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
};

auth.onAuthStateChanged((u) => {
  el('adminAuthState').textContent = u ? `${u.displayName || u.uid} 로그인` : '로그인이 필요합니다';
  if (!u) auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
});

el('upsertProblemBtn').onclick = upsertProblem;
el('changeStatusBtn').onclick = changeStatus;
el('pickBestBtn').onclick = pickBest;
el('runRatingBtn').onclick = runRating;
el('loadSubmissionsBtn').onclick = loadForGrading;
