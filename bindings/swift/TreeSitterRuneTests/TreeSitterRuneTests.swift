import XCTest
import SwiftTreeSitter
import TreeSitterRune

final class TreeSitterRuneTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_rune())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Rune grammar")
    }
}
