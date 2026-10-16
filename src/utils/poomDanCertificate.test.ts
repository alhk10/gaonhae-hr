import { isPoomDanRank, resolvePoomDanRank } from './poomDanCertificate';

const equal = (a: unknown, e: unknown, rule: string) => { if (a !== e) throw new Error(`${rule}: expected ${e}, got ${a}`); };

equal(resolvePoomDanRank('Black Tip', 'Grading Fee - Black Tip >> 1st Dan'), '1st Dan', 'Black Tip with Dan fee prints 1st Dan');
equal(resolvePoomDanRank('1st Poom', '1st Poom >> 2nd Poom'), '2nd Poom', '1st Poom with Poom fee prints 2nd Poom');
equal(resolvePoomDanRank('3rd Dan', null), '4th Dan', '3rd Dan prints 4th Dan');
equal(resolvePoomDanRank('Black Tip', null), '1st Poom / 1st Dan', 'Black Tip without fee shows both');
equal(isPoomDanRank('Black Tip'), true, 'Black Tip uses new design');
equal(isPoomDanRank('2nd Poom'), true, '2nd Poom uses new design');
equal(isPoomDanRank('4th Dan'), false, '4th Dan is outside the range');
equal(isPoomDanRank('Red'), false, 'Red keeps current design');
console.log('poomDanCertificate ok');
