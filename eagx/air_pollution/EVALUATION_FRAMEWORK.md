# Delhi Air Pollution TTX - Comprehensive Evaluation Framework

## Overview

This document outlines the evaluation strategy for the Delhi Air Pollution tabletop exercise, covering model validation, game mechanics evaluation, learning outcomes assessment, and comparative analysis of different TTX design variants.

---

## 1. Model Validation Metrics

### 1.1 Hybrid Automaton Validation

**Metrics:**
- **Regime Classification Accuracy**: Do predicted regimes match historical Delhi AQI classifications?
  - Test against 2019-2024 Delhi DPCC data
  - Target: >90% regime classification accuracy

- **Transition Timing**: Do regime transitions occur at realistic intervals?
  - Compare to historical GRAP activation patterns
  - Measure: Mean time in each regime vs. real data

- **Guard Condition Robustness**: Do threshold checks handle edge cases?
  - Test: AQI exactly at boundaries (100, 200, 300, 400)
  - Test: Rapid oscillations near thresholds

**Evaluation Methods:**
```python
# Historical validation
def validate_regime_classification():
    historical_aqi = load_delhi_aqi_2019_2024()
    model_regimes = [ha.get_regime(aqi) for aqi in historical_aqi]
    actual_grap_stages = load_grap_activations()

    accuracy = compare_classifications(model_regimes, actual_grap_stages)
    return accuracy  # Target: >0.9
```

### 1.2 System Dynamics Calibration

**Metrics:**
- **Emission Inventory Accuracy**: Do modeled emissions match SAFAR/IIT Delhi data?
  - Vehicular: 28% of total ±3%
  - Industry: 20% ±3%
  - Construction: 17% ±3%
  - Stubble burning: 26% ±5% (Oct-Nov)
  - Residential: 9% ±2%

- **Dispersion Realism**: Does PM2.5 accumulation/dispersal match observations?
  - R² > 0.7 for AQI time series prediction
  - Wind speed correlation with dispersion rate: |r| > 0.6
  - Rain event PM reduction: 70-90% within 24h

- **Health Impact Plausibility**: Do hospitalization rates align with epidemiology?
  - Compare to Delhi health burden studies
  - Excess PM2.5 → respiratory admissions: 0.8% per 10 μg/m³
  - Target: Within 95% CI of published exposure-response functions

**Evaluation Methods:**
```python
# Emissions calibration
def calibrate_emissions():
    real_emissions = load_safar_emission_inventory()
    model_emissions = sd.compute_emissions(baseline_policy, "pre_diwali")

    sector_shares = {
        'vehicular': model_emissions['vehicular'] / model_emissions['total'],
        'industry': model_emissions['industry'] / model_emissions['total'],
        # ...
    }

    errors = compare_distributions(sector_shares, real_emissions)
    return errors  # Target: <5% for each sector
```

### 1.3 Agent-Based Model Validation (When Implemented)

**Metrics:**
- **Behavioral Realism**: Do farmer burning decisions match survey data?
  - Subsidy elasticity: 50% subsidy → 30-40% reduction in burning
  - Social conformity: If 30% neighbors burn → cascade effect

- **Compliance Rates**: Do industries/citizens respond realistically?
  - Odd-even vehicle compliance: 50-70% (Delhi historical)
  - Construction ban compliance: 60-80% with enforcement

- **Emergence Validation**: Do aggregate patterns match real-world observations?
  - Spatial clustering of farm fires
  - Threshold effects in policy adoption

---

## 2. Game Mechanics Evaluation

### 2.1 Balance Metrics

**Objectives:**
- No single strategy dominates across all scenarios
- All player roles have meaningful agency
- Hidden objectives are achievable but require trade-offs

**Metrics:**
- **Role Win Rate**: What % of games does each role achieve hidden objective?
  - Target: 40-60% for all roles (prevents dominant/useless roles)

- **Action Diversity**: Are all available actions used across games?
  - Measure: % of action types selected at least once per 10 games
  - Target: >80% of actions used

- **Public vs Hidden Tension**: How often do hidden objectives conflict with public score?
  - Measure: Correlation between hidden score gains and public score changes
  - Target: -0.3 to -0.5 (moderate tension, not extreme)

