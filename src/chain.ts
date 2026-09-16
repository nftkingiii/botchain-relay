import { Contract, Interface, JsonRpcProvider, getAddress, isAddress, type BrowserProvider } from 'ethers';
import type { ChainReceipt } from './domain';

export const BOT = {
  chainId: Number(import.meta.env.VITE_BOT_CHAIN_ID || 968),
  rpcUrl: import.meta.env.VITE_BOT_RPC_URL || 'https://rpc.bohr.life',
  explorerUrl: import.meta.env.VITE_BOT_EXPLORER_URL || 'https://scan.bohr.life',
  registry: (import.meta.env.VITE_RELAY_REGISTRY_ADDRESS || '').trim(),
  symbol: 'BOT',
} as const;

export const REGISTRY_ABI = [
  'function receipts(bytes32) view returns (bytes32 intentHash, bytes32 sourceProofHash, uint256 amount, address seller, uint64 expiry, bool accepted)',
  'function record(bytes32 invoiceId, bytes32 intentHash, bytes32 sourceProofHash, uint256 amount, address seller, uint64 expiry, bool accepted)',
  'event ReceiptRecorded(bytes32 indexed invoiceId, bytes32 intentHash, bool accepted)',
];
const iface = new Interface(REGISTRY_ABI);

async function rpc(method: string, params: unknown[] = []): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(BOT.rpcUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method, params }), signal: controller.signal,
    });
    if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
    const result = await response.json() as { result?: unknown; error?: { message?: string } };
    if (result.error) throw new Error(result.error.message || 'RPC request failed');
    return result.result;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('BOT Chain RPC timed out. Try again shortly.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function readNetwork() {
  const [chainHex, blockHex] = await Promise.all([rpc('eth_chainId'), rpc('eth_blockNumber')]);
  const chainId = Number.parseInt(String(chainHex), 16);
  if (chainId !== BOT.chainId) throw new Error(`RPC returned chain ${chainId}; expected ${BOT.chainId}.`);
  let contractCode: 'present'|'empty'|'unconfigured' = 'unconfigured';
  if (BOT.registry) {
    if (!isAddress(BOT.registry)) throw new Error('VITE_RELAY_REGISTRY_ADDRESS is not a valid EVM address.');
    const code = await rpc('eth_getCode', [getAddress(BOT.registry), 'latest']);
    contractCode = code === '0x' ? 'empty' : 'present';
    if (contractCode === 'empty') throw new Error('Configured registry address has no bytecode on this network.');
  }
  return { chainId, block: BigInt(String(blockHex)), contractCode };
}

export async function readReceipt(invoiceId: string): Promise<ChainReceipt | null> {
  if (!BOT.registry || !isAddress(BOT.registry)) throw new Error('Registry address is not configured.');
  const data = iface.encodeFunctionData('receipts', [invoiceId]);
  const value = await rpc('eth_call', [{ to: getAddress(BOT.registry), data }, 'latest']);
  const decoded = iface.decodeFunctionResult('receipts', String(value));
  const receipt = { intentHash: decoded[0] as string, sourceProofHash: decoded[1] as string, amount: decoded[2] as bigint, seller: decoded[3] as string, expiry: decoded[4] as bigint, accepted: decoded[5] as boolean };
  if (receipt.expiry === 0n) return null;
  return receipt;
}

export async function submitReceipt(provider: BrowserProvider, invoiceId: string, intentHash: string, proofHash: string, amount: string, seller: string, expiry: number, accepted: boolean) {
  const signer = await provider.getSigner();
  const registry = new Contract(getAddress(BOT.registry), REGISTRY_ABI, signer);
  const fn = registry.getFunction('record');
  const args = [invoiceId, intentHash, proofHash, BigInt(amount), getAddress(seller), BigInt(expiry), accepted] as const;
  await fn.staticCall(...args);
  const estimate = await fn.estimateGas(...args);
  const tx = await fn(...args, { gasLimit: estimate * 120n / 100n });
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error('Transaction was mined but did not succeed. Check the explorer before retrying.');
  return { hash: tx.hash as string, blockNumber: receipt.blockNumber as number, gasUsed: receipt.gasUsed as bigint };
}

declare global {
  interface Window { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown>; on?(event: string, listener: (...args: unknown[]) => void): void; removeListener?(event: string, listener: (...args: unknown[]) => void): void } }
}
