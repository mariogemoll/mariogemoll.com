<!-- SPDX-FileCopyrightText: 2025-2026 Mario Gemoll -->
<!-- SPDX-License-Identifier: CC-BY-NC-SA-4.0 -->

# [[ page-title ]]

## Prologue: Time-dependent vector fields

On this page we will work with time-dependent vector fields and trajectories of points moving along
these fields between time $t=0$ and time $t=1$. A time-dependent vector field maps a point $x$ and a
time $t$ to a velocity vector (the instantaneous velocity at point $x$ at time $t$).

Formally, such
a field is defined as

$$
u: \mathbb{R}^d \times [0,1] \to \mathbb{R}^d,\quad (x,t)\mapsto u_t(x)
$$

and trajectories $x_t$ evolve according to the ordinary differential equation (ODE)

$$
\dot x_t = u_t(x_t).
$$

Sidenote 1: The "dot notation" is the physics convention for denoting the derivative with respect to
time: $\dot x_t =\frac{d}{dt}x_t$.

Sidenote 2: If the subscript $t$ looks a bit strange at first: it simply denotes the value at time
$t$. Since $t\in[0,1]$ is a real number, subscripts are not restricted to integers: E.g.
$x_{0.123}$, $u_{0.456}$.

[[ vector-field-visualization ]]

Answering the question "If a point starts at $x_0$ at $t=0$ and follows the vector field, where is
it at any later time?" means solving the ODE. For some simple vector fields we can find a
closed-form solution, but in many cases we approximate the trajectory numerically using methods like
the Euler method.

The idea is simple: use the velocity vectors to advance the point in small time increments. The
smaller the steps, the more accurate the approximation becomes:

[[ euler-method-visualization ]]

## Conditional probability path

