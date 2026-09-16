import '@fontsource-variable/instrument-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import React, { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserProvider, formatUnits, getAddress, isAddress } from 'ethers';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCheck, ChevronDown, CircleAlert, CircleCheck, CircleHelp, Clipboard, FilePlus2, FileText, Filter, GitCompareArrows, Inbox, Link2, LoaderCircle, Menu, Plus, RefreshCw, Search, ShieldAlert, Wallet, X } from 'lucide-react';
import { BOT, readNetwork, readReceipt, submitReceipt } from './chain';
import { evaluateInvoice, hashInvoice, normalizeAddress, storageScope, validBytes32, type Invoice, type Observation, type MatchRow } from './domain';
import './styles.css';

function ReconcilePage({invoice,observed,setObserved,evaluated,onEvaluate,rows,isMatch,onUseFixture,network,receipt,receiptBusy,receiptError,onReadReceipt,onAnchor,tx,canAnchor,connected,onConnect,onCheckReceipts}:{invoice:Invoice;observed:Observation;setObserved:(x:Observation)=>void;evaluated:boolean;onEvaluate:()=>void;rows:MatchRow[];isMatch:boolean;onUseFixture:()=>void;network:NetworkState|null;receipt:Awaited<ReturnType<typeof readReceipt>>;receiptBusy:boolean;receiptError:string;onReadReceipt:()=>void;onAnchor:()=>void;tx:TxState;canAnchor:boolean;connected:boolean;onConnect:()=>void;onCheckReceipts:()=>void}){
 const set=(key:keyof Observation,value:string)=>setObserved({...observed,[key]:key==='expiry'?(value?Math.floor(new Date(value).getTime()/1000):0):value});
 const expiryInput=observed.expiry?new Date(observed.expiry*1000-Date.now()%60000).toISOString().slice(0,16):'';
 return <section className="page"><div className="page-heading"><div><h1>Reconcile</h1><p>Compare the intent with the evidence supplied for this invoice.</p></div><span className={`scope-chip ${invoice.fixture?'sample-chip':''}`}>{invoice.fixture?'Illustrative fixture':'LOCAL INTENT'}</span></div>
  <div className="route-strip"><div className="route-step complete"><span>01</span><b>Invoice intent</b><small>Local record</small></div><i/><div className="route-step active"><span>02</span><b>Evidence review</b><small>{evaluated?(isMatch?'Fields align':'Differences found'):'Awaiting review'}</small></div><i/><div className={`route-step ${receipt?'complete':''}`}><span>03</span><b>Receipt anchor</b><small>{receipt?'Read from chain':'Not yet recorded'}</small></div></div>
  <div className="reconcile-title"><div><div className="mono-label">{invoice.id} <span>·</span> {idShort(invoice.invoiceId)}</div><h2>Evidence comparison</h2><p>Intent hash <code>{invoice.intentHash.slice(0,18)}…{invoice.intentHash.slice(-8)}</code></p></div><button className="quiet-button" onClick={onUseFixture}><Activity size={15}/>Load sample evidence</button></div>
  {invoice.fixture&&<div className="fixture-banner"><CircleHelp size={17}/><div><b>Sample invoice — fixture data only</b><span>This record is not from a customer or the blockchain. Use the sample button to preview a match and a mismatch. On-chain actions stay disabled for fixtures.</span></div></div>}
  <div className="compare-grid"><div className="compare-column expected"><div className="column-head"><div><span className="column-number">A</span><div><b>Expected in intent</b><small>Invoice-side values</small></div></div><FileText size={17}/></div><div className="compare-row"><span>Payer</span><b className="mono-value">{addressLabel(invoice.payer)}</b><button className="copy-control" title="Copy expected payer" onClick={()=>navigator.clipboard?.writeText(invoice.payer)}><Clipboard size={14}/></button></div><div className="compare-row"><span>Recipient</span><b className="mono-value">{addressLabel(invoice.recipient)}</b><button className="copy-control" title="Copy expected recipient" onClick={()=>navigator.clipboard?.writeText(invoice.recipient)}><Clipboard size={14}/></button></div><div className="compare-row"><span>Amount · {invoice.unit}</span><b>{new Intl.NumberFormat('en').format(Number(invoice.amount))}</b><span/></div><div className="compare-row"><span>Reference</span><b className="mono-value">{invoice.id}</b><span/></div><div className="document-preview"><img src="/specimen-invoice.svg" alt="Illustrative invoice document specimen, explicitly marked not payment evidence"/><div className="specimen-caption"><FileText size={14}/><span>Illustrative document specimen · not evidence</span></div></div></div>
   <div className="compare-column observed"><div className="column-head"><div><span className="column-number">B</span><div><b>Observed evidence</b><small>Operator-supplied values · unverified</small></div></div><ShieldAlert size={17}/></div>
    <label className="evidence-field">Observed payer address<input value={observed.payer} onChange={e=>set('payer',e.target.value)} placeholder="0x…" autoComplete="off" spellCheck={false}/></label>
    <label className="evidence-field">Observed recipient address<input value={observed.recipient} onChange={e=>set('recipient',e.target.value)} placeholder="0x…" autoComplete="off" spellCheck={false}/></label>
    <div className="evidence-inline"><label className="evidence-field">Observed integer amount<input inputMode="numeric" value={observed.amount} onChange={e=>set('amount',e.target.value)} placeholder="2450"/></label><label className="evidence-field">Evidence expiry<input type="datetime-local" value={expiryInput} onChange={e=>set('expiry',e.target.value)}/></label></div>
    <label className="evidence-field">Source approval hash <input className="mono-input" value={observed.proofHash} onChange={e=>set('proofHash',e.target.value)} placeholder="0x + 64 hex characters" spellCheck={false}/><small>Manual hash entry only. No oracle, source-chain verifier, or external attestation service is connected.</small></label>
   </div></div>
  <div className="evaluation-bar"><div className={`evaluation-state ${evaluated?(isMatch?'pass':'fail'):'idle'}`}>{evaluated?<>{isMatch?<CircleCheck size={19}/>:<CircleAlert size={19}/>}<span><b>{isMatch?'Fields match':'Mismatch found'}</b><small>{isMatch?'Compared locally; source proof contents are not verified.':'Review each row below. No money action is available.'}</small></span></>:<><CircleHelp size={19}/><span><b>Ready to compare</b><small>No fields are considered matched until evaluated.</small></span></>}</div><button className="primary-button" onClick={onEvaluate}><CheckCheck size={16}/>Evaluate evidence</button></div>
  <div className="match-list" aria-live="polite">{rows.map(row=><MatchRowView key={row.key} row={row} evaluated={evaluated}/> )}</div>
  <div className="chain-readback"><div className="readback-head"><div><span className="column-number chain">⛓</span><div><b>BOT Chain receipt read-back</b><small>{BOT.registry?`Testnet · ${addressLabel(BOT.registry)}`:'Registry not configured'}</small></div></div><button className="quiet-button" onClick={onReadReceipt} disabled={!BOT.registry||receiptBusy}><RefreshCw size={14} className={receiptBusy?'spin':''}/>Check invoice ID</button></div>
    {receiptBusy?<div className="readback-result"><LoaderCircle size={17} className="spin"/>Reading latest contract state…</div>:receipt?<div className="readback-result recorded"><CircleCheck size={18}/><div><b>Receipt exists · {receipt.accepted?'accepted':'rejected'}</b><span>Intent {receipt.intentHash.slice(0,14)}… · amount {receipt.amount.toString()} · recipient {addressLabel(receipt.seller)}</span></div><a href={`${BOT.explorerUrl}/address/${BOT.registry}`} target="_blank" rel="noreferrer">View contract <Link2 size={14}/></a></div>:receiptError?<div className="readback-result error"><CircleAlert size={17}/>{receiptError}</div>:<div className="readback-result"><CircleHelp size={17}/>{BOT.registry?'No receipt exists for this invoice ID at the latest block.':'Set the verified registry address to enable public read-back.'}{network&&<small>Block {network.block.toString()}</small>}</div>}
  </div>
  <div className="anchor-bar"><div className="anchor-warning"><CircleHelp size={18}/><span><b>A record is an immutable assertion anchor.</b><small>It does not verify evidence contents, prove payment, or move funds. Anyone may call the deployed contract; it has no role gate.</small></span></div><div className="anchor-actions">{!connected?<button className="primary-button" onClick={onConnect}><Wallet size={16}/>Connect to anchor</button>:!canAnchor?<button className="primary-button" disabled><BadgeCheck size={16}/>{receipt?'Already recorded':'Complete review to anchor'}</button>:<button className="primary-button" onClick={onAnchor}><BadgeCheck size={16}/>Review on-chain record</button>}</div></div>
  {tx.kind!=='idle'&&<div className={`tx-feedback ${tx.kind}`} role={tx.kind==='error'?'alert':'status'}>{tx.kind==='pending'?<LoaderCircle size={17} className="spin"/>:tx.kind==='confirmed'?<CircleCheck size={18}/>:tx.kind==='rejected'?<CircleHelp size={18}/>:<CircleAlert size={18}/>}<span><b>{tx.kind==='pending'?'Wallet action pending':tx.kind==='confirmed'?'Transaction confirmed':tx.kind==='rejected'?'Wallet rejected':'Transaction not recorded'}</b><small>{tx.message}</small></span>{tx.hash&&<a href={`${BOT.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noreferrer">View transaction <ArrowRight size={14}/></a>}</div>}
 </section>
}

function MatchRowView({row,evaluated}:{row:MatchRow;evaluated:boolean}){return <div className={`match-row ${evaluated?(row.matches?'match':'mismatch'):'unchecked'}`}><span>{evaluated?(row.matches?<Check size={16}/>:<X size={16}/>):<span className="neutral-dot"/>}</span><b>{row.label}</b><div><small>Expected</small><code>{row.expected}</code></div><div><small>Observed</small><code>{row.observed}</code></div><strong>{evaluated?(row.matches?'Aligned':'Different'):'Not checked'}</strong></div>}

function ReceiptsPage({invoice,invoices,receipt,busy,error,tx,onRefresh,onExport,onSelect,onGoInvoices}:{invoice?:Invoice;invoices:Invoice[];receipt:Awaited<ReturnType<typeof readReceipt>>;busy:boolean;error:string;tx:TxState;onRefresh:()=>void;onExport:()=>void;onSelect:(x:Invoice)=>void;onGoInvoices:()=>void}){
 return <section className="page"><div className="page-heading"><div><h1>Receipts</h1><p>Immutable registry records found by invoice ID · no global indexer is configured.</p></div><button className="secondary-button" onClick={onExport} disabled={!invoices.length}><ArrowDownToLine size={16}/>Export list</button></div>
  <div className="receipt-callout"><span className="route-mark"><i/><i/><i/></span><div><b>What this record proves</b><p>A contract stored the submitted hashes, integer amount, recipient, expiry and outcome for an invoice ID. It does not prove an off-chain approval is valid or funds were settled.</p></div><a href="https://scan.bohr.life/address/0xb80b17b94646ae0b1e4cb3bab8bc72cff7a95c9c" target="_blank" rel="noreferrer">Contract source <ArrowRight size={14}/></a></div>
  <div className="receipts-layout"><div className="receipt-invoice-list"><div className="list-title"><b>My invoice intents</b><span>{invoices.length}</span></div>{!invoices.length?<div className="empty-mini"><Inbox size={20}/><p>No local invoice IDs yet.</p><button onClick={onGoInvoices}>Create invoice</button></div>:invoices.map(x=><button key={x.id} className={`receipt-select ${x.id===invoice?.id?'active':''}`} onClick={()=>onSelect(x)}><span className="status-pip teal"/><span><b>{x.id}</b><small>{idShort(x.invoiceId)}</small></span><ArrowRight size={15}/></button>)}</div>
   <div className="receipt-detail"><div className="receipt-detail-head"><div><span className="mono-label">CONTRACT LOOKUP</span><h2>{invoice?.id||'Select an invoice'}</h2></div><button className="quiet-button" disabled={!invoice||busy} onClick={onRefresh}><RefreshCw size={15} className={busy?'spin':''}/>Refresh read-back</button></div>
    {!invoice?<div className="empty-state compact"><CircleHelp size={24}/><p>Choose an invoice to query its receipt mapping.</p></div>:busy?<div className="receipt-empty"><LoaderCircle size={24} className="spin"/><b>Reading BOT Chain</b><span>Looking up this invoice ID at the latest block.</span></div>:error?<div className="receipt-empty error"><CircleAlert size={24}/><b>Could not read receipt</b><span>{error}</span></div>:receipt?<div className="receipt-paper"><div className="paper-top"><img src="/relay-mark.svg" alt=""/><span className={`origin-tag ${receipt.accepted?'local':'fixture'}`}>{receipt.accepted?'ACCEPTED':'REJECTED'}</span></div><div className="paper-ref"><span>INVOICE IDENTIFIER</span><code>{invoice.invoiceId}</code></div><div className="paper-amount"><span>ANCHORED INTEGER AMOUNT</span><b>{receipt.amount.toString()} <small>{invoice.unit} · display label is local</small></b></div><div className="paper-rows"><div><span>Intent hash</span><code>{receipt.intentHash}</code></div><div><span>Source proof hash</span><code>{receipt.sourceProofHash}</code></div><div><span>Recipient</span><code>{receipt.seller}</code></div><div><span>Expiry timestamp</span><code>{receipt.expiry.toString()}</code></div></div><div className="paper-note"><Check size={16}/><span>Read from the deployed registry. Underlying approval and payment remain unverified.</span></div><a className="paper-link" href={`${BOT.explorerUrl}/address/${BOT.registry}`} target="_blank" rel="noreferrer">Open contract on BOTScan <Link2 size={14}/></a></div>:<div className="receipt-empty"><Inbox size={25}/><b>No receipt found for this invoice ID</b><span>Only known local invoice IDs can be checked here. The contract has no receipt enumeration endpoint.</span><button className="quiet-button" onClick={()=>{onSelect(invoice);history.pushState({},'',`/reconcile?invoice=${encodeURIComponent(invoice.id)}`);dispatchEvent(new PopStateEvent('popstate'))}}>Open reconciliation <ArrowLeft size={14}/></button></div>}
   </div></div>
  {tx.kind==='confirmed'&&<div className="tx-feedback confirmed"><CircleCheck size={18}/><span><b>Latest transaction succeeded</b><small>{tx.message}</small></span>{tx.hash&&<a href={`${BOT.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noreferrer">Transaction <ArrowRight size={14}/></a>}</div>}
 </section>
}

function NewInvoiceModal({onClose,onSubmit,error}:{onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;error:string}){return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal" onSubmit={onSubmit} aria-labelledby="new-invoice-title"><div className="modal-head"><div><span className="mono-label">LOCAL INVOICE INTENT</span><h2 id="new-invoice-title">Add invoice</h2></div><button type="button" className="icon-button" title="Close" onClick={onClose}><X size={19}/></button></div><p className="modal-intro">This creates a local comparison record. It does not call the registry or verify a source approval.</p><label>Invoice reference<input name="reference" required minLength={3} maxLength={64} placeholder="INV—24020" autoFocus/></label><div className="form-two"><label>Expected payer address<input name="payer" required placeholder="0x…" spellCheck={false}/></label><label>Expected recipient address<input name="recipient" required placeholder="0x…" spellCheck={false}/></label></div><div className="form-two"><label>Amount · integer base units<input name="amount" required inputMode="numeric" pattern="[0-9]+" placeholder="2450"/></label><label>Unit label · local only<input name="unit" maxLength={20} defaultValue="units" placeholder="units"/></label></div><label>Due date<input name="due" required type="datetime-local"/></label><div className="form-note"><CircleHelp size={16}/><span>The deployed contract stores an integer only; it has no currency, token, decimal, or payer field. Payer and unit label are included in the intent hash/local metadata.</span></div>{error&&<div className="form-error" role="alert"><CircleAlert size={15}/>{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><FilePlus2 size={16}/>Create intent</button></div></form></div>}

function ConfirmModal({invoice,accepted,onCancel,onConfirm}:{invoice:Invoice;accepted:boolean;onCancel:()=>void;onConfirm:()=>void}){return <div className="modal-backdrop" role="presentation"><div className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div className="confirm-symbol"><ShieldAlert size={23}/></div><div className="modal-head"><div><span className="mono-label">EXPLICIT WALLET ACTION</span><h2 id="confirm-title">{accepted?'Anchor matched fields':'Anchor mismatch outcome'}?</h2></div><button className="icon-button" title="Close" onClick={onCancel}><X size={18}/></button></div><p>This will call <code>record</code> on RelayProofRegistry for <b>{invoice.id}</b>. It writes the {accepted?'accepted':'rejected'} flag and supplied hashes/fields to BOT Chain Testnet.</p><div className="permanent-warning"><CircleAlert size={17}/><span>Each invoice ID can be recorded once. A rejected or incorrect record cannot be edited or replaced. The call does not move money or validate the underlying evidence.</span></div><div className="modal-actions"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" onClick={onConfirm}>Continue to wallet</button></div></div></div>}

createRoot(document.getElementById('root')!).render(<App/>);
const FIXTURES: Invoice[] = [
  { id:'INV—24018', invoiceId:'0x'+'a'.repeat(64), intentHash:'0x'+'1'.repeat(64), payer:'0x8b3a350cf5c34c9194ca3a9d8c4c7a9d9a8b4c10', recipient:'0x00000000000000000000000000000000000000a1', amount:'2450', unit:'USD units', dueAt:Date.now()+86400000*4, createdAt:Date.now()-86400000*2, fixture:true },
  { id:'INV—24019', invoiceId:'0x'+'b'.repeat(64), intentHash:'0x'+'2'.repeat(64), payer:'0x00000000000000000000000000000000000000b2', recipient:'0x00000000000000000000000000000000000000c3', amount:'680', unit:'USD units', dueAt:Date.now()+86400000, createdAt:Date.now()-86400000, fixture:true },
];
const BLANK_OBS: Observation = { payer:'', recipient:'', amount:'', proofHash:'', expiry:0 };
type Route = 'invoices'|'reconcile'|'receipts';
type NetworkState = { chainId:number; block:bigint; contractCode:'present'|'empty'|'unconfigured' };
type TxState = { kind:'idle'|'pending'|'confirmed'|'error'|'rejected'; message:string; hash?:string; block?:number };
const ROUTES: { id:Route; label:string; icon:typeof FileText }[] = [
  { id:'invoices',label:'Invoices',icon:FileText },{ id:'reconcile',label:'Reconcile',icon:GitCompareArrows },{ id:'receipts',label:'Receipts',icon:BadgeCheck },
];
const routeFromPath = ():Route => location.pathname.startsWith('/reconcile')?'reconcile':location.pathname.startsWith('/receipts')?'receipts':'invoices';
function idShort(id:string){ return `${id.slice(0,10)}…${id.slice(-6)}`; }
function dateLabel(ms:number){ return new Intl.DateTimeFormat('en',{month:'short',day:'2-digit',year:'numeric'}).format(ms); }
function addressLabel(value:string){ return value ? `${value.slice(0,7)}…${value.slice(-5)}` : '—'; }
function getLocal(scope:string):Invoice[]{ try{return JSON.parse(localStorage.getItem(scope)||'[]') as Invoice[]}catch{return []} }
function csvEscape(value:string){return `"${value.replaceAll('"','""')}"`}
function exportCsv(rows:Invoice[], receiptMap:Record<string,string>){
  const data=[['Invoice reference','Invoice id','Intent hash','Payer','Recipient','Integer amount','Unit label','On-chain state'],...rows.map(x=>[x.id,x.invoiceId,x.intentHash,x.payer,x.recipient,x.amount,x.unit,receiptMap[x.invoiceId]||'not checked'])];
  const blob=new Blob([data.map(row=>row.map(csvEscape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download='relay-receipts.csv';a.click();URL.revokeObjectURL(url);
}

function App(){
  const [route,setRoute]=useState<Route>(routeFromPath);
  const [walletAddress,setWalletAddress]=useState(''); const [walletChain,setWalletChain]=useState<number|null>(null);
  const [walletBusy,setWalletBusy]=useState(false); const [walletError,setWalletError]=useState('');
  const [network,setNetwork]=useState<NetworkState|null>(null); const [networkError,setNetworkError]=useState(''); const [networkBusy,setNetworkBusy]=useState(false);
  const [localInvoices,setLocalInvoices]=useState<Invoice[]>([]); const [activeId,setActiveId]=useState(''); const [search,setSearch]=useState(''); const [filter,setFilter]=useState<'all'|'sample'|'local'>('all');
  const [newOpen,setNewOpen]=useState(false); const [createError,setCreateError]=useState(''); const [evaluated,setEvaluated]=useState(false); const [observe,setObserve]=useState<Observation>(BLANK_OBS);
  const [receipt,setReceipt]=useState<Awaited<ReturnType<typeof readReceipt>>>(null); const [receiptBusy,setReceiptBusy]=useState(false); const [receiptError,setReceiptError]=useState('');
  const [tx,setTx]=useState<TxState>({kind:'idle',message:''}); const [confirmOpen,setConfirmOpen]=useState(false); const [mobileNav,setMobileNav]=useState(false);
  const scope=storageScope(BOT.chainId,BOT.registry||'unconfigured',walletAddress||'anonymous');
  const invoices=useMemo(()=>[...FIXTURES,...localInvoices], [localInvoices]);
  const active=invoices.find(x=>x.id===activeId)||invoices[0];
  const matchRows=useMemo(()=>active?evaluateInvoice(active,observe):[],[active,observe]);
  const isMatch=matchRows.length>0&&matchRows.every(x=>x.matches);
  const isReal=!!active&&!active.fixture;
  const isReady=!!(active&&isReal&&validBytes32(observe.proofHash)&&observe.expiry*1000>Date.now()&&/^[0-9]+$/.test(observe.amount)&&isAddress(observe.recipient)&&isAddress(observe.payer));
  const connectedToTarget=walletAddress&&walletChain===BOT.chainId;

  const refreshNetwork=useCallback(async()=>{setNetworkBusy(true);setNetworkError('');try{setNetwork(await readNetwork())}catch(e){setNetworkError(e instanceof Error?e.message:'Could not read BOT Chain.')}finally{setNetworkBusy(false)}},[]);
  const loadReceipt=useCallback(async(invoice:Invoice)=>{setReceiptBusy(true);setReceiptError('');try{setReceipt(await readReceipt(invoice.invoiceId))}catch(e){setReceipt(null);setReceiptError(e instanceof Error?e.message:'Receipt read failed.')}finally{setReceiptBusy(false)}},[]);
  useEffect(()=>{void refreshNetwork()},[refreshNetwork]);
  useEffect(()=>{setLocalInvoices(getLocal(scope));setEvaluated(false);setReceipt(null);setTx({kind:'idle',message:''});},[scope]);
  useEffect(()=>{localStorage.setItem(scope,JSON.stringify(localInvoices))},[scope,localInvoices]);
  useEffect(()=>{const onpop=()=>setRoute(routeFromPath());addEventListener('popstate',onpop);return()=>removeEventListener('popstate',onpop)},[]);
  useEffect(()=>{
    if(!window.ethereum?.on)return;
    const onAccounts=(accounts:unknown)=>{const list=accounts as string[];setWalletAddress(list?.[0]||'');setReceipt(null);setTx({kind:'idle',message:''});};
    const onChain=(chain:unknown)=>{setWalletChain(Number.parseInt(String(chain),16));setReceipt(null);setNetwork(null);void refreshNetwork()};
    window.ethereum.on('accountsChanged',onAccounts);window.ethereum.on('chainChanged',onChain);
    return()=>{window.ethereum?.removeListener?.('accountsChanged',onAccounts);window.ethereum?.removeListener?.('chainChanged',onChain)}
  },[refreshNetwork]);
  useEffect(()=>{if(route==='receipts'&&active)void loadReceipt(active)},[route,active?.invoiceId,loadReceipt]);
  useEffect(()=>{const id=new URLSearchParams(location.search).get('invoice');if(id&&invoices.some(x=>x.id===id))setActiveId(id)},[invoices]);

  function navigate(next:Route){setRoute(next);setMobileNav(false);history.pushState({},'',`/${next}${active?`?invoice=${encodeURIComponent(active.id)}`:''}`)}
  function selectInvoice(invoice:Invoice){setActiveId(invoice.id);setEvaluated(false);setReceipt(null);setTx({kind:'idle',message:''});history.replaceState({},'',`${location.pathname}?invoice=${encodeURIComponent(invoice.id)}`)}
  async function connect(){
    if(!window.ethereum){setWalletError('No injected EVM wallet found. Install a wallet extension to connect; public reads still work.');return}
    setWalletBusy(true);setWalletError('');
    try{const accounts=await window.ethereum.request({method:'eth_requestAccounts'}) as string[];if(!accounts?.[0])throw new Error('Wallet did not return an account.');const chain=await window.ethereum.request({method:'eth_chainId'});setWalletAddress(getAddress(accounts[0]));setWalletChain(Number.parseInt(String(chain),16));setTx({kind:'idle',message:''})}
    catch(e){const x=e as {code?:number;message?:string};setWalletError(x.code===4001?'Wallet connection was rejected.':x.message||'Could not connect wallet.')}finally{setWalletBusy(false)}
  }
  async function disconnect(){setWalletAddress('');setWalletChain(null);setReceipt(null);setWalletError('');setTx({kind:'idle',message:''})}
  async function ensureTargetChain(){
    if(!window.ethereum)throw new Error('Connect an EVM wallet first.');
    try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:`0x${BOT.chainId.toString(16)}`}]})}
    catch(e){const x=e as {code?:number};if(x.code!==4902)throw e;await window.ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:`0x${BOT.chainId.toString(16)}`,chainName:'BOT Chain Testnet',nativeCurrency:{name:'BOT',symbol:'BOT',decimals:18},rpcUrls:[BOT.rpcUrl],blockExplorerUrls:[BOT.explorerUrl]}]})}
    setWalletChain(BOT.chainId);
  }
  function createInvoice(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setCreateError('');const form=new FormData(event.currentTarget);
    try{
      const id=String(form.get('reference')||'').trim();if(id.length<3||id.length>64)throw new Error('Reference must be 3–64 characters.');
      const payer=normalizeAddress(String(form.get('payer')||''));const recipient=normalizeAddress(String(form.get('recipient')||''));
      const amount=String(form.get('amount')||'').trim();if(!/^\d{1,78}$/.test(amount)||BigInt(amount)===0n)throw new Error('Enter a positive integer amount in base units.');
      const unit=String(form.get('unit')||'units').trim().slice(0,20)||'units';const due=new Date(String(form.get('due')||'')).getTime();if(!Number.isFinite(due)||due<=Date.now())throw new Error('Choose a future due date.');
      if(invoices.some(x=>x.id.toLowerCase()===id.toLowerCase()))throw new Error('That invoice reference already exists in this view.');
      const hashes=hashInvoice(id,payer,recipient,amount,unit,Math.floor(due/1000));
      const invoice:Invoice={id,invoiceId:hashes.invoiceId,intentHash:hashes.intentHash,payer,recipient,amount,unit,dueAt:due,createdAt:Date.now()};
      setLocalInvoices(xs=>[invoice,...xs]);selectInvoice(invoice);setNewOpen(false);setRoute('reconcile');history.pushState({},'',`/reconcile?invoice=${encodeURIComponent(invoice.id)}`);
    }catch(e){setCreateError(e instanceof Error?e.message:'Invoice could not be created.')}
  }
  function useFixtureEvidence(){
    if(!active)return;const mismatch=active.id==='INV—24019';setObserve({payer:active.payer,recipient:mismatch?'0x0000000000000000000000000000000000000d4':active.recipient,amount:mismatch?'681':active.amount,proofHash:'0x'+'c'.repeat(64),expiry:Math.floor((Date.now()+86400000*2)/1000)});setEvaluated(true);setReceipt(null)
  }
  async function commitReceipt(){
    if(!active||!isReal)return;setTx({kind:'pending',message:'Checking contract state, simulating the call, then waiting for wallet confirmation.'});setConfirmOpen(false);
    try{
      if(!window.ethereum)throw new Error('Connect an EVM wallet first.');
      if(!BOT.registry)throw new Error('Set VITE_RELAY_REGISTRY_ADDRESS to the verified deployment in BOTCHAIN_TESTNET.md.');
      if(walletChain!==BOT.chainId)await ensureTargetChain();
      const provider=new BrowserProvider(window.ethereum as never,'any');const signer=await provider.getSigner();
      const existing=await readReceipt(active.invoiceId);if(existing)throw new Error('This invoice ID already has an immutable on-chain receipt.');
      const accepted=isMatch;
      const result=await submitReceipt(provider,active.invoiceId,active.intentHash,observe.proofHash,active.amount,active.recipient,observe.expiry,accepted);
      setTx({kind:'confirmed',message:`${accepted?'Matched':'Mismatch'} receipt confirmed in block ${result.blockNumber}. This anchors submitted fields only; it does not prove funds moved.`,hash:result.hash,block:result.blockNumber});
      setReceipt(await readReceipt(active.invoiceId));
      void signer;
    }catch(e){const x=e as {code?:number;message?:string};const rejected=x.code===4001||x.code==='ACTION_REJECTED';setTx({kind:rejected?'rejected':'error',message:rejected?'Wallet request rejected. No transaction was sent.':(x.message||'The receipt was not recorded.')});}
  }
  async function refreshCurrentReceipt(){if(active){setReceipt(null);await loadReceipt(active)}}

  const shown=invoices.filter(x=>(filter==='all'||(filter==='sample'?x.fixture:!x.fixture))&&`${x.id} ${x.payer} ${x.recipient}`.toLowerCase().includes(search.toLowerCase()));
  const amountRows=shown.reduce((sum,x)=>sum+BigInt(x.amount),0n).toString();
  const iconRoute=route;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'nav-open':''}`}>
      <a className="brand" href="/invoices" onClick={e=>{e.preventDefault();navigate('invoices')}}><img src="/relay-mark.svg" alt=""/><span>relay</span><small>SETTLEMENT DESK</small></a>
      <div className="workspace-switch"><div className="workspace-avatar">O</div><div><strong>Operations</strong><span>Invoice desk</span></div><ChevronDown size={15}/></div>
      <nav className="primary-nav" aria-label="Main navigation">{ROUTES.map(({id,label,icon:Icon})=><button key={id} className={`nav-item ${route===id?'selected':''}`} onClick={()=>navigate(id)} aria-current={route===id?'page':undefined}><Icon size={18}/><span>{label}</span>{id==='invoices'&&localInvoices.length>0&&<small>{localInvoices.length}</small>}</button>)}</nav>
      <div className="side-caption">NETWORK</div>
      <button className="network-switch" onClick={()=>void refreshNetwork()} title="Refresh BOT Chain status"><span className={`network-bullet ${network?'ok':networkError?'error':''}`}/><span><b>BOT Chain Testnet</b><small>Chain 968 · BOT</small></span><RefreshCw size={14} className={networkBusy?'spin':''}/></button>
      <div className="sidebar-bottom"><div className="desk-label"><span className="route-mark" aria-hidden="true"><i/><i/><i/></span><div><b>Evidence first</b><small>Anchors ≠ settlement</small></div></div><a href="https://scan.bohr.life/address/0xb80b17b94646ae0b1e4cb3bab8bc72cff7a95c9c" target="_blank" rel="noreferrer">Verified testnet contract <ArrowRight size={14}/></a></div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>}
    <div className="main-column">
      <header className="topbar"><button className="icon-button mobile-menu" title="Open navigation" onClick={()=>setMobileNav(x=>!x)}><Menu size={19}/></button><div className="breadcrumbs"><span>Operations</span><span>/</span><b>{ROUTES.find(x=>x.id===iconRoute)?.label}</b></div><div className="top-actions"><span className="connection-state"><i className={network?'up':''}/>{network?'RPC connected':'RPC status'}</span>{walletAddress?<div className="wallet-cluster"><button className={`wallet-button ${walletChain===BOT.chainId?'good':'warn'}`} onClick={walletChain===BOT.chainId?disconnect:()=>void ensureTargetChain()} title={walletChain===BOT.chainId?'Disconnect wallet':'Switch wallet to BOT Chain Testnet'}><Wallet size={15}/>{addressLabel(walletAddress)}<span>{walletChain===BOT.chainId?'Disconnect':'Wrong network'}</span></button></div>:<button className="wallet-button" onClick={()=>void connect()} disabled={walletBusy}><Wallet size={15}/>{walletBusy?'Connecting…':'Connect wallet'}</button>}</div></header>
      <main>
        {walletError&&<div className="inline-alert error"><CircleAlert size={16}/><span>{walletError}</span><button onClick={()=>setWalletError('')} aria-label="Dismiss"><X size={16}/></button></div>}
        {networkError&&<div className="inline-alert error"><CircleAlert size={16}/><span>{networkError}</span><button onClick={()=>void refreshNetwork()}>Retry</button></div>}
        {!BOT.registry&&<div className="inline-alert warning"><CircleHelp size={16}/><span>Contract reads are not configured. Set <code>VITE_RELAY_REGISTRY_ADDRESS</code> to the verified address in BOTCHAIN_TESTNET.md.</span></div>}
        {route==='invoices'&&<InvoicesPage invoices={shown} allCount={invoices.length} total={amountRows} activeId={active?.id||''} onSelect={selectInvoice} onCreate={()=>setNewOpen(true)} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} onGoReconcile={()=>navigate('reconcile')} />}
        {route==='reconcile'&&active&&<ReconcilePage invoice={active} observed={observe} setObserved={v=>{setObserve(v);setEvaluated(false);setReceipt(null)}} evaluated={evaluated} onEvaluate={()=>setEvaluated(true)} rows={matchRows} isMatch={isMatch} onUseFixture={useFixtureEvidence} network={network} receipt={receipt} receiptBusy={receiptBusy} receiptError={receiptError} onReadReceipt={()=>void loadReceipt(active)} onAnchor={()=>setConfirmOpen(true)} tx={tx} canAnchor={isReady&&evaluated&&!active.fixture&&!receipt&&!!BOT.registry} connected={!!connectedToTarget} onConnect={()=>void connect()} onCheckReceipts={()=>navigate('receipts')} />}
        {route==='receipts'&&<ReceiptsPage invoice={active} invoices={invoices.filter(x=>!x.fixture)} receipt={receipt} busy={receiptBusy} error={receiptError} tx={tx} onRefresh={refreshCurrentReceipt} onExport={()=>exportCsv(invoices,receipt?{[active?.invoiceId||'']:'recorded'}:{})} onSelect={selectInvoice} onGoInvoices={()=>navigate('invoices')} />}
      </main>
      <footer className="page-footer"><span>Relay · BOT Chain Testnet</span><span>Receipt anchors record submitted claims. They do not prove underlying payment.</span><a href="https://github.com/nftkingiii/botchain-relay" target="_blank" rel="noreferrer">Contract source <ArrowRight size={13}/></a></footer>
    </div>
    {newOpen&&<NewInvoiceModal onClose={()=>{setNewOpen(false);setCreateError('')}} onSubmit={createInvoice} error={createError}/>}
    {confirmOpen&&active&&<ConfirmModal invoice={active} accepted={isMatch} onCancel={()=>setConfirmOpen(false)} onConfirm={()=>void commitReceipt()}/>}
  </div>
}

function InvoicesPage({invoices,allCount,total,activeId,onSelect,onCreate,search,onSearch,filter,onFilter,onGoReconcile}:{invoices:Invoice[];allCount:number;total:string;activeId:string;onSelect:(x:Invoice)=>void;onCreate:()=>void;search:string;onSearch:(x:string)=>void;filter:'all'|'sample'|'local';onFilter:(x:'all'|'sample'|'local')=>void;onGoReconcile:()=>void}){
 return <section className="page"><div className="page-heading"><div><h1>Invoices</h1><p>Invoice intent queue · {allCount} records including clearly marked fixtures</p></div><button className="primary-button" onClick={onCreate}><Plus size={17}/>New invoice</button></div>
  <div className="overview-line"><div><span>WORK QUEUE</span><b>{allCount.toString().padStart(2,'0')}</b><small>Local intents</small></div><div><span>AGGREGATE UNITS</span><b>{new Intl.NumberFormat('en').format(Number(total))}</b><small>Across visible rows · illustrative units</small></div><div className="overview-note"><span className="route-mark"><i/><i/><i/></span><p>Match the expected parties and amount to supplied evidence. Record an outcome only after review.</p></div></div>
  <div className="table-toolbar"><label className="search-box"><Search size={17}/><input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Search reference or address" aria-label="Search invoices"/>{search&&<button title="Clear search" onClick={()=>onSearch('')}><X size={14}/></button>}</label><div className="filter-select"><Filter size={15}/><select value={filter} onChange={e=>onFilter(e.target.value as typeof filter)} aria-label="Filter invoice origin"><option value="all">All sources</option><option value="local">My invoices</option><option value="sample">Sample fixtures</option></select></div></div>
  {!invoices.length?<div className="empty-state"><Inbox size={26}/><h2>No invoices found</h2><p>{search?'Try another reference or clear the search.':'Create a local invoice intent to begin a reconciliation.'}</p><button className="secondary-button" onClick={onCreate}><FilePlus2 size={16}/>Create invoice</button></div>:<div className="queue-table"><div className="queue-header"><span>REFERENCE</span><span>EXPECTED PAYER</span><span>AMOUNT · INTEGER UNITS</span><span>DUE DATE</span><span>ORIGIN</span><span/></div>{invoices.map(item=><button className={`queue-row ${item.id===activeId?'is-active':''}`} key={item.id} onClick={()=>{onSelect(item);onGoReconcile()}}><span className="ref-cell"><i className={`status-pip ${item.fixture?'amber':'teal'}`}/><span><b>{item.id}</b><small>{idShort(item.invoiceId)}</small></span></span><span className="payer-cell"><b>{addressLabel(item.payer)}</b><small>Expected payer</small></span><span className="amount-cell"><b>{new Intl.NumberFormat('en').format(Number(item.amount))}</b><small>{item.unit}</small></span><span>{dateLabel(item.dueAt)}</span><span><em className={`origin-tag ${item.fixture?'fixture':'local'}`}>{item.fixture?'Sample':'Local'}</em></span><ArrowRight className="row-arrow" size={17}/></button>)}</div>}
  <div className="below-note"><CircleHelp size={15}/><span>Currency labels and payer details are local metadata; the deployed registry commits the intent hash, proof hash, integer amount, recipient, expiry and accepted flag.</span></div>
 </section>
}
