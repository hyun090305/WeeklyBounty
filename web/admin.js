import { auth, db, fn, googleProvider, now } from './firebase.js';
import {
  collection, doc, getDocs, query, setDoc, where
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';
import { onAuthStateChanged, signInWithPopup } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-functions.js';

const el = (id) => document.getElementById(id);

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekNumber(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

function buildWeekOptions() {
  const select = el('weekRange');
  if (!select) return;
  const monday = startOfWeek(new Date());
  select.innerHTML = '';
  for (let i = -8; i <= 12; i += 1) {
    const start = new Date(monday);
    start.setDate(monday.getDate() + (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const id = `${start.getFullYear()}w${String(weekNumber(start)).padStart(2, '0')}`;
    const label = `${formatDate(start)} ~ ${formatDate(end)}`;
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    option.selected = i === 0;
    select.appendChild(option);
  }
  updateGeneratedProblemId();
}

function updateGeneratedProblemId() {
  const id = el('weekRange')?.value || '';
  el('generatedProblemId').value = id;
}

function initAdminTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  const panes = document.querySelectorAll('.admin-pane');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panes.forEach((pane) => pane.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });
}


async function upsertProblem() {
  const id = el('weekRange').value.trim();
  if (!id) return;
  const user = auth.currentUser;
  const selectedWeekText = el('weekRange').selectedOptions[0]?.textContent || '';
  await setDoc(doc(db, 'problems', id), {
    weekLabel: selectedWeekText,
    setterName: user?.displayName || 'unknown',
    setterUid: user?.uid || '',
    tags: el('tags').value.split(',').map((x) => x.trim()).filter(Boolean),
    statement: el('statement').value,
    officialSolution: el('officialSolution').value,
    manualClosed: false,
    ratingUpdated: false,
    updatedAt: now()
  }, { merge: true });
  alert('saved');
}

async function changeStatus() {
  const status = el('nextStatus').value;
  const patch = {};
  if (status === 'open') patch.manualClosed = false;
  if (status === 'closed') patch.manualClosed = true;
  if (status === 'published') patch.publishedAt = now();
  if (status === 'grading') patch.publishedAt = null;
  await setDoc(doc(db, 'problems', el('targetProblemId').value.trim()), patch, { merge: true });
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
el('weekRange').onchange = updateGeneratedProblemId;
buildWeekOptions();
initAdminTabs();
