<!-- SPDX-FileCopyrightText: 2026 Mario Gemoll -->
<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# [[ page-title ]]

## Markov Decision Process

The mathematical model for reinforcement learning is the **Markov Decision Process (MDP)**. An MDP
is defined by:

- A set of states $S$
- A set of actions $A$
- Transition probabilities $Pr(s'|s, a)$
- A starting point or starting point distribution
- A reward function $R(r|s, a, s')$: The reward associated with choosing action $a$ in state $s$
and landing in state $s'$
- Depending on the formulation, a discount factor, a horizon H, or both.

Remark: Depending on the algorithm, the reward is given as a function of the state and action only.
It is then the expectation of the reward function $R(r|s, a, s')$ over the next state $s'$:

$$
R(s,a)
\;:=\;
\mathbb{E}[\,r_{t+1} \mid s_t=s,a_t=a\,]
=
\mathbb{E}_{s'}[R(s,a,s')]
=
\sum_{s'} P(s' \mid s,a)\,R(s,a,s')
$$
