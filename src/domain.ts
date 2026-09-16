import { getAddress, isAddress, keccak256, toUtf8Bytes } from 'ethers';

export type Invoice = {
  id: string; invoiceId: string; intentHash: string; payer: string; recipient: string;
  amount: string; unit: string; dueAt: number; createdAt: number; fixture?: boolean;
};
export type Observation = { payer: string; recipient: string; amount: string; proofHash: string; expiry: number };
export type MatchRow = { key: keyof Pick<Observation, 'payer'|'recipient'|'amount'>; label: string; expected: string; observed: string; matches: boolean };
export type ChainReceipt = { intentHash: string; sourceProofHash: string; amount: bigint; seller: string; expiry: bigint; accepted: boolean };

export function normalizeAddress(value: string): string {
  if (!isAddress(value.trim())) throw new Error('Enter a valid EVM address.');
  return getAddress(value.trim());
}

export function hashInvoice(ref: string, payer: string, recipient: string, amount: string, unit: string, dueAt: number) {
  const normalized = [ref.trim(), getAddress(payer), getAddress(recipient), amount.trim(), unit.trim(), String(dueAt)];
  const intentHash = keccak256(toUtf8Bytes(JSON.stringify(normalized)));
  const invoiceId = keccak256(toUtf8Bytes(`relay:${ref.trim()}`));
  return { invoiceId, intentHash };
}

export function evaluateInvoice(invoice: Invoice, observed: Observation): MatchRow[] {
  const payerValid = isAddress(observed.payer.trim());
  const recipientValid = isAddress(observed.recipient.trim());
  return [
    { key: 'payer', label: 'Payer', expected: invoice.payer, observed: observed.payer || 'Not supplied', matches: payerValid && getAddress(observed.payer) === getAddress(invoice.payer) },
    { key: 'recipient', label: 'Recipient', expected: invoice.recipient, observed: observed.recipient || 'Not supplied', matches: recipientValid && getAddress(observed.recipient) === getAddress(invoice.recipient) },
    { key: 'amount', label: `Amount · ${invoice.unit}`, expected: invoice.amount, observed: observed.amount || 'Not supplied', matches: /^d+$/.test(observed.amount) && BigInt(observed.amount) === BigInt(invoice.amount) },
  ];
}

export function validBytes32(value: string): boolean { return /^0x[0-9a-fA-F]{64}$/.test(value.trim()); }
export function storageScope(chainId: number, contract: string, account: string) {
  return `relay:v1:${chainId}:${contract.toLowerCase()}:${account.toLowerCase()}`;
}
