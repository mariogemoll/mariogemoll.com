<!-- SPDX-FileCopyrightText: 2026 Mario Gemoll -->
<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# [[ page-title ]]

This page provides a structured introduction to reinforcement learning (RL), moving from core
definitions to modern deep RL methods. We begin by formalizing the Markov decision process (MDP) and
defining policies, returns, and value functions. We then derive the Bellman expectation and
optimality equations, which form the foundation for dynamic programming methods such as policy
iteration and value iteration. Building on this, we cover Monte Carlo methods and
temporal-difference learning (including TD(0), SARSA, and Q-learning), highlighting their respective
update rules and trade-offs. We then introduce function approximation with neural networks, leading
to Deep Q-Networks (DQN) and their key stabilizing techniques such as replay buffers and target
networks. Finally, we outline the transition to policy gradient methods and actor–critic approaches,
connecting Monte Carlo and bootstrapped updates and setting the stage for modern algorithms such as
PPO and related methods.

Applications of RL in modern LLM posttraining are described on a [separate page](llm-posttraining).

## Markov Decision Process

The mathematical model for reinforcement learning is the **Markov Decision Process (MDP)**. An MDP
describes the environment an agent is situated in and is defined by:

- A set of states $S$
- A set of actions $A$
- Transition probabilities $P(s' \mid s, a)$
- A starting point or starting point distribution
- A reward function $r(s, a, s')$: the reward associated with choosing action $a$ in state $s$
  and landing in state $s'$
- Depending on the formulation, a discount factor $\gamma$, a horizon $H$, or both.

**Remark:** More general formulations allow stochastic rewards. On this page, we assume deterministic
rewards for simplicity.

<a name="remark-reward"></a>
**Remark:** Depending on the algorithm, the reward is given as a function of the state and action
only. In that case, the reward is defined as the expected reward over possible next states:

$$
r(s,a)
\;:=\;
\mathbb{E}_{S_{t+1} \sim P(\cdot \mid s,a)}[\, r(s,a,S_{t+1}) \,]
=
\sum_{s'} P(s' \mid s,a)\, r(s,a,s').
$$

**Another remark:** Here we assume full observability and that the full state of the environment is
known at any given time. For situations where this is not the case, there is also a
**Partially Observable Markov Decision Process (POMDP)**, but we will not go into that here.

**Remark:** Capital letters such as $S_t$ and $A_t$ denote random variables arising from interaction
with the environment. Lowercase letters like $s$ and $a$ denote particular realizations of those
variables.

**Yet another remark:** Notation is inconsistent across reinforcement learning texts and can be
confusing at first. I will try to be consistent on this page. The most important thing is to
understand what the symbols and concepts mean; once that is clear, different notational conventions
become much easier to parse.

## Gridworlds

A convenient toy model for a Markov Decision Process is a gridworld: a two-dimensional grid in which
each cell corresponds to a state (the state is the agent’s position on the grid).

The action set consists of four moves: up, down, left, and right. Each action incurs a step cost
(negative reward) of −0.1. One cell is designated as a goal state with a reward of +10, and another
as a trap state with a reward of −10. Goal and trap cells are terminal states. After that, the
episode ends and no further rewards are obtained.

Transitions are stochastic: the environment is "slippery", meaning that an intended move succeeds
with high probability, but with some probability the next state is shifted to the cell to the left
or right of the intended direction. Transitions in the opposite direction never occur.

The visualization below shows such a gridworld, where actions can be selected using the direction
buttons or the WASD keys.

[[ gridworld-visualization ]]

## Policy

The way an agent acts in an environment is described by a **policy**: a function that, given the
state the agent is in, returns the next action to take. A policy can be deterministic
($\pi(s) = a$) or stochastic ($\pi(a \mid s)$).

A policy applied to an MDP generates a sequence (also called a trajectory or rollout) of states,
actions, and rewards:

$$
(s_0, a_0, r_1), (s_1, a_1, r_2), (s_2, a_2, r_3), \dots
$$

## Return

The **return** is the discounted sum of future rewards starting at time step $t$:

$$
G_t
\;:=\;
\sum_{k=0}^{\infty} \gamma^k \, r_{t+k+1}.
$$

The usual objective in reinforcement learning is to find a policy that maximizes the expected return
over all starting states and trajectories:

$$
\pi^* \;=\; \arg\max_\pi \; \mathbb{E}_\pi \!\left[ \sum_{t=0}^{\infty} \gamma^t \, r_{t+1} \right].
$$

## State and action values

For a stationary system with known dynamics, we can assign a value to each state that measures how
good it is to be in that state with respect to the objective of maximizing expected return. These
are called **state values** or **V values**:

$$
v^\pi(s)
\;:=\;
\mathbb{E}_\pi \big[\, G_t \mid S_t = s \,\big].
$$

We can also define **action values**, also called **state–action values** or **Q values**. An action
value measures how good it is to take a particular action in a particular state:

$$
q^\pi(s,a)
\;:=\;
\mathbb{E}_\pi \big[\, G_t \mid S_t = s,\; A_t = a \,\big].
$$

State values and action values are related. The state value is the expected action value under the
policy:

$$
v^\pi(s)
\;=\;
\sum_a \pi(a \mid s)\, q^\pi(s,a).
$$

The action value can be written as the immediate reward plus the discounted expected value of the
next state:

$$
q^\pi(s,a)
\;=\;
r(s,a)
+
\gamma \sum_{s'} P(s' \mid s,a)\, v^\pi(s').
$$

**Remark:** The reward function $r(s,a)$ used here is the shortened form of $r(s,a,s')$, obtained by
taking the expectation over possible next states (see [above](#remark-reward)).

## Bellman equations

Substituting the previous relations into one another yields the **Bellman expectation equations**,
which relate state values and action values at a time step with those at the next timestep, under a
fixed policy $\pi$:

$$
\begin{aligned}
v^\pi(s)
&=
\sum_a \pi(a \mid s)
\left(
r(s,a)
+
\gamma \sum_{s'} P(s' \mid s,a)\, v^\pi(s')
\right)
\\[6pt]
q^\pi(s,a)
&=
r(s,a)
+
\gamma \sum_{s'} P(s' \mid s,a)
\left(
\sum_{a'} \pi(a' \mid s')\, q^\pi(s',a')
\right)
\end{aligned}
$$

There are also the **Bellman optimality equations**, which relate the values assuming an optimal
policy:

$$
\begin{aligned}
v^*(s)
&=
\max_a
\left(
r(s,a)
+
\gamma \sum_{s'} P(s' \mid s,a)\, v^*(s')
\right)
\\[6pt]
q^*(s,a)
&=
r(s,a)
+
\gamma \sum_{s'} P(s' \mid s,a)
\max_{a'} q^*(s',a')
\end{aligned}
$$

Assuming the optimal state-value function $v^*$ is known, an optimal (greedy) policy can be derived
by, for each state, evaluating all available actions via their immediate reward plus the expected
value of the next state (weighted by the transition probabilities), and selecting an action that
maximizes this quantity. If multiple actions attain the maximum, any of them may be chosen:

$$
\pi^*(s)
\;\in\;
\arg\max_a
\left[
r(s,a)
+
\gamma \sum_{s'} P(s' \mid s,a)\, v^*(s')
\right]
$$

If we know the q* values, it's even much simpler. In each state, just take the action with the
highest q value:

$$
\pi^*(s)
\;\in\;
\arg\max_a q^*(s,a)
$$

## Dynamic programming

Assuming we have a complete model of the environment (i.e., the MDP with all transition
probabilities and rewards) we can compute the optimal value function, and derive an optimal policy
from it, using the Bellman equations and dynamic programming techniques. There are two algorithms,
policy iteration and value iteration.

### Policy iteration

Let's first look at policy iteration for state values. We start with an arbitrary policy and
arbitrary initial state values. Then, we find the values for each state under this policy ("policy
evaluation") by applying the Bellman expectation equation repeatedly until convergence (i.e., until
the values don't change any more).  Then we do "policy improvement" to set the best greedy policy
for the new values as described above. We repeat this overall two-step process until convergence
(i.e., until the policy doesn't change any more).

[[ policy-iteration-v-visualization ]]

We can do the same thing for action values as well, just using the appropriate Q-value functions:

[[ policy-iteration-q-visualization ]]

### Value iteration

As we've seen, in policy iteration we take a policy, evaluate it by finding state and action values,
usually in a loop until convergence, then derive a new policy from those values, and iterate the
process until we arrive at the optimal values and policy.

Value iteration is a related technique that takes a shortcut: It does not go through the iterative
process of finding the exact state/action values for a given policy, in fact it doesn't explicitly
deal with policies. Instead it just looks at values and actions and applies the Bellman optimality
equation iteratively:

$$
v_{k+1}(s) = \max_a [ r(s,a) + \gamma \sum_{s'} P(s'|s, a) v_k(s') ]
$$

Basically in each iteration it asks for each state: Using which action can I max out the sum of
expected immediate reward and next state value (taking into account the transition probabilities)?
Then it just updates the state's value with that result for the best action.

After each iteration we could extract the greedy policy with respect to the current values (and
might do so to monitor convergence). However, this is not required for the algorithm itself, since
the policy does not influence the value updates. Once the values have converged, an optimal policy
can be obtained by acting greedily with respect to the final value function.

[[ value-iteration-v-visualization ]]

Again, we can do the same thing for Q values:

$$
q_{k+1}(s, a) = r(s, a) + \gamma \sum_{s'}P(s'|s, a)\max_{a'}q_k(s', a')
$$

[[ value-iteration-q-visualization ]]

## Monte Carlo methods

So far we’ve lived in a world where we have a perfect model of the environment. We knew all possible
states and actions, the transition probabilities, and the rewards. In a sense, this is the platonic
ideal of the control problem. But it is not really reinforcement learning: nothing had to be
learned. The Bellman equations and dynamic programming were developed in the 1950s precisely for
this model-known setting.

In the real world, things are messier. We usually do not have access to the transition probabilities
or reward model. Instead, we observe what happens when we act.

Monte Carlo methods are among the simplest ways to deal with this. Rather than computing
expectations from a known model, we estimate them from experience. The overall structure resembles
policy iteration: we follow a policy to generate trajectories (episodes), compute the cumulative
returns those trajectories produce, and use empirical averages of those returns to estimate the
value of states and actions. Then we can update the policy by choosing the greedy best action like
in policy iteration. Since we still need transition probabilities to do that using V values, MC is
usually done using Q values, which is completely "model-free".

The complete algorithm for MC control is as follows:

- Run an episode: Generates $s_0, a_0, r_1, s_1, a_1, r_2 \dots$
- For each state-action pair encountered, calculate the return $G_t$ from that action. There
  are two variants: first-visit MC (count only the return from the first time the state-action pair
  appears in the trajectory) and every-visit MC (count returns from all occurrences).
- Nudge the action value slightly (according to a step size/learning rate $\alpha$) for each
  $s, a, G$ triple thus generated: $Q(s,a) \leftarrow Q(s,a) + \alpha \big(G - Q(s,a)\big)$
- Update the policy (e.g. ε-greedily)

This gets repeated until the policy converges or reaches satisfactory performance.

Instead of updating the policy after every episode, one can also run a batch of episodes and then
update using averages, like in the following visualization:

[[ monte-carlo-visualization ]]

## Temporal-difference learning

Now we’ll look at temporal-difference learning, in particular one-step TD methods. For control, two
common algorithms are SARSA and Q-learning. First we look at SARSA.

### SARSA

As we just discussed, in MC we adjust values after one episode (or multiple episodes) according to
the returns we saw:

$$
Q(s,a) \leftarrow Q(s,a) + \alpha \big(G - Q(s,a)\big)
$$

and then we update the policy.

In SARSA, we update action-value estimates at every step. Since the policy is chosen ε-greedily with
respect to $Q$, improving $Q$ automatically improves the policy.

Assume we're in state s and take action a according to the policy. We'll observe an immediate reward
r and land in a state $s'$. We then choose the next action a' according to the same policy and use
our current estimate $Q(s',a')$. We can therefore update Q(s,a) according to how different it is
from the immediate reward plus the discounted estimate of the next state–action pair:

$$
Q(s,a) \leftarrow Q(s, a) + \alpha \big[ r + \gamma Q(s', a') - Q(s, a) \big]
$$

We then continue by taking action $a'$ in state $s'$ until convergence (or until the values are good
enough).

In short: in state $S$, sample $A$, observe reward $R$, land in state $S'$, sample $A'$: SARSA.

### Q-Learning

In SARSA, we used the estimated value of the next action we'll actually take in the update
("on-policy"). Q-learning is similar to SARSA, however here we just use the value of the best
currently estimated action greedily (which is not necessarily the action we'll actually take in the
next step, therefore this alogrithm is "off-policy"):

$$
Q(s,a) \leftarrow Q(s, a) + \alpha \big[ r + \gamma \max_{a'} Q(s', a') - Q(s, a) \big].
$$

## Q-function approximation using a neural network

So far we have dealt with environments with a finite number of states (e.g. gridworld positions).
Let's now consider CartPole, an environment in which at every time step the agent is asked to decide
to move a cart left or right with the aim of balancing a pole attached on top of it for as long as
possible. This environment has a four-dimensional continuous state space (cart position, cart
velocity, pole angle, pole angular velocity). The action space is still discrete (left/right).

We could probably solve this environment with some of the techniques discussed so far by
discretizing the state space with appropriate granularity, however now we'll approximate $Q(s, a)$
using a neural network.

Recall that in Q-learning we said that ideally $Q(s,a)$ should equal the immediate reward we get from
taking action a in state s plus the discounted value of the best next action. This was our "target":
$r + \gamma \max_{a'} Q(s', a')$.

We then updated the current value we had for $Q(s,a)$ in our table according to its distance to this
target based on the observation of $r$ and $s'$ (ie., the TD error):
$Q(s,a) \leftarrow Q(s,a) + \alpha [ \text{target} - Q(s, a) ]$.

We'll now no longer have a table of Q values, but rather a neural network with parameters $\theta$
$Q_\theta(s)$, outputting a vector of Q values, one for each action. For CartPole we can use a very
simple architecture with one hidden layer with 4 nodes, and two outputs:

![A simple neural network with 4 inputs, one hidden layer with 8 nodes, and 2
outputs](/reinforcement-learning/qnn.svg)

To train it we'll need a loss function, we'll take the mean squared error. Each iteration of the
training loop is as follows:

- We're in state $s$.
- We get the Q values from the network.
- We choose the action ε-greedily.
- We get to a next state $s'$ and receive reward $r$.
- We consult the network again to get the Q values for the next possible actions.
- We then can compare the Q value our neural network gave us for a with the target
$r + \gamma \max_{a'} Q(s', a')$ using MSE.
- We update $\theta$ using gradient descent.

There is a
[Jupyter notebook containing JAX training code](https://github.com/mariogemoll/reinforcement-learning/blob/main/py/ql.ipynb)
and the following visualization shows the model in action:

[[ cartpole-visualization ]]

## Deep Q-network (DQN)

The Deep Q-network (DQN) enabled AIs to play Atari. It makes two important extensions to the
Q-function approximation discussed above:

- **Replay buffer:** Instead of updating the weights according to the data of an observation
  immediately after that observation was made, in each iteration it makes an observation
  $(a, s, r, s')$, stores it in a FIFO buffer, then samples a few entries from that buffer and uses
  those for the gradient descent training step.
- **Separate target network:** Recall that in approximate Q-learning we use the model itself to
  calculate the target for the loss, which we then use to update the model. This can create
  instabilities, for example if the network slightly overestimates a value, that inflated value is
  used in the next target, which reinforces the error. In DQN, the target network (used in
  $r + \gamma \max_{a'} Q(s', a')$ ) is a separate network, which is a snapshot of the network that
  is being trained. It stays frozen for many steps, but gets updated with the weights of the trained
  model in regular intervals.

Here we see a DQN (trained using
[this Jupyter notebook](https://github.com/mariogemoll/reinforcement-learning/blob/main/py/dqn_minatar_breakout_cnn.ipynb))
playing a simplified version of the Atari game Breakout:

[[ breakout-visualization ]]

## Policy gradient/REINFORCE

The RL algorithms we looked at so far were value-based, they tried to approximate V or Q values and
a policy was derived from those. Another family of algorithms aim at learning a policy directly. One
fundamental algorithm here is REINFORCE, introduced in 1992 by Ronald J. Williams.

We start with the goal of Reinforcement Learning in general: Maximizing the return (see above). Here
usually a slightly different notation is used. We speak of state-action sequences, or trajectories,
that happen in the environment: $\tau = (s_0, a_1, \dots, s_H, a_H)$ (in the finite-horizon case).
Note that in this formulation the rewards aren't part of the trajectory, but we have a function
that gives us the observed reward for a state and an action in a given trajectory:
$r(s_t, a_t) = r_t$ (which again seems to be different from the expected reward
$r(s,a) = \mathbb{E}[r(s,a,s')]$, RL notation is a bit inconsistent...)

For the observed rewards we overload the r notation a bit:
$$R(\tau) = \sum_{t=0}^H r_t = \sum_{t=0}^H r(s_t, a_t)$$
The objective function of RL then becomes
$$J(\theta)=\mathbb{E}_{\tau \sim p_\theta(\tau)}[R(\tau)] = \sum_\tau p_\theta(\tau) R(\tau)$$
i.e the expected return over all trajectories under the policy parameterized by $\theta$.
$p_\theta(\tau)$ is the likelihood of trajectory $\tau$ induced by the policy $\pi_\theta$
interacting with the environment.

We then want to find the optimal
$\theta^{*} = \arg \max_\theta J(\theta)$.

We take the gradient w.r.t. $\theta$ ($\nabla$ here means $\nabla_\theta$):
$$
\begin{align}
\nabla J(\theta) &= \nabla \sum_\tau p_\theta(\tau) R(\tau) \\
&\overset{(1)}{=} \sum_\tau \nabla p_\theta(\tau) R(\tau) \\
&\overset{(2)}{=} \sum_\tau \frac{p_\theta(\tau)}{p_\theta(\tau)} \nabla p_\theta(\tau) R(\tau) \\
&= \sum_\tau p_\theta(\tau) \frac{\nabla p_\theta(\tau)}{p_\theta(\tau)} R(\tau) \\
&\overset{(3)}{=} \sum_\tau p_\theta(\tau) \nabla \log p_\theta(\tau) R(\tau) \\
\end{align}
$$

(1): Linearity of gradient operator  
(2): Multiply by $1 = \frac{p_\theta(\tau)}{p_\theta(\tau)}$  
(3): $\nabla \log f(x) = \frac{\nabla f(x)}{f(x)}$ (chain rule)

Since this is an expectation (weighted sum) again, we can approximate it through sampling:
$$\nabla J(\theta) \approx \frac{1}{N}\sum_{i=1}^N \nabla \log p_\theta(\tau^{(i)}) R(\tau^{(i)})$$

Let's look at the first part. The likelihoods of the trajectories depend on the transition
probabilities. But this turns out to not be a problem:

$$
\begin{align}
&\, \nabla \log p_\theta(\tau^{(i)}) \\
&= \nabla \log \left[
  \prod_{t=0}^H p(s_{t+1}^{(i)}|a_t^{(i)}|s_t^{(i)}) \pi_\theta(a_t^{(i)}|s_t^{(i)}) \right] \\
&= \nabla \sum_{t=0}^H \log p(s_{t+1}^{(i)}|a_t^{(i)}|s_t^{(i)}) +
  \nabla \sum_{t=0}^H \log \pi_\theta(a_t^{(i)}|s_t^{(i)}) \\
&= \nabla \sum_{t=0}^H \log \pi_\theta(a_t^{(i)}|s_t^{(i)})
\end{align}
$$

In the last step we were able to remove the first term since it does not depend on $\theta$, so its
gradient is zero.

Overall this gives us the following approximation of the gradient of the RL objective:

$$
\nabla J(\theta) \approx \frac{1}{N}\sum_{i=1}^N \sum_{t=0}^H
  \nabla_\theta \log \pi_\theta(a_t^{(i)}|s_t^{(i)}) R(\tau^{(i)})
$$

We can use this in the REINFORCE algorithm, which does these things iteratively:

- Sample trajectories
- Approximate $\nabla J(\theta)$
- Update $\theta$ using gradient descent: $\theta \leftarrow \theta + \alpha \nabla J(\theta)$

REINFORCE has notoriously high variance. Learning curves oscillate heavily, and training runs can
differ vastly depending on the seeds the pseudo-random generators were initialized with. Several
methods exist to reduce the variance.

One simple improvement is **reward-to-go**: instead of weighting every step's log-probability by the
total trajectory return $R(\tau)$, we weight each step $t$ by the sum of rewards from that step
onward:

$$
\nabla J(\theta) \approx \frac{1}{N}\sum_{i=1}^N \sum_{t=0}^H
  \nabla_\theta \log \pi_\theta(a_t^{(i)}|s_t^{(i)}) \sum_{k=t}^H r_k^{(i)}
$$

This makes sense because actions at time $t$ cannot influence rewards that were already collected
before $t$, and removing those irrelevant terms reduces variance.

Another common technique is subtracting a **baseline** from the return. In
[this notebook](https://github.com/mariogemoll/reinforcement-learning/blob/main/py/cartpole_pg.ipynb),
the baseline used is the mean return of the batch of sampled trajectories. Instead of weighting each
trajectory's log-probabilities by the raw return $R(\tau^{(i)})$, we subtract the batch mean and
divide by the standard deviation to obtain normalized advantages:

$$
\hat{A}^{(i)} = \frac{R(\tau^{(i)}) - \bar{R}}{\sigma_R + \epsilon}
$$

where $\bar{R} = \frac{1}{N}\sum_i R(\tau^{(i)})$ and $\sigma_R$ is the standard deviation of the
returns in the batch ($\epsilon$ is a "fuzz factor" to prevent division by zero). The gradient
estimate then becomes:

$$
\nabla J(\theta) \approx \frac{1}{N}\sum_{i=1}^N \sum_{t=0}^H
  \nabla_\theta \log \pi_\theta(a_t^{(i)}|s_t^{(i)}) \hat{A}_t^{(i)}
$$

Subtracting the baseline does not change the expected gradient (it is still an unbiased estimate),
but it reduces the variance: trajectories with above-average returns push the policy toward the
actions taken, while below-average trajectories push it away, rather than all trajectories pushing
in the same direction with different magnitudes.

A more powerful approach is a **state-dependent baseline**. Instead of subtracting a single scalar
(the batch mean), we train a separate neural network $V_\phi(s)$ that estimates the value of each
state. The advantage at each time step then becomes
$\hat{A}_t = \sum_{k=t}^H r_k - V_\phi(s_t)$. The value network is trained alongside the policy by
minimizing the mean squared error between its predictions and the observed returns. In
[this notebook](https://github.com/mariogemoll/reinforcement-learning/blob/main/py/pendulum_pg.ipynb),
a state-dependent baseline is used to solve the Pendulum environment.

[[ pendulum-visualization ]]

It's notable that while the final algorithm in this example (with value network and other
variance-reducing measures applied) does consistently solve the environment, there is still a lot of
variability depending on the seed for the pseudorandom generator used in training (see also
[this notebook](https://github.com/mariogemoll/reinforcement-learning/blob/main/py/pendulum_pg_multiseed.ipynb)).

## Actor-critic methods

Recall that in REINFORCE with a state-dependent baseline the advantage was

$$
\hat{A}_t = \sum_{k=t}^H r_k - V_\phi(s_t).
$$

Moreover, it was a Monte-Carlo method, meaning that we
had to collect a full episode before making any updates. We can replace the advantage with the TD(0)
error (like we did in the tabular world before)

$$
\delta_t = r_{t+1} + \gamma V_\phi(s_{t+1}) - V_\phi(s_t).
$$

In other words, instead of taking the whole reward(-to-go) as a signal for the gradient, we only
look at the immediate reward and use an estimate of the value of the next state (bootstrapping).
This means we can do an update at every time step, and we use the TD error $\delta_t$ to update the
weights of both the policy (the "actor") and the value function (the "critic"). The policy gets
updated by $\nabla \log \pi(a_t|s_t) \delta_t$.
For the value function, we use the mean squared error:
$\mathcal{L}_V(\phi) = \frac{1}{2} \left(V_\phi(s_t) - (r_{t+1} + \gamma V_\phi(s_{t+1}))\right)^2$.
Taking a gradient step on this loss yields:
$\phi \leftarrow \phi + \alpha_v \, \delta_t \, \nabla_\phi V_\phi(s_t)$.

To put it all in a nutshell, at every time step $t$:

- In state $s_t$, take action $a_t$ according to our policy $\pi$. Receive reward $r_{t+1}$ and land
  in state $s_{t+1}$.
- Compute TD error: $\delta_t = r_{t+1} + \gamma V_\phi(s_{t+1}) - V_\phi(s_t)$
- Update the critic (value function):
  $\phi \leftarrow \phi + \alpha_v \, \delta_t \, \nabla_\phi V_\phi(s_t)$
- Update the actor (policy):
  $\theta \leftarrow \theta + \alpha_\pi \, \delta_t \, \nabla_\theta \log \pi_\theta(a_t \mid s_t)$

This can be extended to an n-step version. For example, for n=3, run the policy for three
steps and collect

$$
(s_t, a_t, r_{t+1}), \qquad
(s_{t+1}, a_{t+1}, r_{t+2}), \qquad
(s_{t+2}, a_{t+2}, r_{t+3}), \qquad
s_{t+3}.
$$

For the most recent state-action pair $(s_{t+2}, a_{t+2})$, use  
$\delta_{t+2} = r_{t+3} + \gamma V_\phi(s_{t+3}) - V_\phi(s_{t+2})$  
to update the critic via
$\phi \leftarrow \phi + \alpha_v \, \delta_{t+2} \, \nabla_\phi V_\phi(s_{t+2})$  
and the actor via
$\theta \leftarrow \theta + \alpha_\pi \, \delta_{t+2} \, \nabla_\theta \log \pi_\theta(a_{t+2}\mid s_{t+2})$.

For the previous state-action pair $(s_{t+1}, a_{t+1})$, use  
$\delta_{t+1} = r_{t+2} + \gamma r_{t+3} + \gamma^2 V_\phi(s_{t+3}) - V_\phi(s_{t+1})$  
to update the critic via
$\phi \leftarrow \phi + \alpha_v \, \delta_{t+1} \, \nabla_\phi V_\phi(s_{t+1})$  
and the actor via
$\theta \leftarrow \theta + \alpha_\pi \, \delta_{t+1} \, \nabla_\theta \log \pi_\theta(a_{t+1}\mid s_{t+1})$.

Finally, for $(s_t, a_t)$, use  
$\delta_t = r_{t+1} + \gamma r_{t+2} + \gamma^2 r_{t+3} + \gamma^3 V_\phi(s_{t+3}) - V_\phi(s_t)$  
to update the critic via $\phi \leftarrow \phi + \alpha_v \, \delta_t \, \nabla_\phi V_\phi(s_t)$  
and the actor via
$\theta \leftarrow \theta + \alpha_\pi \, \delta_t \, \nabla_\theta \log \pi_\theta(a_t\mid s_t)$.

In general, the n-step version replaces the one-step TD error
$r_{t+1} + \gamma V_\phi(s_{t+1}) - V_\phi(s_t)$
with
$\delta_t = r_{t+1} + \gamma r_{t+2} + \cdots + \gamma^{n-1} r_{t+n} + \gamma^n V_\phi(s_{t+n}) - V_\phi(s_t)$
and then uses this quantity for both the critic and the actor updates.

This was introduced in [[ ref-mnih-et-al-2016 ]]. The implementation involved several asynchronous
workers (Asynchronous Advantage Actor-Critic, A3C). Shortly afterwards synchronous implementations
of the same algorithm became common, this variant is now referred to as Advantage Actor-Critic
(A2C).

## Generalized Advantage Estimation (GAE)

The n-step formulation above reduces the variance of the gradient estimate compared to Monte-Carlo
returns, but it introduces a bias through bootstrapping. In practice there is a trade-off:

- Small n: high bias, low variance
- Large n: low bias, high variance

Instead of choosing a fixed n, we can combine multiple n-step advantages using an exponentially
weighted average. This leads to Generalized Advantage Estimation (GAE), introduced in
[[ ref-schulman-et-al-2015 ]] and widely used in modern policy-gradient methods such as PPO.

The n-step advantage can be written as a sum of discounted TD errors

$$
A_t^{(n)} =
\delta_t
+ \gamma \delta_{t+1}
+ \gamma^2 \delta_{t+2}
+ \dots
+ \gamma^{n-1} \delta_{t+n-1}.
$$

GAE forms a weighted combination of these:

$$
\hat{A}_t^{\text{GAE}(\gamma,\lambda)}
=
\sum_{l=0}^{\infty}
(\gamma \lambda)^l
\delta_{t+l}.
$$

In practice, of course, this sum is not infinite. We have a limited number of steps in our rollout,
after which the sum gets truncated.

The parameter $\lambda \in [0,1]$ controls the bias–variance trade-off:

- $\lambda = 0$: $\hat{A}_t = \delta_t$ (TD(0), very low variance but biased)
- $\lambda = 1$: approximates the Monte-Carlo advantage
- $0 < \lambda < 1$: interpolates smoothly between the two

The policy update becomes

$$
\nabla_\theta J(\theta)
=
\mathbb{E}\left[
\nabla_\theta \log \pi_\theta(a_t|s_t)\,\hat A_t
\right].
$$

The value function is typically trained using a regression target for the return

$$
R_t = \hat{A}_t^{\text{GAE}} + V(s_t),
$$

with loss
$$
\| R_t - V(s_t) \|^2.
$$

In modern implementations (e.g. PPO), the workflow typically becomes:

1. Run the policy for $T$ steps, collect $(s_t,a_t,r_{t+1},s_{t+1})$.
2. Compute $\delta_t = r_{t+1} + \gamma V(s_{t+1}) - V(s_t)$.
3. Compute advantages backwards: $\hat A_t = \delta_t + \gamma\lambda \hat A_{t+1}$.
4. Compute value targets $R_t = \hat A_t + V(s_t)$.
5. Update policy using advantages.
6. Update value function using $R_t$.

<h2 id="ppo">Proximal Policy Optimization (PPO)</h2>

One issue with policy gradient is that in practice updates can be too aggressive. Because the
gradient is estimated from sampled trajectories, a single update can change the policy drastically,
so that it behaves poorly and previously learned behavior gets destroyed. Training becomes instable
or collapses. To mitigate this, researchers tried to find ways to restrict updates so that they do
not move the policy too far in one step.

An early solution, Trust Region Policy Optimization (TRPO), addressed this by solving

$$
\max_\theta \; \mathbb{E}\left[ \frac{\pi_\theta(a|s)}{\pi_{\theta_{old}}(a|s)} A \right]
$$

subject to a KL constraint

$$
D_{KL}(\pi_{\theta_{old}} \,\|\, \pi_\theta) \le \delta.
$$

This prevents the new policy from drifting too far from the previous one. However, TRPO had
complicated implementations, requiring second-order optimization and conjugate gradients. Proximal
Policy Optimization (PPO) simplifies this:

We define the probability ratio (like in TRPO)

$$
r_t(\theta)
=
\frac{\pi_\theta(a_t|s_t)}
{\pi_{\theta_{old}}(a_t|s_t)}
$$

and then maximize

$$
L^\text{CLIP}(\theta) = \mathbb{E}\Big[
\min \left(
r_t(\theta)\hat A_t
\, ,\,
\text{clip}(r_t(\theta),1-\epsilon,1+\epsilon)\hat A_t
\right )
\Big].
$$

This clipping also prevents the policy from steering too far off, but is much easier to work with.

- When $\hat{A}_t > 0$: The action was better than average. We
want to increase its probability, but the clip caps the gain at $1+\epsilon$ to prevent
over-optimism.
- When $\hat{A}_t < 0$: The action was worse than average. We decrease its probability,
but the clip prevents us from "over-punishing" the policy if the ratio drops below $1-\epsilon$.

In practice, PPO is implemented as an actor-critic method. The total loss function minimized during
training usually combines three distinct terms:

$$
L_t^{\text{PPO}}(\theta, \phi) =
\mathbb{E}_t \left[
  L_t^{\text{CLIP}}(\theta) - c_1 L_t^{\text{VF}}(\phi) + c_2 S[\pi_\theta](s_t)
\right]
$$

- $L_t^{\text{CLIP}}$ (clipped surrogate objective): As just described.
- $L_t^{\text{VF}}$ (value function loss): A squared-error loss $(V_\phi(s_t) - V^{\text{target}}_t)^2$
that ensures the Critic accurately predicts the expected return.
- $S[\pi_\theta] = \mathcal{H}(\pi_\theta(\cdot \mid s))$ (entropy bonus): This rewards the policy
for maintaining a degree of randomness.  It prevents premature convergence by ensuring the agent
continues to explore different actions.

$c_1$ and $c_2$ are hyperparameters that balance policy learning, value fitting, and exploration.

PPO's success relies on several specific implementation "tricks" that ensure stable and
efficient learning:

Synchronous parallel rollouts: PPO typically runs $N$ environments in parallel.
It collects a fixed window of $T$ steps from each environment before performing an update. This
"batch" of $N \times T$ samples provides a more stable gradient than a single trajectory.

Advantage normalization: Before updating, the GAE advantages $\hat{A}_t$ are often normalized
(subtracting the mean and dividing by the standard deviation) across the entire batch. This keeps
the scale of the gradients consistent regardless of the environment's reward magnitude.

Multiple Epochs per Batch:
Unlike vanilla Policy Gradient (which discards data after one update), PPO's clipping allows us to
perform multiple epochs of SGD on the same batch of data. This significantly improves sample
efficiency without risking the "policy collapse" seen in older methods.

GAE Integration: PPO uses Generalized Advantage Estimation (GAE) to calculate $\hat{A}_t$, allowing
the user to tune the $\lambda$ parameter to find the sweet spot between bias (from bootstrapping)
and variance (from Monte-Carlo returns).

The full algorithm is as follows (note that we also collect d_t, which is 1 when the rollout is
done, and that we use log probabilities for numerical stability):

$$
\begin{aligned}
&\textbf{Initialize policy parameters } \theta,\ \textbf{value parameters } \phi \\[4pt]
&\textbf{Choose hyperparameters } N,T,K,M,\gamma,\lambda,\epsilon,c_1,c_2 \\[8pt]

&\textbf{repeat} \\[4pt]

&\quad \textbf{Collect rollout data using the current policy } \pi_\theta \\[2pt]
&\quad \textbf{for each environment step } t=0,\dots,T-1 \textbf{ and each of } N
  \text{ environments do} \\[2pt]
&\qquad a_t \sim \pi_\theta(\cdot \mid s_t) \\
&\qquad \ell_t \leftarrow \log \pi_\theta(a_t \mid s_t) \\
&\qquad v_t \leftarrow V_\phi(s_t) \\
&\qquad \text{Execute } a_t,\ \text{observe } r_t,\ s_{t+1},\ d_t \\
&\qquad \text{Store } (s_t,a_t,r_t,s_{t+1},d_t,\ell_t,v_t) \\[2pt]
&\quad \textbf{end for} \\[8pt]

&\quad \textbf{Bootstrap the final value} \\
&\quad v_T \leftarrow V_\phi(s_T) \\[8pt]

&\quad \textbf{Compute GAE advantages backwards} \\
&\quad \hat A_T \leftarrow 0 \\[2pt]
&\quad \textbf{for } t=T-1,\dots,0 \textbf{ do} \\
&\qquad \delta_t \leftarrow r_t + \gamma (1-d_t)\, v_{t+1} - v_t \\
&\qquad \hat A_t \leftarrow \delta_t + \gamma\lambda(1-d_t)\hat A_{t+1} \\
&\qquad \hat V_t \leftarrow \hat A_t + v_t \\
&\quad \textbf{end for} \\[8pt]

&\quad \textbf{Normalize advantages over the whole batch} \\
&\quad \hat A_t \leftarrow \frac{\hat A_t - \mu_A}{\sigma_A + \varepsilon_{\text{norm}}} \\[8pt]

&\quad \textbf{Flatten the } N \times T \textbf{ rollout into one batch} \\[2pt]
&\quad \text{with stored old log-probabilities } \ell_t^{\text{old}} \leftarrow \ell_t \\[8pt]

&\quad \textbf{for } k=1,\dots,K \textbf{ epochs do} \\[2pt]
&\qquad \text{Shuffle the batch and split it into minibatches of size } M \\[4pt]

&\qquad \textbf{for each minibatch } \mathcal{B} \textbf{ do} \\[2pt]

&\qquad\quad \ell_t \leftarrow \log \pi_\theta(a_t \mid s_t), \qquad t \in \mathcal{B} \\
&\qquad\quad v_\theta(s_t) \leftarrow V_\phi(s_t), \qquad t \in \mathcal{B} \\
&\qquad\quad r_t(\theta) \leftarrow \exp\!\big(\ell_t - \ell_t^{\text{old}}\big) \\[8pt]

&\qquad\quad L_t^{\text{CLIP}}(\theta) \leftarrow
\min\!\left(
r_t(\theta)\hat A_t,\;
\mathrm{clip}\!\big(r_t(\theta),1-\epsilon,1+\epsilon\big)\hat A_t
\right) \\[10pt]

&\qquad\quad L_t^{VF}(\phi) \leftarrow \big(v_\theta(s_t)-\hat V_t\big)^2 \\[8pt]

&\qquad\quad S_t \leftarrow S[\pi_\theta](s_t) \\[8pt]

&\qquad\quad J(\theta,\phi) \leftarrow
\frac{1}{|\mathcal{B}|}\sum_{t \in \mathcal{B}}
\left[ L_t^{\text{CLIP}}(\theta) - c_1 L_t^{VF}(\phi) + c_2 S_t \right] \\[10pt]

&\qquad\quad \text{Update } \theta,\phi \text{ by ascending } \nabla J(\theta,\phi) \\
&\qquad\quad \text{(equivalently, minimize } -J(\theta,\phi)\text{)} \\[4pt]

&\qquad \textbf{end for} \\[4pt]
&\quad \textbf{end for} \\[8pt]

&\textbf{until training converges}
\end{aligned}
$$

PPO has struck a balance between ease of implementation, sample efficiency, and ease of tuning that
has made it the starting point for almost any RL project today.

Here are some PPO-trained MuJoCo Hopper agents for your enjoyment. Train your own using
[this notebook](https://github.com/mariogemoll/reinforcement-learning/blob/main/py/hopper_ppo.ipynb)!

[[ hopper-visualization ]]

Starting from the formalism of Markov decision processes, we built up the basic vocabulary of
reinforcement learning: policies, returns, value functions, and the Bellman equations. We then
examined both planning in model-known settings through dynamic programming and learning in
model-free settings through Monte Carlo and temporal-difference methods, including SARSA,
Q-learning, and function approximation. Finally, we discussed policy-gradient and actor-critic
methods, culminating in GAE and PPO, which play a central role in contemporary reinforcement
learning practice.

[[ references ]]
