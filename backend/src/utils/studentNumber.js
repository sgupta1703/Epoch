function normalizeStudentNumber(value = '') {
  return String(value).replace(/\D/g, '').slice(0, 7);
}

function isValidStudentNumber(value = '') {
  return /^\d{7}$/.test(normalizeStudentNumber(value));
}

module.exports = {
  normalizeStudentNumber,
  isValidStudentNumber,
};
