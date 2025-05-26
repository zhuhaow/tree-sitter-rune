/**
 * @file Rune grammar for tree-sitter
 * @author Zhuhao Wang <zhuhaow@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "rune",

  extras: ($) => [
    $.comment,
    /\s+/, // General whitespace
  ],

  precedences: ($) => [
    [
      "call",
      "member",
      "index", // Highest: call, member access, indexing
      "unary_not",
      "unary_neg", // Then unary operators
      "binary_mul_div_mod", // Then multiplicative binary ops
      "binary_add_sub", // Then additive binary ops
      "binary_shift", // Then shift ops
      "binary_compare", // Then comparison ops (non-equality)
      "binary_eq_neq", // Then equality ops
      "binary_bitwise_and", // Then bitwise AND
      "binary_bitwise_xor", // Then bitwise XOR
      "binary_bitwise_or", // Then bitwise OR
      "binary_logical_and", // Then logical AND
      "binary_logical_or", // Then logical OR
    ],
    ["template_chars", "template_interpolation"], // Template literals
  ],

  supertypes: ($) => [$._expression, $._statement],

  inline: ($) => [$._statement_block],

  word: ($) => $.identifier,

  rules: {
    source_file: ($) => repeat($._item),

    _item: ($) => $._declaration,

    _declaration: ($) =>
      choice(
        $.use_declaration,
        $.struct_declaration,
        $.enum_declaration,
        $.fn_declaration
      ),

    // Function declaration rule: e.g., fn add(a, b) { a + b }
    fn_declaration: ($) =>
      seq(
        optional("async"),
        "fn",
        field("name", $.identifier),
        field("parameters", $.parameter_list),
        field("body", $.block)
      ),

    parameter_list: ($) =>
      seq(
        "(",
        optional(
          seq(
            $.parameter,
            repeat(seq(",", $.parameter)),
            optional(",") // Optional trailing comma
          )
        ),
        ")"
      ),

    parameter: ($) => field("name", $.identifier),

    block: ($) => seq("{", optional($._statement_block), "}"),

    _statement: ($) =>
      choice(
        $.expression_statement,
        $.return_statement,
        $.let_statement,
        $.const_statement
      ),

    expression_statement: ($) => seq($._expression, ";"),

    return_statement: ($) => seq("return", optional($._expression), ";"),

    // Let statement rule: e.g., let x = 42;
    let_statement: ($) =>
      seq(
        "let",
        field("name", $.identifier),
        "=",
        field("value", $._expression),
        ";"
      ),

    // Const statement rule: e.g., const PI = 3.14;
    const_statement: ($) =>
      seq(
        "const",
        field("name", $.identifier),
        "=",
        field("value", $._expression),
        ";"
      ),

    _statement_block: ($) =>
      choice(
        seq(repeat1($._statement), optional($._expression)),
        $._expression
      ),

    _expression: ($) =>
      choice(
        $.path,
        $._primitive,
        $.vector,
        $.object_literal,
        $.tuple,
        $.parenthesized_expression,
        $.unary_expression,
        $.binary_expression,
        $.call_expression,
        $.member_expression,
        $.index_expression,
        $.macro_invocation,
        $.template_literal
      ),

    use_declaration: ($) => seq("use", $.path, ";"),

    path: ($) => seq($.identifier, repeat(seq("::", $.identifier))),

    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    await_keyword: ($) => "await",

    // According to https://rune-rs.github.io/book/primitives.html,
    // type hashes are primitive type, but not sure how they are represented.
    _primitive: ($) =>
      choice(
        $.unit,
        $.boolean,
        $.byte,
        $.char,
        $.integer,
        $.float,
        $.static_string
      ),

    unit: ($) => token(seq("(", ")")),
    boolean: ($) => choice("true", "false"),
    byte: ($) => token(seq("b'", /[^']*/, "'")),
    char: ($) => token(seq("'", /[^']+/, "'")),
    integer: ($) => /[0-9]+/,
    float: ($) => /[0-9]+\.[0-9]+/,
    static_string: ($) => token(seq('"', /[^"]*/, '"')),

    // Template literal rule: e.g., `Hello ${name}`
    template_literal: ($) =>
      seq("`", repeat(choice($.template_chars, $.template_interpolation)), "`"),

    template_chars: ($) =>
      token.immediate(prec("template_chars", /[^`$]+|[$][^{]|[$]/)),

    template_interpolation: ($) =>
      prec("template_interpolation", seq("${", $._expression, "}")),

    // Vector rule: e.g., ["hello", 42, true]
    vector: ($) =>
      seq(
        "[",
        optional(
          seq(
            $._expression,
            repeat(seq(",", $._expression)),
            optional(",") // Optional trailing comma
          )
        ),
        "]"
      ),

    // Object entry rule for key-value pairs: e.g., "key": value
    object_entry: ($) =>
      seq(
        choice($.static_string, $.path), // Keys can be strings or identifiers
        ":",
        $._expression
      ),

    // Object literal rule: e.g., #{ "foo": 42, bar: "baz" } or #{}
    object_literal: ($) =>
      seq(
        "#",
        "{",
        optional(
          seq(
            $.object_entry,
            repeat(seq(",", $.object_entry)),
            optional(",") // Optional trailing comma
          )
        ),
        "}"
      ),

    _empty_tuple_marker: ($) => ",",

    // Tuple rule: e.g., ("hello", 42, true), or (,) for empty
    tuple: ($) =>
      seq(
        "(",
        choice(
          $._empty_tuple_marker,
          seq($._expression, ","),
          seq($._expression, repeat1(seq(",", $._expression)), optional(","))
        ),
        ")"
      ),

    // Struct declaration rule: e.g., struct User { username, active, }
    struct_declaration: ($) =>
      seq(
        "struct",
        field("name", $.identifier),
        "{",
        optional(
          seq(
            field("field", $.identifier),
            repeat(seq(",", field("field", $.identifier))),
            optional(",") // Optional trailing comma for fields
          )
        ),
        "}"
      ),

    // Enum declaration rule: e.g., enum Color { Red, Green, Blue }
    enum_declaration: ($) =>
      seq(
        "enum",
        field("name", $.identifier),
        "{",
        optional(
          seq(
            $.enum_variant,
            repeat(seq(",", $.enum_variant)),
            optional(",") // Optional trailing comma for variants
          )
        ),
        "}"
      ),

    // Represents the payload of a tuple-like enum variant, e.g., (v1, v2)
    // where v1, v2 are value names (identifiers).
    _enum_variant_tuple_payload: ($) =>
      seq(
        "(",
        field("value_name", $.identifier), // Requires at least one value name
        repeat(seq(",", field("value_name", $.identifier))),
        optional(","), // Optional trailing comma for value names
        ")"
      ),

    // Represents the payload of a struct-like enum variant, e.g., { f1, f2 }
    // where f1, f2 are field names (identifiers).
    _enum_variant_struct_payload: ($) =>
      seq(
        "{",
        optional(
          seq(
            // Allows for empty struct payload like `Variant {}`
            field("field_name", $.identifier),
            repeat(seq(",", field("field_name", $.identifier))),
            optional(",") // Optional trailing comma for field names
          )
        ),
        "}"
      ),

    enum_variant: ($) =>
      seq(
        field("name", $.identifier),
        optional(
          choice(
            field("tuple_payload", $._enum_variant_tuple_payload),
            field("struct_payload", $._enum_variant_struct_payload)
          )
        )
      ),

    // New Expression Forms
    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    unary_expression: ($) =>
      choice(
        prec.right("unary_not", seq("!", field("argument", $._expression))),
        prec.right("unary_neg", seq("-", field("argument", $._expression)))
      ),

    binary_expression: ($) =>
      choice(
        prec.left(
          "binary_logical_or",
          seq(field("left", $._expression), "||", field("right", $._expression))
        ),
        prec.left(
          "binary_logical_and",
          seq(field("left", $._expression), "&&", field("right", $._expression))
        ),
        prec.left(
          "binary_bitwise_or",
          seq(field("left", $._expression), "|", field("right", $._expression))
        ),
        prec.left(
          "binary_bitwise_xor",
          seq(field("left", $._expression), "^", field("right", $._expression))
        ),
        prec.left(
          "binary_bitwise_and",
          seq(field("left", $._expression), "&", field("right", $._expression))
        ),
        prec.left(
          "binary_eq_neq",
          seq(
            field("left", $._expression),
            choice("==", "!="),
            field("right", $._expression)
          )
        ),
        prec.left(
          "binary_compare",
          seq(
            field("left", $._expression),
            choice("<", "<=", ">", ">="),
            field("right", $._expression)
          )
        ),
        prec.left(
          "binary_shift",
          seq(
            field("left", $._expression),
            choice("<<", ">>"),
            field("right", $._expression)
          )
        ),
        prec.left(
          "binary_add_sub",
          seq(
            field("left", $._expression),
            choice("+", "-"),
            field("right", $._expression)
          )
        ),
        prec.left(
          "binary_mul_div_mod",
          seq(
            field("left", $._expression),
            choice("*", "/", "%"),
            field("right", $._expression)
          )
        )
      ),

    call_expression: ($) =>
      prec.left(
        "call",
        seq(
          field("function", $._expression),
          field("arguments", $.argument_list)
        )
      ),

    argument_list: ($) =>
      seq(
        "(",
        optional(
          seq($._expression, repeat(seq(",", $._expression)), optional(","))
        ),
        ")"
      ),

    member_expression: ($) =>
      prec.left(
        "member",
        seq(
          field("object", $._expression),
          ".",
          field("property", choice($.identifier, $.await_keyword))
        )
      ),

    index_expression: ($) =>
      prec.left(
        "index",
        seq(
          field("object", $._expression),
          "[",
          field("index", $._expression),
          "]"
        )
      ),

    macro_invocation: ($) =>
      prec.right(
        "call",
        seq(
          field("macro", $.path),
          "!",
          optional(field("arguments", $.argument_list))
        )
      ),

    comment: ($) =>
      token(
        choice(
          seq("//", /[^\n]*/),
          seq("/*", repeat(choice(/[^\*]/, /\*[^/]/)), "*/")
        )
      ),
  },
});
