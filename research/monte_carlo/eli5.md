# Monte Carlo Simulation: Explain Like I'm 5

**TL;DR**: Instead of asking "what will happen?", we ask "what might happen, and how likely is each outcome?"

---

## The Dice Analogy

###

 Without Monte Carlo

**Question**: "If I roll a six-sided die, what number will I get?"

**Answer**: "Uh... maybe a 4?"

**Problem**: This is just a guess. We don't know if 4 is likely or rare.

### With Monte Carlo

**Question**: "If I roll a six-sided die 1000 times, what's the distribution of outcomes?"

**Answer**:
- 1 appeared: 167 times (16.7%)
- 2 appeared: 165 times (16.5%)
- 3 appeared: 171 times (17.1%)
- 4 appeared: 163 times (16.3%)
- 5 appeared: 169 times (16.9%)
- 6 appeared: 165 times (16.5%)

**Insight**: Each outcome has about a 1/6 chance. We can quantify the uncertainty!

---

## The Weather Forecast Analogy

### Single Prediction (Old Way)

**Meteorologist**: "It will rain 1 inch on Tuesday."

**Problem**: What if conditions change slightly? How confident are we?

### Ensemble Forecast (Monte Carlo Way)

**Meteorologist**: "I ran 50 different weather models with slightly different starting conditions:
- 35 models predict rain (70% chance)
- Most models predict 0.5-1.5 inches
- 3 models predict heavy rain (2+ inches)
- 15 models predict no rain"

**Benefit**: You know the uncertainty! Plan for a range, not a single number.

---

## The AI Governance Example

### Without Monte Carlo

**Analyst**: "If we invest in AI safety, catastrophe will be avoided."

**Policy maker**: "How sure are you?"

**Analyst**: "Uh... pretty sure?"

**Problem**: This isn't actionable. What does "pretty sure" mean?

### With Monte Carlo

**Analyst**: "I simulated 1000 possible futures:
- **With safety investment**:
  - 220 futures → catastrophe (22%)
  - 289 futures → aligned AI (29%)
  - 491 futures → other outcomes (49%)

- **Without safety investment**:
  - 334 futures → catastrophe (33%)
  - 156 futures → aligned AI (16%)
  - 510 futures → other outcomes (51%)

Safety investment **reduces catastrophe risk by 11 percentage points** (from 33% to 22%)."

**Policy maker**: "OK, so it's not a guarantee, but it cuts risk by a third. How expensive is the investment?"

**Benefit**: We can now compare costs vs risk reduction quantitatively.

---

## Key Concepts (in Plain English)

### 1. Uncertainty

**Without MC**: "Compute will grow at 15% per year"
- But we don't actually know this! It could be 10%, could be 20%.

**With MC**: "Compute growth is somewhere between 10-20% per year. Let's run the model with lots of different growth rates and see what happens."

### 2. Distributions

**Example**: Time to AGI

**Without MC**: "AGI in 2035" (single number)

**With MC**:
```
AGI Arrival Time (from 1000 simulations):
├─ Earliest: 2030
├─ Latest: 2042
├─ Most likely (median): 2033
├─ 50% of scenarios: Between 2031 and 2036
└─ 90% of scenarios: Between 2030 and 2039
```

**Benefit**: You plan for a *range*, not a single date.

### 3. Probabilities

**Without MC**: "This might cause catastrophe"

**With MC**: "This causes catastrophe in 33% of scenarios (confidence interval: 30-36%)"

**Benefit**: Quantify "might" → make informed decisions

### 4. What-If Scenarios

**Question**: "What if we're wrong about trust?"

**MC Answer**:
- If initial trust is high (>0.7): P(catastrophe) = 18%
- If initial trust is medium (0.5-0.7): P(catastrophe) = 33%
- If initial trust is low (<0.5): P(catastrophe) = 52%

**Insight**: Trust matters a lot! We should measure/track it carefully.

---

## The Recipe

**Step 1**: Build a simulator
- "If we start with X compute and Y trust, and policies do Z, what happens?"
- This is your "recipe" for one possible future

**Step 2**: Identify what you don't know
- "We don't know exactly how much trust we start with"
- "We don't know exactly how fast compute will grow"
- "We don't know when incidents might occur"

**Step 3**: Specify ranges
- Initial trust: Probably between 50% and 90%
- Growth rate: Probably between 10% and 20% per year
- Incidents: Probably 1-3 per decade

**Step 4**: Run many times
- Run 1: Sample trust=62%, growth=12%, incidents at months [34, 67] → Aligned outcome
- Run 2: Sample trust=71%, growth=18%, incidents at months [15, 89] → Slowdown
- Run 3: Sample trust=54%, growth=19%, incidents at months [12, 23, 56] → Catastrophe
- ... 997 more runs ...

**Step 5**: Look at the pile of results
- Count outcomes: "Catastrophe happened in 334 out of 1000 runs → 33%"
- Find patterns: "Catastrophe runs had lower trust on average (68% vs 75%)"
- Compute statistics: "Median time to AGI: 68 months, range: 38-108 months"

