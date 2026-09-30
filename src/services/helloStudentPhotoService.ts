import { supabase } from '@/integrations/supabase/client';

const call = async (sessionId: string, studentId: string, imageDataUrl?: string): Promise<string | null> => {
  const { data, error } = await supabase.functions.invoke('hello-student-photo', {
    body: { session_id: sessionId, student_id: studentId, ...(imageDataUrl ? { image_data_url: imageDataUrl } : {}) },
  });
  if (error || data?.error) throw new Error(data?.error || error?.message || 'Photo unavailable');
  return data?.photo_url || null;
};

export const getHelloStudentPhoto = (sessionId: string, studentId: string) => call(sessionId, studentId);

export const saveHelloStudentPhoto = async (sessionId: string, studentId: string, file: File): Promise<string | null> => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) {
    throw new Error('Choose a JPEG, PNG or WebP photo smaller than 5 MB');
  }
  const imageDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Photo could not be read'));
    reader.readAsDataURL(file);
  });
  return call(sessionId, studentId, imageDataUrl);
};
