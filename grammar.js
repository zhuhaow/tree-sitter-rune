/**
 * @file Rune grammar for tree-sitter
 * @author Zhuhao Wang <zhuhaow@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "rune",

  rules: {
    source_file: $ => repeat($._item),

    _item: $ => choice(
      $.use_declaration,
    ),

    use_declaration: $ => seq(
      "use",
      $.path,
      ";"
    ),

    path: $ => seq(
      $.identifier,
      repeat(seq(
        "::",
        $.identifier,
      )),
    ),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,
  }
});
