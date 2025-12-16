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
the concept of a stochastic differential equation (SDE). Such an SDE can be approximated by the
Euler-Maruyama method (basically the Euler method with some randomness added to it):

$$
x_{t+h} = x_t + h u_t(x_t) + \sqrt h σ_t ϵ_t, \quad ϵ_t ∼ \mathcal N (0, I_d)
$$

Note the diffusion coefficient $\sigma_t$, which controls the amount of randomness.

[[ sde-widget ]]
