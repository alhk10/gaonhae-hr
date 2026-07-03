import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Award, GraduationCap, Trophy } from 'lucide-react';
import { getActivePricingConfig, SlotPricingConfig } from '@/services/slotPricingService';
import { Skeleton } from '@/components/ui/skeleton';

interface PricingSettingsTabProps {
  onConfigChange?: (config: Partial<SlotPricingConfig>) => void;
}

const PricingSettingsTab: React.FC<PricingSettingsTabProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState<SlotPricingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getActivePricingConfig();
      setConfig(data);
    } catch (error) {
      console.error('Error loading pricing config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SlotPricingConfig, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updated = { ...config, [field]: numValue } as SlotPricingConfig;
    setConfig(updated);
    onConfigChange?.(updated);
  };

  if (loading) {
    return (
      <div className="space-y-6 py-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No pricing configuration found. Please contact system administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Base Rates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            <CardTitle>Base Rates</CardTitle>
          </div>
          <CardDescription>
            Configure base pay rates for weekday and weekend bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weekday_rate">Weekday Base Rate ($)</Label>
              <Input
                id="weekday_rate"
                type="number"
                step="0.01"
                value={config.weekday_base_rate}
                onChange={(e) => handleChange('weekday_base_rate', e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekend_rate">Weekend Base Rate ($)</Label>
              <Input
                id="weekend_rate"
                type="number"
                step="0.01"
                value={config.weekend_base_rate}
                onChange={(e) => handleChange('weekend_base_rate', e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="years_of_service_bonus">Years of Service Bonus ($ per year)</Label>
              <Input
                id="years_of_service_bonus"
                type="number"
                step="0.01"
                value={config.years_of_service_bonus_per_year}
                onChange={(e) => handleChange('years_of_service_bonus_per_year', e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Additional payment per day for each year worked (default: $3)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Monthly Milestone Bonuses */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <CardTitle>Monthly Milestone Bonuses</CardTitle>
          </div>
          <CardDescription>
            One-time bonus paid per month when employee reaches slot milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="milestone_5">8 Slots Bonus ($)</Label>
              <Input
                id="milestone_5"
                type="number"
                step="0.01"
                value={config.milestone_5_slots_bonus}
                onChange={(e) => handleChange('milestone_5_slots_bonus', e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone_10">12 Slots Bonus ($)</Label>
              <Input
                id="milestone_10"
                type="number"
                step="0.01"
                value={config.milestone_10_slots_bonus}
                onChange={(e) => handleChange('milestone_10_slots_bonus', e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone_16">16 Slots Bonus ($)</Label>
              <Input
                id="milestone_16"
                type="number"
                step="0.01"
                value={config.milestone_16_slots_bonus}
                onChange={(e) => handleChange('milestone_16_slots_bonus', e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Dan Level Bonuses */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            <CardTitle>Dan Level Bonuses</CardTitle>
          </div>
          <CardDescription>
            Additional pay based on employee's Dan level (only highest Dan applies)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dan_first">1st Dan Bonus ($)</Label>
              <Input
                id="dan_first"
                type="number"
                step="0.01"
                value={config.dan_first_bonus}
                onChange={(e) => handleChange('dan_first_bonus', e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dan_second">2nd Dan Bonus ($)</Label>
              <Input
                id="dan_second"
                type="number"
                step="0.01"
                value={config.dan_second_bonus}
                onChange={(e) => handleChange('dan_second_bonus', e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dan_third">3rd Dan & Above Bonus ($)</Label>
              <Input
                id="dan_third"
                type="number"
                step="0.01"
                value={config.dan_third_above_bonus}
                onChange={(e) => handleChange('dan_third_above_bonus', e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Qualification Bonuses */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            <CardTitle>Qualification Bonuses</CardTitle>
          </div>
          <CardDescription>
            Additional pay based on certifications (all applicable bonuses stack)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Coach Certifications */}
            <div>
              <h4 className="text-sm font-semibold mb-1">Coach Certifications</h4>
              <p className="text-xs text-muted-foreground mb-3">Poomsae Coach (L1/L2/L3) and SG Coach (L1/L2) are non-stackable — only the highest level held is paid.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stf_induction">STF Coach Induction ($)</Label>
                  <Input
                    id="stf_induction"
                    type="number"
                    step="0.01"
                    value={config.stf_coach_induction_bonus}
                    onChange={(e) => handleChange('stf_coach_induction_bonus', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stf_poomsae_l1">STF Poomsae Coach Level 1 ($)</Label>
                  <Input
                    id="stf_poomsae_l1"
                    type="number"
                    step="0.01"
                    value={config.stf_poomsae_coach_level1_bonus}
                    onChange={(e) => handleChange('stf_poomsae_coach_level1_bonus', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stf_poomsae_l2">STF Poomsae Coach Level 2 ($)</Label>
                  <Input
                    id="stf_poomsae_l2"
                    type="number"
                    step="0.01"
                    value={config.stf_poomsae_coach_level2_bonus}
                    onChange={(e) => handleChange('stf_poomsae_coach_level2_bonus', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stf_poomsae_l3">STF Poomsae Coach Level 3 ($)</Label>
                  <Input
                    id="stf_poomsae_l3"
                    type="number"
                    step="0.01"
                    value={config.stf_poomsae_coach_level3_bonus}
                    onChange={(e) => handleChange('stf_poomsae_coach_level3_bonus', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sg_coach_l1">SG Coach Level 1 ($)</Label>
                  <Input
                    id="sg_coach_l1"
                    type="number"
                    step="0.01"
                    value={config.sg_coach_level1_bonus}
                    onChange={(e) => handleChange('sg_coach_level1_bonus', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sg_coach_l2">SG Coach Level 2 ($)</Label>
                  <Input
                    id="sg_coach_l2"
                    type="number"
                    step="0.01"
                    value={config.sg_coach_level2_bonus}
                    onChange={(e) => handleChange('sg_coach_level2_bonus', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Referee Certifications */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Referee Certifications</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stf_poomsae_ref">STF Poomsae Referee ($)</Label>
                  <Input
                    id="stf_poomsae_ref"
                    type="number"
                    step="0.01"
                    value={config.stf_poomsae_referee_bonus}
                    onChange={(e) => handleChange('stf_poomsae_referee_bonus', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stf_kyorugi_ref">STF Kyorugi Referee ($)</Label>
                  <Input
                    id="stf_kyorugi_ref"
                    type="number"
                    step="0.01"
                    value={config.stf_kyorugi_referee_bonus}
                    onChange={(e) => handleChange('stf_kyorugi_referee_bonus', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingSettingsTab;
