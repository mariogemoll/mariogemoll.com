// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

export default {
  names: ["math-block-format"],
  description: "Allow only standalone $$ or lines starting and ending with $$",
  tags: ["mathjax"],

  function: function rule(params, onError) {
    const lines = params.lines;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (!trimmed.includes("$$")) {
        return;
      }

      if (trimmed === "$$") {
        return;
      }

      const match = trimmed.match(/^\$\$(.+)\$\$$/);
      if (match && trimmed === line) {
        return;
      }

      // Everything else is invalid
      onError({
        lineNumber: index + 1,
        detail: "Lines with '$$' must be either '$$', or '$$ math $$' (with no other content)",
      });
    });
  }
};
