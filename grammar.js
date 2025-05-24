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
      $.struct_declaration,
      $.enum_declaration, // Added enum_declaration
      $._expression, // Allow expressions as top-level items
    ),

    // General expression rule
    _expression: $ => choice(
      $._primitive,
      $.vector,
      $.object_literal,
      $.tuple, // Added tuple
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

    _empty_tuple_marker: $ => ",",

    // Tuple rule: e.g., ("hello", 42, true), or (,) for empty
    tuple: $ => seq(
      "(",
      choice(
        $._empty_tuple_marker,
        seq(
          $._expression,
          repeat(seq(",", $._expression)),
          optional(",")
        )
      ),
      ")"
    ),

    // Struct declaration rule: e.g., struct User { username, active, }
    struct_declaration: $ => seq(
      "struct",
      field("name", $.identifier),
      "{",
      optional(seq(
        field("field", $.identifier),
        repeat(seq(",", field("field", $.identifier))),
        optional(",") // Optional trailing comma for fields
      )),
      "}"
    ),

    // Enum declaration rule: e.g., enum Color { Red, Green, Blue }
    enum_declaration: $ => seq(
      "enum",
      field("name", $.identifier),
      "{",
      optional(seq(
        $.enum_variant,
        repeat(seq(",", $.enum_variant)),
        optional(",") // Optional trailing comma for variants
      )),
      "}"
    ),

    // Represents the payload of a tuple-like enum variant, e.g., (v1, v2)
    // where v1, v2 are value names (identifiers).
    _enum_variant_tuple_payload: $ => seq(
      "(",
      field("value_name", $.identifier), // Requires at least one value name
      repeat(seq(",", field("value_name", $.identifier))),
      optional(","), // Optional trailing comma for value names
      ")"
    ),

    // Represents the payload of a struct-like enum variant, e.g., { f1, f2 }
    // where f1, f2 are field names (identifiers).
    _enum_variant_struct_payload: $ => seq(
      "{",
      optional(seq( // Allows for empty struct payload like `Variant {}`
        field("field_name", $.identifier),
        repeat(seq(",", field("field_name", $.identifier))),
        optional(",") // Optional trailing comma for field names
      )),
      "}"
    ),

    enum_variant: $ => seq(
      field("name", $.identifier),
      optional(
        choice(
          field("tuple_payload", $._enum_variant_tuple_payload),
          field("struct_payload", $._enum_variant_struct_payload)
        )
      )
    ),
  }
});
