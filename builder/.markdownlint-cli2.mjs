import mathBlockFormat from './markdownlint-rules/math-block-format.js';
import htmlValidate from './markdownlint-rules/html-validate.js';

export default {
  default: true,
  config: {
    MD013: { line_length: 100 },
    MD033: false,
    MD034: false, // Allow bare URLs
    MD041: false
  },
  customRules: [mathBlockFormat, htmlValidate]
};
