import assert from 'node:assert/strict';
const decide = (source, hash) => source === 'valid' && hash === '0x7b2a…91f4';
assert.equal(decide('valid', '0x7b2a…91f4'), true);
assert.equal(decide('missing', '0x7b2a…91f4'), false);
assert.equal(decide('valid', 'wrong'), false);
console.log('proof decision tests: 3 passed');
