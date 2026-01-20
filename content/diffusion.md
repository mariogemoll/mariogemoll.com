<!-- SPDX-FileCopyrightText: 2025-2026 Mario Gemoll -->
<!-- SPDX-License-Identifier: CC-BY-NC-SA-4.0 -->

# [[ page-title ]]

## Brownian motion and Wiener process

Brownian motion describes the random motion of particles in fluids or gases. It is basically a
random walk. Mathematically it can be modeled as a Wiener process. For our purposes, we can think of
this as a path starting at the origin at $t=0$, and then proceeding with step size $h$, adding noise
from a standard Gaussian scaled by $\sqrt h$ at each step, until $t=1$:

$$
W_{t+h} = W_t + \sqrt h ϵ_t, \quad ϵ_t ∼ \mathcal N (0,Id) \quad (t = 0, h, 2h, ... , 1−h)
$$

[[ brownian-motion-visualization ]]

## Stochastic differential equations

We can add some Brownian motion to the paths taken by particles moving along a vector field
described by an [ODE](/flow-matching#prologue%3A-time-dependent-vector-fields), which gives rise to
the concept of a stochastic differential equation (SDE):

$$
\begin{align*}
dX_t &= u_t(X_t)dt + σ_t dW_t \\
X_0 &= x_0
\end{align*}
$$

For the details about the $\mathrm{d}X$ notation, see [[ ref-holderrieth-and-erives-2025 ]].

The $sigma_t$ in the above equation is called the diffusion coefficient and controls the amount of
randomness (the ODE term $u_t(X_t)$ is also called the drift coefficient).

Such an SDE can be approximated by the Euler-Maruyama method (basically the Euler method with some
randomness added to it):

$$
x_{t+h} = x_t + h u_t(x_t) + \sqrt h σ_t ϵ_t, \quad ϵ_t ∼ \mathcal N (0, I_d)
$$

[[ euler-maruyama-method-visualization ]]

## Score field

As described on the [flow matching page](/flow-matching), any conditional probability path can be
expressed as an ODE which transforms points sampled from $p_\rm{init}$ into $p_\rm{data}$. It turns
out the same can be accomplished using an SDE. We can construct it by extending an existing ODE: We
add Brownian motion as above, and counteract this by adding the so-called conditional score function
(or rather, since it's also time-dependent, score field) $s(x|z) = \nabla \log p_t(x|z)$ to the
drift coefficient:

$$
\begin{gathered}
X_0 ∼p_\mathrm{init} \\
\mathrm{d} X_t =
  \left [ u_t(X_t|z) + \frac{\sigma_t^2}{2} s_t(X_t|z) \right ] \mathrm{d} t
    + \sigma_t \mathrm{d} W_t
\end{gathered}
$$

In the Gaussian case the score field is again rather simple:

$$
s_t(x|z)
  = \nabla \log p_t(x|z) = \nabla \log \mathcal N (x; \alpha_t z, \beta_t^2 I_d)
  = - \frac{x - \alpha_t z}{\beta_t^2}
$$

[[ conditional-probability-path-ode-sde-visualization ]]

The marginal ODE can be extended to a marginal SDE in a similar manner:

$$
\begin{gathered}
X_0 \sim p_\mathrm{init} \\
\mathrm{d}X_t
  = \left [ u_t(X_t) + \frac{\sigma_t^2}{2} s_t(X_t) \right ] \mathrm{d}t
    + \sigma_t\mathrm{d}W_t
\end{gathered}
$$

The marginal score function $s_t(x) = \nabla \log p_t(X_t)$ is the marginalization over all the
conditional score functions:

$$
s_t(x)
  = \nabla \log p_t(x)
  = \int \nabla \log p_t(x|z) \frac{p_t(x|z) p_\mathrm{data}(z)}{p_t(x)} \mathrm d z
$$

[[ marginal-probability-path-ode-sde-visualization ]]

## Learning a diffusion model

A marginal SDE (or an approximation thereof) gives us a diffusion model: We can sample a point from
$p_\mathrm{init}$, then apply Euler-Maruyama using the SDE, and at $t=1$ we will arrive at a point
from $p_\mathrm{data}$. As we've seen above, for the SDE we need the ODE and the score field.
With [flow matching](/flow-matching) we have a method to get $\hat{u}_t(x)$, an approximation ODE.
For the SDE, as in flow matching, we can try to learn a neural network $\hat{s}_t(x)$ that minimizes
the mean squared error, ie. the **score matching loss**:

$$
\mathcal{L}_{\text{SM}}
  = \mathbb{E}_{t\sim \mathcal{U}(0,1),\ z\sim p_{\rm{data}},\ x\sim p_t(\cdot|z)}[
    \|\hat{s}_t(x) - s_t(x)\|^2
  ]
$$

Similarly to before, this is intractable because of the integral in $s_t(x)$ (see above), however we
can again just minimize the **conditional score matching loss**:

$$
\mathcal{L}_{\text{CSM}}
  = \mathbb{E}_{t\sim \mathcal{U}(0,1),\ z\sim p_{\rm{data}},\ x\sim p_t(\cdot|z)}[
    \|\hat{s}_t(x) - s_t(x|z)\|^2
  ]
$$

Let's see this in action and learn a distribution to generate the moons dataset:

[[ moons-dataset-widget ]]

First, let's train a model to learn the ODE. The model is already preloaded (in fact, it's exactly
the same as on the [flow matching page](/flow-matching)), but you can train it again in the browser:

[[ flow-matching-training-widget ]]

Next we'll learn the score field. Again, a trained model is provided for your convenience.

[[ score-matching-training-widget ]]

We can now combine the two to simulate the SDE and use it to generate new samples:

[[ diffusion-visualization-widget ]]

## Credits & License

The content on this page is based on the course "Introduction to Flow Matching and Diffusion Models"
by Peter Holderrieth and Ezra Erives (MIT). I want to thank the authors for the excellent material.

Original course: https://diffusion.csail.mit.edu/2025/index.html

Their material is licensed under Creative Commons Attribution-NonCommercial-ShareAlike
(CC BY-NC-SA). I have adapted and extended it for this site, and this page is therefore also
published under CC BY-NC-SA.

[[ references ]]
