import { sortInvoiceLines } from './invoiceLineSort';

const order = (names: string[]) => sortInvoiceLines(names.map(description => ({ description }))).map(x => x.description).join(' | ');
const equal = (a: string, b: string, rule: string) => { if (a !== b) throw new Error(`${rule}:\n got ${a}\n exp ${b}`); };

equal(order(['Mouth Guard', 'Color Belt (Red / 160)', 'Custom Poom Uniform (120)', 'Kang Klass', 'Trial Lesson', 'Registration Fee', 'White >> Yellow Tip Grading']),
  'Trial Lesson | Registration Fee | Kang Klass | White >> Yellow Tip Grading | Custom Poom Uniform (120) | Color Belt (Red / 160) | Mouth Guard', 'group order');
equal(order(['Custom Black Uniform (160)', 'Custom Poom Uniform (150)', 'White Uniform (130)']),
  'White Uniform (130) | Custom Poom Uniform (150) | Custom Black Uniform (160)', 'uniform order');
equal(order(['Color Belt (Red / 160)', 'Color Belt (Yellow Tip / 160)', 'Color Belt (Yellow / 160)', 'Color Belt (Blue Tip / 160)']),
  'Color Belt (Yellow Tip / 160) | Color Belt (Yellow / 160) | Color Belt (Blue Tip / 160) | Color Belt (Red / 160)', 'belt grade order');
equal(order(['Custom Poom Uniform (150)', 'Custom Poom Uniform (120)', 'Custom Poom Uniform (140)']),
  'Custom Poom Uniform (120) | Custom Poom Uniform (140) | Custom Poom Uniform (150)', 'size order');
console.log('invoiceLineSort: all passed');
