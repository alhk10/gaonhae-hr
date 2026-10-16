import { isPoomDanRank, poomDanRankLabel } from './poomDanCertificate';

const equal = (a: unknown, e: unknown, rule: string) => { if (a !== e) throw new Error(`${rule}: expected ${e}, got ${a}`); };

equal(isPoomDanRank('Black Tip'), true, 'Black Tip > 1st Poom/Dan uses new design');
equal(isPoomDanRank('1st Poom'), true, '1st Poom uses new design');
equal(isPoomDanRank('1st Dan'), true, '1st Dan uses new design');
equal(isPoomDanRank('3rd Dan'), true, '3rd Dan uses new design');
equal(isPoomDanRank('Red'), false, 'Red keeps current design');
equal(isPoomDanRank('Foundation 2'), false, 'Foundation keeps current design');
equal(poomDanRankLabel('Black Tip'), '1st Poom / 1st Dan', 'Black Tip prints 1st Poom / 1st Dan');
console.log('poomDanCertificate ok');
