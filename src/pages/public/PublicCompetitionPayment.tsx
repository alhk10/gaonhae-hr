/**
 * Public competition payment page (no auth).
 * Mounted at /comps. Event-driven: admin defines events in /access settings,
 * this page renders only the fields required by the selected event.
 * The form itself lives in CompetitionRegistrationForm so it can also be
 * embedded in the /hello chat with prefilled student details.
 */
import React from 'react';
import CompetitionRegistrationForm from '@/components/public/CompetitionRegistrationForm';

const PublicCompetitionPayment: React.FC = () => <CompetitionRegistrationForm />;

export default PublicCompetitionPayment;
