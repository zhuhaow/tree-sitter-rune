package tree_sitter_rune_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_rune "github.com/zhuhaow/tree-sitter-rune/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_rune.Language())
	if language == nil {
		t.Errorf("Error loading Rune grammar")
	}
}
