import { isHomeScreenPromptDue } from './homeScreenPrompt';

const DAY = 24 * 60 * 60 * 1000;
const check = (actual: boolean, expected: boolean, label: string) => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
};

check(isHomeScreenPromptDue(null), true, 'first login shows prompt');
check(isHomeScreenPromptDue(0, 149 * DAY), false, 'hidden at 149 days');
check(isHomeScreenPromptDue(0, 150 * DAY), true, 'shows again at 150 days');
console.log('homeScreenPrompt tests passed');
