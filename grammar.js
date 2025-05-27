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
      "try", // Then try operator
      "unary_not",
      "unary_neg", // Then other unary operators
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
      "closure", // Lowest: closure expressions
    ],
    ["template_chars", "template_interpolation"], // Template literals
  ],

  conflicts: ($) => [
    [$._expression, $._statement],
    [$.path, $.identifier_pattern],
    [$.struct_pattern, $.enum_variant_pattern],
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
        $.fn_declaration,
        $.impl_declaration
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

    // Implementation block rule: e.g., impl Foo { fn new() { Foo } }
    impl_declaration: ($) =>
      seq(
        "impl",
        field("name", $.path),
        field("body", seq("{", repeat($.fn_declaration), "}"))
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
        $.const_statement,
        $.compound_assignment_statement,
        $.break_statement,
        $.continue_statement,
        $.if_expression,
        $.loop_expression,
        $.while_expression,
        $.for_expression
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

    // Compound assignment statement: e.g., x += 1; or counter *= 2;
    compound_assignment_statement: ($) =>
      seq(
        field("left", $._expression),
        field(
          "operator",
          choice("+=", "-=", "*=", "/=", "%=", "|=", "&=", "^=", "<<=", ">>=")
        ),
        field("right", $._expression),
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
        $.template_literal,
        $.try_expression,
        $.closure_expression,
        $.if_expression,
        $.loop_expression,
        $.while_expression,
        $.for_expression,
        $.range_expression,
        $.match_expression
      ),

    use_declaration: ($) => seq("use", $.path, ";"),

    path: ($) =>
      choice($.identifier, seq($.identifier, repeat1(seq("::", $.identifier)))),

    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    await_keyword: ($) => "await",

    // Loop label rule: e.g., 'label: loop { ... }
    loop_label: ($) => seq("'", field("name", $.identifier), ":"),

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
    char: ($) => token(seq("'", /[^']/, "'")),
    integer: ($) => /[0-9]+/,
    float: ($) => /[0-9]+\.[0-9]+/,
    static_string: ($) => seq('"', /[^"]*/, '"'),

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

    // Try operator (?) for error handling: e.g., let result = parse(input)?;
    try_expression: ($) =>
      prec.left("try", seq(field("expression", $._expression), "?")),

    // Closure parameters are similar to function parameters but enclosed in vertical bars
    closure_parameter_list: ($) =>
      seq(
        "|",
        optional(
          seq(
            $.parameter,
            repeat(seq(",", $.parameter)),
            optional(",") // Optional trailing comma
          )
        ),
        "|"
      ),

    // Closure expression: e.g., |a, b| n + a + b or async || { Ok(http::get(url).await?.status()) }
    closure_expression: ($) =>
      prec.right(
        "closure",
        seq(
          optional("async"),
          field("parameters", $.closure_parameter_list),
          field("body", choice($._expression, $.block))
        )
      ),

    // If expression rule: e.g., if x < 5 { "less than five" } else if x > 10 { "more than ten" } else { "between" }
    if_expression: ($) =>
      seq(
        "if",
        field("condition", $._expression),
        field("consequence", $.block),
        optional(
          seq("else", field("alternative", choice($.if_expression, $.block)))
        )
      ),

    // Loop expression rule: e.g., loop { if x > 10 { break x; } } or 'outer_loop: loop { break 'outer_loop; }
    loop_expression: ($) =>
      seq(
        optional(field("label", $.loop_label)),
        "loop",
        field("body", $.block)
      ),

    // While expression rule: e.g., while x < 10 { if x == 5 { break x; } x += 1; } or 'outer_while: while x < 10 { break 'outer_while; }
    while_expression: ($) =>
      seq(
        optional(field("label", $.loop_label)),
        "while",
        field("condition", $._expression),
        field("body", $.block)
      ),

    // For expression rule: e.g., for x in collection { total += x; break total; } or 'outer_for: for x in collection { break 'outer_for; }
    // Can also use range expressions: e.g., for i in 0..10 { ... }
    for_expression: ($) =>
      seq(
        optional(field("label", $.loop_label)),
        "for",
        field("pattern", $.identifier),
        "in",
        field("iterator", $._expression),
        field("body", $.block)
      ),

    // Break statement rule: e.g., break; or break value; or break 'label; or break 'label value;
    break_statement: ($) =>
      seq(
        "break",
        optional(field("label", seq("'", $.identifier))),
        optional($._expression),
        ";"
      ),

    // Continue statement rule: e.g., continue; or continue 'label;
    continue_statement: ($) =>
      seq("continue", optional(field("label", seq("'", $.identifier))), ";"),

    // Range expression rule:
    // Half-open ranges: e.g., a..b, a.., ..b, ..
    // Closed/inclusive ranges: e.g., a..=b, ..=b
    range_expression: ($) =>
      choice(
        prec.left(
          seq(
            field("start", optional($._expression)),
            "..",
            field("end", optional($._expression))
          )
        ),
        prec.left(
          seq(
            field("start", optional($._expression)),
            "..=",
            field("end", $._expression)
          )
        )
      ),

    // Match expression rule: e.g., match value { 1 => "one", 2 => "two", _ => "other" }
    match_expression: ($) =>
      seq(
        "match",
        field("value", $._expression),
        "{",
        optional(
          seq(
            $.match_arm,
            repeat(seq(",", $.match_arm)),
            optional(",") // Optional trailing comma
          )
        ),
        "}"
      ),

    // Match arm rule: e.g., pattern => expression or pattern if condition => expression
    match_arm: ($) =>
      seq(
        field("pattern", $.pattern),
        optional(seq("if", field("guard", $._expression))), // Add support for guards
        "=>",
        field("value", choice($._expression, $.block))
      ),

    // Pattern rule for match expressions
    pattern: ($) =>
      choice(
        $.literal_pattern,
        $.identifier_pattern,
        $.wildcard_pattern,
        $.tuple_pattern,
        $.struct_pattern,
        $.enum_variant_pattern,
        $.range_pattern,
        $.or_pattern
      ),

    // Literal pattern: numbers, strings, booleans
    literal_pattern: ($) =>
      choice($.integer, $.float, $.static_string, $.boolean, $.char),

    // Identifier pattern (variable binding): e.g., x
    identifier_pattern: ($) => $.identifier,

    // Wildcard pattern: _
    wildcard_pattern: ($) => "_",

    // Tuple pattern: e.g., (x, y, _)
    tuple_pattern: ($) =>
      seq(
        "(",
        choice(
          $._empty_tuple_marker,
          seq($.pattern, ","),
          seq($.pattern, repeat1(seq(",", $.pattern)), optional(","))
        ),
        ")"
      ),

    // Struct pattern: e.g., Point { x, y: 0, .. }
    struct_pattern: ($) =>
      seq(
        field("name", $.path),
        "{",
        optional(
          seq(
            choice(
              $.struct_pattern_field,
              $.struct_pattern_shorthand,
              $.rest_pattern
            ),
            repeat(
              seq(
                ",",
                choice(
                  $.struct_pattern_field,
                  $.struct_pattern_shorthand,
                  $.rest_pattern
                )
              )
            ),
            optional(",")
          )
        ),
        "}"
      ),

    // Struct pattern field: e.g., x: 42
    struct_pattern_field: ($) =>
      seq(field("name", $.identifier), ":", field("pattern", $.pattern)),

    // Struct pattern shorthand: e.g., x (equivalent to x: x)
    struct_pattern_shorthand: ($) => field("name", $.identifier),

    // Rest pattern: .. (matches remaining fields)
    rest_pattern: ($) => "..",

    // Enum variant pattern: e.g., Option::Some(x) or Color::Red
    enum_variant_pattern: ($) =>
      seq(
        field("path", $.path),
        optional(
          choice(
            // Tuple variant: e.g., Some(x)
            seq(
              "(",
              optional(
                seq(
                  field("pattern", $.pattern),
                  repeat(seq(",", field("pattern", $.pattern))),
                  optional(",")
                )
              ),
              ")"
            ),
            // Struct variant: e.g., Person { name, age }
            seq(
              "{",
              optional(
                seq(
                  choice(
                    $.struct_pattern_field,
                    $.struct_pattern_shorthand,
                    $.rest_pattern
                  ),
                  repeat(
                    seq(
                      ",",
                      choice(
                        $.struct_pattern_field,
                        $.struct_pattern_shorthand,
                        $.rest_pattern
                      )
                    )
                  ),
                  optional(",")
                )
              ),
              "}"
            )
          )
        )
      ),

    // Range pattern: e.g., 1..=5 or 'a'..='z'
    range_pattern: ($) =>
      seq(
        field("start", choice($.integer, $.float, $.char)),
        choice("..", "..="),
        field("end", choice($.integer, $.float, $.char))
      ),

    // Or pattern: e.g., 1 | 2 | 3
    or_pattern: ($) =>
      prec.left(
        1,
        seq(
          field(
            "left",
            choice(
              $.literal_pattern,
              $.identifier_pattern,
              $.wildcard_pattern,
              $.tuple_pattern
            )
          ),
          "|",
          field(
            "right",
            choice(
              $.pattern,
              $.literal_pattern,
              $.identifier_pattern,
              $.wildcard_pattern,
              $.tuple_pattern
            )
          )
        )
      ),
  },
});
