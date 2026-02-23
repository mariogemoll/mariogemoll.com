<!-- SPDX-FileCopyrightText: 2026 Mario Gemoll -->
<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# [[ page-title ]]

Reinforcement learning formalizes the problem of an agent learning to act in an environment by
maximizing cumulative reward. This page covers the foundations: Markov decision processes, policies,
value functions, and the Bellman equations.

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

So far, we have introduced Markov decision processes, value functions, dynamic programming, Monte
Carlo methods, and temporal-difference learning. Together, these form the conceptual basis for
control algorithms and modern reinforcement learning methods, including policy-gradient approaches.
