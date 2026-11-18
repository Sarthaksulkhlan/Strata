# STRATA: evidence for Rajasthan Royals
## Three-minute presentation | target 2:58

Speak only the quoted narration. Directions and evidence notes are not spoken.
365 spoken words: about 2:42 at 135 words/minute, plus 16 seconds for screen transitions. Rehearse to 2:58; this is an estimate, not a measured recording.

### 0:00-0:18 | The selection problem
**Screen/action:** Live landing page; hold on STRATA title, then scroll toward Rankings.
**Judges should understand:** The project connects match pressure with player evaluation.
**Narration:** "When Rajasthan Royals assess players for 2027, season averages are only the starting point. Who contributes when the game becomes difficult, and how much evidence supports that judgement? I built STRATA to make those questions inspectable."
**Transition:** Follow the Rankings navigation anchor.

### 0:18-0:35 | Platform and data
**Screen/action:** Show the ranking overview and its batting and bowling tables.
**Judges should understand:** Published rankings and uploaded analyses are separate.
**Narration:** "STRATA analyses six connected cricket tables, including a source pack of 200,999 deliveries. It brings reviewed batting and bowling rankings, player evidence and methodology into one interface. Uploaded analyses stay separate from the approved production results."
**Transition:** Focus the batting table and use View Batsmen, then hover or focus Ravindra Jadeja's ranking row to reveal player evidence.

### 0:35-1:17 | Actual selection evidence
**Screen/action:** Highlight Jadeja at batting rank 1: 92 exposures, nine matches, strong evidence. Show Ayush Badoni at rank 2: 77 exposures, five matches, moderate. Use View Bowlers and hover or focus Lockie Ferguson at bowling rank 1: 38 legal-ball exposures, five matches, moderate; open his evidence.
**Judges should understand:** Evidence tier takes precedence over score; samples matter.
**Narration:** "Ravindra Jadeja leads our batting list with 92 pressure balls across nine matches and strong evidence. Ayush Badoni is second: 77 balls, five matches and moderate evidence. His pressure score is higher, but STRATA ranks evidence tier first. Neither batting interval rules out zero improvement. Lockie Ferguson leads bowling with 38 legal balls across five matches. His adjusted improvement is about four runs per six balls, with an interval of 2.28 to 6.34. That is promising, but still moderate evidence from a small sample."
**Transition:** Click Methodology; carry the question 'why these results?' into the next screen.

### 1:17-1:48 | Why the method supports these decisions
**Screen/action:** Methodology: show the six-table cards and pressure diagram, then Scores & uncertainty. Toggle batting/bowling.
**Judges should understand:** Context and uncertainty drive ordering, not invented weights.
**Narration:** "We join competitions, teams, matches, rosters, playing elevens and deliveries after validation. Pre-ball state identifies demanding chases and constrained first innings. Historical context is trained before 2024. Batting rewards runs above expectation; bowling rewards conceding fewer. Match resampling estimates uncertainty, and shrinkage tempers noisy scores. Evidence tier comes before score, then player ID resolves ties. Analytical qualification does not establish auction eligibility."
**Transition:** Return to the landing navigation and click Open Live Console.

### 1:48-2:15 | Honest Console demonstration
**Screen/action:** Show all six required CSV slots/cards. Use only an authorized small valid six-table pack within live limits. Show actual validation messages. If no pack is available, show the empty slots and schema requirements. Do not claim a run started or completed. If a real job completes, show its progress/results; otherwise remain on validation throughout this narration.
**Judges should understand:** This is an implemented workflow, with a truthful demonstration boundary.
**Narration:** "The Console checks all six uploads before analysis. Here are the required tables and validation feedback. A valid job reports real processing stages, then exposes rankings and supporting evidence. Today I am demonstrating the validation workflow, not claiming a completed full-pack cloud run. Sessions are temporary, and incomplete uploads cannot generate rankings."
**Transition:** Return to the approved ranking tables, not uncompleted uploaded results.

### 2:15-2:43 | What Rajasthan Royals can do with this evidence
**Screen/action:** Show Jadeja and Badoni in batting, then Ferguson in bowling. Highlight evidence labels rather than implying transfer availability.
**Judges should understand:** These are role-relevant scouting leads, not a fabricated shopping list.
**Narration:** "For Royals, Jadeja and Badoni provide contrasting batting-depth research leads: stronger sample support versus a higher estimated upside with more uncertainty. Ferguson supplies a bowling run-containment lead for difficult situations. These are questions for scouting, not instructions to buy. Availability, retention, fitness, price, roster rules and the team's actual needs must be checked separately before any auction recommendation."
**Transition:** Hold on player evidence, then finish on the STRATA title.

### 2:43-2:58 | Closing
**Screen/action:** Hold the evidence panel for the first sentence, then return to the title.
**Judges should understand:** STRATA supports evidence-led judgement.
**Narration:** "STRATA gives Rajasthan Royals a disciplined starting point: who stands out under pressure, how much to trust the signal, and what still needs checking. Better auction decisions start with evidence behind the name, not season averages alone."

## Verified speaker reference: do not read aloud

Source: approved phase7a_v2_a batting/top_10.csv.gz and bowling/top_10.csv.gz,
primary rules_pressure definition; cross-checked against public ranking responses.
No source-record identifiers are included in this presentation.

| Player | Role/rank | Exposures / matches | Tier | Shrunk score | Adjusted rate | Adjusted-rate 95% interval |
|---|---|---|---|---|---|---|
| Ravindra Jadeja | Batting 1 | 92 / 9 | strong | 7.3287 | 8.0715 | -14.1338 to 31.2435 |
| Ayush Badoni | Batting 2 | 77 / 5 | moderate | 37.9625 | 42.7185 | -10.6341 to 62.2250 |
| Lockie Ferguson | Bowling 1 | 38 / 5 | moderate | 3.7251 | 3.9509 | 2.2794 to 6.3381 |

Batting units: runs per 100 balls above supported expectation. Bowling units:
negatively signed residual runs per six legal balls; positive means fewer runs
conceded than expected. Intervals refer to adjusted rates, NOT shrunk scores.
Jadeja has 96 supporting records; Badoni 80; Ferguson 39. These are not exposures.
Strong is an evidence classification, not proof of positive skill or rank certainty.
Potential RR contributions are conditional scouting interpretations from these
role-specific metrics. No current squad gap, retention, price, availability,
IPL eligibility or specialist phase skill has been established here.

## Methodology detail for judge questions

Primary window: at least 36 legal balls played, 6-60 remaining and 2-8 wickets
remaining. First innings: scoring rate at/below historical Q25 with at most six
wickets remaining, or death phase with at most four. Chase: required rate above
historical Q70. Historical cells need 100 events and 10 matches. Evaluation is
2024 onward. Strong evidence: 60 exposures/8 matches and interval half-width
at most 25 batting or 1.5 bowling. Moderate: 30/5 and 40/2.5. Limited: 12/3.
Bootstrap uses 1,000 match resamples, seed 7007; empirical-Bayes shrinkage uses
estimated uncertainty. Unsupported statistics remain null.

The official Unstop page was opened but its Round 1 text was not extractable.
This script follows the requested three-minute format; independently check the
submission portal's current duration, upload and disclosure requirements.
