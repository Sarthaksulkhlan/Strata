import type { Method } from '../api/liveClient';
import { ArrowDown, ArrowRight, Database, ShieldCheck, Activity, Scale } from 'lucide-react';

/** Explanatory diagrams of the recovered method, not simulated match data. */
export function PressureExplainer({ methodology, showBackendDetails = true }: { methodology?: Method; showBackendDetails?: boolean }) {
  const datasets = [
    ['competitions', 'Competition ID → match format and competition context'],
    ['teams', 'Competition + team IDs → fixture team identities'],
    ['matches', 'Match ID → competition, date, teams and result checks'],
    ['competition_team_player_mapping', 'Competition + team + player IDs → roster and names'],
    ['playing_eleven', 'Match + team + player IDs → participation consensus'],
    ['ball_by_ball', 'Match + innings + event number → delivery, actors and runs'],
  ];
  return (
    <section aria-labelledby="pressure-explainer-title" className="border border-[#0A1128]/15 bg-[#EFECE4]/75 p-5 sm:p-7 space-y-6">
      <div className="flex gap-3 items-start">
        <Activity className="text-[#1D4ED8] shrink-0 mt-1" />
        <div>
          <p className="font-mono-tabular text-[10px] uppercase tracking-widest text-[#64748B]">Understand the analysis</p>
          <h2 id="pressure-explainer-title" className="font-editorial text-2xl sm:text-3xl mt-1">How STRATA Evaluates Performance Under Pressure</h2>
          <p className="text-sm text-[#475569] mt-2">Six linked tables establish the context. The recovered Phase 7A method evaluates batting and bowling separately; uploaded results never replace approved production rankings.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-label="Six-table relationship diagram">
        {datasets.map(([name, relation]) => <div key={name} className="p-3 border border-[#0A1128]/15 bg-[#F7F4EE] min-w-0">
          <Database size={16} className="text-[#1D4ED8] mb-2" />
          <p className="font-mono-tabular text-xs font-bold break-words">{name}.csv</p>
          <p className="text-xs text-[#475569] mt-2">{relation}</p>
        </div>)}
      </div>
      <div className="flex items-center justify-center gap-3 text-[#1D4ED8] text-xs font-mono-tabular"><ArrowDown size={18} /> Join by identifiers; never infer missing players or dates <ArrowDown size={18} /></div>
      <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Analysis flow">
        {[
          ['01 / Validate', 'Check schemas, keys, roster relationships and delivery semantics. Reconstruct complete innings and reconcile recorded results. Invalid contexts remain diagnostic evidence, not eligible pressure events.'],
          ['02 / Establish pressure', 'Use pre-delivery score, legal balls and wickets remaining. Fit historical thresholds on pre-2024 matches; evaluate 2024 onward. No future outcome becomes a pressure predictor.'],
          ['03 / Compare like contexts', 'Compare runs against supported historical context baselines. A batter exposure is a ball faced; a bowler exposure is a legal ball. Evidence records can include non-exposure deliveries.'],
          ['04 / Rank with uncertainty', 'Aggregate by player and match. Bootstrap matches, shrink noisy scores toward the cohort mean, then sort by evidence tier, score and player ID. A Top 10 is at most ten supported candidates.'],
        ].map(([title, body]) => <li key={title} className="border-t-2 border-[#1D4ED8] pt-3"><p className="font-mono-tabular text-xs font-bold flex justify-between">{title}<ArrowRight size={14} /></p><p className="text-sm text-[#475569] mt-2">{body}</p></li>)}
      </ol>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-[#0A1128] text-[#F7F4EE] p-4 sm:p-5">
          <p className="font-mono-tabular text-xs uppercase tracking-wider">Pressure window · legal balls remaining</p>
          <svg viewBox="0 0 360 75" role="img" aria-label="Pressure window is 6 through 60 legal balls remaining out of 120" className="w-full mt-3">
            <rect x="20" y="25" width="320" height="16" fill="#475569" />
            <rect x="36" y="25" width="144" height="16" fill="#60A5FA" />
            {[0, 6, 60, 120].map(value => <text key={value} x={20 + value * 320 / 120} y={value === 6 ? 15 : 62} textAnchor="middle" fill="#F7F4EE" fontSize="12">{value}</text>)}
          </svg>
          <p className="text-xs leading-relaxed text-[#CBD5E1]">Also requires at least 36 legal balls played and 2–8 wickets remaining. First innings: scoring rate at/below historical Q25 with at most 6 wickets remaining, or death phase with at most 4. Chase: required rate above historical Q70. Historical cells require 100 events across 10 matches.</p>
        </div>
        <div className="border border-[#0A1128]/15 p-4 sm:p-5 bg-[#F7F4EE]">
          <p className="font-mono-tabular text-xs uppercase flex gap-2"><Scale size={16} /> Role-specific context adjustment</p>
          <p className="font-mono-tabular text-xs mt-4">Residual = observed runs − context-expected runs</p>
          <p className="text-sm mt-3">Batting: 100 × supported residual runs ÷ supported balls faced.</p>
          <p className="text-sm mt-2">Bowling: −6 × supported residual runs ÷ supported legal balls.</p>
          <p className="text-xs text-[#475569] mt-3">These adjusted rates feed the shrunk pressure score; wickets are reported separately. Match-bootstrap uncertainty uses 1,000 replicates and seed 7007. Missing statistical values remain unavailable, not zero.</p>
        </div>
      </div>
      <div className="overflow-x-auto border border-[#0A1128]/15">
        <table className="w-full text-xs text-left"><caption className="text-left p-3 font-mono-tabular font-bold">Evidence gates · all conditions in each row must hold</caption>
          <thead className="bg-[#0A1128] text-[#F7F4EE]"><tr>{['Tier', 'Exposures', 'Matches', '95% CI half-width: batting / bowling'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
          <tbody>{[['Strong', '≥60', '≥8', '≤25 / ≤1.5'], ['Moderate', '≥30', '≥5', '≤40 / ≤2.5'], ['Limited', '≥12', '≥3', 'No precision gate; inspect uncertainty']].map(row => <tr key={row[0]} className="border-t border-[#0A1128]/10">{row.map(cell => <td key={cell} className="p-3">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="text-xs text-[#475569] flex gap-2"><ShieldCheck size={18} className="shrink-0" />Below these gates, evidence is insufficient. A numerical rank does not establish certainty, auction suitability or eligibility. Historical context gaps and the retained partially-supported-context bootstrap limitation still apply.</p>
      {showBackendDetails && <details className="text-xs text-[#475569]"><summary className="cursor-pointer font-mono-tabular">Backend methodology and limitations</summary>
        {methodology ? <div className="space-y-2 mt-3"><p>{methodology.description}</p><p>{methodology.pressure}</p><p>{methodology.scores}</p><p>{methodology.evidence}</p><ul className="list-disc pl-5">{methodology.limitations.map(text => <li key={text}>{text}</li>)}</ul></div> : <p className="mt-3">Backend methodology is loading or unavailable. The diagram describes the recovered Phase 7A method; upload and analysis require a backend connection.</p>}
      </details>}
    </section>
  );
}