Let's now switch gears a bit and talk about probability distributions. Given a point $z$ in
$\mathbb{R}^d$ (for now we'll look at $\mathbb{R}^2$) we can define a conditional probability path,
ie. a transformation of an initial probability distribution $p_{\rm{init}}$ into the Dirac delta
distribution $\delta_{z}$ (which when sampled always gives the point $z$) over the continuous
timespan between time points $t=0$ and $t=1$, described as a set of distributions $p_t(\cdot|z)$:

$$
p_0(\cdot|z)=p_{\rm{init}}, \quad p_1(\cdot|z)=\delta_{z}\quad \text{ for all }z\in\mathbb{R}^d.
$$

In particular, we can construct a Gaussian conditional probability path where we start with a
the standard Gaussian distribution and then successively move the mean towards z and the covariance
matrix towards the identity matrix. This is governed by "noise schedulers" $\alpha_t$ and
$\beta_t$:

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

Here is a visualization in which you can also see the effect of different noise schedulers:

[[ conditional-probability-path-visualization ]]

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

[[ conditional-probability-path-ode-visualization ]]

The formula for this vector field (for the Gaussian case) is rather simple:

$$
u_t(x|z)
= \left( \dot{\alpha_t}
       - \frac{\dot{\beta_t}}{\beta_t}\,\alpha_t \right) z
  + \frac{\dot{\beta_t}}{\beta_t}\, x
$$

A justification is given in [[ ref-holderrieth-and-erives-2025 ]].

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

Again, the formula is explained in [[ ref-holderrieth-and-erives-2025 ]] but don't worry about it for
now.

Here we see a marginal probability path and vector field visualized for a mixture of Gaussians
distribution (can be modified at $t=1$):

[[ marginal-probability-path-ode-visualization ]]

So what's the point of all this? We see that for any distribution, there is a vector field that
transforms a simple initial distribution into the target distribution. Given the appropriate vector
field, we could sample from the initial distribution, run the data point through the vector field
till the end (ie., till $t=1$), and the result would be equivalent to sampling from the target
distribution. Note that the trajectory given by the vector field procedure is also fully
deterministic, ie. all the randomness comes from the initial sampling.

And this works for arbitrarily complex distributions and any number of dimensions. What this means
is we could, in theory, say, sample from a 515x515x3-dimensional standard Gaussian, apply the vector
field corresponding to the marginal probability path towards the distribution of all Studio Ghibli
images, and get one of those pictures out.

The problem, of course, is that for this and any other "real" distribution, we can't give a formula
for the distribution, nor describe the marginal vector field explicitly (this basically only works
for mixtures of Gaussians, like in the visualization above). We can, however, learn a neural network
which approximates the vector field.

## Loss function

What we need is a neural network which gives us for a point x and time t a vector which pushes the
point towards a sensible point in the data distribution. In other words, we want a neural network
which "matches the flow" given by the vector field. Then we can sample from $p_{\rm{init}}$
and use the Euler method, i.e. get the vector from the neural network, push the point a bit in that
direction, call the vector field neural network again, and repeat, up to $t = 1$.

As usual in machine learning we can initialize a neural network with random parameters and then try
to tweak them using gradient descent and a lot of training data. What should our loss function be
though? A natural choice is the mean squared error between the output of the neural network and the
actual value of the vector field.

One complication is that we need inputs at different $t$, but we only have training data for
$p_{\rm{data}}$ ($= p_1$). However that's not an issue, we can simply sample $t$ uniformly from
$[0,1]$ get the value along the conditional probability path.

This leads to the **flow matching loss** defined as follows:

$$
\mathcal{L}_{\text{FM}} =
\mathbb{E}_{t\sim \mathcal{U}(0,1),\ z\sim p_{\rm{data}},\ x\sim p_t(\cdot|z)}[
\|\hat{u}_t(x) - u_t(x)\|^2
]
$$

However, as stated above, we can't calculate that hairy integral which hides behind $u_t(x)$ (in
particular, it involves $p_{\rm{data}}$, which we don't know). So are we stuck here? No, actually
we're quite lucky: It turns out we can train the model directly on the conditional vector field
rather than the marginal one, and minimizing the following **conditional flow matching loss** is
equivalent to minimizing the flow matching loss!

$$
\mathcal{L}_{\text{CFM}} =
\mathbb{E}_{t\sim \mathcal{U}(0,1),\ z\sim p_{\rm{data}},\ x\sim p_t(\cdot|z)}[
\|\hat{u}_t(x) - u_t(x|z)\|^2
]
$$

(Proof given in [[ ref-holderrieth-and-erives-2025 ]].)

To make this more concrete in the Gaussian case, let's plug in the formulas for conditional
probability path $p_t(\cdot|z)$ and conditional vector field $u_t(x|z)$:

$$
\mathcal{L}_{\text{CFM}} =
\mathbb{E}_{
    t \sim \mathcal{U}(0,1),\ z\sim p_{\rm{data}},\ x\sim \mathcal{N}(\alpha_t z,\ \beta_t^2 I_d)
}\left[\left\|
    \hat{u}_t(x) - \left( \dot{\alpha_t}
       - \frac{\dot{\beta_t}}{\beta_t}\,\alpha_t \right) z
  - \frac{\dot{\beta_t}}{\beta_t}\, x
\right\|^2\right]
$$

Sampling $x\sim \mathcal{N}(\alpha_t z,\ \beta_t^2 I_d)$ is equivalent to sampling
$\epsilon \sim \mathcal{N}(0,\ I_d)$ and setting $x=\alpha_tz+\beta_t\epsilon$, so we can simplify
the loss function as follows:

$$
\begin{align}
\mathcal{L}_{\text{CFM}} &=
\mathbb{E}_{
    t \sim \mathcal{U}(0,1),\ z\sim p_{\rm{data}},\ \epsilon \sim \mathcal{N}(0, I_d)
}\left[\left\|
    \hat{u}_t(\alpha_tz+\beta_t\epsilon) - \left( \dot{\alpha_t}
       - \frac{\dot{\beta_t}}{\beta_t}\,\alpha_t \right) z
  - \frac{\dot{\beta_t}}{\beta_t}\, (\alpha_tz+\beta_t\epsilon)
\right\|^2\right] \\
&=
\mathbb{E}_{
    t \sim \mathcal{U}(0,1),\ z\sim p_{\rm{data}},\ \epsilon \sim \mathcal{N}(0, I_d)
}\left[\left\|
    \hat{u}_t(\alpha_tz+\beta_t\epsilon)
    - \dot{\alpha_t} z
    + \frac{\dot{\beta_t}}{\beta_t}\, \alpha_t z
    - \frac{\dot{\beta_t}}{\beta_t}\, \alpha_t z
    - \dot{\beta_t} \epsilon
\right\|^2\right] \\
&=
\mathbb{E}_{
    t \sim \mathcal{U}(0,1),\ z\sim p_{\rm{data}},\ \epsilon \sim \mathcal{N}(0, I_d)
}\left[\left\|
    \hat{u}_t(\alpha_tz+\beta_t\epsilon)
    - (\dot{\alpha_t} z + \dot{\beta_t} \epsilon)
\right\|^2\right]
\end{align}
$$

Choosing noise schedulers $\alpha_t=t$ and $\beta_t=1-t$ (and therefore $\dot{\alpha_t}=1$,
$\dot{\beta_t}=-1$) yields the Gaussian CondOT probability path
$p_t(x|z) = \mathcal{N}(tz, (1-t)^2I_d)$ (OT stands for "Optimal transport").

A sample from this conditional distribution can be generated simply as
$x = t z + (1-t)\epsilon,\ \epsilon \sim \mathcal{N}(0, I_d)$.

For this path, the optimal transport vector field takes the remarkably simple form
$u_t(x|z) = z - \epsilon$.

Thus the CFM objective becomes
$$
\mathcal{L}_{\text{CFM}}
=
\mathbb{E}_{t \sim \mathcal{U}(0,1),\; z \sim p_{\rm data},\; \epsilon \sim \mathcal{N}(0,I_d)}
\left[
\left\|
\hat{u}_t\!\bigl(tz+(1-t)\epsilon\bigr) - (z - \epsilon)
\right\|^2
\right].
$$

In practice, training reduces to the following simple procedure:

* Sample a data point $z \sim p_{\rm data}$.
* Sample a time $t \sim \mathcal{U}(0,1)$.
* Sample Gaussian noise $\epsilon \sim \mathcal{N}(0,I_d)$.
* Form the noisy input $x = t z + (1 - t)\epsilon$.
* Evaluate the model prediction $\hat{u}_t(x)$.
* Compute the squared error with the target velocity $z - \epsilon$.

## Code Example

Here's a minimal TF.js example showing how to construct a velocity vector field network and compute
the loss:

```typescript
// Velocity network: takes [x, t] as input, outputs velocity vector
const velocityNet = tf.sequential({
  layers: [
    tf.layers.dense({ inputShape: [3], units: 128, activation: 'relu' }),
    tf.layers.dense({ units: 128, activation: 'relu' }),
    tf.layers.dense({ units: 128, activation: 'relu' }),
    tf.layers.dense({ units: 2 })  // output: velocity vector
  ]
});

function computeLoss(dataBatch) {
  return tf.tidy(() => {
    const batchSize = dataBatch.shape[0];

    // Sample t uniformly from [0, 1]
    const t = tf.randomUniform([batchSize, 1], 0, 1);

    // Sample noise ε ~ N(0, I)
    const epsilon = tf.randomNormal([batchSize, 2]);

    // Form noisy input: x = tz + (1-t)ε
    const x = tf.add(tf.mul(t, dataBatch), tf.mul(tf.sub(1, t), epsilon));

    // Target velocity: v = z - ε
    const targetVelocity = tf.sub(dataBatch, epsilon);

    // Predict velocity from network
    const input = tf.concat([x, t], 1);
    const predictedVelocity = velocityNet.predict(input);

    // MSE loss
    const diff = tf.sub(predictedVelocity, targetVelocity);
    const loss = tf.mean(tf.square(diff));

    return loss;
  });
}
```

Training loop:

```typescript
const optimizer = tf.train.adam(0.001);

async function train(dataset, numSteps) {
  for (let step = 0; step < numSteps; step++) {
    const dataBatch = dataset.sample();  // Sample batch from training data

    optimizer.minimize(() => computeLoss(dataBatch));

    if (step % 100 === 0) {
      const loss = computeLoss(dataBatch);
      console.log(`Step ${step}, Loss: ${await loss.data()}`);
      loss.dispose();
    }
  }
}
```

For generation, we start from noise and follow the learned vector field:

```typescript
function generate(batchSize, numSteps = 100) {
  // Start from noise: x_0 ~ N(0, I)
  let x = tf.randomNormal([batchSize, 2]);
  const dt = 1.0 / numSteps;

  for (let step = 0; step < numSteps; step++) {
    const t = step * dt;

    x = tf.tidy(() => {
      const tTensor = tf.fill([batchSize, 1], t);
      // Get velocity from network
      const input = tf.concat([x, tTensor], 1);
      const velocity = velocityNet.predict(input);
      // Euler step: x_{t+dt} = x_t + dt * v_t(x_t)
      return tf.add(x, tf.mul(velocity, dt));
    });
  }

  return x;  // x_1 ~ p_data
}
```

## Learning "moons"

Let's learn an in-browser model that can approximate the moons toy dataset:

[[ moons-dataset-widget ]]

A pretrained model has already been loaded. The training loss curve is shown below. If you want,
you can train a model from scratch by clicking on "Reset model" and then "Train model":

[[ training-widget ]]

We can see how the model transforms a normal Gaussian distribution into the data distribution:

[[ flow-visualization-widget ]]

## Credits & License

The content on this page is based on the course "Introduction to Flow Matching and Diffusion Models"
by Peter Holderrieth and Ezra Erives (MIT). I want to thank the authors for the excellent material.

Original course: https://diffusion.csail.mit.edu/2025/index.html

Their material is licensed under Creative Commons Attribution-NonCommercial-ShareAlike
(CC BY-NC-SA). I have adapted and extended it for this site, and this page is therefore also
published under CC BY-NC-SA.

[[ references ]]
