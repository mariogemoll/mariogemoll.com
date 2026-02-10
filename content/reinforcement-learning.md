<!-- SPDX-FileCopyrightText: 2026 Mario Gemoll -->
<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# [[ page-title ]]

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

The usual objective is to find a policy that maximizes the expected return over all starting states
and trajectories:

$$
\pi^* \;=\; \arg\max_\pi \; \mathbb{E}_\pi \!\left[ \sum_{t=0}^{\infty} \gamma^t \, r_{t+1} \right].
$$

## Return

The **return** is the discounted sum of future rewards starting at time step $t$:

$$
G_t
\;:=\;
\sum_{k=0}^{\infty} \gamma^k \, r_{t+k+1}.
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

Assuming the optimal state-value function v^* is known, an optimal (greedy) policy can be derived
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
