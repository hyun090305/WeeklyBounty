import { auth, db, googleProvider, now } from './firebase.js';
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';
import { onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';

const el = (id) => document.getElementById(id);
let currentUser = null;
let currentProblem = null;

function statusText(problem) { return effectiveStatus(problem); }

function parseWeekId(weekId = '') {
  const m = String(weekId).match(/^(\d{4})w(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), week: Number(m[2]) };
}

function isoWeekBoundsUtc(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const weekStart = new Date(week1Monday);
  weekStart.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  return { weekStart, weekEnd };
}

function todayUtcDate() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function effectiveStatus(problem) {
  if (!problem) return 'scheduled';
  const parsed = parseWeekId(problem.id);
  if (!parsed) return problem.status || 'scheduled';
  const { weekStart, weekEnd } = isoWeekBoundsUtc(parsed.year, parsed.week);
  const today = todayUtcDate();
  if (today < weekStart) return 'scheduled';
  if (today <= weekEnd) return problem.manualClosed === true ? 'closed' : 'open';
  return problem.publishedAt ? 'published' : 'grading';
}


function currentWeekProblemId(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}w${String(week).padStart(2, '0')}`;
}

function renderStatementWithLatex(text = '') {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  el('problemStatement').innerHTML = escaped;
  if (window.renderMathInElement) {
    window.renderMathInElement(el('problemStatement'), {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false
    });
  }
}

async function loadCurrentProblem() {
  const weekId = currentWeekProblemId();
  const todayProblemDoc = await getDoc(doc(db, 'problems', weekId));

  if (!todayProblemDoc.exists()) {
    currentProblem = null;
    el('statusBadge').textContent = '-';
    el('problemTitle').textContent = '아직 이번 주 문제가 올라오지 않은 것 같아요.';
    el('problemMeta').textContent = `조회 주차: ${weekId}`;
    renderStatementWithLatex('');
    return;
  }

  currentProblem = { id: todayProblemDoc.id, ...todayProblemDoc.data() };
  el('statusBadge').textContent = statusText(currentProblem);
  el('problemTitle').textContent = `${currentProblem.weekLabel || currentProblem.id} by ${currentProblem.setterName || 'unknown'}`;
  el('problemMeta').textContent = `태그: ${(currentProblem.tags || []).join(', ')} | 마감: ${currentProblem.closeAt || '-'}`;
  renderStatementWithLatex(currentProblem.statement || currentProblem.statementMd || '');
}

async function loadArchive() {
  const q = query(collection(db, 'problems'), orderBy('publishedAt', 'desc'), limit(40));
  const snap = await getDocs(q);
  el('archiveBody').innerHTML = snap.docs.map((d) => {
    const p = d.data();
    return `<tr><td>${p.weekLabel || d.id}</td><td>${p.setterName || '-'}</td><td>${(p.tags || []).join(', ')}</td><td>${p.publishedAt || '-'}</td><td>${effectiveStatus({ id: d.id, ...p })}</td></tr>`;
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
  if (effectiveStatus(currentProblem) !== 'open') return alert('open 상태에서만 제출/수정 가능합니다.');
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
