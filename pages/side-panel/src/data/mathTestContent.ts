// Test content with mathematical formulas for KaTeX rendering
export const MATH_TEST_CONTENT = `# Math Rendering Test

This is a test document with various mathematical formulas to verify KaTeX rendering.

## Square Bracket Notation (Physics Style)

Here is the reported formula in square brackets:

[ ds^2 = -f(r)dt^2 + \\frac{dr^2}{f(r)} + r^2 d\\phi^2 + \\alpha^2 r^2 dz^2 ]

Another square bracket formula:

[ V_e = \\frac{1}{r^2} \\left( -\\Lambda_m r^2 - 4M q - \\Lambda_m r \\right) \\left( m^2 - 3k^2 \\Lambda_m \\right) ]

## Inline Math

Here is an inline formula: $E = mc^2$ and another one: $\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$

## Display Math

Here is a display formula:

$$V_e = \\frac{1}{r^2} \\left( -\\Lambda_m r^2 - 4M q - \\Lambda_m r \\right) \\left( m^2 - 3k^2 \\Lambda_m \\right)$$

## More Complex Formulas

The Schrödinger equation:

$$i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)$$

Maxwell's equations:

$$\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}$$

$$\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}$$

## LaTeX Environments

Using equation environment:

\\begin{equation}
\\frac{d^2x}{dt^2} + 2\\gamma\\frac{dx}{dt} + \\omega_0^2 x = 0
\\end{equation}

## Testing Different Formats

Square brackets: [ E = mc^2 ]
Dollar signs: $E = mc^2$
Double dollars: $$E = mc^2$$

This should now render properly with our KaTeX integration.`;
