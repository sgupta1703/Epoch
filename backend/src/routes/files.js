const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../services/supabaseClient');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

async function teacherOwnsUnit(unitId, teacherId) {
  const { data: unit } = await supabase
    .from('units').select('classroom_id').eq('id', unitId).single();
  if (!unit) return false;
  const { data: classroom } = await supabase
    .from('classrooms').select('id')
    .eq('id', unit.classroom_id).eq('teacher_id', teacherId).single();
  return !!classroom;
}

async function studentCanAccessUnit(unitId, studentId) {
  const { data: unit } = await supabase
    .from('units').select('classroom_id, is_visible').eq('id', unitId).single();
  if (!unit || !unit.is_visible) return false;
  const { data: enrollment } = await supabase
    .from('classroom_students').select('classroom_id')
    .eq('classroom_id', unit.classroom_id).eq('student_id', studentId).single();
  return !!enrollment;
}

// GET /api/units/:unitId/files
router.get('/:unitId/files', authenticate, async (req, res, next) => {
  try {
    const { unitId } = req.params;

    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsUnit(unitId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    } else {
      const canAccess = await studentCanAccessUnit(unitId, req.user.id);
      if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    }

    const { data: files, error } = await supabase
      .from('unit_files')
      .select('*')
      .eq('unit_id', unitId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    // Attach public URLs
    const filesWithUrls = files.map(f => ({
      ...f,
      url: supabase.storage.from('unit-files').getPublicUrl(f.storage_path).data.publicUrl,
    }));

    res.json({ files: filesWithUrls });
  } catch (err) {
    next(err);
  }
});

// POST /api/units/:unitId/files
router.post('/:unitId/files', authenticate, requireRole('teacher'), upload.single('file'), async (req, res, next) => {
  try {
    const { unitId } = req.params;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { originalname, mimetype, buffer, size } = req.file;
    const ext = originalname.split('.').pop();
    const storagePath = `${unitId}/${Date.now()}-${originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from('unit-files')
      .upload(storagePath, buffer, { contentType: mimetype });

    if (uploadError) throw uploadError;

    const { data: file, error: dbError } = await supabase
      .from('unit_files')
      .insert({
        unit_id: unitId,
        name: originalname,
        size,
        mime_type: mimetype,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    const url = supabase.storage.from('unit-files').getPublicUrl(storagePath).data.publicUrl;

    res.status(201).json({ file: { ...file, url } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/units/:unitId/files/:fileId
router.delete('/:unitId/files/:fileId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, fileId } = req.params;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: file, error: fetchError } = await supabase
      .from('unit_files').select('*').eq('id', fileId).eq('unit_id', unitId).single();

    if (fetchError || !file) return res.status(404).json({ error: 'File not found' });

    await supabase.storage.from('unit-files').remove([file.storage_path]);
    await supabase.from('unit_files').delete().eq('id', fileId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;