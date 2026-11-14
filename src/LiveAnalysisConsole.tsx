import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Upload, Play, Download, X, CheckCircle2 } from 'lucide-react';
import { createLiveApi, LiveApiError, type Evidence, type Job, type LiveRole, type LiveSchema, type Results, type Session, type TableRow } from './api/liveClient';

const configuredBase=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
const direct=window.location.origin==='https://strata-y6yz.onrender.com'||window.location.origin===configuredBase;
const api=createLiveApi(direct?configuredBase:'');
const button='inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border border-[#0A1128]/20 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0A1128]/5 transition-colors';
const card='border border-[#0A1128]/15 bg-white/60 p-5 sm:p-7';
const format=(value:unknown)=>value===null || value===undefined ? 'Unavailable' : typeof value==='number' ? Number.isInteger(value)?String(value):value.toFixed(3) : String(value);

function DataTable({rows,label}:{rows:TableRow[];label:string}) {
  if(!rows.length) return <p className="text-sm text-[#64748B]">No records in this view.</p>;
  const cols=Object.keys(rows[0]);
  return <div className="max-h-80 overflow-auto border border-[#0A1128]/10" tabIndex={0} role="region" aria-label={label}>
    <table className="w-full text-xs text-left whitespace-nowrap"><caption className="sr-only">{label}</caption><thead className="sticky top-0 bg-[#EFECE4]"><tr>{cols.map(c=><th key={c} className="p-3 font-mono-tabular">{c}</th>)}</tr></thead>
      <tbody>{rows.map((r,i)=><tr key={i} className="border-t border-[#0A1128]/10">{cols.map(c=><td key={c} className="p-3 max-w-xs truncate" title={format(r[c])}>{format(r[c])}</td>)}</tr>)}</tbody></table>
  </div>;
}

