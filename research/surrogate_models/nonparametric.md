# Nonparametric Models: Deep Dive

**Purpose**: Detailed technical coverage of nonparametric surrogate models (Gaussian Processes, Random Forests, Neural Networks).

**Use**: When you need to understand the math, choose between methods, or tune hyperparameters.

---

## Overview

**Nonparametric**: Model complexity grows with data size (vs parametric: fixed # parameters)

**Key advantage**: Flexible, can fit complex functions without specifying functional form

**Common types**:
1. Gaussian Processes (Kriging)
2. Random Forests
3. Neural Networks
4. Support Vector Regression
5. Radial Basis Functions
6. Polynomial Chaos Expansion

---

## 1. Gaussian Processes (GP)

### What is a GP?

**Definition**: Distribution over functions f(x) such that any finite set {f(x₁), ..., f(x_n)} is Gaussian

**Specified by**:
- Mean function: m(x) = E[f(x)]
- Covariance function (kernel): k(x, x') = E[(f(x) − m(x))(f(x') − m(x'))]

**Notation**: f(x) ~ GP(m(x), k(x, x'))

---

### Prior and Posterior

**Prior** (before seeing data):
```
f(x) ~ GP(m(x), k(x, x'))
```

**Observations**: y = f(x) + ε, ε ~ N(0, σ²)

**Posterior** (after seeing data D = {(x₁, y₁), ..., (x_n, y_n)}):
```
f(x*) | D ~ N(μ*(x*), σ²*(x*))
```

Where:
```
μ*(x*) = m(x*) + k(x*, X)(K + σ²I)^{-1}(y − m)
σ²*(x*) = k(x*, x*) − k(x*, X)(K + σ²I)^{-1}k(X, x*)
```

**K**: n×n kernel matrix K_ij = k(x_i, x_j)

---

### Common Kernels

**1. Squared Exponential (RBF)**:
```
k(x, x') = σ²_f exp(−||x − x'||² / (2ℓ²))
```

Parameters:
- σ²_f: Signal variance
- ℓ: Length scale (controls smoothness)

**Properties**: Infinitely differentiable, very smooth

---

**2. Matérn**:
```
k(x, x') = σ²_f (2^{1−ν}/Γ(ν)) (√(2ν) ||x − x'|| / ℓ)^ν K_ν(√(2ν) ||x − x'|| / ℓ)
```

Parameter ν controls smoothness:
- ν = 1/2: Exponential (non-differentiable)
- ν = 3/2: Once differentiable
- ν = 5/2: Twice differentiable
- ν → ∞: RBF (infinitely differentiable)

**Use**: More flexible than RBF, good default

---

**3. Rational Quadratic**:
```
k(x, x') = σ²_f (1 + ||x − x'||² / (2αℓ²))^{−α}
```

**Use**: Scale mixture of RBF kernels (captures multiple length scales)

---

### Hyperparameter Tuning

**Method**: Maximize marginal likelihood via gradient descent

```python
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern

kernel = Matern(length_scale=1.0, nu=2.5)
gp = GaussianProcessRegressor(kernel=kernel, n_restarts_optimizer=10)
gp.fit(X_train, y_train)
y_pred, y_std = gp.predict(X_test, return_std=True)
```

**Pros**: Uncertainty, flexible, works with small data (N ~ 10-1000)
**Cons**: O(n³) scalability, struggles with d > 20
**Use when**: Need uncertainty estimates, N < 10k

---

## 2. Random Forests (RF)

### What is a Random Forest?

**Definition**: Ensemble of decision trees, each trained on bootstrap sample with random feature subset

**Prediction**: Average (regression) or majority vote (classification)

---

### Algorithm

**Training**:
```
for b = 1 to B (# trees):
    1. Bootstrap sample: D_b = sample(D, n, replace=True)
    2. Grow tree T_b:
       - At each split, randomly select m features (m ≈ √p)
       - Choose best split among m features (minimize MSE/Gini)
       - Grow until min_samples_leaf reached (no pruning)
```

**Prediction**:
```
f_RF(x) = (1/B) Σ_{b=1}^B T_b(x)
```

---

### Hyperparameters

| Parameter | Description | Default | Tuning |
|-----------|-------------|---------|--------|
| `n_estimators` | # trees | 100 | More is better (diminishing returns >500) |
| `max_depth` | Tree depth | None | Limit if overfitting |
| `min_samples_split` | Min samples to split | 2 | Increase if overfitting |
| `min_samples_leaf` | Min samples in leaf | 1 | Increase to regularize |
| `max_features` | # features per split | √p | Tune via CV |

---

### Uncertainty & Feature Importance

```python
# Ensemble variance for uncertainty
tree_predictions = np.array([tree.predict(X_test) for tree in rf.estimators_])
y_pred, y_std = np.mean(tree_predictions, axis=0), np.std(tree_predictions, axis=0)

# Feature importance
importances = rf.feature_importances_
```

**Pros**: Robust, interpretable, fast O(n log n), scales to N > 100k
**Cons**: Poor extrapolation, ensemble variance underestimates uncertainty
**Use when**: Large data, need interpretability, don't extrapolate

---

## 3. Neural Networks (NN)

### Architecture

**Feedforward NN** (most common for surrogates):
```
Input → Hidden1 → Hidden2 → ... → Output
```

Each layer:
```
h_{l+1} = σ(W_l h_l + b_l)
```

Where:
- W_l: Weight matrix
- b_l: Bias vector
- σ: Activation function (ReLU, tanh, sigmoid)

---

### Activation Functions

| Function | Formula | Use |
|----------|---------|-----|
| **ReLU** | max(0, x) | Default (fast, effective) |
| **Leaky ReLU** | max(0.01x, x) | Avoids dead neurons |
| **tanh** | (e^x − e^{−x}) / (e^x + e^{−x}) | Symmetric, bounded |
| **sigmoid** | 1 / (1 + e^{−x}) | Output layer (probability) |
| **Swish** | x · sigmoid(x) | Smooth, often better than ReLU |

---

### Architecture Choices

**Width vs Depth**:
- **Wide + Shallow** (e.g., [d, 128, 128, 1]): Good for smooth functions
- **Deep + Narrow** (e.g., [d, 32, 32, 32, 32, 1]): Better for complex, hierarchical features

**Rule of thumb**: Start with 2-3 hidden layers, 64-128 neurons per layer

---

### Training

**Loss function** (regression):
```
L(θ) = (1/n) Σᵢ (y_i − f_θ(x_i))² + λ ||θ||²  (MSE + L2 regularization)
```

**Optimization**: Adam, SGD, L-BFGS

```python
import torch
import torch.nn as nn

class Surrogate(nn.Module):
    def __init__(self, input_dim, hidden_dim=64, n_layers=3):
        super().__init__()

        layers = [nn.Linear(input_dim, hidden_dim), nn.ReLU()]
        for _ in range(n_layers - 1):
            layers += [nn.Linear(hidden_dim, hidden_dim), nn.ReLU()]
        layers += [nn.Linear(hidden_dim, 1)]

        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)

# Train
model = Surrogate(input_dim=10)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
criterion = nn.MSELoss()

for epoch in range(1000):
    optimizer.zero_grad()
    y_pred = model(X_train_tensor)
    loss = criterion(y_pred, y_train_tensor)
    loss.backward()
    optimizer.step()
```

---

### Uncertainty Quantification

**Ensemble**: Train multiple NNs, compute std across predictions
**MC Dropout**: Keep dropout on at test time, sample 100 times

```python
# MC Dropout example
model.train()  # Keep dropout enabled
predictions = [model(X_test).detach().numpy() for _ in range(100)]
y_pred, y_std = np.mean(predictions, axis=0), np.std(predictions, axis=0)
```

**Pros**: Flexible, differentiable, GPU scalable, transfer learning
**Cons**: Many hyperparameters, data hungry, needs ensembles for UQ
**Use when**: Large data (N > 10k), need gradients, have GPU

---

## 4. Support Vector Regression (SVR)

**Goal**: ε-insensitive regression with kernel trick

```python
from sklearn.svm import SVR
svr = SVR(kernel='rbf', C=100, epsilon=0.1)
svr.fit(X_train, y_train); y_pred = svr.predict(X_test)
```

**Pros**: Sparse (uses support vectors), robust to small errors
**Cons**: No uncertainty, O(n²-n³) scalability

---

## 5. Radial Basis Functions (RBF)

**Form**: f(x) = Σᵢ wᵢ φ(||x − xᵢ||), fit by solving Φw = y

```python
from scipy.interpolate import RBFInterpolator
rbf = RBFInterpolator(X_train, y_train, kernel='gaussian', epsilon=0.1)
y_pred = rbf(X_test)
```

**Pros**: Exact interpolation, simple
**Cons**: Ill-conditioned, overfits noise, no uncertainty

---

## 6. Polynomial Chaos Expansion (PCE)

**Idea**: Expand Y = f(X) in orthogonal polynomials (Legendre for uniform, Hermite for normal)

```python
import chaospy as cp
dist = cp.J(cp.Uniform(0, 1), cp.Uniform(0, 1))
expansion = cp.generate_expansion(3, dist)
approx = cp.fit_regression(expansion, X_train, y_train)
mean, std = cp.E(approx, dist), cp.Std(approx, dist)  # Analytical!
```

**Pros**: Analytical statistics (mean, Sobol), efficient, spectral accuracy
**Cons**: Needs smooth functions, curse of dimensionality

---

## Comparison Table

| Method | Scalability (N) | Uncertainty | Extrapolation | Interpretability | Best Use Case |
|--------|-----------------|-------------|---------------|------------------|---------------|
| **GP** | Poor (N < 10k) | ✓✓ | Poor | Medium | Small data, need UQ |
| **RF** | Good (N > 100k) | ✓ (ensemble variance) | Poor | ✓ (feature importance) | Large tabular data |
| **NN** | Excellent (GPU) | ✓ (ensemble/dropout) | Medium | Poor | Large data, complex |
| **SVR** | Medium | ✗ | Poor | Poor | Sparse, robust to outliers |
| **RBF** | Medium | ✗ | Poor | Poor | Exact interpolation |
| **PCE** | Good | ✓✓ (analytical) | Medium | ✓ (polynomial structure) | Smooth, low-dim, need statistics |

---

## Practical Recommendations

### For AI Governance Surrogates

**Small data** (N < 1000):
→ Use **GP** with Matérn kernel
- Provides uncertainty for active learning
- Good with limited budget

**Medium data** (N ~ 10,000):
→ Use **RF** or **NN ensemble**
- RF for interpretability (feature importance)
- NN for complex nonlinearities

**Large data** (N > 100,000):
→ Use **NN** with GPU
- Scalable to millions of samples
- Leverage transfer learning

**Need analytical statistics** (Sobol indices):
→ Use **PCE** (if smooth, low-dim)
- Compute sensitivity indices without extra simulations

---

## Summary

**Nonparametric surrogates** provide flexible approximations without assuming functional form.

**Key trade-offs**:
- GP: Best uncertainty, poor scalability
- RF: Robust, interpretable, no extrapolation
- NN: Flexible, scalable, needs more data
- SVR: Sparse, no uncertainty
- RBF: Simple, can overfit
- PCE: Analytical stats, needs smoothness

**For AI-2027**:
- **Mode dynamics**: NN (learn from trajectories)
- **Policy optimization**: GP (Bayesian optimization with UQ)
- **Sensitivity analysis**: PCE (if smooth) or RF (otherwise)
- **Calibration**: RF (handles noisy ABM outputs)

**Related Documentation**:
- [fundamentals.md](./fundamentals.md) - Training workflow and validation
- [applications_ha.md](./applications_ha.md) - Using surrogates in HA mode dynamics
- [examples.md](./examples.md) - Runnable code for each method
