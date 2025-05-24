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
      $._expression, // Allow expressions as top-level items
    ),

    // General expression rule
    _expression: $ => choice(
      $._primitive,
      $.vector,
      $.object_literal, // Added object_literal
      $.identifier
      // Future expression types can be added here
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
    _primitive: $ => choice(
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
    byte: $ => token(seq("b'", /[^']*/, "'")),
    char: $ => token(seq("'", /[^']+/, "'")),
    integer: $ => /[0-9]+/,
    float: $ => /[0-9]+\.[0-9]+/,
    static_string: $ => token(seq('"', /[^"]*/, '"')),

    // Vector rule: e.g., ["hello", 42, true]
    vector: $ => seq(
      "[",
      optional(seq(
        $._expression,
        repeat(seq(",", $._expression)),
        optional(",") // Optional trailing comma
      )),
      "]"
    ),

    // Object literal rule: e.g., #{}
    object_literal: $ => token(seq(
      "#",
      "{",
      "}"
    )),
  }
});
