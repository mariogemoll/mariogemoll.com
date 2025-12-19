# [[ page-title ]]

## Brownian motion and Wiener process

Brownian motion describes the random motion of particles in fluids or gases. It is basically a
random walk. Mathematically it can be modeled as a Wiener process. For our purposes, we can think of
this as a path starting at the origin at $t=0$, and then proceeding with step size $h$, adding noise
from a standard Gaussian scaled by $\sqrt h$ at each step, until $t=1$:

$$
W_{t+h} = W_t + \sqrt h ϵ_t, \quad ϵ_t ∼ \mathcal N (0,Id) \quad (t = 0, h, 2h, ... , 1−h)
$$

[[ brownian-motion-widget ]]

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

[[ sde-widget ]]

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

[[ conditional-path-ode-sde-widget ]]

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

[[ marginal-path-ode-sde-widget ]]

[[ references ]]
