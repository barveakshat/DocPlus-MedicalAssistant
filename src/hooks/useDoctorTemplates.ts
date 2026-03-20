import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DoctorTemplate {
  id: string;
  content: string;
  sort_order: number;
}

const DEFAULT_TEMPLATES = [
  'Please upload your latest reports before our next discussion.',
  'Please book a follow-up for 7 days from now.',
  'Kindly monitor your symptoms and share updates by evening.',
  'Please continue current medication and report any side effects immediately.',
];

export function useDoctorTemplates(doctorUserId: string | null | undefined) {
  const [templates, setTemplates] = useState<DoctorTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!doctorUserId) return;
    setLoading(true);

    const { data } = await supabase
      .from('doctor_templates')
      .select('id, content, sort_order')
      .eq('doctor_user_id', doctorUserId)
      .order('sort_order', { ascending: true });

    if (data && data.length > 0) {
      setTemplates(data as DoctorTemplate[]);
    } else {
      // Seed defaults on first use
      const rows = DEFAULT_TEMPLATES.map((content, i) => ({
        doctor_user_id: doctorUserId,
        content,
        sort_order: i,
      }));
      const { data: inserted } = await supabase
        .from('doctor_templates')
        .insert(rows)
        .select('id, content, sort_order');
      setTemplates((inserted ?? []) as DoctorTemplate[]);
    }

    setLoading(false);
  }, [doctorUserId]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const addTemplate = useCallback(
    async (content: string) => {
      if (!doctorUserId || !content.trim()) return;
      const maxOrder = templates.reduce((max, t) => Math.max(max, t.sort_order), -1);
      const { data } = await supabase
        .from('doctor_templates')
        .insert({ doctor_user_id: doctorUserId, content: content.trim(), sort_order: maxOrder + 1 })
        .select('id, content, sort_order')
        .single();
      if (data) setTemplates((prev) => [...prev, data as DoctorTemplate]);
    },
    [doctorUserId, templates]
  );

  const deleteTemplate = useCallback(async (id: string) => {
    await supabase.from('doctor_templates').delete().eq('id', id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { templates, loading, addTemplate, deleteTemplate };
}
