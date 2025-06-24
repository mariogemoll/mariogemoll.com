// scripts/md-rule-html-validate.js
import { HtmlValidate } from "html-validate";

/* One HtmlValidate instance is enough for all files */
const htmlvalidate = new HtmlValidate({
  extends: ["html-validate:recommended"],
  // Snippet-friendly: turn off document-level rules
  rules: {
    "document-type": "off",
    "close-order": "off"
  }
});

export default {
  /* Rule metadata --------------------------------------------------------- */
  names: ["HTML001", "html-block-validate"],
  description: "html-validate",
  information: new URL(
    "https://html-validate.org/guide/api/getting-started.html"
  ),
  tags: ["html", "validation"],

  /* The actual rule ------------------------------------------------------- */
  function: function mdHtmlValidate(params, onError) {
    for (const token of params.tokens) {
      if (token.type !== "html_block") continue;


      const report = htmlvalidate.validateStringSync(token.content);
      const messages = report.results[0]?.messages || [];

      for (const m of messages) {
        onError({
          /* markdownlint line numbers are 1-based; token.map[0] is 0-based */
          lineNumber: (token.map ? token.map[0] : 0) + 1,
          detail: `[${m.ruleId}] ${m.message}`,
          context: token.content.trim().split(/\r?\n/, 1)[0]
        });
      }
    }
  }
};