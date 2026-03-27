<!-- SPDX-FileCopyrightText: 2026 Mario Gemoll -->
<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# [[ page-title ]]

## Reinforcement Learning from Human Feedback

In traditional reinforcement learning we try to iteratively make a policy better, ie. learn a policy
that maximizes the reward we get from the environment. In LLM posttraining we don't really have an
environment, but we want to make our "policy" (the LLM) better as in more aligned with certain
preferences while not losing previously learned capabilities. Since the preference data we train on
comes from humans, we call this reinforcement learning from human feedback.

In this context, states are (partially) generated sequences of text, i.e., the prompt tokens and all
response tokens generated so far. An action is then simply the next token to add to that sequence.

## Value model

In some RL algorithms we need state value functions. In a typical LLM transformer the last layer is
an unembedding layer that turns the hidden states into vocabulary logits (hidden dims -> vocab size)
. We can simply replace this with one that maps each token to a single value (hidden dims -> 1),
for example like this in PyTorch:

```python
import torch
import torch.nn as nn

class ValueModel(nn.Module):
    def __init__(self, base_model):
        super().__init__()
        self.base_model = base_model  # e.g. AutoModel.from_pretrained(...)

        # scalar head: d → 1 (applied to every token)
        self.value_head = nn.Linear(base_model.config.hidden_size, 1)

    def forward(self, input_ids, attention_mask):
        # forward through transformer
        outputs = self.base_model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            output_hidden_states=False,
            return_dict=True,
        )

        # [B, T, d]
        hidden_states = outputs.last_hidden_state

        # [B, T]
        values = self.value_head(hidden_states).squeeze(-1)

        return values
```

Usually the value model is trained by finetuning an existing language model (the one we want to do
RLHF on). In practice, the policy model and value model are often implemented as one model with two
heads.

## Reward model

What we'll also need for our reward is a reward model. The idea is that we use a dataset of human
preference data to train a model that can score how good a given response is, i.e. for a given
prompt x and response y we get a scalar score. We will then later use this model to estimate rewards
for responses from the LLM. So in RLHF the human feedback typically isn't directly on the model
responses, but on data that is used to train a reward model that will then evaluate model responses.
To build such a model we can adapt an existing LLM as we did above for the value model, however here
we only to the end-of-sequence token:

```python
class RewardModel(nn.Module):
    def __init__(self, base_model):
        super().__init__()
        self.base_model = base_model

        # scalar head: d → 1
        self.reward_head = nn.Linear(base_model.config.hidden_size, 1)

    def forward(self, input_ids, attention_mask):
        # forward through transformer
        outputs = self.base_model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            output_hidden_states=False,
            return_dict=True,
        )

        # [B, T, d]
        hidden_states = outputs.last_hidden_state

        # compute last valid token index per sequence
        lengths = attention_mask.sum(dim=1)          # [B]
        idx = lengths - 1                            # [B]

        # gather last hidden state: [B, d]
        h_last = hidden_states[torch.arange(hidden_states.size(0)), idx]

        # scalar reward: [B]
        rewards = self.reward_head(h_last).squeeze(-1)

        return rewards
```

Typically, the dataset for such a model doesn't consist of $(x, y, \text{score})$ triples, but of
$(x, y_\text{chosen}, y_\text{rejected})$ triples where one response is preferred over the other
(you might have contributed to such a dataset by clicking "I prefer this response" in a chatbot
app).

For training we make use of the Bradley-Terry assumption. Without going into detail, it says that
the probability of $y_\text{chosen}$ being preferred over $y_\text{rejected}$ is equal to the
sigmoid of the difference of the rewards for the responses:

$$
P(y_{\text{chosen}} \succ y_{\text{rejected}}) =
\sigma\big(r_\theta(x, y_{\text{chosen}}) - r_\theta(x, y_{\text{rejected}})\big)
$$

The training objective then becomes

$$
\mathcal{L} = - \log \sigma\big(r_\theta(x, y_c) - r_\theta(x, y_r)\big)
$$

or, in PyTorch:

