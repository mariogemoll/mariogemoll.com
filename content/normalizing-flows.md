# [[ page-title ]]

Applying a function to a random variable turns it into another random variable. For example, think
about applying a simple "scale and shift" linear transformation to a 1D random variable $Z$ to
create a random variable $X$:

$$
\begin{aligned}
X &= f(Z) \\[6pt]
f(z) &= s\,z + t
\end{aligned}
$$

Now assume we want to get the PDF of the transformed random value (for example to display a chart
like the one below). If the function is invertible, we might want to do the transformation
"backwards" (ie., apply the inverse) and then evaluate the original PDF.  However, then we'll see
that we don't get a probability distribution any more (the area under the curve does not sum to 1).
As long as our function is also differentiable, this can be corrected by multiplying by the absolute
value of the derivative of the inverse of the transformation. This is the change-of-variables
formula for PDFs:

$$
p_X(x) = p_Z(f^{-1}(x)) \left| \frac{d}{dx} f^{-1}(x) \right|
$$

Here we see this in action in the application of a linear transformation to a uniform and a Gaussian
distribution:

[[ linear-transform-widget ]]

This process can be repeated several times, and if the functions are invertible, the whole process
is also invertible. In particular, a simple probability distribution like a Gaussian can be
converted into a more complex distribution and vice versa. Here we see a Gaussian transformed by a
sigmoid function, two splines, and a logit function:

[[ layers-widget ]]

This is the idea behind normalizing flows: Trying to learn a series of sequential functions which
transform a simple "latent" distribution $Z$, usually a multivariate normal distribution, into the
much more complex data distribution $X$. Or rather, learning the (invertible) functions in the other
direction, hence the name normalizing flow.

Before we continue we should state the multivariate version of the change-of-variables formula:

$$
p_X(\mathbf{x}) =
p_Z(f^{-1}(\mathbf{x})) \left| \det \frac{\partial f^{-1}}{\partial \mathbf{x}} \right|
$$

where $\det \frac{\partial f^{-1}}{\partial \mathbf{x}}$ is the determinant of the Jacobian
matrix of the inverse transformation (correcting for the change in volume, analogous to the change
of area in the 1D case, see above).

For a composition of functions $f = f_1 \circ f_2 \circ \cdots \circ f_K$, we can define
intermediate variables:

$$
\mathbf{z}^{(0)} = \mathbf{z}, \quad
\mathbf{z}^{(1)} = f_1(\mathbf{z}^{(0)}), \quad
\mathbf{z}^{(2)} = f_2(\mathbf{z}^{(1)}), \quad \dots, \quad
\mathbf{z}^{(K)} = f_K(\mathbf{z}^{(K-1)}) = \mathbf{x}.
$$

These can of course also be expressed by applying the inverse functions in the other direction:

$$
\mathbf{z}^{(K)} = \mathbf{x}, \quad
\mathbf{z}^{(K-1)} = f_K^{-1}(\mathbf{z}^{(K)}), \quad
\mathbf{z}^{(K-2)} = f_{K-1}^{-1}(\mathbf{z}^{(K-1)}), \quad \dots, \quad
\mathbf{z}^{(0)} = f_1^{-1}(\mathbf{z}^{(1)}) = \mathbf{z}.
$$

Applying the change-of-variables rule successively through all layers, we get the full
transformation from latent to data space:

$$
p_X(\mathbf{x})
= p_Z(\mathbf{z})
\prod_{k=1}^{K}
\left|
\det
\frac{\partial f_k^{-1}}{\partial \mathbf{z}^{(k)}}
\right| \, .
$$

Assuming we can compute the functions in the individual layers of the flow (or approximate them with
a neural network), we can:

- generate new samples of the data distribution: sample $z$, apply all the transformations:
$x = f(z)$
- calculate the likelihood of a datapoint by evaluating the PDF stated above.

