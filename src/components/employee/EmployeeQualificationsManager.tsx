import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { EmployeeQualifications } from '@/types/employee';

interface EmployeeQualificationsManagerProps {
  qualifications: EmployeeQualifications;
  onChange: (qualifications: EmployeeQualifications) => void;
  disabled?: boolean;
}

const QUALIFICATION_FIELDS = [
  { key: 'danFirst', label: '1st Dan' },
  { key: 'danSecond', label: '2nd Dan' },
  { key: 'danThird', label: '3rd Dan' },
  { key: 'danFourthAbove', label: '4th Dan & Above' },
  { key: 'stfPoomsaeCoachLevel1', label: 'STF Poomsae Coach Level 1' },
  { key: 'stfPoomsaeCoachLevel2', label: 'STF Poomsae Coach Level 2' },
  { key: 'stfPoomsaeCoachLevel3', label: 'STF Poomsae Coach Level 3' },
  { key: 'sgCoachLevel1', label: 'SG Coach Level 1' },
  { key: 'sgCoachLevel2', label: 'SG Coach Level 2' },
  { key: 'sgCoachLevel3', label: 'SG Coach Level 3' },
  { key: 'stfCoachInduction', label: 'STF Coach Induction' },
  { key: 'stfPoomsaeReferee', label: 'STF Poomsae Referee' },
  { key: 'stfKyorugiReferee', label: 'STF Kyorugi Referee' },
  { key: 'kukkiwonMastersClass3', label: 'Kukkiwon International Masters Class 3' },
  { key: 'kukkiwonMastersClass2', label: 'Kukkiwon International Masters Class 2' },
  { key: 'kukkiwonMastersClass1', label: 'Kukkiwon International Masters Class 1' },
  { key: 'kukkiwonPoomDanExaminerClass3', label: 'Kukkiwon Poom Dan Examiner Class 3' },
  { key: 'kukkiwonPoomDanExaminerClass2', label: 'Kukkiwon Poom Dan Examiner Class 2' },
  { key: 'kukkiwonPoomDanExaminerClass1', label: 'Kukkiwon Poom Dan Examiner Class 1' },
  { key: 'wtKyorugiCoachLevel1', label: 'World Taekwondo Kyorugi Coach Level 1' },
  { key: 'wtKyorugiCoachLevel2', label: 'World Taekwondo Kyorugi Coach Level 2' },
  { key: 'wtPoomsaeCoach', label: 'World Taekwondo Poomsae Coach' },
] as const;

const EmployeeQualificationsManager: React.FC<EmployeeQualificationsManagerProps> = ({
  qualifications,
  onChange,
  disabled = false,
}) => {
  const handleCheckboxChange = (key: string, checked: boolean) => {
    onChange({
      ...qualifications,
      [key]: checked,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qualifications & Certifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUALIFICATION_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={qualifications[key as keyof EmployeeQualifications] || false}
                onCheckedChange={(checked) => handleCheckboxChange(key, checked as boolean)}
                disabled={disabled}
              />
              <Label
                htmlFor={key}
                className="text-sm font-normal cursor-pointer"
              >
                {label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeQualificationsManager;
