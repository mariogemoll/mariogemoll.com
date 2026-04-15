<!-- SPDX-FileCopyrightText: 2026 Mario Gemoll -->
<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# [[ page-title ]]

After a language model is trained on a large corpus of text, it becomes effective at modeling and
continuing text sequences. This stage is commonly referred to as *pretraining*. In practice,
however, pretrained models are typically not yet well-suited for downstream use. A series of
additional training steps, often grouped under the term *posttraining*, are therefore applied to
make the model more useful for specific applications. The distinction between pretraining and
posttraining (and sometimes *"midtraining"*) is not always sharp and can vary across workflows.

## LoRA

One tool that is frequently used in posttraining (although it can also be used more broadly in
machine learning) is low-rank adaptation (LoRA, [[ ref-hu-et-al-2021 ]]). It allows making updates
to a matrix in a low-dimensional subspace using far fewer parameters than updating each entry
individually, thus greatly reducing memory and compute requirements.

Assume we apply changes $\Delta W$ to a weight matrix $W \in \mathbb{R}^{d \times k}$:
$$
W' = W + \Delta W
$$

In LoRA, the update is parameterized using two low-rank matrices $A \in \mathbb{R}^{r \times k}$ and
$B \in \mathbb{R}^{d \times r}$ with $r \ll \min(d,k)$ such that

$$
W' = W + BA.
$$

<img src="/llm-posttraining/lora.svg"
    alt="A figure showing the dot product of a 10x3 and a 3x10 matrix resulting in a 10x10 matrix">

By construction, the update satisfies $\operatorname{rank}(\Delta W) \le r$, meaning we restrict
updates to a low-dimensional subspace. This leads to a significant reduction in parameters, from
$d \cdot k$ for a full update to $r(d + k)$ with LoRA, which is much smaller when $r \ll \min(d,k)$.

A concrete example illustrates the scale of this reduction. Consider a typical transformer
projection matrix with size 4096 × 4096, which contains about 16.8 million parameters. A full
update would require modifying all of them. In contrast, using LoRA with a small rank such as r = 8
introduces only 8(4096 + 4096) = 65,536 trainable parameters, 256 times fewer. Despite this
drastic compression, such low-rank updates are often sufficient to adapt large models effectively,
which is what makes LoRA so practical for fine-tuning.

In practice, a scaling factor $\alpha$ (not the learning rate) is applied:
$$
W' = W + \frac{\alpha}{r} BA,
$$
which keeps the magnitude of the update roughly invariant as $r$ changes.

During training, the base weights $W$ are typically frozen, and only $A$ and $B$ are updated. This
makes LoRA particularly efficient for fine-tuning large models.

From a forward-pass perspective, instead of computing $Wx$, we have
$$
Wx \;\to\; Wx + \frac{\alpha}{r}\, B(Ax).
$$
i.e., the input is first projected down to $\mathbb{R}^r$ and then lifted back to $\mathbb{R}^d$.

Since the update is additive, a single base model can be shared across many LoRA adapters, each
representing a different task. After training, the update can be merged into the base weights,
allowing standard inference without additional overhead. If desired, this merge can be reversed
later by keeping track of the original weights.

## Supervised Fine-Tuning

The first posttraining step is usually supervised fine-tuning (SFT). The goal is to adapt the
pretrained model to follow instructions and produce outputs in a desired interaction format (e.g.,
chat-based dialogue). This is achieved by training on curated prompt-response pairs using the same
next-token prediction objective as in pretraining, typically with a cross-entropy loss.

The result of SFT is an "instruct" model, which serves as the foundation for further posttraining
steps.

## Reinforcement Learning from Human Feedback

The remainder of this page will be about reinforcement learning in the context of LLMs/transformers.
First we'll look at reinforcement learning from human feedback, in which preference data generated
by humans ("this answer is better than that one") is used to influence the model's behaviour in a
certain way (e.g. to make it answer in a polite way). Later we'll also discuss reinforcement
learning from verifiable rewards, where we'll use an objective scoring function to model better at
certain tasks (e.g. make it better at solving math by checking results).

As usual with RL, we need to define some MDP. In the context of RLHF/RLVR, a state is a sequence of
text (ie. all the tokens generated so far). Often we denote the prompt by $x$ and the completion by
$y$: $s_t = (x, y_{\lt t})$

