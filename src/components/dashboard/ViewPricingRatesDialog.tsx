import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Award, GraduationCap, Trophy, ShieldCheck } from 'lucide-react';
import { getActivePricingConfig, SlotPricingConfig } from '@/services/slotPricingService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (v: number | undefined | null) =>
  `$${Number(v ?? 0).toFixed(2)}`;

const Row: React.FC<{ label: string; value: number | undefined | null }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-b-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-mono font-medium">{fmt(value)}</span>
  </div>
);

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <Card>
    <CardHeader className="p-3 pb-2">
      <div className="flex items-center gap-2">
        {icon}
        <CardTitle className="text-base">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="p-3 pt-0">{children}</CardContent>
  </Card>
);

const ViewPricingRatesDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const [config, setConfig] = useState<SlotPricingConfig | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getActivePricingConfig()
      .then(setConfig)
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Dynamic Pricing Rates
          </DialogTitle>
          <DialogDescription>
            Current active pay rates for slot bookings (view only).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !config ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No pricing configuration found.
          </div>
        ) : (
          <div className="space-y-3">
            <Section icon={<DollarSign className="w-4 h-4" />} title="Base Rates">
              <Row label="Weekday Base Rate" value={config.weekday_base_rate} />
              <Row label="Weekend Base Rate" value={config.weekend_base_rate} />
              <Row label="Years of Service Bonus (per year)" value={config.years_of_service_bonus_per_year} />
            </Section>

            <Section icon={<Trophy className="w-4 h-4" />} title="Monthly Milestone Bonuses">
              <Row label="8 Slots" value={config.milestone_5_slots_bonus} />
              <Row label="12 Slots" value={config.milestone_10_slots_bonus} />
              <Row label="16 Slots" value={config.milestone_16_slots_bonus} />
            </Section>

            <Section icon={<Award className="w-4 h-4" />} title="Dan Level Bonuses (highest only)">
              <Row label="1st Dan" value={config.dan_first_bonus} />
              <Row label="2nd Dan" value={config.dan_second_bonus} />
              <Row label="3rd Dan & Above" value={config.dan_third_above_bonus} />
            </Section>

            <Section icon={<GraduationCap className="w-4 h-4" />} title="Coach Certifications (highest level only)">
              <Row label="STF Coach Induction" value={config.stf_coach_induction_bonus} />
              <Row label="STF Poomsae Coach Level 1" value={config.stf_poomsae_coach_level1_bonus} />
              <Row label="STF Poomsae Coach Level 2" value={config.stf_poomsae_coach_level2_bonus} />
              <Row label="STF Poomsae Coach Level 3" value={config.stf_poomsae_coach_level3_bonus} />
              <Row label="SG Coach Level 1" value={config.sg_coach_level1_bonus} />
              <Row label="SG Coach Level 2" value={config.sg_coach_level2_bonus} />
            </Section>

            <Section icon={<ShieldCheck className="w-4 h-4" />} title="Referee Certifications (stackable)">
              <Row label="STF Poomsae Referee" value={config.stf_poomsae_referee_bonus} />
              <Row label="STF Kyorugi Referee" value={config.stf_kyorugi_referee_bonus} />
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewPricingRatesDialog;
