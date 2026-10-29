import { gradingBadgeState, helloShowsGrading } from './gradingReady';

const eq = (a: unknown, b: unknown, m: string) => { if (a !== b) throw new Error(`${m}: ${a} !== ${b}`); };
eq(gradingBadgeState(null), 'not_ready', 'null');
eq(gradingBadgeState({ ready: true, paid: false }), 'ready', 'ready');
eq(gradingBadgeState({ ready: true, paid: true }), 'paid', 'paid');
eq(helloShowsGrading({ ready: false, paid: false }), false, 'hidden when not ready');
eq(helloShowsGrading({ ready: true, paid: false }), true, 'shown when ready');
eq(helloShowsGrading({ ready: true, paid: true }), false, 'hidden when paid');
console.log('gradingReady tests passed');
