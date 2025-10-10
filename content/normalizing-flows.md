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
