# Variational Autoencoders

$$
\newcommand{\KL}[2]{\mathrm{D_{KL}}\left(#1 \,\|\, #2\right)}
\newcommand{\E}[2]{\mathbb{E}_{#1}\left[#2\right]}
\newcommand{\integral}[2]{\int #1 \, #2}
$$

To train a VAE, we try to maximize the log likelihood of all the training examples:

$$ \log \prod_{i=1}^n p(x_i) = \sum_{i=1}^n \log p(x_i) $$

(To be clear, the subscript $i$ here denotes the number of the training example, not a coordinate in
the vector $x$.)

For simplicity, let's drop the summation for now and look at just one example at a time. VAEs are a
type of latent space model. This means we assume a joint distribution $p(z, x)$ over the latent
variables $z$ and the data $x$. The distribution of the data is then the marginalization over the
latent variables:

$$ \log p(x_i) = \log \integral{p(z, x_i)}{dz} $$

Applying the product rule from probability:

$$ \log \integral{p(z, x_i)}{dz} = \log \integral{p(x_i|z) \, p(z)}{dz} $$

In our model, we'll assume some distribution over the latent space, e.g., a Gaussian, so for a given
$z$ we can calculate $p(z)$. Later we'll also use a neural network which can give us, for a given
$z$, the parameters for a distribution over the data space, so we can also calculate $p(x_i|z)$.
However, unfortunately, there's no formula to calculate this integral over all values of $z$ in
closed form.

We need to find some approximation. First we'll introduce a new probability distribution
$q(z|x_i)$. As long as it is greater than zero everywhere, we can multiply by 1 in the form of
$ \frac{q(z|x_i)}{q(z|x_i)} $:

$$
\begin{aligned}
\log \integral{p(x_i|z) \, p(z)}{dz}
&= \log \integral{\frac{q(z|x_i)}{q(z|x_i)} \, p(x_i|z) \, p(z)}{dz} \\
&= \log \integral{q(z|x_i) \, \frac{p(x_i|z) \, p(z)}{q(z|x_i)}}{dz}
\end{aligned}
$$

Note that now we're dealing with three separate distributions, confusingly denoted using only two
distinct letters:

* $p(z)$ — Assumed distribution over the latent space (standard normal)
* $p(x|z)$ — Likelihood of seeing a particular $x$ for a chosen $z$
* $q(z|x_i)$ — A helper distribution ("tailor-made" for our $x_i$) that tells us the likelihood
  of a particular $z$ for a given $x_i$, used in lieu of $p(z|x_i)$

This can be expressed as an expectation:

$$
\log \integral{q(z|x_i) \frac{p(x_i|z) p(z)}{q(z|x_i)}}{dz} =
\log \E{z \sim q(z|x_i)}{\frac{p(x_i|z) p(z)}{q(z|x_i)}}
$$

Now we can use Jensen's inequality (since log is concave) to get the log inside the expecation:

$$
\log \E{z \sim q}{\frac{p(x_i|z) p(z)}{q(z|x_i)}} \geq \E{z \sim q(z|x_i)}{\log
\frac{p(x_i|z) p(z)}{q(z|x_i)}}
$$

This lower bound is called the ELBO (evidence lower bound). Applying log rules:

$$
\E{z \sim q(z|x_i)}{\log \frac{p(x_i|z) p(z)}{q(z|x_i)}}
= \E{z \sim q(z|x_i)}{\log p(x_i|z) + \log p(z) - \log q(z|x_i)}
$$

The expectation can be approximated by Monte Carlo sampling from $q$:

$$
\begin{align}
\text{ELBO}(x_i) &= \E{z \sim q(z|x_i)}{\log p(x_i|z) + \log p(z) - \log q(z_j|x_i)} \\
&\approx \frac{1}{k} \sum_{j=1}^k \left[ \log p(x_i|z_j) + \log p(z_j) - \log q(z_j|x_i) \right]
\qquad z_j \sim q(z|x_i)
\end{align}
$$

In practice, often only a single sample is taken:

$$
\begin{align}
\text{ELBO}(x_i) &= \E{z \sim q(z|x_i)}{\log p(x_i|z) + \log p(z) - \log q(z|x_i)} \\
&\approx \log p(x_i|z^*) + \log p(z^*) - \log q(z^*|x_i)
\qquad z^* \sim q(z|x_i)
\end{align}
$$

What all this means in plain English is that if we want to compute the probability density $p(x_i)$
we can do the following:

* Run $x_i$ through the encoder to get parameters for a distribution $q(z|x_i)$
* Sample (one) $z^*$ from $q$
* Calculate log $q(z^*|x_i)$
* Calculate log $p(z^*)$ (Standard normal distribution)
* Run $z^*$ through the decoder to get parameters for a distribution $p(x|z^*)$, calculate log
  $p(x_i|z^*)$

Then  $\log p(x_i|z^*) + \log p(z^*) - \log q(z^*|x_i)$ gives us a sample-based approximation of the
ELBO, which itself is a lower bound for $p(x_i)$.

Let's go back to before the sampling step. On closer inspection we see that the ELBO actually
includes the KL divergence:

$$
\begin{align}
\text{ELBO}(x_i) &= \E{z \sim q(z|x_i)}{ \log p(x_i|z) + \log p(z) - \log q(z|x_i) } \\
&= \E{z \sim q(z|x_i)}{ \log p(x_i|z) } - \E{z \sim q(z|x_i)}{ \log q(z|x_i) - \log p(z) } \\
&= \E{z \sim q(z|x_i)}{ \log p(x_i|z) } - \KL{q(z|x_i)}{p(z)} \\
&\approx \log p(x_i|z^*) - \KL{q(z|x_i)}{p(z)} \qquad z^* \sim q(z|x_i)
\end{align}
$$

In the last step, we applied our single-sample Monte Carlo approximation again. We’ve now simplified
things quite a bit: the ELBO is approximated by the likelihood of observing our data point $x_i$
under a single latent sample $z^*$ — this is known as the reconstruction term — minus the KL
divergence between our learned approximate posterior $q(z|x_i)$ and the prior $p(z)$.

A neat feature here is that we only need to sample from the latent distribution for the
reconstruction term. The KL divergence can often be computed analytically: when both $q(z|x_i)$ and
$p(z)$ are Gaussians (as is commonly the case), the KL divergence has a closed-form solution that
depends only on their means and variances.

During training, the model is encouraged to maximize the reconstruction term, i.e. to make the
decoder good at reconstructing data from latent samples, while simultaneously minimizing the KL
divergence, which prevents the approximate posterior $q(z|x_i)$ from drifting too far from the prior
$p(z)$.
To summarize:

$$ \log p(x_i) \geq ELBO \approx \log p(x_i|z^*) - \KL{q(z|x_i)}{p(z)} \qquad z^* \sim q(z|x_i) $$

In practice:

* Run $x_i$ through the encoder to get parameters for a distribution $q(z|x_i)$
* Sample $z^*$ from $q(z|x_i)$
* Run $z^*$ through the decoder to get parameters for a distribution $p(x|z^*)$,
calculate log $p(x_i|z^*)$
* Subtract KL-divergence between $q(z|x_i)$ and $p(z)$

In the end, during each training step, we compute the approximate ELBO for each training example —
which acts as a lower bound for the intractable log-likelihood $\log p(x_i)$. These ELBOs are summed
(or averaged) across a minibatch to obtain the total objective. Since we want to maximize the data
likelihood, we maximize the ELBO — or equivalently, minimize its negative — using gradient descent.

However, to make this optimization work end-to-end with backpropagation, we need to address one
remaining technical challenge — and it’s an essential one in the VAE framework: the
reparameterization trick.

Recall that we’re taking a sample $z^*$ from a Gaussian distribution $q(z|x_i) = \mathcal{N}(\mu,
\sigma^2)$, where $\mu$ and $\sigma^2$ (for technical reasons actually $\log \sigma^2$) are the
outputs of the encoder neural network. This latent variable $z$ is then passed into the decoder.

During backpropagation, in order to update the encoder’s parameters, we would need to propagate
gradients through the sampling step — that is, through the operation "sample from $q(z|x_i)$".
Unfortunately, sampling is non-differentiable, so there’s no direct way to do this.

However, since $q$ is a Gaussian, we can re-express the sampling step using a deterministic
transformation:

$$ z^* = \mu + \sigma \cdot \epsilon \qquad \epsilon \sim \mathcal{N}(0, 1) $$

This is called the reparameterization trick. It separates the randomness ($\epsilon$) from the
parameters ($\mu$, $\sigma^2$), allowing us to compute gradients with respect to $\mu$
and $\sigma^2$ as usual. Since $\epsilon$ is independent of the encoder parameters, it is treated as
a constant during backpropagation.

## Dataset explanation

<div id="datasetexplanation-widget" class="widget">[[ datasetexplanation-widget ]]</div>

## Dataset visualization

<div id="datasetvisualization-widget" class="widget">[[ datasetvisualization-widget ]]</div>

## Mapping

<div id="mapping-widget" class="widget">[[ mapping-widget ]]</div>

## Decoding

<div id="decoding-widget" class="widget">[[ decoding-widget ]]</div>
