import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateInvoice, hashInvoice, storageScope, validBytes32, type Invoice } from '../src/domain.ts';

const invoice: Invoice = {
  id: 'INV-1', invoiceId: '0x' + 'a'.repeat(64), intentHash: '0x' + 'b'.repeat(64),
  payer: '0x0000000000000000000000000000000000000001', recipient: '0x0000000000000000000000000000000000000002',
  amount: '2450', unit: 'units', dueAt: 2000000000, createdAt: 1,
};

describe('invoice intent boundary', () => {
  it('hashes the same intent deterministically and changes with a bound field', () => {
    const a = hashInvoice(invoice.id, invoice.payer, invoice.recipient, invoice.amount, invoice.unit, invoice.dueAt);
    const b = hashInvoice(invoice.id, invoice.payer, invoice.recipient, invoice.amount, invoice.unit, invoice.dueAt);
    const c = hashInvoice(invoice.id, invoice.payer, invoice.recipient, '2451', invoice.unit, invoice.dueAt);
    assert.deepEqual(a, b); assert.notEqual(a.intentHash, c.intentHash);
  });
  it('matches only exact payer, recipient and integer amount', () => {
    const rows = evaluateInvoice(invoice, { payer: invoice.payer, recipient: invoice.recipient, amount: '2450', proofHash: '', expiry: 0 });
    assert.equal(rows.every(x => x.matches), true);
    const wrong = evaluateInvoice(invoice, { payer: invoice.payer, recipient: invoice.recipient, amount: '2450.00', proofHash: '', expiry: 0 });
    assert.equal(wrong[2].matches, false);
  });
  it('validates bytes32 and scopes browser data to exact chain, contract and account', () => {
    assert.equal(validBytes32('0x' + 'f'.repeat(64)), true);
    assert.equal(validBytes32('0x1234'), false);
    assert.notEqual(storageScope(968, '0xA', '0xB'), storageScope(968, '0xA', '0xC'));
  });
});