### 2.2 Engagement Metrics

**From Playtesting:**
- **Subjective Engagement**: Post-game survey (1-5 scale)
  - Target mean: >4.0

- **Deliberation Quality**: Do players discuss trade-offs meaningfully?
  - Qualitative coding of deliberation transcripts
  - Code for: cost-benefit reasoning, systems thinking, ethical dilemmas

- **Decision Time**: How long does action selection take?
  - Target: 6-10 minutes (not too quick/not analysis paralysis)

### 2.3 Replayability

**Metrics:**
- **Scenario Variation**: How different are outcomes across playthroughs?
  - Measure: Variance in final AQI, public approval, win conditions
  - Target: High variance (not deterministic)

- **Player Learning**: Do experienced players perform better?
  - Compare first-time vs. repeat player outcomes
  - Expect: 10-20% better outcomes on 2nd+ play

---

## 3. Learning Outcomes Assessment

### 3.1 Knowledge Gains

**Pre/Post Test (10 questions):**
1. What % of Delhi pollution comes from stubble burning in Oct-Nov? (Baseline, Post)
2. How does temperature inversion affect AQI?
3. What is GRAP and when does it activate?
4. Main trade-off between farmer subsidies and vehicle restrictions?
5. Why does public alarm not always lead to policy change?

**Metrics:**
- **Knowledge Score Improvement**: Mean % correct pre → post
  - Target: +20 percentage points

- **Systems Thinking**: Open-ended question about feedback loops
  - Rubric: Identifies reinforcing loop (2 pts), balancing loop (2 pts), delays (1 pt)
  - Target: Mean score 3/5 → 4.5/5

### 3.2 Attitude Changes

**Survey Items (1-7 Likert):**
1. "Air pollution governance is primarily a technical problem." (Expect: decrease in agreement)
2. "Farmers are to blame for Delhi's air crisis." (Expect: decrease → understanding complexity)
3. "Coordination across stakeholders is crucial." (Expect: increase)
4. "Quick fixes (e.g., odd-even) are effective." (Expect: decrease → appreciation for long-term)

**Target:**
- Mean shift of 0.5-1.0 points toward nuanced understanding

### 3.3 Transfer of Learning

**Delayed Assessment (1 week later):**
- **Scenario Transfer**: Present a different air pollution scenario (Beijing, LA)
  - Do players apply Delhi insights?
  - Rubric: Mentions coordination (1pt), feedback loops (1pt), hidden incentives (1pt)

- **Policy Reasoning**: "Design a stubble burning reduction policy"
  - Rubric: Considers cost-effectiveness (2pt), compliance (2pt), equity (2pt), timing (1pt)
  - Target: Mean 5/7 points

---

## 4. Comparative Evaluation: TTX Design Variants

### 4.1 Variant A: Current Design (Multi-Model + LLM Narrative)

**Architecture:**
- Hybrid Automaton + System Dynamics + LLM narratives
- 5 rounds, hidden objectives, action points

**Evaluation:**
- Engagement: High (narrative richness)
- Learning: Moderate (some black-box confusion)
- Realism: High (formal models)
- Scalability: Moderate (LLM cost)

### 4.2 Variant B: Pure Formal Models (No LLM)

**Architecture:**
- Same models, but rule-based consequence generation
- Templated narratives, no GPT calls

**Hypothesis:**
- Engagement: Lower (less vivid)
- Learning: Higher (transparent causality)
- Realism: Same
- Scalability: High (no API costs)

**Test:**
- Run A/B test with 20 players per variant
- Compare engagement scores, learning gains, time-to-complete

### 4.3 Variant C: Simplified Model (System Dynamics Only)

**Architecture:**
- Only SD model, no regime switches
- Fewer roles (4 instead of 8)
- 3 rounds instead of 5

**Hypothesis:**
- Engagement: Lower (less complexity)
- Learning: Higher for novices (less overwhelming)
- Realism: Lower (misses threshold effects)
- Scalability: Highest

**Target Audience:** General public, students

