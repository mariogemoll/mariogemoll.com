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

<!-- TODO: Flow widget -->

This is the idea behind normalizing flows: Trying to learn a series of sequential functions which
transform the data distribution into a simple one, usually a multivariate normal distribution, hence
the name normalizing flow. We also require that the functions are differentiable. A sufficiently
powerful model can then be used for density estimation (i.e. we can state an approximate PDF of the
data distribution), and also to generate new samples.

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

To see an actual example, let's try to create a generative model for the 2D moons dataset:

[[ dataset-widget ]]
