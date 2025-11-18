# Surrogate Model Fundamentals

**Purpose**: Core concepts, types, training workflows, and validation strategies for surrogate models.

---

## What is a Surrogate Model?

**Formal definition**: Given an expensive function $f: \mathbb{R}^d \to \mathbb{R}$ (or $\mathbb{R}^m$), a surrogate model $\hat{f}$ is a cheaper approximation trained to minimize:

$$
\mathbb{E}[(f(x) - \hat{f}(x))^2]
$$

over a distribution of inputs $x$.

**Practical definition**: A fast model that emulates a slow model, trained on limited evaluations of the slow model.

---

## Types of Surrogate Models

### 1. Gaussian Process (GP) Regression / Kriging

**What**: Treats unknown function as draw from Gaussian process

**Advantages**:
- Uncertainty quantification (predictive variance)
- Works with small datasets (10-1000 points)
- Smooth interpolation
- Theoretical guarantees (Bayesian)

**Disadvantages**:
- O(n³) training complexity (slow for >5000 points)
- Requires choosing kernel
- Can be overconfident in extrapolation

**When to use**:
- Small-to-medium data (< 5000 points)
- Need uncertainty estimates
- Function is smooth
- Want theoretical guarantees

**Python**:
```python
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel

kernel = RBF(length_scale=1.0) + WhiteKernel(noise_level=0.01)
gp = GaussianProcessRegressor(kernel=kernel, n_restarts_optimizer=10)
gp.fit(X_train, y_train)

y_pred, y_std = gp.predict(X_test, return_std=True)
```

---

### 2. Random Forest (RF)

**What**: Ensemble of decision trees with bootstrap aggregating

**Advantages**:
- Handles nonlinearity naturally
- Robust to noise
- Scales to large datasets (100,000+ points)
- Provides variance estimates (across trees)
- Feature importance built-in

**Disadvantages**:
- Less smooth than GP (piecewise constant)
- Can overfit with deep trees
- Extrapolation is poor (flat outside training range)

**When to use**:
- Large datasets
- Nonlinear relationships
- Categorical inputs
- Want feature importance
- Don't need smoothness

**Python**:
```python
from sklearn.ensemble import RandomForestRegressor

rf = RandomForestRegressor(n_estimators=100, max_depth=20, random_state=42)
rf.fit(X_train, y_train)

y_pred = rf.predict(X_test)
y_std = np.std([tree.predict(X_test) for tree in rf.estimators_], axis=0)

# Feature importance
importances = rf.feature_importances_
```

---

### 3. Neural Networks (NN)

**What**: Multi-layer perceptron with nonlinear activations

**Advantages**:
- Extremely flexible (universal approximator)
- Scales to huge datasets (millions of points)
- Can learn complex patterns
- Differentiable (enables gradient-based optimization)
- Transfer learning possible

**Disadvantages**:
- Requires lots of data for good generalization
- Black box (hard to interpret)
- No built-in uncertainty (need ensembles or Bayesian NNs)
- Hyperparameter tuning critical

**When to use**:
- Huge datasets (10,000+ points)
- Very complex nonlinear relationships
- Need differentiability
- Want to do transfer learning

**Python (PyTorch)**:
```python
import torch
import torch.nn as nn

class Surrogate(nn.Module):
    def __init__(self, input_dim, hidden_dim=64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1)
        )

    def forward(self, x):
        return self.net(x)

model = Surrogate(input_dim=10)
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.MSELoss()

# Train
for epoch in range(1000):
    optimizer.zero_grad()
    pred = model(X_train)
    loss = criterion(pred, y_train)
    loss.backward()
    optimizer.step()
```

---

### 4. Support Vector Regression (SVR)

**What**: SVM for regression with ε-insensitive loss

**Advantages**:
- Robust to outliers
- Sparse representation (uses subset of training points)
- Works well in high dimensions
- Theoretical guarantees (structural risk minimization)

