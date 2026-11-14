export type TableRow = Record<string, string | number | boolean | null>;
export type LiveRole = 'batting' | 'bowling';
export interface Validation {
  original_rows:number; processed_rows:number; rejected_rows:number; duplicate_records:number;
  columns:string[]; normalized_columns:string[]; additional_columns:string[];
  missing_values:Record<string,number>; raw_preview:TableRow[]; structured_preview:TableRow[];
  issues:TableRow[]; sha256:string; notice:string;
}
export interface Method { version:string; description:string; pressure:string; scores:string; evidence:string; limitations:string[] }
export interface LiveSchema { required_columns:Record<string,string[]>; max_bytes:number; max_rows:number; expires_seconds:number; limitation:string; methodology:Method }
export interface Job {
  status:'receiving'|'validated'|'queued'|'running'|'complete'|'unavailable'|'failed'|'cancelled';
  stages:string[]; validation:Record<string,Validation>; missing_tables:string[];
  analysis_available:boolean; message:string|null; expires_in_seconds:number;
}
export interface Session { job_id:string; access_token:string }
export interface Player extends TableRow {
  player_id:number; player_name:string; rank:number; pressure_score:number|null;
  exposures:number; matches:number; evidence_level:string; source_record_count:number;
  adjusted_rate:number|null; rate:number|null; context_coverage:number;
  ci95_low:number|null; ci95_high:number|null;
}
export interface Results {
  status:string; message?:string; rankings?:Record<LiveRole,Player[]>;
  summary?:TableRow; methodology?:Method; issues?:TableRow[]; match_checks?:TableRow[];
  source_files?:Record<string,{sha256:string;rows:number}>;
}
export interface Evidence { metrics:Player; balls:TableRow[]; matches:TableRow[]; total:number; offset:number; limit:number }

export class LiveApiError extends Error {
  constructor(message:string, public status:number) {super(message);this.name='LiveApiError';}
}

export function createLiveApi(base:string) {
  const url = `${base.replace(/\/$/,'')}/api/v1/live`;
  async function request<T>(path:string, session?:Session, init:RequestInit={}) : Promise<T> {
    const response = await fetch(url+path, {...init, signal:AbortSignal.timeout(60000), cache:'no-store',
      headers:{Accept:'application/json', ...(session ? {'X-Analysis-Token':session.access_token} : {}), ...init.headers}});
    if (!response.ok) {
      const body = await response.json().catch(()=>null);
      const detail = typeof body?.detail==='string' ? body.detail : body?.error?.message;
      throw new LiveApiError(detail || `Live console request failed (${response.status}). Please retry.`,response.status);
    }
    return response.status===204 ? undefined as T : await response.json() as T;
  }
  const path = (s:Session) => `/jobs/${encodeURIComponent(s.job_id)}`;
  return {
    schema:()=>request<LiveSchema>('/schema'),
    upload:(file:File)=>request<Job & Session>('/uploads',undefined,{method:'POST',headers:{'Content-Type':'text/csv'},body:file}),
    companion:(s:Session,table:string,file:File)=>request<Job>(`${path(s)}/tables/${encodeURIComponent(table)}`,s,{method:'POST',headers:{'Content-Type':'text/csv'},body:file}),
    status:(s:Session)=>request<Job>(path(s),s),
    start:(s:Session)=>request<{status:string}>(path(s)+'/start',s,{method:'POST'}),
    cancel:(s:Session)=>request<{message:string}>(path(s)+'/cancel',s,{method:'POST'}),
    remove:(s:Session)=>request<void>(path(s),s,{method:'DELETE'}),
    results:(s:Session)=>request<Results>(path(s)+'/results',s),
    player:(s:Session,id:number,role:LiveRole,offset=0)=>request<Evidence>(`${path(s)}/players/${id}?role=${role}&offset=${offset}`,s),
    async download(s:Session,kind:'structured'|'rankings') {
      const response=await fetch(`${url}${path(s)}/${kind}.csv`,{headers:{'X-Analysis-Token':s.access_token},cache:'no-store',signal:AbortSignal.timeout(60000)});
      if(!response.ok) throw new LiveApiError(response.status===404?'Job unavailable, expired, or inaccessible. Re-upload after a restart.':`Download unavailable (${response.status}).`,response.status);
      return response.blob();
    },
  };
}
