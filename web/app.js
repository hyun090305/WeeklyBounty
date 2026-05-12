import { auth, db, googleProvider, now } from './firebase.js';
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';
import { onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';

const el = (id) => document.getElementById(id);
let currentUser = null;
let currentProblem = null;

function statusText(problem) { return problem?.status || 'scheduled'; }

async function loadCurrentProblem() {
  const q = query(
    collection(db, 'problems'),
    where('status', 'in', ['open', 'closed', 'grading', 'published']),
    orderBy('publishedAt', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  currentProblem = { id: snap.docs[0].id, ...snap.docs[0].data() };
  el('statusBadge').textContent = statusText(currentProblem);
  el('problemTitle').textContent = `${currentProblem.weekLabel || currentProblem.id} by ${currentProblem.setterName || 'unknown'}`;
  el('problemMeta').textContent = `태그: ${(currentProblem.tags || []).join(', ')} | 마감: ${currentProblem.closeAt || '-'}`;
  el('problemStatement').textContent = currentProblem.statement || '';
}

async function loadArchive() {
  const q = query(collection(db, 'problems'), orderBy('publishedAt', 'desc'), limit(40));
  const snap = await getDocs(q);
  el('archiveBody').innerHTML = snap.docs.map((d) => {
    const p = d.data();
    return `<tr><td>${p.weekLabel || d.id}</td><td>${p.setterName || '-'}</td><td>${(p.tags || []).join(', ')}</td><td>${p.publishedAt || '-'}</td><td>${p.status}</td></tr>`;
  }).join('');
}

async function loadLeaderboard() {
  const q = query(collection(db, 'users'), orderBy('rating', 'desc'), limit(30));
  const snap = await getDocs(q);
  el('leaderboardList').innerHTML = snap.docs.map((d) => {
    const u = d.data();
    return `<li>${u.nickname || d.id} - ${u.rating || 1200}</li>`;
  }).join('');
}

async function loadMySubmission() {
  if (!currentUser || !currentProblem) return;
  const subId = `${currentProblem.id}_${currentUser.uid}`;
  const snap = await getDoc(doc(db, 'submissions', subId));
  if (!snap.exists()) return;
  const s = snap.data();
  el('submissionInput').value = s.content || '';
  el('publicToggle').checked = s.isPublic === true;
}

async function saveSubmission() {
  if (!currentUser || !currentProblem) return alert('로그인 후 이용하세요.');
  if (currentProblem.status !== 'open') return alert('open 상태에서만 제출/수정 가능합니다.');
  const content = el('submissionInput').value.trim();
  if (content.length < 20) return alert('증명/아이디어 중심으로 충분히 작성해주세요.');
  const subId = `${currentProblem.id}_${currentUser.uid}`;
  await setDoc(doc(db, 'submissions', subId), {
    problemId: currentProblem.id,
    authorUid: currentUser.uid,
    content,
    isPublic: el('publicToggle').checked,
    updatedAt: now()
  }, { merge: true });
  el('submissionNote').textContent = '저장되었습니다.';
}

onAuthStateChanged(auth, async (u) => {
  currentUser = u;
  el('authState').textContent = u ? `${u.displayName || u.uid} 로그인` : '로그아웃 상태';
  el('loginBtn').hidden = !!u;
  el('logoutBtn').hidden = !u;
  await loadCurrentProblem();
  await Promise.all([loadArchive(), loadLeaderboard()]);
  await loadMySubmission();
});

el('loginBtn').onclick = () => signInWithPopup(auth, googleProvider);
el('logoutBtn').onclick = () => signOut(auth);
el('saveSubmissionBtn').onclick = saveSubmission;