**Disadvantages**:
- Slow for large datasets (O(n²) to O(n³))
- Hyperparameter tuning critical (C, ε, kernel parameters)
- No probabilistic interpretation

**When to use**:
- Medium datasets (100-10,000 points)
- High-dimensional inputs
- Presence of outliers
- Want sparsity

**Python**:
```python
from sklearn.svm import SVR

svr = SVR(kernel='rbf', C=100, gamma=0.1, epsilon=0.1)
svr.fit(X_train, y_train)
y_pred = svr.predict(X_test)
```

---

### 5. Radial Basis Function (RBF) Networks

**What**: Linear combination of radial basis functions centered at data points

**Advantages**:
- Exact interpolation (if desired)
- Smooth approximation
- Works well for scattered data

**Disadvantages**:
- Scales poorly (O(n³) for full RBF)
- Requires choosing RBF type and parameters
- Can be ill-conditioned

**When to use**:
- Scattered data in space
- Need exact interpolation at training points
- Function is smooth

**Python**:
```python
from scipy.interpolate import RBFInterpolator

rbf = RBFInterpolator(X_train, y_train, kernel='thin_plate_spline')
y_pred = rbf(X_test)
```

---

### 6. Polynomial Chaos Expansion (PCE)

**What**: Polynomial expansion in random variables (spectral method)

**Advantages**:
- Analytical expressions for moments (mean, variance)
- Efficient for low-to-medium dimensionality
- Sensitivity analysis (Sobol indices) is analytical

**Disadvantages**:
- Curse of dimensionality (exponential in dimension)
- Requires choosing polynomial basis
- Less flexible than nonparametric methods

**When to use**:
- Low dimensionality (< 10 parameters)
- Inputs have known distributions
- Want analytical sensitivity analysis
- Smooth functions

**Python (chaospy)**:
```python
import chaospy as cp

# Define input distributions
dist = cp.J(cp.Uniform(0, 1), cp.Uniform(0, 1))

# Polynomial chaos expansion
expansion = cp.generate_expansion(order=3, dist=dist)
X_train = dist.sample(100)
y_train = expensive_function(X_train)

pce, coeffs = cp.fit_regression(expansion, X_train, y_train, retall=True)

# Predict
y_pred = pce(X_test)

# Sensitivity (Sobol indices)
sobol_first = cp.Sens_m(pce, dist)
sobol_total = cp.Sens_t(pce, dist)
```

---

## Comparison Table

| Surrogate | Training Cost | Prediction | Uncertainty | Smoothness | Scalability | Use Case |
|-----------|--------------|------------|-------------|------------|-------------|----------|
| **GP** | O(n³) | O(n) | ✓✓ | ✓✓ | < 5000 | Small data, need UQ |
| **RF** | O(n log n × trees) | O(log n) | ✓ | △ | 100K+ | Large data, robust |
| **NN** | O(epochs × n) | O(1) | △ | ✓ | Millions | Huge data, complex |
| **SVR** | O(n² to n³) | O(n_sv) | ✗ | ✓ | < 10K | High-dim, outliers |
| **RBF** | O(n³) | O(n) | ✗ | ✓✓ | < 1000 | Scattered, smooth |
| **PCE** | O(P) | O(P) | ✓✓ | ✓ | < 10 dims | Low-dim, analytical |

*P = number of polynomial terms (grows exponentially with dimension)*

---

## Training Workflow

### Step 1: Design of Experiments (DoE)

**Goal**: Choose training points to maximize information

**Common strategies**:
- **Random sampling**: Baseline
- **Latin Hypercube Sampling (LHS)**: Better space coverage
- **Sobol sequences**: Low-discrepancy (quasi-random)
- **Adaptive sampling**: Start coarse, refine where uncertain

**Python (LHS)**:
```python
from scipy.stats.qmc import LatinHypercube

sampler = LatinHypercube(d=5)  # 5 dimensions
X_train = sampler.random(n=100)  # 100 samples
X_train_scaled = lb + (ub - lb) * X_train  # Scale to bounds
```

---

### Step 2: Generate Training Data

