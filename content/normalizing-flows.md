# [[ page-title ]]

Applying a function to a random variable turns it into another random variable. For example, think
about a simple "scale and shift" linear transformation of a 1D random variable X:

$$
\begin{aligned}
Y &= f(X) \\
f(x) &= s\,x + t
\end{aligned}
$$

Now assume we want to get the PDF of the transformed random value (for example to display a chart
like the one below). If the function is invertible, we might want to do the transformation
"backwards" (ie., apply the inverse) and then evaluate the original PDF.  However, then we'll see
that we don't get a probability distribution any more (the area under the curve does not sum to 1).
As long as our function is also differentiable, this can be corrected by multiplying by the absolute
value of the derivative of the inverse of the transformation. This is the change of variables
formula for PDFs:

$$
p_Y(y) = p_X(f^{-1}(y)) \left| \frac{d}{dy} f^{-1}(y) \right|
$$

Here we see this in action in the application of a linear transformation to a uniform and a Gaussian
distribution:

[[ linear-transform-widget ]]

This process can be repeated several times, and if the functions are invertible, the whole process
is also invertible. In particular, a simple probability distribution like a Gaussian can be
converted into a more complex distribution and vice versa.

[[ layers-widget ]]

This is the idea behind normalizing flows: Trying to learn a series of sequential functions which
transform the data distribution into a simple one, usually a multivariate normal distribution, hence
the name normalizing flow. We also require that the functions are differentiable. A sufficiently
powerful model can then be used for density estimation (i.e. we can state an approximate PDF of the
data distribution), and also to generate new samples.

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

<!-- TODO: Loss function derivation -->

[[ training-widget ]]

We can now see how the flow pushes points sampled from the initial Gaussian distribution towards
the desired target/data distribution:

[[ flow-visualization-widget ]]
