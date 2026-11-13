export type Role = 'batting' | 'bowling';
export type EvidenceLevel = 'strong' | 'moderate' | 'limited' | 'insufficient';
export interface Ranking { rank:number; player:{id:number;name:string}; role:Role; definition:string; pressure_score:number; rate:number; adjusted_rate:number; exposures:number; matches:number; seasons:number; runs:number; wickets:number; context_coverage:number; uncertainty:{ci95_low:number;ci95_high:number;ci_half_width:number;match_rate_sd:number}; shrink_weight:number; evidence_level:EvidenceLevel; source_record_count:number; review_status:string }
export interface RankingResponse { data:Ranking[]; meta:{ role:Role; definition:string; total:number; limit:number; offset:number; source_run:string; review_status:string } }
export interface MethodologySection { id:string; title:string; body_markdown:string; results?:Array<Record<string,unknown>> }
export interface MethodologyResponse { data:{version:string;review_status:string;sections:MethodologySection[]} }
const baseUrl=(import.meta.env.VITE_API_BASE_URL||'http://localhost:8000').replace(/\/$/,'');
async function request<T>(path:string):Promise<T>{const response=await fetch(`${baseUrl}/api/v1${path}`,{headers:{Accept:'application/json'}});if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body?.error?.message||body?.detail||`Service unavailable (${response.status})`)}return response.json() as Promise<T>}
export const clutchIqApi={rankings:(role:Role)=>request<RankingResponse>(`/rankings/${role}?definition=rules_pressure&limit=10`),methodology:()=>request<MethodologyResponse>('/methodology')};