### 4.4 Variant D: Game Theory Explicit Layer

**Architecture:**
- Add Nash equilibrium calculations
- Show Pareto frontier visualizations
- Explicit payoff matrices for key decisions

**Hypothesis:**
- Engagement: Mixed (appeals to analytical types)
- Learning: Higher for policy/econ students
- Realism: Moderate (assumes rationality)

**Test:**
- Compare with economics students vs. general audience

### 4.5 Variant E: LLM as Evolution Operator

**Architecture:**
- LLM doesn't just narrate—it adapts model parameters based on emergent gameplay
- Example: If players repeatedly ignore farmer subsidies, LLM increases burning propensity
- Formal models provide constraints, LLM provides adaptive dynamics

**Hypothesis:**
- Engagement: Highest (adaptive challenge)
- Learning: Moderate (harder to debug)
- Realism: Moderate (depends on LLM calibration)

---

## 5. Evaluation Protocols

### 5.1 Historical Validation

**Protocol:**
1. Load Delhi AQI daily data (Oct-Nov 2019, 2020, 2021, 2022, 2023)
2. For each year, extract:
   - Weather conditions (wind, rain, temperature)
   - Policy interventions (GRAP activations, odd-even dates)
   - Stubble burning hotspot counts (NASA FIRMS data)
3. Run model with these inputs
4. Compare predicted vs. actual AQI time series
5. Compute: R², RMSE, regime classification accuracy

**Passing Criteria:**
- R² > 0.7
- Regime accuracy > 85%
- RMSE < 50 AQI points

### 5.2 Expert Validation

**Protocol:**
1. Recruit 5-8 domain experts:
   - Delhi pollution control official
   - Air quality researcher
   - Farmer representative
   - Environmental economist
   - Public health specialist
2. Have them play the game
3. Survey: "On a scale 1-5, how realistic is..."
   - Emission dynamics
   - Policy effectiveness
   - Stakeholder behavior
   - Trade-offs presented
4. Target: Mean realism rating > 4.0

### 5.3 Playtesting Evaluation

**Sample:**
- N=30 participants minimum
- Mix of: policy students (10), engineers (10), general public (10)

**Data Collection:**
- Pre-game: Knowledge test + demographics
- During game: Video recording, action logs, deliberation transcripts
- Post-game: Knowledge test + engagement survey + systems thinking assessment

**Analysis:**
- Quantitative: Pre/post test scores (paired t-test)
- Qualitative: Thematic coding of deliberations
- Behavioral: Action selection patterns, time allocation

---

## 6. Success Criteria

### 6.1 Minimum Viable Product (MVP)

✅ Models run without errors
✅ AQI predictions within 20% of historical
✅ Players report engagement > 3.5/5
✅ Knowledge gains > 10%

### 6.2 Good Product

✅ R² > 0.7 for historical AQI
✅ All roles used >once per game
✅ Engagement > 4.0/5
✅ Knowledge gains > 20%
✅ Systems thinking improves (pre/post)

### 6.3 Excellent Product

✅ R² > 0.85, regime accuracy > 90%
✅ Action diversity > 80%
✅ Engagement > 4.3/5
✅ Knowledge gains > 30%
✅ Transfer of learning demonstrated
✅ Expert validation > 4.0/5
✅ Variant comparison complete

---

## 7. Implementation Roadmap

### Phase 1: Model Validation (2 weeks)
- [ ] Historical AQI data ingestion
- [ ] Calibration scripts for SD model
- [ ] Sensitivity analysis for HA parameters
- [ ] Automated testing suite

### Phase 2: Game Mechanics Eval (2 weeks)
- [ ] Balance testing with simulated players
- [ ] Action diversity analysis
- [ ] Hidden objective achievement rate measurement
- [ ] Automated balance reports

### Phase 3: Human Playtesting (4 weeks)
- [ ] Recruit 30 participants
- [ ] Pre/post assessment instruments
- [ ] Data collection protocols
- [ ] Analysis pipeline

### Phase 4: Variant Testing (4 weeks)
- [ ] Implement 5 variants
- [ ] A/B testing framework
- [ ] Comparative evaluation
- [ ] Recommendations for deployment

