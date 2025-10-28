# [[ page-title ]]

The following is a description of the basics of normalizing flows. It focuses on the core
coupling-layer mechanism introduced in the [[ ref-dinh-et-al-2014 (NICE) ]] and
[[ ref-dinh-et-al-2016 (Real NVP) ]] papers (using alternating affine transformations with tractable
Jacobians) but omits architectural extensions (such as multiscale structure and normalization
layers) that appear in full-sized flow models. For a broader overview, plase refer to the
[further reading](#further-reading) section at the end.

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

## An example flow with coupling layers

To see an actual example, we discuss a generative model for the 2D moons dataset, depicted here:

[[ moons-dataset-widget ]]

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

In the follwing, we'll use a
[TensorFlow.js model](https://github.com/mariogemoll/normalizing-flows/blob/main/ts/src/model.ts)
running in the browser (however, there's also a
[notebook](https://github.com/mariogemoll/normalizing-flows/blob/main/py/normalizing-flows.ipynb)
with an equivalent implementation in PyTorch). The simplified code section for the coupling layer
is here:

```js
export class CouplingLayer {
  flip: boolean;
  scaleNet: MLP;
  shiftNet: MLP;

  forward(x: Tensor2D): [Tensor2D, Tensor1D] {
    // Split input into two parts
    let [x1, x2] = tf.split(x, 2, 1);

    if (this.flip) {
      [x1, x2] = [x2, x1];
    }

    // Compute scale and shift
    const s = tf.tanh(this.scaleNet.predict(x1));
    const t = this.shiftNet.predict(x1);

    // Apply transformation
    const y1 = x1;
    const y2 = tf.add(tf.mul(tf.exp(s), x2), t);

    // Compute log determinant
    const logDet = tf.sum(s, 1);

    // Concatenate output
    const y = (this.flip ? tf.concat([y2, y1], 1) : tf.concat([y1, y2], 1));

    return [y, logDet];
  }

  inverse(y: Tensor2D): [Tensor2D, Tensor1D] {
    let [y1, y2] = tf.split(y, 2, 1);

    if (this.flip) {
      [y1, y2] = [y2, y1];
    }

    const s = tf.tanh(this.scaleNet.predict(y1));
    const t = this.shiftNet.predict(y1);

    const x1 = y1;
    const x2 = tf.mul(tf.sub(y2, t), tf.exp(tf.neg(s)));

    const logDet = tf.neg(tf.sum(s, 1));

    const x = (this.flip ? tf.concat([x2, x1], 1) : tf.concat([x1, x2], 1));
    return [x, logDet];
  }
}
```

Note that the transformation is in fact

$$
\begin{aligned}
y_1 &= x_1\\
y_2 &= x_2 \odot \exp\!\big(s(x_1)\big) + t(x_1)
\end{aligned}
$$

where $\odot$ and $\exp$ act elementwise. The $\exp$ makes sure that the scale is strictly positive
(even when the neural network outputs zero). Moreover, the log-determinant of the Jacobian becomes
super simple: It's just the sum of the values in the scale vector.

Our model has 8 coupling layers and has already been
trained, the following widget shows the training loss curve. You can however run the training again
(this will use the samples from the moons widget above).

[[ training-widget ]]

We can now see how the flow pushes points sampled from the initial Gaussian distribution towards
the desired target/data distribution:

[[ flow-visualization-widget ]]

## Further reading

This page describes the main ideas introduced by the NICE ([[ ref-dinh-et-al-2014 ]]) and Real NVP
([[ ref-dinh-et-al-2016 ]]) papers, namely, invertible
coupling layers that make it possible to learn flexible yet tractable density transformations.

There is a YouTube video by Marcus Brubaker ([[ ref-brubaker-2020 ]]) covering this material and
much more, which is highly recommended.

Notable milestone advancements in normalizing flows after NICE and Real NVP include IAF
(Inverse Autoregressive Flow, [[ ref-kingma-et-al-2016 ]]), MAF (Masked Autoregressive Flow,
[[ ref-papamakarios-et-al-2017 ]]), Glow ([[ ref-kingma-et-al-2018 ]]), and Flow++
([[ ref-ho-et-al-2019 ]]), which introduced more expressive and scalable architectures.
[[ ref-kobyzev-et-al-2019 ]] and [[ ref-papamakarios-et-al-2019 ]] provide a comprehensive overview
of the field. In recent years, the normalizing flow concept has been generalized into continuous
formulations such as Flow Matching and Rectified Flow models, which connect flows with modern
diffusion-based generative models.

[[ references ]]