```python
import torch
import torch.nn.functional as F

def bradley_terry_loss(r_chosen, r_rejected):
    # r_* shape: (batch,)
    return -F.logsigmoid(r_chosen - r_rejected).mean()
```

## RLHF using PPO

To do full PPO using RLHF, conceptually we need four models:

- A reward model $\text{RM}$
- A reference model $\pi_\text{ref}$
- A value model $V$
- The actual model we want to train $\pi$

The algorithm is then as follows:

In every iteration:

- Sample prompts $x_i$ and generate responses $y_i$. also store the probabilities $\pi(a_t|s_t)$
  (later referred to as $\pi_\text{old}(a_t|s_t)$).
- for each (x,y):
  - Calculate the KL penalty against the reference on the token level:
    $r_t = - \beta \left(\log \pi_\text{old}(a_t|s_t) - \log \pi_{\text{ref}}(a_t|s_t)\right)$
  - Calculate the reward model score: $r_{\text{RM}} = r_\theta(x, y)$
  - Add the reward model score to the last token only
  - Compute the TD error using the values from the value model:
    $\delta_t = r_t + \gamma V(s_{t+1}) - V(s_t)$
  - Calculate advantages using GAE: $A_t = \sum_{l=0}^{\infty} (\gamma \lambda)^l \delta_{t+l}$
  - Calculate value function targets: $V^\text{target}_t = A_t + V(s_t)$.
- Then, for each epoch:
  - Calculate the ratio $ρ_t = \frac{\pi(a_t|s_t)}{\pi_\text{old}(a_t|s_t)}$
  - Update policy model using
  $L^{CLIP}(\theta)=\mathbb{E}_t [\min(ρ_t \hat{A}_t,\text{clip}(ρ_t,1-\epsilon,1+\epsilon) \hat{A}_t)]$
  - Update value model using
      $L^{VF}(\phi) = \frac{1}{2} (V_\phi(s_t) - V^\text{target}_t)^2$

## DPO

It turns out that there is an analytical best policy solution to the RLHF objective, which will make
things much easier, if we assume the human preferences follow the Bradley-Terry model:

The RLHF objective is:

$$
\max_{\pi} \mathbb{E}_{y \sim \pi(y|x)} [r(x,y)] - \beta, \mathbb{D}_{KL}(\pi(y|x) || \pi_{\text{ref}}(y|x))
$$

This is a constrained optimization problem. There is an exact solution for the optimal policy
$\pi^*$ for this objective which can be derived using some optimization math (Lagrangian):

$$
\pi^*(y|x) = \frac{1}{Z(x)} \pi_{\text{ref}}(y|x) \exp\left( \frac{1}{\beta} r(x,y) \right)
$$

The Z(x) here is an inconvenient normalization constant which we can't compute. However, it will
turn out to not be a problem, so just think of it as some constant for now.

Let's rearrange the formula:

$$\exp\left( \frac{1}{\beta} r(x,y) \right) = Z(x) \frac{\pi^*(y|x)}{\pi_{\text{ref}}(y|x)}$$

Taking the logarithm, we can express the reward using just the policy ratios:

$$r(x,y) = \beta \log \frac{\pi^*(y|x)}{\pi_{\text{ref}}(y|x)} + \beta \log Z(x)$$

Let’s take a minute to think about what that means: We assume we know human preferences and can
express them using a reward function. We then define the objective of finding a policy that
maximizes this reward while staying close to the reference policy (via a KL penalty). The resulting
optimal policy increases the probability of high-reward completions and decreases the probability of
low-reward ones relative to the reference model.  Because of this, the reward of a completion can be
expressed (up to a prompt-dependent constant) as the log of the ratio between how likely the optimal
policy is to produce that completion and how likely the reference model is to produce it.

Let's plug this into the Bradley-Terry formula:

$$
\begin{align}
P(y_{\text{chosen}} \succ y_{\text{rejected}})
&= \sigma\big(r_\theta(x, y_{\text{chosen}}) - r_\theta(x, y_{\text{rejected}})\big) \\
&= \sigma \left(
    \left[ \beta \log \frac{\pi^*(y_\text{chosen}|x)}{\pi_{\text{ref}}(y_\text{chosen}|x)} +
        \beta \log Z(x) \right] -
    \left[ \beta \log \frac{\pi^*(y_\text{rejected}|x)}{\pi_{\text{ref}}(y_\text{rejected}|x)} +
        \beta \log Z(x) \right]
\right) \\
&= \sigma \left(
    \beta \log \frac{\pi^*(y_\text{chosen}|x)}{\pi_{\text{ref}}(y_\text{chosen}|x)} -
    \beta \log \frac{\pi^*(y_\text{rejected}|x)}{\pi_{\text{ref}}(y_\text{rejected}|x)}
\right)
\end{align}
$$

In the last step the hairy Z(x) canceled out nicely.

Now, the optimal policy is the one that would maximize the probability
$P(y_{\text{chosen}} \succ y_{\text{rejected}})$.
We don't know the optimal policy, but we have training data, and we can train our model so that it
optimizes the probability (or rather, minimizes the negative log probability):

$$
\mathcal{L}_{DPO}(\pi_\theta; \pi_{\text{ref}}) =
-\mathbb{E}_{(x, y_w, y_l) \sim D} \left[ \log \sigma \left(
    \beta \log \frac{\pi_\theta(y_\text{chosen}|x)}{\pi_{\text{ref}}(y_\text{chosen}|x)} -
    \beta \log \frac{\pi_\theta(y_\text{rejected}|x)}{\pi_{\text{ref}}(y_\text{rejected}|x)}
\right) \right]
$$

This means we've turned an RL problem into a much simpler binary classification problem!

Here is a sketch of an implementation of the algorithm in PyTorch:

```python
beta = 0.1 # KL-penalty coefficient
optimizer = torch.optim.AdamW(policy.parameters(), lr=5e-7)

def get_batch_logps(logits, labels, mask):
    """
    Sum the log-probabilities of the tokens in the completion.
    logits: [batch, seq_len, vocab_size]
    labels: [batch, seq_len] (Token IDs)
    mask:   [batch, seq_len] (1 for completion tokens, 0 for prompt/padding)
    """
    # Standard log_softmax over the vocabulary dimension
    log_probs = F.log_softmax(logits, dim=-1)

    # Pick the log-prob for the actual token at each position
    per_token_logps = torch.gather(log_probs, dim=-1, index=labels.unsqueeze(-1)).squeeze(-1)

    # Sum across the sequence length, ignoring the prompt via the mask
    return (per_token_logps * mask).sum(-1)

for batch in dataloader:
    # Concatenate chosen and rejected to process in one GPU pass
    all_responses = torch.cat([batch.chosen, batch.rejected], dim=0)
    all_masks = torch.cat([batch.chosen_mask, batch.rejected_mask], dim=0)

    # Forward passes
    policy_logits = policy(all_responses).logits
    with torch.no_grad():
        ref_logits = ref_model(all_responses).logits

    # Calculate sequence-level log-probabilities: log pi(y|x)
    all_logps = get_batch_logps(policy_logits, all_responses, all_masks)
    all_ref_logps = get_batch_logps(ref_logits, all_responses, all_masks)

    # Split back into chosen (w) and rejected (l)
    logp_w, logp_l = all_logps.chunk(2)
    ref_logp_w, ref_logp_l = all_ref_logps.chunk(2)

    # reward_difference = [beta * log(pi/ref)_w] - [beta * log(pi/ref)_l]
    # Note: log(a/b) = log(a) - log(b)
    implicit_reward_w = beta * (logp_w - ref_logp_w)
    implicit_reward_l = beta * (logp_l - ref_logp_l)

    # Loss = -E [ log sigma ( reward_w - reward_l ) ]
    loss = -F.logsigmoid(implicit_reward_w - implicit_reward_l).mean()

    # Backprop
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
```

Because of its simplicity and stability, DPO has effectively replaced PPO as the industry's default
alignment algorithm. While some labs still use RL for its exploration capabilities, DPO is now the
standard "workhorse" for turning a base model into a chat-aligned assistant. However, DPO only
learns from the data in the training set, no new text is generated, there is no exploration. That's
why PPO can still lead to better outcomes in certain situations.