export default function LiveAnalysisConsole() {
  const [schema,setSchema]=useState<LiveSchema|null>(null), [job,setJob]=useState<Job|null>(null);
  const [session,setSession]=useState<Session|null>(null), [result,setResult]=useState<Results|null>(null);
  const [error,setError]=useState(''), [busy,setBusy]=useState(false), [activity,setActivity]=useState('');
  const [files,setFiles]=useState<Array<{name:string;size:number}>>([]), [role,setRole]=useState<LiveRole>('batting');
  const [evidence,setEvidence]=useState<Evidence|null>(null), [selectedTable,setSelectedTable]=useState('ball_by_ball');
  const input=useRef<HTMLInputElement>(null);
  const alive=useRef(true);
  const working=job?.status==='queued'||job?.status==='running';
  function clearSession() {setJob(null);setSession(null);setResult(null);setEvidence(null);setFiles([]);setSelectedTable('ball_by_ball');}
  function expired(e:unknown) {return e instanceof LiveApiError&&e.status===404&&e.message.startsWith('Job unavailable');}
  useEffect(()=>{alive.current=true; api.schema().then(setSchema).catch(e=>setError(e.message));return()=>{alive.current=false;};},[]);
  useEffect(()=>{
    if(!working||!session) return;
    let cancelled=false; let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      try {
        const next=await api.status(session);
        if(cancelled) return;
        setError('');
        if(next.status==='complete'||next.status==='unavailable') {
          const data=next.status==='complete' ? await api.results(session) : await api.results(session).catch(()=>null);
          if(!cancelled) setResult(data);
        }
        if(!cancelled) setJob(next);
        if(next.status==='queued'||next.status==='running') timer=setTimeout(poll,1000);
      } catch(e) { if(!cancelled) {setError(e instanceof Error?e.message:'Unable to check progress.');if(expired(e))clearSession();else timer=setTimeout(poll,5000);} }
    };
    void poll();
    return()=>{cancelled=true;clearTimeout(timer);};
  },[working,session]);

  async function action(task:()=>Promise<void>) {
    setBusy(true);setError('');
    try {await task();} catch(e) {if(alive.current){setError(e instanceof Error?e.message:'Request failed. Please retry.');if(expired(e))clearSession();}}
    finally {if(alive.current){setBusy(false);setActivity('');}}
  }
  async function upload(selected:FileList|File[]) {
    if(busy||working||!schema||(job&&job.status!=='validated')) return;
    const incoming=Array.from(selected);
    await action(async()=>{
      if(!incoming.length) return;
      for(const f of incoming) {
        if(!f.name.toLowerCase().endsWith('.csv')) throw new Error('Choose CSV files only.');
        if(f.size>schema!.max_bytes||!f.size) throw new Error(`${f.name}: file must be non-empty and at most 2 MiB.`);
      }
      setFiles(previous=>[...previous,...incoming.map(f=>({name:f.name,size:f.size}))]);
      let current=session;
      let next=job;
      if(!current) {
        const delivery=incoming.find(f=>f.name==='ball_by_ball.csv') || (incoming.length===1?incoming[0]:null);
        if(!delivery) throw new Error('Start with ball_by_ball.csv, or select it alongside the five companion CSVs.');
        setActivity('Uploading and validating deliveries…');
        const response=await api.upload(delivery);
        current={job_id:response.job_id,access_token:response.access_token};next=response;
        setSession(current);setJob(next);
        incoming.splice(incoming.indexOf(delivery),1);
      }
      for(const file of incoming) {
        const table=file.name.replace(/\.csv$/i,'');
        if(!schema!.required_columns[table]||table==='ball_by_ball') throw new Error('Companion filenames must match the schema below. Delete the current upload to replace deliveries.');
        setActivity(`Uploading and validating ${table}…`);
        next=await api.companion(current,table,file);setJob(next);
      }
    });
    if(input.current) input.current.value='';
  }
  async function download(kind:'structured'|'rankings') {
    await action(async()=>{
      const blob=await api.download(session!,kind);const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=`uploaded-${kind}.csv`;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
  const validation=job?.validation[selectedTable];
  const leaders=result?.rankings?.[role]?.slice(0,10)||[];
  const method=result?.methodology||schema?.methodology;
  return <div className="min-h-screen bg-[#F7F4EE] text-[#0A1128]">
    <header className="border-b border-[#0A1128]/15 sticky top-0 z-30 bg-[#F7F4EE]/95"><div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-3">
      <a href="#hero" className="font-editorial text-2xl font-bold">STRATA</a><a href="#hero" className={button}><ArrowLeft size={16}/>Back to platform</a></div></header>
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-7">
      <div><p className="font-mono-tabular text-xs tracking-widest text-[#1D4ED8] mb-3">UPLOAD / INSPECT / VERIFY</p><h1 className="font-editorial text-4xl sm:text-6xl">Live Analysis Console</h1><p className="max-w-3xl mt-4 text-[#475569] leading-relaxed">Inspect cricket deliveries and run the recovered Phase 7A pressure methodology on your own data. Results are separate from STRATA’s approved production rankings.</p></div>
      <div className="border-l-4 border-[#1D4ED8] bg-[#1D4ED8]/5 p-4 text-sm">Temporary session: files, results and access keys stay in memory. They expire after 15 minutes and disappear on server restarts. Leaving this page loses access; there is no saved history. Up to 2 MiB / 10,000 rows per CSV and 6 MiB per job. Use complete matches with historical training coverage.</div>
      {error&&<div role="alert" className="border border-red-700/30 bg-red-50 p-4 text-red-800 break-words">{error}<button className={`${button} ml-3`} onClick={()=>void action(async()=>{if(session){const next=await api.status(session);setJob(next);if(next.status==='complete')setResult(await api.results(session));}else setSchema(await api.schema());})} disabled={busy}>Retry connection</button></div>}
      <section className={card} aria-labelledby="upload-title">
        <h2 id="upload-title" className="font-editorial text-2xl mb-4">01 / Your source data</h2>
        <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void upload(e.dataTransfer.files);}} className="border-2 border-dashed border-[#0A1128]/25 p-8 text-center bg-[#F7F4EE]">
          <Upload className="mx-auto mb-3 text-[#1D4ED8]" size={28}/><p className="font-medium">Drop your CSV files here</p><p className="text-sm text-[#64748B] my-2">Start with ball_by_ball.csv. Add the five companion tables to enable pressure analysis.</p>
          <input ref={input} type="file" multiple accept=".csv,text/csv" className="sr-only" aria-label="Upload cricket CSV files" onChange={e=>e.target.files&&void upload(e.target.files)} disabled={!schema||busy||working||Boolean(job&&job.status!=='validated')}/>
          <button className={`${button} mt-2`} onClick={()=>input.current?.click()} disabled={!schema||busy||working||Boolean(job&&job.status!=='validated')}>Browse CSV files</button>
        </div>
        <p role="status" aria-live="polite" className="mt-3 text-sm">{activity || (job ? `Upload status: ${job.status}` : schema?'Ready for upload.':'Connecting to backend…')}</p>
        {files.length>0&&<ul className="mt-3 text-xs break-all space-y-1">{files.map((f,i)=><li key={i}>{f.name} · {(f.size/1024).toFixed(1)} KiB</li>)}</ul>}
        {job?.missing_tables.length ? <p className="mt-4 text-sm text-[#475569]">Required before analysis: {job.missing_tables.map(t=>t+'.csv').join(', ')}.</p> : null}
        <details className="mt-5 text-sm"><summary className="cursor-pointer font-medium">Original CSV schema and prerequisites</summary><p className="my-3">Dates must be YYYY-MM-DD. Literal “None” means no extras; unknown extra conventions are quarantined. Match, team and player IDs must agree across all tables. Training uses pre-2024 matches; evaluation begins in 2024. No external dataset is silently added.</p>{schema&&Object.entries(schema.required_columns).map(([table,cols])=><div className="my-3" key={table}><strong>{table}.csv</strong><p className="font-mono-tabular text-xs break-words mt-1">{cols.join(', ')}</p></div>)}</details>
      </section>
      {job&&<section className={card}>
        <h2 className="font-editorial text-2xl mb-4">02 / Validation & structured data</h2>
        <label className="text-sm">Inspect table <select className="border p-2 mb-4 max-w-full bg-transparent" value={selectedTable} onChange={e=>setSelectedTable(e.target.value)}>{Object.keys(job.validation).map(t=><option key={t}>{t}</option>)}</select></label>
        {validation&&<><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">{[['Received',validation.original_rows],['Event-valid / parsed',validation.processed_rows],['Event-invalid',validation.rejected_rows],['Duplicate records',validation.duplicate_records]].map(([label,value])=><div className="border p-3" key={label}><p className="text-xs text-[#64748B]">{label}</p><p className="font-mono-tabular text-2xl mt-1">{value}</p></div>)}</div>
          <p className="text-sm text-[#475569] mb-4">{validation.notice}</p>
          <details open><summary className="cursor-pointer font-medium mb-3">Raw preview · first 10 records</summary><DataTable rows={validation.raw_preview} label="Raw uploaded data"/></details>
          <details className="mt-4" open><summary className="cursor-pointer font-medium mb-3">Pandas structured preview · first 10 records</summary><DataTable rows={validation.structured_preview} label="Structured normalized data"/></details>
          <details className="mt-4"><summary className="cursor-pointer">Missing values, detected columns and validation issues</summary><p className="text-xs my-3 break-words">Detected: {validation.columns.join(', ')}<br/>Derived: {validation.normalized_columns.join(', ')}</p><DataTable rows={Object.entries(validation.missing_values).map(([column,count])=>({column,empty_values:count}))} label="Missing values"/><div className="mt-3"><DataTable rows={validation.issues} label="Validation issues (first 100)"/></div><p className="text-xs break-all mt-3">File SHA-256: {validation.sha256}</p></details></>}
        <div className="flex flex-wrap gap-3 mt-5"><button className={button} disabled={busy||working} onClick={()=>void download('structured')}><Download size={16}/>Export structured deliveries</button><button className={button} disabled={busy||working} onClick={()=>void action(async()=>{await api.remove(session!);setJob(null);setSession(null);setResult(null);setEvidence(null);setFiles([]);setSelectedTable('ball_by_ball');})}><X size={16}/>Delete session</button></div>
      </section>}
      {job&&<section className={card}>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-5"><h2 className="font-editorial text-2xl">03 / Pressure analysis</h2><button className={`${button} bg-[#0A1128] text-white hover:bg-[#1D4ED8]`} disabled={busy||!job.analysis_available||job.status!=='validated'} onClick={()=>void action(async()=>{await api.start(session!);setJob({...job,status:'queued'});setResult(null);})}><Play size={16}/>Start Analysis</button></div>
        <p className="text-sm text-[#64748B] mb-4">Stages below come from completed ingestion work and actual analysis execution. No simulated percentages.</p>
        <ol className="space-y-2 text-sm" aria-live="polite">{job.stages.map((stage,i)=><li key={i} className="flex gap-2">{working&&i===job.stages.length-1?<span className="shrink-0 text-[#1D4ED8]" aria-label="Current stage">→</span>:<CheckCircle2 size={15} className="shrink-0 mt-0.5 text-[#1D4ED8]"/>}{stage}</li>)}</ol>
        <p role="status" className="mt-5 font-medium">Status: {job.status}{job.message?` — ${job.message}`:''}</p>
        {working&&<button className={`${button} mt-4`} disabled={busy} onClick={()=>void action(async()=>{const r=await api.cancel(session!);setActivity(r.message);})}>Cancel at next safe stage</button>}
      </section>}
      {result&&<section className={card}>
        <h2 className="font-editorial text-2xl mb-3">04 / Uploaded-dataset results</h2><p className="text-sm text-[#64748B] mb-4">Exploratory results; not independently Phase 7B reviewed. Evidence labels and context coverage are part of every assessment.</p>
        {result.message&&<p className="mb-4">{result.message}</p>}{result.summary&&<DataTable rows={[result.summary]} label="Dataset summary"/>}
        {result.rankings&&<><div className="flex flex-wrap gap-3 mt-6 mb-4">{(['batting','bowling'] as const).map(r=><button className={`${button} ${r===role?'bg-[#0A1128] text-white':''}`} key={r} disabled={busy} onClick={()=>{setRole(r);setEvidence(null);}} aria-pressed={r===role}>{r==='batting'?'Top batters':'Top bowlers'}</button>)}<button className={button} disabled={busy} onClick={()=>void download('rankings')}><Download size={16}/>Export all rankings</button></div>
          {leaders.length ? <><p className="mb-3">Leading observed {role==='batting'?'batter':'bowler'}: <strong>{leaders[0].player_name}</strong> · {leaders[0].evidence_level} evidence. Showing {leaders.length} of {result.rankings[role].length} candidates.</p>
            <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap"><thead className="bg-[#EFECE4]"><tr>{['Rank / player','Pressure score','Exposures','Matches','Evidence','Context','95% interval','Details'].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{leaders.map(p=><tr className="border-b border-[#0A1128]/10" key={p.player_id}><td className="p-3">{p.rank}. {p.player_name}<span className="block text-xs text-[#64748B]">ID {p.player_id}</span></td><td className="p-3 font-mono-tabular">{format(p.pressure_score)}</td><td className="p-3">{p.exposures}</td><td className="p-3">{p.matches}</td><td className="p-3">{p.evidence_level}</td><td className="p-3">{format(p.context_coverage)}%</td><td className="p-3">{format(p.ci95_low)} to {format(p.ci95_high)}</td><td className="p-3"><button className={button} disabled={busy} onClick={()=>void action(async()=>setEvidence(await api.player(session!,p.player_id,role)))}>View evidence</button></td></tr>)}</tbody></table></div></> : <p>No supported {role} candidates. Thresholds have not been lowered.</p>}
          {evidence&&<div className="mt-6 space-y-4 border-t pt-5"><h3 className="font-editorial text-xl">{evidence.metrics.player_name} · {evidence.metrics.source_record_count} supporting records / {evidence.metrics.exposures} exposures</h3><p className="text-sm">Raw scaled rate: {format(evidence.metrics.rate)} · Context-adjusted rate: {format(evidence.metrics.adjusted_rate)} · Shrunk score: {format(evidence.metrics.pressure_score)}. Interval shown is the original match-bootstrap interval for the adjusted rate.</p><DataTable rows={[evidence.metrics]} label="Player metrics and score breakdown"/><DataTable rows={evidence.matches} label="Match-level evidence"/><DataTable rows={evidence.balls} label="Ball-level evidence"/><div className="flex gap-3"><button className={button} disabled={busy||!evidence.offset} onClick={()=>void action(async()=>setEvidence(await api.player(session!,evidence.metrics.player_id,role,Math.max(0,evidence.offset-evidence.limit))))}>Previous records</button><button className={button} disabled={busy||evidence.offset+evidence.limit>=evidence.total} onClick={()=>void action(async()=>setEvidence(await api.player(session!,evidence.metrics.player_id,role,evidence.offset+evidence.limit)))}>Next records</button></div><p className="text-xs">Records {evidence.offset+1}–{Math.min(evidence.offset+evidence.limit,evidence.total)} of {evidence.total}. Source record numbers refer to your uploaded delivery CSV, excluding its header.</p></div>}
        </>}
        <details className="mt-5"><summary className="cursor-pointer">Source traceability and match checks</summary>{result.source_files&&<DataTable rows={Object.entries(result.source_files).map(([table,v])=>({table,...v}))} label="Source hashes"/>}<DataTable rows={result.issues||[]} label="Relationship issues (first 100)"/><DataTable rows={result.match_checks||[]} label="Match reconciliation"/></details>
      </section>}
      {method&&<section className={card}><h2 className="font-editorial text-2xl mb-4">How this analysis works</h2><div className="space-y-3 text-sm leading-relaxed text-[#475569]"><p>{method.description}</p><p>{method.pressure}</p><p>{method.scores}</p><p>{method.evidence}</p><ul className="list-disc pl-5 space-y-2">{method.limitations.map(l=><li key={l}>{l}</li>)}</ul></div></section>}
    </main>
  </div>;
}