---

## 8. Metrics Dashboard

**Real-Time Model Monitoring:**
```python
class EvaluationDashboard:
    def log_game_session(self, session_data):
        """Track key metrics per session"""
        metrics = {
            'engagement_score': self.compute_engagement(session_data),
            'action_diversity': self.measure_action_diversity(session_data),
            'model_accuracy': self.compare_to_baseline(session_data),
            'learning_gain': self.pre_post_diff(session_data),
            'role_balance': self.win_rate_variance(session_data)
        }

        self.db.insert(metrics)

        # Alert if metrics out of range
        if metrics['engagement_score'] < 3.5:
            self.alert("Low engagement detected")
        if metrics['role_balance'] > 0.3:  # High variance in win rates
            self.alert("Role imbalance detected")
```

**Automated Alerts:**
- Engagement drops below 3.5 → Review narrative quality
- Win rate variance >0.3 → Rebalance hidden objectives
- Knowledge gain <10% → Strengthen debrief
- Model RMSE >60 → Recalibrate parameters

---

## 9. Data Collection Templates

### 9.1 Pre-Game Survey

**Demographics:**
- Age, education, field of study/work
- Prior knowledge of air pollution (1-5)
- Prior knowledge of Delhi (1-5)

**Knowledge Test:**
10 multiple choice questions (see Section 3.1)

### 9.2 Post-Game Survey

**Engagement (1-5):**
- How engaging was the experience?
- How realistic did the scenario feel?
- How well did the models enhance understanding?

**Knowledge Test:**
Same 10 questions (randomized order)

**Systems Thinking:**
Open-ended: "Describe one feedback loop you noticed in the game."

**Transfer:**
"If you were advising the Delhi government, what would you recommend and why?"

---

## 10. Analysis Scripts

### 10.1 Historical Validation Script

```python
def historical_validation_pipeline():
    """
    Compare model predictions to real Delhi data
    """
    # Load data
    historical = pd.read_csv('data/delhi_aqi_2019_2024.csv')
    weather = pd.read_csv('data/delhi_weather_2019_2024.csv')
    policies = pd.read_csv('data/delhi_policies_2019_2024.csv')

    results = []

    for year in [2019, 2020, 2021, 2022, 2023]:
        # Filter data
        year_data = historical[historical.year == year]
        year_weather = weather[weather.year == year]
        year_policies = policies[policies.year == year]

        # Run model
        model = DelhiSystemDynamics()
        predictions = model.simulate(
            weather_schedule=year_weather,
            policy_schedule=year_policies
        )

        # Compare
        r2 = compute_r_squared(year_data.aqi, predictions.aqi)
        rmse = compute_rmse(year_data.aqi, predictions.aqi)
        regime_acc = regime_accuracy(year_data.aqi, predictions.aqi)

        results.append({
            'year': year,
            'r_squared': r2,
            'rmse': rmse,
            'regime_accuracy': regime_acc
        })

    return pd.DataFrame(results)
```

---

## 11. Reporting Templates

### 11.1 Weekly Evaluation Report

**Sections:**
1. Model Performance
   - Historical validation metrics
   - Sensitivity analysis results
   - Edge case testing status

2. Game Metrics
   - Sessions conducted this week
   - Average engagement score
   - Action diversity trends
   - Role balance status

3. Learning Outcomes
   - Pre/post test results
   - Systems thinking scores
   - Transfer assessment

4. Issues & Risks
   - Low-performing variants
   - Balance problems
   - Technical bugs

5. Next Steps
   - Calibration adjustments
   - Variant iterations
   - Recruitment progress

---

## 12. Success Stories & Failure Modes

### Success Stories (What to Celebrate)

✅ **Player Quote:** "I never realized how farmers are trapped in a coordination dilemma."
✅ **Data:** 95% of players could identify at least one feedback loop post-game
✅ **Model Accuracy:** R² = 0.82 for Oct-Nov 2023 AQI prediction
✅ **Engagement:** 4.5/5 average across 30 sessions
✅ **Transfer:** Player designed a subsidy policy considering compliance, timing, and equity

