"""Invented cricket records for tests only; never shipped as user results."""
import pandas as pd


def fixture(training=10, evaluation=8):
    balls, matches, eleven = [], [], []
    for mid in range(1, training+evaluation+1):
        early = mid <= training
        runs = 1 if early else 2
        matches.append(dict(match_id=mid,comp_id=1,match_date='2023-05-01' if early else '2024-05-01',
            home_team_id=1,away_team_id=2,toss_win_team_id=1,win_team_id=1,
            result=f'Alpha Won by {120*runs} runs',first_inn_revised_overs='',second_inn_revised_overs='',revised_target=''))
        for team in (1,2):
            for n in range(1,5):
                eleven.append(dict(match_id=mid,team_id=team,player_id=team*100+n,batting_order=n,
                    is_played='true',is_captain='false',is_wk='false',is_impact='false',is_impact_off='false'))
        for inn in (1,2):
            for i in range(120):
                batter=inn*100+(1 if i<10 else 2 if i<20 else 3)
                wicket=i in (9,19)
                balls.append(dict(match_id=mid,innings=inn,overid=i//6+1,over_ball_num=i%6+1,
                    innings_ball_num=i+1,batting_team_id=inn,bowling_team_id=3-inn,striker_id=batter,
                    non_striker_id=inn*100+4,bowler_id=(3-inn)*100+1,striker_name=f'Test {batter}',
                    non_striker_name=f'Test {inn*100+4}',bowler_name=f'Test {(3-inn)*100+1}',
                    runs=runs if inn==1 else 0,extras_type='None',extras1_runs=0,extras_2_runs=0,
                    is_wicket=str(wicket).lower(),dismissal_type_id=1 if wicket else '',
                    dismissed_player_id=batter if wicket else '',dismissal_type='Bowled' if wicket else '',
                    is_four='false',is_six='false'))
    return {k:pd.DataFrame(v).to_csv(index=False).encode() for k,v in {
        'ball_by_ball':balls, 'matches':matches, 'playing_eleven':eleven,
        'competitions':[dict(comp_id=1,comp_name='IPL Test',match_format='T20')],
        'teams':[dict(comp_id=1,team_id=t,team_name=n) for t,n in [(1,'Alpha'),(2,'Beta')]],
        'competition_team_player_mapping':[dict(comp_id=1,comp_name='IPL Test',team_id=t,team_name=n,
            player_id=t*100+i,player_name=f'Test {t*100+i}') for t,n in [(1,'Alpha'),(2,'Beta')] for i in range(1,5)],
    }.items()}
