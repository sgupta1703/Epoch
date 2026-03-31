export const STUDENT_QUIZ_LOCK_EVENT = 'epoch:student-quiz-lock-changed';

function hasWindow() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function lockStorageKey(studentId) {
  return `epoch:student-quiz-lock:${studentId}`;
}

function draftStorageKey(studentId, quizId) {
  return `epoch:student-quiz-draft:${studentId}:${quizId}`;
}

function readJson(key) {
  if (!hasWindow()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  if (!hasWindow()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeStorageItem(key) {
  if (!hasWindow()) return;
  window.localStorage.removeItem(key);
}

function emitQuizLockChange() {
  if (!hasWindow()) return;
  window.dispatchEvent(new Event(STUDENT_QUIZ_LOCK_EVENT));
}

function isValidLock(lock, studentId) {
  return !!(
    lock &&
    typeof lock.studentId === 'string' &&
    lock.studentId === studentId &&
    typeof lock.classroomId === 'string' &&
    typeof lock.unitId === 'string' &&
    typeof lock.quizId === 'string'
  );
}

export function buildStudentQuizLockPath(lock) {
  if (!lock) return '/student';
  const params = new URLSearchParams({ quizId: lock.quizId });
  return `/student/classroom/${lock.classroomId}/unit/${lock.unitId}/quiz?${params.toString()}`;
}

function isAllowedStudentQuizEscapePath(pathname) {
  return pathname === '/student'
    || pathname === '/student/profile'
    || pathname === '/student/settings';
}

export function getActiveStudentQuizLock(studentId) {
  if (!studentId) return null;

  const lock = readJson(lockStorageKey(studentId));
  if (!isValidLock(lock, studentId)) {
    removeStorageItem(lockStorageKey(studentId));
    return null;
  }

  return lock;
}

export function setActiveStudentQuizLock(lock) {
  if (!lock?.studentId) return;
  writeJson(lockStorageKey(lock.studentId), {
    studentId: lock.studentId,
    classroomId: lock.classroomId,
    unitId: lock.unitId,
    quizId: lock.quizId,
    startedAt: lock.startedAt || new Date().toISOString(),
  });
  emitQuizLockChange();
}

export function clearActiveStudentQuizLock(studentId) {
  if (!studentId) return;
  removeStorageItem(lockStorageKey(studentId));
  emitQuizLockChange();
}

export function isStudentQuizLockPath(location, lock) {
  if (!location || !lock) return false;

  const pathname = location.pathname || '';
  const search = location.search || '';
  const params = new URLSearchParams(search);

  return pathname === `/student/classroom/${lock.classroomId}/unit/${lock.unitId}/quiz`
    && params.get('quizId') === lock.quizId;
}

export function buildStudentQuizEscapeState(state = {}) {
  return { ...state, allowStudentQuizEscape: true };
}

export function isStudentQuizLockEscapeAllowed(location) {
  if (!location) return false;

  const pathname = location.pathname || '';
  return isAllowedStudentQuizEscapePath(pathname) && !!location.state?.allowStudentQuizEscape;
}

export function getStudentQuizDraft(studentId, quizId) {
  if (!studentId || !quizId) return {};
  const draft = readJson(draftStorageKey(studentId, quizId));
  return draft && typeof draft === 'object' ? draft : {};
}

export function setStudentQuizDraft(studentId, quizId, answers) {
  if (!studentId || !quizId) return;
  writeJson(draftStorageKey(studentId, quizId), answers || {});
}

export function clearStudentQuizDraft(studentId, quizId) {
  if (!studentId || !quizId) return;
  removeStorageItem(draftStorageKey(studentId, quizId));
}