The job of the machine learning model will be to approximate the functions in the individual layers
of the flow (we'll get to how to construct those functions, or at least one way of constructing
them, in a minute). Since we now have a way of computing the density function of the data
distribution(!), it's straightforward to give the loss function for training: We want to have a
model under which the likelihood of the datapoints in the training set is high. So we want to
maximize the likelihood of the training set, or equivantly (since we want a loss function) minimize
the negative likelihood. In practice, usually log-likelihoods are minimized, to avoid numerical
issues and because products turn into sums.

Starting with maximum likelihood estimation:

$$
\max \prod_{i=1}^{N} p_X(\mathbf{x}_i)
$$

This is equivalent to minimizing the negative likelihood:

$$
\min -\prod_{i=1}^{N} p_X(\mathbf{x}_i)
$$

Taking the logarithm (which is monotonic, so preserves the location of the maximum/minimum):

$$
\min - \sum_{i=1}^{N} \log p_X(\mathbf{x}_i)
$$

Substituting the change-of-variables formula from above and averaging over the datapoints gives us
the negative log-likelihood loss:

$$
\mathcal{L} = -\frac{1}{N} \sum_{i=1}^{N} \left[ \log p_Z(\mathbf{z}_i) + \sum_{k=1}^{K} \log
\left| \det \frac{\partial f_k^{-1}}{\partial \mathbf{z}^{(k)}} \right| \right] \, .
$$

To see an actual example, create a generative model for the 2D moons dataset, which looks like this:

[[ moons-dataset-widget ]]

## Coupling layers

For each layer in the flow, we need a transformation that is invertible and whose
derivative/Jacobian is easy to compute. One interesting way of accomplishing this is by using
so-called coupling layers: These only modify half of the input dimensions, the other half is passed
through as-is. However, the parameters of the (invertible) transformation are completely determined
by the dimensions that are not transformed. In that way these parameters can be calculated in both
directions, thus ensuring the invertiblity of the whole layer. The actual transformation is usually
simple, usually just an affine transformation (ie. scale and shift), which makes the Jacobian easy
to compute. Note, however, that the function which derives the parameters itself does not need to be
invertible and can be arbitrarily complex and can be learned during the training process (e.g. a
convolutional neural net).

In PyTorch, this looks like this:

```python
class CouplingLayer(nn.Module):
    def __init__(self, flip):
        super().__init__()
        self.flip = flip
        self.scale_net = MLP()
        self.shift_net = MLP()

    def forward(self, x):
        x1, x2 = x.chunk(2, dim=1)
        if self.flip:
            x1, x2 = x2, x1
        s = self.scale_net(x1)
        s = torch.tanh(s)
        t = self.shift_net(x1)
        y1 = x1
        y2 = torch.exp(s) * x2 + t
        log_det = s.sum(dim=1)
        if self.flip:
            y1, y2 = y2, y1
        return torch.cat([y1, y2], dim=1), log_det

    def inverse(self, y):
        y1, y2 = y.chunk(2, dim=1)
        if self.flip:
            y1, y2 = y2, y1
        s = self.scale_net(y1)
        s = torch.tanh(s)
        t = self.shift_net(y1)
        x1 = y1
        x2 = (y2 - t) * torch.exp(-s)
        log_det = -s.sum(dim=1)
        if self.flip:
            x1, x2 = x2, x1
        return torch.cat([x1, x2], dim=1), log_det
```

In the follwing, we'll use a
[TensorFlow.js model](https://github.com/mariogemoll/normalizing-flows/blob/main/ts/src/model.ts)
running in the browser (however, there's also a
[notebook](https://github.com/mariogemoll/normalizing-flows/blob/main/py/normalizing-flows.ipynb)
with an equivalent implementation in PyTorch). The model has 8 coupling layers and has already been
trained, the following widget shows the training loss curve. You can however run the training again
(this will use the samples from the moons widget above).

[[ training-widget ]]

We can now see how the flow pushes points sampled from the initial Gaussian distribution towards
the desired target/data distribution:

[[ flow-visualization-widget ]]
