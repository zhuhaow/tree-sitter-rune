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
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
