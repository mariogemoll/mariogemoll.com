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

Recall that we’re taking a sample $z^*$ from a multivariate Gaussian distribution
$q(z|x_i) = \mathcal{N}(\mu, \Sigma)$. The mean $\mu$ and the values $\sigma^2$ (for technical
reasons actually the log values $\log \sigma^2$) of the diagonal covariance matrix
$\Sigma = \mathrm{diag}(\exp(\sigma^2))$ are the outputs of the encoder neural network. This latent
variable $z^*$ is then passed into the decoder.

During backpropagation, in order to update the encoder’s parameters, we would need to propagate
gradients through the sampling step — that is, through the operation "sample from $q(z|x_i)$".
Unfortunately, sampling is non-differentiable, so there’s no direct way to do this.

However, since $q$ is a Gaussian, we can re-express the sampling step using a deterministic
transformation:

$$ z^* = \mu + \sigma \odot \epsilon \qquad \epsilon \sim \mathcal{N}(0, \mathrm{I}) $$

where

* $\odot$ is the elementwise (Hadamard) product
* $\sigma = \exp\left(\tfrac{1}{2} \log \sigma^2\right)$

This is called the reparameterization trick. It separates the randomness ($\epsilon$) from the
parameters ($\mu$, $\log \sigma^2$), allowing us to compute gradients with respect to $\mu$ and
$\log \sigma^2$ as usual. Since $\epsilon$ is independent of the encoder parameters, it is treated
as a constant during backpropagation.

## A toy dataset

To get an intuition of what a VAE does, let's train one. We'll use a very simple, synthetic image
dataset generated from two variables: The size of a [photo of a face](/vae/face.png) (generated by
ChatGPT) centered on the image, and the hue (as in the HSV color model) of the background color.
Drag the dot around on the 2D grid in the following widget to see example images for different size
and hue values:

[[ datasetexplanation-widget ]]

We generate a dataset of 2000 images. A rectangle of about 20% of the overall 2D area is defined as
the validation set:

[[ datasetvisualization-widget ]]

## Model

We can now train a VAE with a 2D latent space on our data. We hope that the model somehow learns a
2D latent space similar to the 2D space of parameters which actually created the dataset.

The encoder takes a batch of images (3x32x32 RGB values) and first puts it through a CNN which
produces a batch of 2048-dimensional vectors. These get passed through two separate MLPs to get two
batches of two-dimensional mean and log-variance values.

```python
class Encoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Sequential(
            # Input is (B, 3, 32, 32)
            nn.Conv2d(3, 32, 3, stride=2, padding=1),  # -> (B, 32, 16, 16)
            nn.ReLU(),
            nn.Conv2d(32, 64, 3, stride=2, padding=1),  # -> (B, 64, 8, 8)
            nn.ReLU(),
            nn.Conv2d(64, 128, 3, stride=2, padding=1),  # -> (B, 128, 4, 4)
            nn.ReLU(),
            nn.Flatten(),  # -> (B, 2048)
        )
        self.fc_mu = nn.Linear(2048, 2)  # -> (B, 2)
        self.fc_logvar = nn.Linear(2048, 2)  # -> (B, 2)

    def forward(self, x):
        h = self.conv(x)
        return self.fc_mu(h), self.fc_logvar(h)
```

The decoder takes a batch of 2D points, expands them to 2048 dimensions in an MLP, then passes that
through a deconvolutional network to generate means of the output distribution for the 3x32x32
output image RGB values (the variance is assumed to be fixed here). Note that in practice, when the
model is later used for generation, these values are often directly used as the pixel intensity
values for the generated images and no further sampling is happening.

```python
class Decoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Sequential(
            # Input is (B, 2)
            nn.Linear(2, 2048), # -> (B, 2048)
            nn.ReLU(),
        )
        self.deconv = nn.Sequential(
            # Input is (B, 2048)
            nn.Unflatten(1, (128, 4, 4)),  # -> (B, 128, 4, 4)
            nn.ConvTranspose2d(128, 64, 4, stride=2, padding=1), # -> (B, 64, 8, 8)
            nn.ReLU(),
            nn.ConvTranspose2d(64, 32, 4, stride=2, padding=1), # -> (B, 32, 16, 16)
            nn.ReLU(),
            nn.ConvTranspose2d(32, 3, 4, stride=2, padding=1), # -> (B, 3, 32, 32)
            nn.Sigmoid(),
        )

    def forward(self, z):
        return self.deconv(self.fc(z))
```

The whole model combines the encoder and decoder. In a forward pass during training, the mean and
log-variance values are generated by the encoder, then z values are sampled using the
reparameterization trick, then the mean values of the output distribution are generated by the
decoder. All three values are returned by the model, as they are needed for the ELBO calculation
during training.

```python
class VAE(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.encoder = Encoder()
        self.decoder = Decoder()

    def forward(self, x):
        enc_mu, enc_logvar = self.encoder(x)

        # Reparameterization trick
        std = torch.exp(0.5 * enc_logvar)
        eps = torch.randn_like(std)
        z = enc_mu + eps * std

        dec_mu = self.decoder(z)
        return enc_mu, enc_logvar, dec_mu
```

