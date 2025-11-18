# Flow Matching

## Conditional probability path

Given a point $z$ in $\mathbb{R}^d$ (for now we'll look at $\mathbb{R}^2$) we can define a
conditional probability path, ie. a transformation of an initial probability distribution
$p_{\rm{init}}$ into the Dirac delta distribution $\delta_{z}$ (which when sampled always gives the
point $z$) over the continuous timespan between time points $t=0$ and $t=1$, described as a
set of distributions $p_t(\cdot|z)$:

$$
p_0(\cdot|z)=p_{\rm{init}}, \quad p_1(\cdot|z)=\delta_{z}\quad \text{ for all }z\in\mathbb{R}^d.
$$

In particular, we can construct a Gaussian conditional probability path where we start with a
the standard Gaussian distribution and then successively move the mean towards z and the covariance
matrix towards the identity matrix. This is governed by "noise schedulers" $\alpha_t$ and
$\beta_t$

$$
p_t(\cdot|z) = \mathcal{N}(\alpha_t z,\beta_t^2 I_d)
$$

$$
\begin{align}
\text{At }\, t=0: & \quad \alpha_0 = 0, \quad \beta_0 = 1,
    \quad p_0(\cdot|z) = \mathcal{N}(0, I_d) = p_{\rm{init}} \\
\text{At }\, t=1: & \quad \alpha_1 = 1, \quad \beta_1 = 0,
    \quad p_1(\cdot|z) = \mathcal{N}(z, 0) = \delta_z
\end{align}
$$

[[ conditional-prob-path-widget ]]

## Conditional vector field

For any conditional probability path there exists an equivalent vector field/ODE. Intuitively,
instead of sampling from $p_t$ (at a given time point $t$), we can sample a point from
$p_{\rm{init}}$ and then just follow the vector field until time $t$ (e.g., using the Euler method):

[[ conditional-prob-path-and-vector-field-widget ]]

## Marginal probability path and vector field

Now imagine we have a complex data distribution $p_{\rm{data}}$. As with any point in
$\mathbb{R}^d$, we can build the conditional probability path described above for points sampled
from this distribution. Thus we can speak of a marginal probability path, i.e. a set of
distributions $p_t$ which transforms the initial distribution $p_{\rm{init}}$ into $p_{\rm{data}}$.

To sample a point $x \sim p_t$, we just need to follow the procedure "sample $z \sim p_{\rm{data}}$,
then get $p_t(\cdot|z)$ (via conditional probability path), then sample $x \sim p_t(\cdot|z)$".

We can even give the PDF for $p_t$. It is simply the integral over the values of the $p_t(\cdot|z)$
for _all_ $z$, weighed by their likelihoods, in other words we marginalize over $z$:

$$
p_t(x) = \int p_t(x | z)\, p_{\rm{data}}(z)\, dz
$$

Analogous to above, there is also always an equivalent marginal vector field leading to the same
outcome.