An action is simply the next token from the vocabulary to add. Therefore, there is no stochasticity
in state transitions. For a given policy (ie. language model), the result of choosing an action in a
state, ie. adding a token to an existing sequence, is simply the sequence with the token added.

Note that we can use a transformer to give the probability of a certain action in a certain state
(ie., the policy), by looking at the output probabilities:
$\pi_\theta(a_t \mid s_t) = \text{softmax}(\text{logits}_\theta(s_t))$.

We can also give the probability for a whole sequence as the product of the individual token
probablities:

$$
\pi(y|x) = \prod_{t} \pi(y_t \mid x, y_{\lt t})
$$

### Value model

In some RL algorithms we need state value functions. As stated above, states are sequences of text
up to a certain token, so value here means "how good is the text so far". We can construct a machine
learning model for a state value function by altering and finetuning an existing LLM. In a typical
LLM transformer the last layer is an unembedding layer that turns the hidden states into vocabulary
logits (hidden dims -> vocab size) . We can simply replace this with one that maps each token to a
single value (hidden dims -> 1), for example like this in PyTorch:

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

### Reward model

One fundamental piece of RL we haven't talked about so far: The reward. In traditional RL, the agent
chooses an action, or a sequence of actions and gets a reward. In RLHF (and also later in RLVR),
we'll get a reward for a completed sequence. The idea is that we use a dataset of human preference
data to train a model that can score how good a given response is, i.e. for a given prompt x and
response y we get a scalar score. We will then later use this model to estimate rewards for
responses from the LLM. So in RLHF the human feedback typically isn't directly on the model
responses, but on data that is used to train a reward model that will then evaluate model responses.
To build such a model we can adapt an existing LLM as we did above for the value model, however here
we only look at the end-of-sequence token:

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

After training we have a model that can estimate a score a human evaluator would give for a certain
text (i.e., prompt + answer) generated by the model.

### KL divergence and the RLHF objective

Overall the objective of RLHF, as in regular RL, is to find the policy that maximizes the reward we
get for our actions (i.e. generations). However we also want to make sure the model doesn't deviate
too much from the base model, so we add a penalty for the KL divergence:

$$
\max_\pi \;\mathbb{E}_{x \sim \mathcal{D},\, y \sim \pi(\cdot|x)} \big[ r(x,y) \big]
\;-\;
\beta \, D_{\mathrm{KL}}\!\left(\pi(\cdot|x)\,\|\,\pi_{\text{ref}}(\cdot|x)\right)
$$

$\beta$ is a hyperparameter that controls the strength of the KL regularization term.

The KL divergence term is defined over full sequences:

$$
D_{\mathrm{KL}}\!\left(\pi(\cdot|x)\,\|\,\pi_{\mathrm{ref}}(\cdot|x)\right)
=
\mathbb{E}_{y\sim\pi}\!\left[
\log\frac{\pi(y|x)}{\pi_{\mathrm{ref}}(y|x)}
\right]
=
\mathbb{E}_{y\sim\pi}\!\left[
\log\pi(y|x) - \log \pi_{\mathrm{ref}}(y|x)
\right]
$$

However as we'll see we usually only calculate it on the token level
$(\log \pi(y_t\mid s_t)-\log \pi_{\mathrm{ref}}(y_t\mid s_t))$.

### RLHF using PPO