## ELBO

Recall that during training we want to maximize the log likelihood of each data point, which is
approximated by (a stochastic approximation of) the ELBO:

$$ \log p(x_i|z^*) - \KL{q(z|x_i)}{p(z)} \qquad z^* \sim q(z|x_i) $$

The reconstruction term $p(x_i|z^*)$ is a Gaussian with mean as calculated by the decoder (from the
$z^*$ we sampled from $q(z|x_i)$) and a fixed, spherical covariance matrix:

$$
\log p(x_i \mid z^*) =
-\frac{1}{2} \left[ d \log(2\pi) + d \log \sigma^2 + \frac{1}{\sigma^2} \|x_i - \mu\|^2 \right]
$$

In Python:

```python
def log_normal_spherical(x, mu, sigma2):
    d = x.size(1)
    squared_error = (x - mu).pow(2).sum(dim=1)
    return -0.5*(d * math.log(2 * math.pi) + d * math.log(sigma2) + squared_error / sigma2)
```

$q(z|x_i)$ is a Gaussian with mean and diagonal covariance as calculated by the encoder.  $p(z)$ is
the standard Gaussian which we assume to be governing the latent space. The formula for the
Kullback-Leibler divergence in this case is:

$$
\mathrm{KL}(q(z \mid x) \,\|\, p(z)) =
\frac{1}{2} \sum_{j=1}^d \left( \mu_j^2 + \sigma_j^2 - \log \sigma_j^2 - 1 \right)
$$

In code:

```python
def kl_divergence(mu, logvar):
    return 0.5 * torch.sum(mu**2 + torch.exp(logvar) - logvar - 1, dim=1)
```

Those two calculations combined give us a function for the ELBO, which is what we'll maximize during
training (or rather, we'll minimize its negative):

```python
def approximate_elbo(xi, mu_z, mu_xi, logvar_xi):
    recon_term = log_normal_spherical(xi, mu_z, sigma2=1.0)
    kl_term = kl_divergence(mu_xi, logvar_xi)
    return recon_term - kl_term
```

## Training

The following shows a simplified training loop using the VAE model and ELBO function described
above:

```python
vae = VAE()
optimizer = torch.optim.Adam(vae.parameters(), lr=1e-3)
for epoch in range(num_epochs):
    for x in BatchIterator(trainset, batch_size=batch_size):
        enc_mu, enc_logvar, dec_mu = vae(x)
        loss = -approximate_elbo(x, dec_mu, enc_mu, enc_logvar).mean()
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
```

If you want to train the model yourself, you can use a prepared
[notebook](https://github.com/mariogemoll/vae/blob/main/notebooks/vae.ipynb), for example on
[Colab](https://colab.research.google.com/github/mariogemoll/vae/blob/main/notebooks/vae.ipynb).

## Sampling

Only the decoder of the model is needed to sample new images. Z values are sampled from the Gaussian
distribution of the latent space and then passed through the decoder to generate pixel intensity
values.

A trained model has been loaded in this browser, you can use the widget below to sample some images.
The plot on the left shows the corresponding samples in z space (and the background shows the
standard Gaussian distribution). We see that the quality of the generated images varies, but that in
general they do resemble the training data. We also see that they are somewhat blurry, which is a
characteristic of (simple "vanilla") VAEs.

[[ sampling-widget ]]

## Latent space exploration

As we said the training data images were generated by two parameters (size and color hue), so we can
now see how the 2D coordinates from the generating parameter space map to the 2D coordinates in the
latent space resulting from the passing the images through the encoder. Interestingly, the model
does indeed learn a 2D representation that the dimensions of size and hue, although a bit warped, as
can be seen by the transformation of the parameter grid in the widget below.

You can also drag the dot on the left to generate new inputs to the encoder, see the encoding in z
space (mean and magnified standard deviation), and the decoder's reconstruction of the image. The
grey section shows the parameter space of the training data, the cut out area is the validation set
area. We can see that the model is capable to generalize to data from that space (not seen during
training) to a certain extent, however the images look more "ghostly".

The parameter space on the left is also a bit bigger than the one used to generate the
training/validation set, so we can generate images with smaller/larger faces, and some background
hues not seen during training. However we can see that the model is not really able to extrapolate
to those data.

[[ mapping-widget ]]

It's also interesting to see how the mapping of the parameter space grid evolved during training, as
shown in the following widget alongside the training and validation loss curves:

[[ evolution-widget ]]

## Decoding

Here's a widget that allows you to run the decoder and create images from arbitrary latent space
values. Again, the grid for the coordinates created by the training data is shown.

[[ decoding-widget ]]

## Model comparison

When multiple instances of the model with the architecture described above are
[trained](https://github.com/mariogemoll/vae/blob/main/notebooks/train_multiple.ipynb), the loss
converges on more or less the same value, however the latent spaces have different "shapes". You can
click on the plots on the right to load different models for all the widgets above.

[[ modelcomparison-widget ]]
