import type { Ranking, Role } from './clutchiq';

// Approved public aggregate fields only. Update explicitly when the approved release changes.
export const approvedRankings: Record<Role, Ranking[]> = {
  "batting": [
    {
      "pressure_score": 7.32870459259289,
      "rate": 151.08695652173913,
      "adjusted_rate": 8.07147437850214,
      "runs": 139.0,
      "context_coverage": 95.83333333333334,
      "shrink_weight": 0.9652750394109384,
      "rank": 1,
      "exposures": 92,
      "matches": 9,
      "seasons": 3,
      "wickets": 4,
      "player": {
        "id": 152,
        "name": "Ravindra Jadeja"
      },
      "role": "batting",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": -14.133794083661105,
        "ci95_high": 31.243504227466996,
        "ci_half_width": 22.68864915556405,
        "match_rate_sd": 61.057302349426685
      },
      "evidence_level": "strong",
      "source_record_count": 96,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 37.96254324327474,
      "rate": 181.8181818181818,
      "adjusted_rate": 42.718505238241455,
      "runs": 140.0,
      "context_coverage": 96.25,
      "shrink_weight": 0.915128355560124,
      "rank": 2,
      "exposures": 77,
      "matches": 5,
      "seasons": 2,
      "wickets": 2,
      "player": {
        "id": 6460,
        "name": "Ayush Badoni"
      },
      "role": "batting",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": -10.634079216145055,
        "ci95_high": 62.22498597502474,
        "ci_half_width": 36.429532595584895,
        "match_rate_sd": 63.483257890880935
      },
      "evidence_level": "moderate",
      "source_record_count": 80,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 36.83658746742627,
      "rate": 174.02597402597402,
      "adjusted_rate": 40.58860997516695,
      "runs": 134.0,
      "context_coverage": 96.25,
      "shrink_weight": 0.9303985141145444,
      "rank": 3,
      "exposures": 77,
      "matches": 8,
      "seasons": 3,
      "wickets": 5,
      "player": {
        "id": 4260,
        "name": "Heinrich Klaasen"
      },
      "role": "batting",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": 4.0293303279946375,
        "ci95_high": 69.46552624223966,
        "ci_half_width": 32.71809795712251,
        "match_rate_sd": 116.26886142273136
      },
      "evidence_level": "moderate",
      "source_record_count": 80,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 19.308498386126622,
      "rate": 157.42574257425744,
      "adjusted_rate": 22.25646572494028,
      "runs": 159.0,
      "context_coverage": 96.1904761904762,
      "shrink_weight": 0.9171339090428544,
      "rank": 4,
      "exposures": 101,
      "matches": 7,
      "seasons": 3,
      "wickets": 4,
      "player": {
        "id": 2984,
        "name": "Sikandar Raza"
      },
      "role": "batting",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": -19.15498988429983,
        "ci95_high": 52.75932431270145,
        "ci_half_width": 35.957157098500645,
        "match_rate_sd": 39.6335342145564
      },
      "evidence_level": "moderate",
      "source_record_count": 105,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 18.40868358578529,
      "rate": 149.31506849315068,
      "adjusted_rate": 21.929039013378105,
      "runs": 109.0,
      "context_coverage": 97.33333333333334,
      "shrink_weight": 0.900125095625017,
      "rank": 5,
      "exposures": 73,
      "matches": 9,
      "seasons": 3,
      "wickets": 4,
      "player": {
        "id": 4101,
        "name": "Mitchell Santner"
      },
      "role": "batting",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": -17.829951697186672,
        "ci95_high": 61.86302440366044,
        "ci_half_width": 39.84648805042356,
        "match_rate_sd": 93.42226630424491
      },
      "evidence_level": "moderate",
      "source_record_count": 75,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 18.36246852823461,
      "rate": 149.39759036144576,
      "adjusted_rate": 21.469452817804143,
      "runs": 124.0,
      "context_coverage": 96.51162790697676,
      "shrink_weight": 0.9106882025208084,
      "rank": 6,
      "exposures": 83,
      "matches": 8,
      "seasons": 3,
      "wickets": 4,
      "player": {
        "id": 7897,
        "name": "Namboori Tilak Varma"
      },
      "role": "batting",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": -20.144375840215243,
        "ci95_high": 54.77822625091532,
        "ci_half_width": 37.46130104556528,
        "match_rate_sd": 105.35988006142792
      },
      "evidence_level": "moderate",
      "source_record_count": 86,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 12.091104508822584,
      "rate": 134.5679012345679,
      "adjusted_rate": 13.936937332497182,
      "runs": 109.0,
      "context_coverage": 92.04545454545456,
      "shrink_weight": 0.9322767985219236,
      "rank": 7,
      "exposures": 81,
      "matches": 9,
      "seasons": 2,
      "wickets": 4,
      "player": {
        "id": 2490,
        "name": "Mohammad Nawaz"
      },
      "role": "batting",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": -24.343820758550784,
        "ci95_high": 40.138341866051086,
        "ci_half_width": 32.241081312300935,
        "match_rate_sd": 60.7886550030485
      },
      "evidence_level": "moderate",
      "source_record_count": 88,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 11.14431749398986,
      "rate": 141.11111111111111,
      "adjusted_rate": 12.381389762885377,
      "runs": 127.0,
      "context_coverage": 96.7741935483871,
      "shrink_weight": 0.9518648890589172,
      "rank": 8,
      "exposures": 90,
      "matches": 7,
      "seasons": 3,
      "wickets": 4,
      "player": {
        "id": 4986,
        "name": "Rovman Powell"
      },
      "role": "batting",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": -10.21587378726475,
        "ci95_high": 43.5846652850519,
        "ci_half_width": 26.900269536158323,
        "match_rate_sd": 67.15369566519553
      },
      "evidence_level": "moderate",
      "source_record_count": 93,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 10.212159292437956,
      "rate": 126.82926829268293,
      "adjusted_rate": 12.547624581776512,
      "runs": 52.0,
      "context_coverage": 100.0,
      "shrink_weight": 0.9097098800792563,
      "rank": 9,
      "exposures": 41,
      "matches": 5,
      "seasons": 3,
      "wickets": 4,
      "player": {
        "id": 21790,
        "name": "Tashinga Musekiwa"
      },
      "role": "batting",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": -18.169768693844212,
        "ci95_high": 57.202563167314565,
        "ci_half_width": 37.68616593057939,
        "match_rate_sd": 126.65651908556237
      },
      "evidence_level": "moderate",
      "source_record_count": 41,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 9.757076186396011,
      "rate": 134.48275862068965,
      "adjusted_rate": 10.42763428996936,
      "runs": 78.0,
      "context_coverage": 95.08196721311477,
      "shrink_weight": 0.97176150733712,
      "rank": 10,
      "exposures": 58,
      "matches": 5,
      "seasons": 2,
      "wickets": 3,
      "player": {
        "id": 20702,
        "name": "Tristan Stubbs"
      },
      "role": "batting",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": -18.352229780801217,
        "ci95_high": 22.431242803571894,
        "ci_half_width": 20.39173629218656,
        "match_rate_sd": 29.8642118172909
      },
      "evidence_level": "moderate",
      "source_record_count": 61,
      "review_status": "phase_7b_reviewed"
    }
  ],
  "bowling": [
    {
      "pressure_score": 3.72506375775122,
      "rate": -4.578947368421053,
      "adjusted_rate": 3.950921290051425,
      "runs": 29.0,
      "context_coverage": 97.43589743589745,
      "shrink_weight": 0.94742595911705,
      "rank": 1,
      "exposures": 38,
      "matches": 5,
      "seasons": 2,
      "wickets": 5,
      "player": {
        "id": 4692,
        "name": "Lockie Ferguson"
      },
      "role": "bowling",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": 2.2794420197938274,
        "ci95_high": 6.338070690616627,
        "ci_half_width": 2.0293143354114,
        "match_rate_sd": 2.0301066828874594
      },
      "evidence_level": "moderate",
      "source_record_count": 39,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 3.52776551047648,
      "rate": -4.714285714285714,
      "adjusted_rate": 3.736400594601615,
      "runs": 55.0,
      "context_coverage": 100.0,
      "shrink_weight": 0.9488823534978134,
      "rank": 2,
      "exposures": 70,
      "matches": 7,
      "seasons": 3,
      "wickets": 6,
      "player": {
        "id": 781,
        "name": "Sunil Narine"
      },
      "role": "bowling",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": 1.5627919578689555,
        "ci95_high": 5.561737775760076,
        "ci_half_width": 1.99947290894556,
        "match_rate_sd": 3.316902789315109
      },
      "evidence_level": "moderate",
      "source_record_count": 70,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 3.400153937736187,
      "rate": -4.199999999999999,
      "adjusted_rate": 3.4761009759504136,
      "runs": 21.0,
      "context_coverage": 100.0,
      "shrink_weight": 0.9801246600857756,
      "rank": 3,
      "exposures": 30,
      "matches": 5,
      "seasons": 3,
      "wickets": 0,
      "player": {
        "id": 2417,
        "name": "Akeal Hosein"
      },
      "role": "bowling",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": 2.2874470511567284,
        "ci95_high": 4.7409292088325685,
        "ci_half_width": 1.22674107883792,
        "match_rate_sd": 1.571748245085284
      },
      "evidence_level": "moderate",
      "source_record_count": 31,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 3.116880538228439,
      "rate": -5.2727272727272725,
      "adjusted_rate": 3.331680121198822,
      "runs": 58.0,
      "context_coverage": 98.55072463768116,
      "shrink_weight": 0.941578928333457,
      "rank": 4,
      "exposures": 66,
      "matches": 8,
      "seasons": 2,
      "wickets": 8,
      "player": {
        "id": 2633,
        "name": "Jason Holder"
      },
      "role": "bowling",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": 1.38694663095603,
        "ci95_high": 5.6785805984341176,
        "ci_half_width": 2.145816983739044,
        "match_rate_sd": 3.1204983812317844
      },
      "evidence_level": "moderate",
      "source_record_count": 69,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 2.846384663882493,
      "rate": -6.085106382978724,
      "adjusted_rate": 2.958648119583426,
      "runs": 143.0,
      "context_coverage": 97.27891156462584,
      "shrink_weight": 0.9660190399329526,
      "rank": 5,
      "exposures": 141,
      "matches": 14,
      "seasons": 2,
      "wickets": 12,
      "player": {
        "id": 4373,
        "name": "Mustafizur Rahman"
      },
      "role": "bowling",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": 1.3168544897137682,
        "ci95_high": 4.548258495555102,
        "ci_half_width": 1.615702002920667,
        "match_rate_sd": 5.475591718387873
      },
      "evidence_level": "moderate",
      "source_record_count": 147,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 2.5530114655344747,
      "rate": -5.324999999999999,
      "adjusted_rate": 2.68001366950015,
      "runs": 71.0,
      "context_coverage": 100.0,
      "shrink_weight": 0.95801693796135,
      "rank": 6,
      "exposures": 80,
      "matches": 10,
      "seasons": 3,
      "wickets": 7,
      "player": {
        "id": 5979,
        "name": "Abrar Ahmed"
      },
      "role": "bowling",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": 0.7186520032508046,
        "ci95_high": 4.325407823661159,
        "ci_half_width": 1.8033779102051768,
        "match_rate_sd": 5.117589892916517
      },
      "evidence_level": "moderate",
      "source_record_count": 80,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 2.2881365400686127,
      "rate": -6.9375,
      "adjusted_rate": 2.4236386538276298,
      "runs": 148.0,
      "context_coverage": 94.48275862068964,
      "shrink_weight": 0.9510594237469514,
      "rank": 7,
      "exposures": 128,
      "matches": 13,
      "seasons": 3,
      "wickets": 11,
      "player": {
        "id": 8661,
        "name": "Matheesha Pathirana"
      },
      "role": "bowling",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": 0.505347260771952,
        "ci95_high": 4.413729152663279,
        "ci_half_width": 1.954190945945664,
        "match_rate_sd": 3.392911745217285
      },
      "evidence_level": "moderate",
      "source_record_count": 145,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 2.2711774014580355,
      "rate": -7.263157894736842,
      "adjusted_rate": 2.4017867075627097,
      "runs": 69.0,
      "context_coverage": 100.0,
      "shrink_weight": 0.9524513285990158,
      "rank": 8,
      "exposures": 57,
      "matches": 11,
      "seasons": 3,
      "wickets": 6,
      "player": {
        "id": 5944,
        "name": "Mohammed Siraj"
      },
      "role": "bowling",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": 0.4839766702356683,
        "ci95_high": 4.333563120060839,
        "ci_half_width": 1.9247932249125852,
        "match_rate_sd": 3.086185367673289
      },
      "evidence_level": "moderate",
      "source_record_count": 60,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 2.2612304861146573,
      "rate": -6.640000000000001,
      "adjusted_rate": 2.4514848108906224,
      "runs": 83.0,
      "context_coverage": 97.43589743589745,
      "shrink_weight": 0.931968277631964,
      "rank": 9,
      "exposures": 75,
      "matches": 9,
      "seasons": 3,
      "wickets": 6,
      "player": {
        "id": 2382,
        "name": "Jamie Overton"
      },
      "role": "bowling",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": 0.3631344120709781,
        "ci95_high": 5.018153303321275,
        "ci_half_width": 2.3275094456251484,
        "match_rate_sd": 3.6645665872014046
      },
      "evidence_level": "moderate",
      "source_record_count": 78,
      "review_status": "phase_7b_reviewed"
    },
    {
      "pressure_score": 2.234199006099609,
      "rate": -5.678571428571429,
      "adjusted_rate": 2.435388782988774,
      "runs": 53.0,
      "context_coverage": 100.0,
      "shrink_weight": 0.9276414737076978,
      "rank": 10,
      "exposures": 56,
      "matches": 8,
      "seasons": 3,
      "wickets": 2,
      "player": {
        "id": 4101,
        "name": "Mitchell Santner"
      },
      "role": "bowling",
      "definition": "rules_pressure",
      "uncertainty": {
        "ci95_low": -0.5384116977646918,
        "ci95_high": 4.273537766925101,
        "ci_half_width": 2.4059747323448963,
        "match_rate_sd": 6.115905081757952
      },
      "evidence_level": "moderate",
      "source_record_count": 56,
      "review_status": "phase_7b_reviewed"
    }
  ]
};