As in many areas, [PPO](/reinforcement-learning#ppo) is a good standard algorithm that can be used
for RLHF. Conceptually we need four models:

- A reward model $\text{RM}$ (described above)
- A value model $V$ (described above)
- A reference model $\pi_\text{ref}$ (the base model)
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
  - Calculate the ratio $\rho_t = \frac{\pi(a_t|s_t)}{\pi_\text{old}(a_t|s_t)}$
  - Update policy model using
  $L^{CLIP}(\theta)=\mathbb{E}_t [\min(ρ_t \hat{A}_t,\text{clip}(ρ_t,1-\epsilon,1+\epsilon) \hat{A}_t)]$
  - Update value model using
      $L^{VF}(\phi) = \frac{1}{2} (V_\phi(s_t) - V^\text{target}_t)^2$

### DPO

It turns out that there is an analytical best policy solution to the RLHF objective, which will make
things much easier, if we assume the human preferences follow the Bradley-Terry model:

The RLHF objective is:

$$
\max_{\pi} \mathbb{E}_{y \sim \pi(y|x)} [r(x,y)] - \beta\, \mathbb{D}_{KL}(\pi(y|x) || \pi_{\text{ref}}(y|x))
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

## Reinforcement Learning from Verifiable Rewards

RLHF uses preference data (good vs. bad examples) to nudge a model toward desired behaviors, often
related to style, helpfulness, or safety. In Reinforcement Learning from Verifiable Rewards (RLVR),
the reward model is replaced by a verifier capable of assigning rewards based on objective,
deterministic metrics. For example, we might ask the model to solve a math problem and score the
output based on whether the answer is correct.  By sampling multiple outputs and using these reward
signals, we can directly improve the model's task performance. This goes beyond shaping style: it
can increase reliability and, in some cases, help elicit latent capabilities already present in the
model.

While RLVR can be done using PPO, often a modified algorithm called Group Relative Policy
Optimization (GRPO) is used, introduced in 2024 in the DeepSeekMath paper
([[ ref-shao-et-al-2024 ]]).

We typically take a prompt (think: a textual math problem) and let the model generate a "group" of
several completions for the prompt, which all get scored by the verifier. We can then calculate the
advantage of each response by simply measuring how much "better" it is than the average of the
group (similar to a basic average baseline in REINFORCE), scaled by the standard deviation over the
group.

$$
\hat A_i = \frac{r_i - \mu}{\sigma}
$$

Note that there is no critic/value function like in PPO, also no TD error, GAE, or per-token KL
divergence calculation. We only look at sequence-level scores.

Similar to PPO, once we've calculated the advantages, we run several epochs of maximizing the
following objective:

$$
\mathcal J_\text{GRPO}(\theta) =
\mathbb E_{x \sim P(Q), \{y_i\}_{i=1}^G \sim \pi_{\theta_\text{old}}} \left [
    \frac{1}{G} \sum_{i=1}^G \frac{1}{|y_i|} \sum_{t=1}^{|y_i|} \left (
        \mathcal C_\epsilon \left(
            \frac
                {\pi_\theta(y_{t+1}^{(i)}|x,y_{1:t}^{(i)})}
                {\pi_{\theta_\text{old}}(y_{t+1}^{(i)}|x,y_{1:t}^{(i)})},
            \hat A_i
        \right) -
        \beta D_\text{KL}(\pi_\theta, || \pi_\text{ref})
    \right )
\right ]
$$

$\hat A_i$ is as described above, $\mathcal C_\epsilon$ is the clipped deviation from the previous
iteration model like in PPO, and the KL divergence is estimated like this:

$$
D_\text{KL}(\pi_\theta || \pi_\text{ref}) \approx
\frac{\pi_\text{ref}(y_{t+1}^{(i)}|x,y_{1:t}^{(i)})}{\pi_\theta(y_{t+1}^{(i)}|x,y_{1:t}^{(i)})}
- \log
    \frac{\pi_\text{ref}(y_{t+1}^{(i)}|x,y_{1:t}^{(i)})}{\pi_\theta(y_{t+1}^{(i)}|x,y_{1:t}^{(i)})}
- 1
$$

## A practical example: Getting better at GSM8K

This text is accompanied by a [GitHub repo](https://github.com/mariogemoll/llm-posttraining) showing
an example of a posttraining pipeline consting of SFT and RLVR. GSM8K is a relatively simple
benchmark consisting of school math word problems (1.32k in the testset, 7.47k rows in the training
set, of which we take 0.5k for the validation set).
[Qwen2.5-Math-1.5B](https://huggingface.co/Qwen/Qwen2.5-Math-1.5B) achieves a zero-shot accuracy of
51.20% on the validation set "out of the box". After one epoch of SFT (mostly to improve adherence
to the desired output format) we reach an accuracy of 63.60%, after one epoch of RLVR 83.60%. On the
test set we get values of 41.93% for the base model, 51.18% after SFT, and 73.69% after RLVR. Note
that the Qwen2.5-Math paper gives 76.8% for the base model, however they use 8-shot and a different
format, so the results are not directly comparable.

[[ references ]]