### Failure Modes (What to Watch For)

❌ **"Black Box Frustration"**: Players feel models are opaque
   - Fix: Add transparency features, show causal chains

❌ **"Dominant Strategy"**: Everyone picks farmer subsidy every time
   - Fix: Adjust costs, introduce budget constraints, add political capital

❌ **"Fatalism"**: Players give up when AQI spikes
   - Fix: Introduce hope mechanics, show long-term progress, counterfactuals

❌ **"Too Technical"**: General public overwhelmed by model complexity
   - Fix: Use Variant C (simplified) for non-expert audiences

❌ **"Unrealistic"**: Experts say "This isn't how it works"
   - Fix: Recalibrate against expert feedback, cite sources in model docs

---

## 13. Meta-Evaluation Question

**The Big Question:** Does TTX with formal models lead to better policy understanding than pure narrative TTX?

**Experiment Design:**
- Control: Traditional TTX (human facilitator, no models)
- Treatment: Formal model TTX (our system)
- N=60 participants (30 per condition)
- Measure: Pre/post knowledge, systems thinking, transfer

**Hypothesis:**
- Formal models → +15% better systems thinking
- Formal models → +10% better transfer
- But possibly -0.3 lower engagement (too technical?)

**Decision Rule:**
- If systems thinking gain >10% higher: Formal models win
- If engagement drops >0.5 points: Need to improve UX
- If no difference: Reconsider necessity of model complexity

---

## 14. Continuous Improvement

**Feedback Loop:**
```
Playtest → Data → Analysis → Model/Game Adjustments → Playtest
```

**Monthly Review:**
- Are metrics trending in right direction?
- Which variants perform best for which audiences?
- What surprised us?
- What should we change?

**Quarterly Deep Dive:**
- Meta-analysis across all sessions
- Publish findings (EA Forum, academic paper)
- Share code & data (open source)

---

## Appendix: Evaluation Datasets

### A1. Historical Validation Data Sources

1. **Delhi AQI Time Series**
   - Source: Delhi Pollution Control Committee (DPCC)
   - URL: https://app.cpcbccr.com/ccr/#/caaqm-dashboard-all/caaqm-landing
   - Coverage: 2015-2024, hourly
   - Variables: PM2.5, PM10, NO2, SO2, CO, O3

2. **Weather Data**
   - Source: India Meteorological Department (IMD)
   - Coverage: 2015-2024, daily
   - Variables: Temperature, wind speed, humidity, rainfall

3. **Emission Inventory**
   - Source: SAFAR India, IIT Delhi studies
   - Sector breakdowns, seasonal variations

4. **Policy Timeline**
   - GRAP activations (dates, stages)
   - Odd-even schemes (dates, compliance reports)
   - Subsidy programs (coverage, adoption)

5. **Farm Fire Data**
   - Source: NASA FIRMS (Fire Information for Resource Management System)
   - Coverage: 2015-2024, daily hotspot counts
   - Region: Punjab, Haryana, Uttar Pradesh

### A2. Benchmark Targets (From Literature)

| Metric | Source | Value |
|--------|--------|-------|
| Vehicular contribution | SAFAR 2020 | 28% ±3% |
| Industry contribution | IIT Delhi 2019 | 20% ±3% |
| Stubble burning (Oct-Nov) | TERI 2021 | 20-35% |
| Odd-even effectiveness | TERI evaluation | 5-10% AQI reduction |
| Hospitalization rate | Lancet 2018 | 0.8% per 10 μg/m³ excess |
| Rain removal efficiency | Observed | 70-90% in 24h |

---

## Conclusion

This evaluation framework provides a comprehensive, evidence-based approach to validating both the formal models and the game design. By combining historical validation, expert review, playtesting, and variant comparison, we ensure that the TTX is:

1. **Scientifically rigorous** (models calibrated to real data)
2. **Pedagogically effective** (measurable learning gains)
3. **Engaging** (players want to play)
4. **Adaptable** (variants for different audiences)
5. **Continuously improving** (data-driven iteration)

**Next Steps:** Implement Phase 1 (Model Validation) and begin historical data ingestion.
