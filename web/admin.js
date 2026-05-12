import { auth, db, fn, googleProvider, now } from './firebase.js';
import {
  collection, doc, getDocs, query, setDoc, where
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';
import { onAuthStateChanged, signInWithPopup } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-functions.js';

const el = (id) => document.getElementById(id);

async function upsertProblem() {
  const id = el('problemId').value.trim();
  if (!id) return;
  await setDoc(doc(db, 'problems', id), {
    weekLabel: el('weekLabel').value,
    setterName: el('setterName').value,
    setterUid: el('setterUid').value,
    tags: el('tags').value.split(',').map((x) => x.trim()).filter(Boolean),
    statement: el('statement').value,
    officialSolution: el('officialSolution').value,
    status: 'scheduled',
    ratingUpdated: false,
    updatedAt: now()
  }, { merge: true });
  alert('saved');
}

async function changeStatus() {
  await setDoc(doc(db, 'problems', el('targetProblemId').value.trim()), { status: el('nextStatus').value }, { merge: true });
}

async function pickBest() {
  await setDoc(doc(db, 'problems', el('targetProblemId').value.trim()), { bestSubmissionId: el('bestSubmissionId').value.trim() }, { merge: true });
}

async function runRating() {
  const callable = httpsCallable(fn, 'runRatingUpdate');
  const result = await callable({ problemId: el('targetProblemId').value.trim() });
  alert(JSON.stringify(result.data));
}

async function loadForGrading() {
  const problemId = el('gradingProblemId').value.trim();
  const snap = await getDocs(query(collection(db, 'submissions'), where('problemId', '==', problemId)));
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
  await setDoc(doc(db, 'submissions', id), { score, graderComment, gradedAt: now() }, { merge: true });
};

onAuthStateChanged(auth, (u) => {
  el('adminAuthState').textContent = u ? `${u.displayName || u.uid} 로그인` : '로그인이 필요합니다';
  if (!u) signInWithPopup(auth, googleProvider);
});

el('upsertProblemBtn').onclick = upsertProblem;
el('changeStatusBtn').onclick = changeStatus;
el('pickBestBtn').onclick = pickBest;
el('runRatingBtn').onclick = runRating;
el('loadSubmissionsBtn').onclick = loadForGrading;
