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

$$
X_0\sim p_{\rm{init}}, \quad
\frac{d}{d t}X_t = u_t(X_t|z)\quad
\Rightarrow \quad X_t\sim p_t(\cdot|z)\quad
(0\leq t\leq 1)
$$

[[ conditional-prob-path-and-vector-field-widget ]]

The formula for this vector field (for the Gaussian case) is rather simple:

$$
u_t(x|z)
= \left( \dot{\alpha_t}
       - \frac{\dot{\beta_t}}{\beta_t}\,\alpha_t \right) z
  + \frac{\dot{\beta_t}}{\beta_t}\, x
$$

A justification is given in ….

Sidenote: The "dot notation" is the physics convention for denoting the derivative with respect to
time: $\dot{\alpha_t}=\frac{d}{dt}\alpha_t$.

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
outcome:

$$
u_t(x) = \int u_t(x|z)\frac{p_t(x|z)p_{\rm{data}}}{p_t(x)}d z
$$

$$
X_0 \sim p_{\rm{init}} ,\quad
\frac{d}{d t}X_t = u_t(X_t)\quad
\Rightarrow \quad
X_t\sim p_t\quad (0\leq t\leq 1)
$$

Again, the formula is explained in …, but don't worry about it for now.

Here we see a marginal probability path and vector field visualized for a mixture of Gaussians
distribution (can be modified at $t=1$):

[[ marginal-prob-path-and-vector-field-widget ]]

So what's the point of all this? We see that for any distribution, there is a vector field that
transforms a simple initial distribution into the target distribution. Given the appropriate vector
field, we could sample from the initial distribution, run the data point through the vector field
till the end (ie., till $t=1$), and the result would be equivalent to sampling from the target
distribution.

And this works for arbitrarily complex distributions and any number of dimensions. What this means
is we could, in theory, say, sample from a 515x515x3-dimensional standard Gaussian, apply the vector
field corresponding to the marginal probability path towards the distribution of all Studio Ghibli
images, and get one of those pictures out.

The problem, of course, is that for this and any other "real" distribution, we can't give a formula
for the distribution, nor describe the marginal vector field explicitly (this basically only works
for mixtures of Gaussians, like in the visualization above). We can, however, learn a neural network
which approximates the vector field.
