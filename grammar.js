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
      $.primitive,
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

    // According to https://rune-rs.github.io/book/primitives.html,
    // type hashes are primitive type, but not sure how they are represented.
    primitive: $ => choice(
      $.unit,
      $.boolean,
      $.byte,
      $.char,
      $.integer,
      $.float,
      $.static_string,
    ),

    unit: $ => token(seq("(", ")")),
    boolean: $ => choice("true", "false"),
    byte: $ => token(seq("b'", /[^']+/, "'")),
    char: $ => token(seq("'", /[^']+/, "'")),
    integer: $ => /[0-9]+/,
    float: $ => /[0-9]+\.[0-9]+/,
    static_string: $ => token(seq('"', /[^"]*/, '"')),
  }
});
