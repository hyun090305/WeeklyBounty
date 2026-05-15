/**
 * Suoller Firebase Functions (MVP)
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

exports.runRatingUpdate = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login required');

  const roleSnap = await db.collection('roles').doc(uid).get();
  if (!roleSnap.exists || roleSnap.data().isAdmin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }

  const problemId = request.data?.problemId;
  if (!problemId) throw new HttpsError('invalid-argument', 'problemId required');

  return db.runTransaction(async (tx) => {
    const problemRef = db.collection('problems').doc(problemId);
    const problemSnap = await tx.get(problemRef);
    if (!problemSnap.exists) throw new HttpsError('not-found', 'Problem not found');

    const problem = problemSnap.data();
    if (problem.status !== 'published') {
      throw new HttpsError('failed-precondition', 'Problem must be published');
    }
    if (problem.ratingUpdated === true) {
      return { ok: true, skipped: true, reason: 'already-updated' };
    }

    const subsSnap = await db.collection('submissions').where('problemId', '==', problemId).get();
    const graded = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => Number.isInteger(s.score));
    if (graded.length === 0) throw new HttpsError('failed-precondition', 'No graded submissions');

    const userIds = [...new Set(graded.map((s) => s.authorUid))];
    const userRefs = userIds.map((id) => db.collection('users').doc(id));
    const userSnaps = await Promise.all(userRefs.map((r) => tx.get(r)));

    const ratings = {};
    userSnaps.forEach((snap, idx) => {
      ratings[userIds[idx]] = snap.exists ? (snap.data().rating || 1200) : 1200;
    });

    const avgRating = userIds.reduce((acc, id) => acc + ratings[id], 0) / userIds.length;
    const sMap = {};
    graded.forEach((s) => {
      sMap[s.authorUid] = Math.max((sMap[s.authorUid] ?? -1), s.score / 7);
    });
    const sVals = Object.values(sMap);
    const meanS = sVals.reduce((a, b) => a + b, 0) / sVals.length;

    const deltas = {};
    userIds.forEach((id) => {
      const r = ratings[id];
      const si = sMap[id] ?? 0;
      const e = 1 / (1 + Math.pow(10, (avgRating - r) / 400));
      const p = 0.2 + 0.8 * si;
      let delta = Math.round(4 + 20 * (p - e) + 8 * (si - meanS));
      if (si === 0 && delta > 0) delta = 0;
      delta = Math.max(-16, Math.min(24, delta));
      deltas[id] = delta;

      const nextRating = r + delta;
      const peakRating = Math.max(nextRating, (userSnaps.find((x, i) => userIds[i] === id)?.data()?.peakRating || nextRating));
      tx.set(db.collection('users').doc(id), { rating: nextRating, peakRating, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });

    tx.set(db.collection('ratingEvents').doc(problemId), {
      problemId,
      executedBy: uid,
      executedAt: admin.firestore.FieldValue.serverTimestamp(),
      deltas,
      version: 1
    });

    tx.set(problemRef, { ratingUpdated: true }, { merge: true });
    return { ok: true, skipped: false, deltasCount: Object.keys(deltas).length };
  });
});

exports.syncUsersFromAuth = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login required');

  const roleSnap = await db.collection('roles').doc(uid).get();
  if (!roleSnap.exists || roleSnap.data().isAdmin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }

  let pageToken;
  let synced = 0;

  do {
    const page = await admin.auth().listUsers(1000, pageToken);
    await Promise.all(page.users.map(async (userRecord) => {
      const hasGoogleProvider = (userRecord.providerData || []).some((p) => p.providerId === 'google.com');
      if (!hasGoogleProvider) return;
      const createdAt = userRecord.metadata.creationTime ? new Date(userRecord.metadata.creationTime) : null;
      await db.collection('users').doc(userRecord.uid).set({
        displayName: userRecord.displayName || '',
        nickname: userRecord.displayName || userRecord.email || userRecord.uid,
        email: userRecord.email || '',
        photoURL: userRecord.photoURL || '',
        rating: 1200,
        peakRating: 1200,
        createdAt: createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      synced += 1;
    }));
    pageToken = page.pageToken;
  } while (pageToken);

  return { ok: true, synced };
});
