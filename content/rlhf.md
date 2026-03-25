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
