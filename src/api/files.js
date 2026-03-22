import api from './axiosInstance';

export async function getFiles(unitId) {
  const { data } = await api.get(`/api/units/${unitId}/files`);
  return data;
}

export async function uploadFile(unitId, file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post(`/api/units/${unitId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => {
      if (onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function deleteFile(unitId, fileId) {
  const { data } = await api.delete(`/api/units/${unitId}/files/${fileId}`);
  return data;
}