export interface DocumentTypeOption {
  value: string;
  label: string;
  levels?: { value: string; label: string }[];
  hasCustomLabel?: boolean;
}

export const DOCUMENT_TYPES: DocumentTypeOption[] = [
  {
    value: 'kukkiwon_poom',
    label: 'Kukkiwon Poom',
    levels: [
      { value: '1', label: 'Poom 1' },
      { value: '2', label: 'Poom 2' },
      { value: '3', label: 'Poom 3' },
      { value: '4', label: 'Poom 4' },
    ],
  },
  {
    value: 'kukkiwon_dan',
    label: 'Kukkiwon Dan',
    levels: Array.from({ length: 9 }, (_, i) => ({
      value: String(i + 1),
      label: `Dan ${i + 1}`,
    })),
  },
  {
    value: 'stf_poom',
    label: 'STF Poom',
    levels: [
      { value: '1', label: 'Poom 1' },
      { value: '2', label: 'Poom 2' },
      { value: '3', label: 'Poom 3' },
      { value: '4', label: 'Poom 4' },
    ],
  },
  {
    value: 'stf_dan',
    label: 'STF Dan',
    levels: Array.from({ length: 9 }, (_, i) => ({
      value: String(i + 1),
      label: `Dan ${i + 1}`,
    })),
  },
  { value: 'nric_fin', label: 'NRIC / FIN' },
  { value: 'ep_sp_wp', label: 'EP / SP / WP' },
  { value: 'passport', label: 'Passport' },
  {
    value: 'stf_poomsae_referee',
    label: 'STF Poomsae Referee',
    levels: [
      { value: '3P', label: 'Rank 3P' },
      { value: '3', label: 'Rank 3' },
      { value: '2', label: 'Rank 2' },
      { value: '1', label: 'Rank 1' },
      { value: 'S', label: 'Rank S' },
    ],
  },
  {
    value: 'stf_poomsae_coach',
    label: 'STF Poomsae Coach',
    levels: [
      { value: '1', label: 'Level 1' },
      { value: '2', label: 'Level 2' },
      { value: '3', label: 'Level 3' },
    ],
  },
  {
    value: 'stf_kyorugi_referee',
    label: 'STF Kyorugi Referee',
    levels: [
      { value: '3P', label: 'Rank 3P' },
      { value: '3', label: 'Rank 3' },
      { value: '2', label: 'Rank 2' },
      { value: '1', label: 'Rank 1' },
      { value: 'S', label: 'Rank S' },
    ],
  },
  {
    value: 'sg_coach',
    label: 'SG Coach Course',
    levels: [
      { value: '1', label: 'Level 1' },
      { value: '2', label: 'Level 2' },
      { value: '3', label: 'Level 3' },
    ],
  },
  { value: 'stf_coach_induction', label: 'STF Coach Induction Course' },
  { value: 'others', label: 'Others', hasCustomLabel: true },
];

export function getDocumentTypeLabel(type: string, level?: string | null, customLabel?: string | null): string {
  const opt = DOCUMENT_TYPES.find((d) => d.value === type);
  if (!opt) return type;
  if (opt.hasCustomLabel && customLabel) return customLabel;
  if (level && opt.levels) {
    const lvl = opt.levels.find((l) => l.value === level);
    return lvl ? `${opt.label} ${lvl.label}` : opt.label;
  }
  return opt.label;
}
