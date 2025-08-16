// Sample markdown content for demonstration
import { MATH_TEST_CONTENT } from './mathTestContent';

export const SAMPLE_MARKDOWNS = [
  {
    name: "Math Rendering Test",
    md: MATH_TEST_CONTENT
  },
  {
    name: "Philonet Interface Overview",
    md: `# The Humane Interface of Philonet

![cover](https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=1200&q=80)

A minimalist, high-contrast reading surface with humane spacing and subtle blue affordances.

**Categories:** Design, Systems, Product
**Tags:** philonet, ui, reading, dark-mode

## Introduction
Philonet emphasizes clarity, legibility, and rhythm in digital reading experiences.

## Details
- Lightweight typography with generous scale
- Neutral grays for clear hierarchy
- Blue accents for interactive elements
- Responsive layout patterns

## Conclusion
Design for the eyes first, then optimize for everything else.

| Element   | Purpose         | Implementation |
|-----------|-----------------|----------------|
| Spacing   | Comfort         | 8px grid       |
| Contrast  | Readability     | WCAG AA        |
| Motion    | Feedback        | Subtle spring  |
`,
  },
];