**Run expensive model**:
```python
y_train = [expensive_model(x) for x in X_train]
```

**Parallelize if possible**:
```python
from multiprocessing import Pool

with Pool(n_cores) as pool:
    y_train = pool.map(expensive_model, X_train)
```

**Track cost**: If each run takes 1 hour, 100 runs = 100 hours (4 days)

---

### Step 3: Train Surrogate

**Hyperparameter tuning** (cross-validation):
```python
from sklearn.model_selection import GridSearchCV

param_grid = {'n_estimators': [50, 100, 200], 'max_depth': [10, 20, None]}
grid_search = GridSearchCV(RandomForestRegressor(), param_grid, cv=5)
grid_search.fit(X_train, y_train)

best_rf = grid_search.best_estimator_
```

---

### Step 4: Validate

**Metrics**:
- **RMSE** (Root Mean Squared Error): $\sqrt{\frac{1}{n}\sum (y_i - \hat{y}_i)^2}$
- **R²** (coefficient of determination): $1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$
- **Max error**: $\max |y_i - \hat{y}_i|$

**Validation strategies**:
1. **Hold-out set**: Train on 80%, test on 20%
2. **Cross-validation**: k-fold CV (typically k=5 or 10)
3. **Leave-one-out**: For small datasets (< 100 points)

**Python**:
```python
from sklearn.metrics import mean_squared_error, r2_score

y_pred = surrogate.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)
max_error = np.max(np.abs(y_test - y_pred))

print(f"RMSE: {rmse:.4f}")
print(f"R²: {r2:.4f}")
print(f"Max error: {max_error:.4f}")
```

---

### Step 5: Refine (if needed)

**If surrogate is inaccurate**:
1. **More data**: Add training points (adaptive sampling)
2. **Better surrogate**: Try different model type
3. **Feature engineering**: Transform inputs
4. **Ensemble**: Combine multiple surrogates

**Adaptive sampling**:
```python
# Find where surrogate is most uncertain
uncertainties = gp.predict(X_candidates, return_std=True)[1]
next_point = X_candidates[np.argmax(uncertainties)]

# Evaluate expensive model at next_point
y_new = expensive_model(next_point)

# Retrain with augmented data
X_train = np.vstack([X_train, next_point])
y_train = np.append(y_train, y_new)
gp.fit(X_train, y_train)
```

---

## Validation Best Practices

### 1. Visualize Predictions

**Actual vs Predicted plot**:
```python
plt.scatter(y_test, y_pred, alpha=0.5)
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--')
plt.xlabel('Actual')
plt.ylabel('Predicted')
plt.title(f'R² = {r2:.3f}')
```

---

### 2. Residual Analysis

**Plot residuals** (y_test - y_pred):
```python
residuals = y_test - y_pred
plt.scatter(y_pred, residuals)
plt.axhline(0, color='r', linestyle='--')
plt.xlabel('Predicted')
plt.ylabel('Residual')
```

**Good surrogate**: Residuals centered at 0, no pattern

**Problems**:
- Systematic bias: Residuals consistently positive/negative
- Heteroscedasticity: Variance of residuals increases with y_pred
- Nonlinearity: Pattern in residuals vs y_pred

---

### 3. Extrapolation Test

**Warning**: Surrogates unreliable outside training range

**Test**: Evaluate on points outside convex hull of training data

```python
from scipy.spatial import ConvexHull

hull = ConvexHull(X_train)

def is_inside_hull(x, hull):
    # Check if x is inside convex hull
    ...

extrapolation_points = X_test[~is_inside_hull(X_test, hull)]
if len(extrapolation_points) > 0:
    print(f"Warning: {len(extrapolation_points)} test points outside training region")
```

---

### 4. Cross-Validation

**k-fold CV**:
```python
from sklearn.model_selection import cross_val_score

scores = cross_val_score(surrogate, X_train, y_train, cv=5, scoring='r2')
print(f"Mean R²: {scores.mean():.3f} ± {scores.std():.3f}")
```

