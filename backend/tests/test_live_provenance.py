"""Optional local source checks. No proprietary fixture files enter this repository."""
import ast
import hashlib
import importlib
import io
import os
from pathlib import Path
import sys
import unittest
import zipfile

import pandas as pd

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from integration_api.live_console import inspect_csv
from integration_api.live_pipeline import analyze


@unittest.skipUnless(os.environ.get('STRATA_ORIGINAL_WORKSPACE'),'Original analytics workspace required')
class ProvenanceTests(unittest.TestCase):
    def test_recovered_function_bodies_equal_originals(self):
        root=Path(os.environ['STRATA_ORIGINAL_WORKSPACE'])/'analytics'
        recovered=Path(__file__).resolve().parents[1]/'integration_api/recovered'
        for name in ['event_contract','ingest','validation','state','pressure_experiments','phase7a']:
            original=ast.parse((root/(name+'.py')).read_text(encoding='utf-8-sig'))
            copied=ast.parse((recovered/(name+'.py')).read_text(encoding='utf-8-sig'))
            originals={n.name:ast.dump(n,include_attributes=False) for n in original.body if isinstance(n,(ast.FunctionDef,ast.ClassDef))}
            for n in copied.body:
                if isinstance(n,(ast.FunctionDef,ast.ClassDef)):
                    self.assertEqual(ast.dump(n,include_attributes=False),originals[n.name],name+'.'+n.name)

    @unittest.skipUnless(os.environ.get('STRATA_ORIGINAL_ZIP'),'Original ZIP required')
    def test_real_subset_against_original_functions_and_protected_hashes(self):
        root=Path(os.environ['STRATA_ORIGINAL_WORKSPACE'])
        archive=Path(os.environ['STRATA_ORIGINAL_ZIP'])
        sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
        before=sha(archive)
        self.assertEqual(before,'82da62e94840e614ef136f0bb24168fe72b567c3eff71bf6b58488ac9b2b7f7d')
        saved=pd.read_csv(root/'runs/phase7a_v2_a/classified_event_evidence.csv.gz',low_memory=False)
        saved=saved[saved.competition_group.eq('IPL')]
        ids=set(saved.loc[saved.match_date.lt('2024-01-01'),'match_id'].unique()[:10])|set(saved.loc[saved.match_date.ge('2024-01-01'),'match_id'].unique()[:10])
        with zipfile.ZipFile(archive) as z:
            data={Path(n).stem:pd.read_csv(z.open(n),dtype=str,keep_default_na=False) for n in z.namelist() if n.endswith('.csv') and '__MACOSX' not in n}
        for t in ['matches','ball_by_ball','playing_eleven']:
            data[t]=data[t][data[t].match_id.astype(int).isin(ids)]
        comps=set(data['matches'].comp_id)
        for t in ['competitions','teams','competition_team_player_mapping']:
            data[t]=data[t][data[t].comp_id.isin(comps)]
        raw={t:inspect_csv(frame.to_csv(index=False).encode(),t)[1] for t,frame in data.items()}
        result,evidence=analyze(raw,lambda _:None)
        self.assertEqual(result['status'],'complete')
        sys.path.insert(0,str(root))
        original=importlib.import_module('analytics.phase7a')
        from analytics.validation import validate_tables
        from analytics.event_contract import normalize_event
        from analytics.state import reconstruct
        from analytics.pressure_experiments import entry_roles
        typed,issues,_,_,aliases=validate_tables(raw)
        b=raw['ball_by_ball']
        events=pd.concat([b.reset_index(drop=True),pd.DataFrame([normalize_event(r) for r in b.to_dict('records')])],axis=1)
        events['relationship_valid']=~events.source_record_number.isin(issues.loc[issues.table.eq('ball_by_ball'),'source_record_number'])
        # Match the original CSV serialization boundary without changing source files.
        events=pd.read_csv(io.StringIO(events.to_csv(index=False)),low_memory=False)
        states,*_=reconstruct(events,typed['matches'],typed['competitions'])
        f=states[states.context_valid&states.innings.isin([1,2])&~states.terminal_before].merge(events[['source_record_number','n_striker_id','n_bowler_id','batter_runs','bowler_runs','ball_faced','legal_ball','dismissed_batter_id','bowler_wicket']],on='source_record_number',validate='one_to_one')
        f['striker_dismissed']=f.n_striker_id.eq(f.dismissed_batter_id)
        f=f.merge(entry_roles(events),on='source_record_number',validate='one_to_one')
        f=original.classify(f,original.thresholds(f))
        for role,actor in [('batting','n_striker_id'),('bowling','n_bowler_id')]:
            base=original.baseline(f.assign(player_id=f[actor]),role)
            pressure=base[base.rules_pressure.eq(True)]
            self.assertEqual(set(pressure.source_record_number),set(evidence[role].source_record_number))
            expected,_=original.shrink(original.summarize(pressure,role),role)
            expected['evidence_order']=expected.evidence_level.map({'strong':0,'moderate':1,'limited':2,'insufficient':3})
            expected=expected.sort_values(['evidence_order','pressure_score','player_id'],ascending=[True,False,True])
            self.assertEqual([r['player_id'] for r in result['rankings'][role]],expected.player_id.tolist())
            got=pd.DataFrame(result['rankings'][role]).set_index('player_id').sort_index()
            expected=expected.set_index('player_id').sort_index()
            for col in ['exposures','matches','rate','adjusted_rate','pressure_score','ci95_low','ci95_high','context_coverage']:
                pd.testing.assert_series_equal(got[col].astype(float),expected[col].astype(float),check_names=False,check_index_type=False,atol=1e-8,rtol=1e-8)
        self.assertEqual(sha(archive),before)


if __name__=='__main__': unittest.main()
