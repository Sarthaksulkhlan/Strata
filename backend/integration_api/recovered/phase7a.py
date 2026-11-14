import numpy as np
import pandas as pd

TRAIN_END='2024-01-01'

EVAL_START='2024-01-01'

SEED=7007

def rate(n,d,s): return n/d*s if d else np.nan

def thresholds(f):
    """Early-season, competition/innings/phase quantiles; minimum 100 events/10 matches."""
    t=f[f.match_date.lt(TRAIN_END)].copy(); t['score_rate']=6*t.score_before/t.legal_balls_before.replace(0,np.nan)
    rows=[]
    for key,g in t.groupby(['competition_group','innings','innings_phase'],sort=True):
        ok=len(g)>=100 and g.match_id.nunique()>=10
        rows.append(dict(zip(['competition_group','innings','innings_phase'],key), support=ok,
          events=len(g),matches=g.match_id.nunique(), score_q25=g.score_rate.quantile(.25) if ok else np.nan,
          rule_rrr_q70=g.required_rate.quantile(.70) if ok and key[1]==2 else np.nan,
          rule_rrr_q75=g.required_rate.quantile(.75) if ok and key[1]==2 else np.nan))
    return pd.DataFrame(rows)

def classify(f, t):
    f=f.merge(t,on=['competition_group','innings','innings_phase'],how='left',validate='many_to_one')
    f['score_rate']=6*f.score_before/f.legal_balls_before.replace(0,np.nan)
    window=f.legal_balls_before.ge(36)&f.balls_remaining.between(6,60)&f.wickets_remaining.between(2,8)
    first=window&f.innings.eq(1)&f.support&((f.score_rate.le(f.score_q25)&f.wickets_remaining.le(6)) | (f.innings_phase.eq('death')&f.wickets_remaining.le(4)))
    chase=window&f.innings.eq(2)&f.support&f.required_rate.gt(f.rule_rrr_q70)
    f['rules_pressure']=pd.Series(pd.NA,index=f.index,dtype='boolean')
    f.loc[f.match_date.ge(EVAL_START)&f.support,'rules_pressure']=False
    f.loc[(first|chase)&f.match_date.ge(EVAL_START),'rules_pressure']=True
    f['rules_reason']=np.select([first,chase],['first_recovery_or_late_resource_constraint','chase_historical_rrr_q70'],default='not_labelled')
    # Sensitivities deliberately change only one predeclared boundary.
    f['rules_q75']=pd.Series(pd.NA,index=f.index,dtype='boolean'); f.loc[f.match_date.ge(EVAL_START)&f.support,'rules_q75']=False; f.loc[(first|(window&f.innings.eq(2)&f.support&f.required_rate.gt(f.rule_rrr_q75)))&f.match_date.ge(EVAL_START),'rules_q75']=True
    f['rules_wider']=pd.Series(pd.NA,index=f.index,dtype='boolean'); wider=f.legal_balls_before.ge(30)&f.balls_remaining.between(6,72)&f.wickets_remaining.between(2,8); f.loc[f.match_date.ge(EVAL_START)&f.support,'rules_wider']=False; f.loc[((wider&f.innings.eq(1)&((f.score_rate.le(f.score_q25)&f.wickets_remaining.le(6))|(f.innings_phase.eq('death')&f.wickets_remaining.le(4))))|(wider&f.innings.eq(2)&f.required_rate.gt(f.rule_rrr_q70)))&f.match_date.ge(EVAL_START),'rules_wider']=True
    return f

def baseline(f, role):
    f=f.copy(); f['exposure']=f['ball_faced' if role=='batting' else 'legal_ball'].astype(int); f['runs']=f['batter_runs' if role=='batting' else 'bowler_runs'].astype(float)
    f['wickets']=f['striker_dismissed' if role=='batting' else 'bowler_wicket'].astype(int)
    f['role_context']=f['arrival_role'] if role=='batting' else f['innings_phase']
    keys=['competition_group','innings','innings_phase','role_context','exposure']
    tr=f[f.match_date.lt(TRAIN_END)]; a=tr.groupby(keys).agg(expected=('runs','mean'),n=('runs','size'),m=('match_id','nunique')).reset_index(); a=a[(a.n>=100)&(a.m>=10)]
    f=f.merge(a[keys+['expected']],on=keys,how='left',validate='many_to_one'); f['residual']=f.runs-f.expected
    return f

def summarize(f, role):
    scale=100 if role=='batting' else -6; rows=[]
    for player,g in f.groupby('player_id',sort=True):
        supported=g[g.expected.notna()]; ex=g.exposure.sum(); matches=g.match_id.nunique()
        raw=rate(g.runs.sum(),ex,scale); adjusted=rate(supported.residual.sum(),supported.exposure.sum(),scale)
        per=g.groupby('match_id')[['residual','exposure']].sum(); vals=per.residual/per.exposure.replace(0,np.nan)*scale
        lo=hi=np.nan
        if len(per)>=2:
            x=per[['residual','exposure']].to_numpy(); rng=np.random.default_rng(SEED); z=x[rng.integers(0,len(x),(1000,len(x)))].sum(1); v=z[:,0]/z[:,1]*scale; lo,hi=np.quantile(v,[.025,.975])
        rows.append(dict(player_id=player, exposures=int(ex),matches=matches,seasons=g.match_date.str[:4].nunique(),runs=g.runs.sum(),wickets=int(g.wickets.sum()),rate=raw,adjusted_rate=adjusted,context_coverage=len(supported)/len(g)*100,ci95_low=lo,ci95_high=hi,match_rate_sd=vals.std(),source_records=';'.join(map(str,sorted(g.source_record_number)))))
    return pd.DataFrame(rows)

def shrink(x, role):
    scale=100 if role=='batting' else -6; good=x[x.adjusted_rate.notna()].copy(); center=good.adjusted_rate.mean(); tau=max(0.,good.adjusted_rate.var()-((good.ci95_high-good.ci95_low)/3.92).pow(2).mean())
    noise=((good.ci95_high-good.ci95_low)/3.92).pow(2); good['shrink_weight']=tau/(tau+noise); good['pressure_score']=center+good.shrink_weight.fillna(0)*(good.adjusted_rate-center)
    good['ci_half_width']=(good.ci95_high-good.ci95_low)/2
    main=25 if role=='batting' else 1.5; moderate=40 if role=='batting' else 2.5
    good['evidence_level']=np.select([(good.exposures>=60)&(good.matches>=8)&(good.ci_half_width<=main),(good.exposures>=30)&(good.matches>=5)&(good.ci_half_width<=moderate),(good.exposures>=12)&(good.matches>=3)],['strong','moderate','limited'],default='insufficient')
    return good,dict(prior_center=center,prior_variance=tau,role=role)