---

## Common Questions

### Q: Why not just run it once with "best guess" parameters?

**A**: Because you miss the uncertainty!

**Example**:
- Best guess growth rate = 15%
- One simulation: "Catastrophe in 2035"

But what if growth is actually 20%? Or 10%? The answer changes a lot!

**With MC**:
- Run with growth rates from 10-20%
- Result: "Catastrophe happens between 2032 and 2039 in the catastrophe scenarios, with median 2035"

Now you know the spread, not just the middle.

### Q: How many runs do I need?

**A**: Depends on what you're measuring.

**Rule of thumb**:
- For common outcomes (happens ~50% of time): 100 runs is OK
- For rare outcomes (happens ~10% of time): 1000 runs
- For very rare outcomes (happens ~1% of time): 10,000 runs

**Why**: You need enough samples to get a stable estimate.

**Analogy**: If you flip a coin 10 times and get 7 heads, you might think P(heads)=70%. But if you flip 1000 times and get 503 heads, you're confident P(heads) ≈ 50%.

### Q: What if we're wrong about the ranges?

**A**: Run sensitivity analysis!

**Example**:
- "We think initial trust is between 50-90%"
- "But what if it's actually between 30-70%?"

Run MC with both ranges, compare results:
- Range [50-90%]: P(catastrophe) = 33%
- Range [30-70%]: P(catastrophe) = 48%

**Conclusion**: If we're wrong about trust range, catastrophe risk could be 15 percentage points higher. This tells us: **measuring initial trust accurately is important!**

### Q: Isn't this just making stuff up?

**A**: Fair question! Two responses:

**1. You're encoding what you don't know**
- Without MC: "We don't know growth rate, so let's assume 15%" ← This is also made up, just hidden!
- With MC: "We don't know growth rate, so let's assume it's between 10-20%" ← At least we're honest about uncertainty

**2. You can validate**
- Check if results are robust to different assumptions
- Sensitivity analysis shows which assumptions matter
- Compare to historical data where available
- Use expert elicitation for uncertain parameters

**Better question**: "Are we being reasonable about the ranges?" (vs "are we certain about the numbers?")

---

## When Monte Carlo Helps Most

### Scenario 1: High Uncertainty

**Example**: AI governance in 2030
- We don't know: Compute growth, international cooperation, incident rates, alignment progress
- MC helps: Explore the space of possibilities, find robust strategies

### Scenario 2: Rare but Important Events

**Example**: Catastrophic outcomes
- Happen in minority of scenarios, but we care a lot
- MC helps: Estimate P(catastrophe), identify conditions that lead there

### Scenario 3: Comparing Policies

**Example**: Should we invest $100B in alignment?
- Without MC: "It seems like a good idea"
- With MC: "It reduces P(catastrophe) from 33% to 22%, and increases P(aligned) from 16% to 29%"

### Scenario 4: Understanding Trade-offs

**Example**: Fast progress vs safety
- MC shows: Fast growth → earlier AGI, but higher catastrophe risk
- Quantifies the trade-off: Each 5% faster growth → 3% higher catastrophe risk

---

## What Monte Carlo Doesn't Do

### It Doesn't Predict the Future

**MC tells you**: "Here are 1000 possible futures and their probabilities"
**MC doesn't tell you**: "This exact future will happen"

**Analogy**: Weather forecast says "70% chance of rain" - but it still might not rain.

### It Doesn't Replace Good Modeling

**Garbage in, garbage out**:
- If your model is wrong (missing key dynamics), MC won't fix it
- MC just propagates uncertainty through whatever model you have

**Example**:
- Bad model: "Compute growth is all that matters" → MC will miss governance effects
- Better model: "Compute, alignment, trust, incidents all interact" → MC explores these interactions

### It Doesn't Give Guarantees

**MC tells you**: "In 95% of scenarios, we avoid catastrophe"
**MC doesn't tell you**: "Catastrophe is impossible"

**That 5%**: Could still happen! MC quantifies risk, doesn't eliminate it.

---

## The Bottom Line

**Before Monte Carlo**:
- Single futures, best guesses, "it depends"
- Hard to compare policies
- Uncertainty is vague ("might", "probably", "unlikely")

**After Monte Carlo**:
- Distributions of futures, probabilities, ranges
- Statistical policy comparison
- Uncertainty is quantified ("33% chance with 95% CI [30%, 36%]")

**One sentence**: Monte Carlo turns "I think this policy works" into "This policy reduces risk from 33% to 22% based on 1000 simulations."

**For policymakers**: Enables informed decision-making under uncertainty.

**For researchers**: Rigorous uncertainty quantification and sensitivity analysis.

**For communicators**: Clear, probabilistic statements instead of vague handwaving.

---

## Next Steps

- See [examples.md](./examples.md) for concrete AI governance examples with code
- See [formalism.md](./formalism.md) for mathematical details
- See [practical_guide.md](./practical_guide.md) for how-to advice
