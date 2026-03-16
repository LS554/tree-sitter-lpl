// Tree-sitter grammar for the LPL programming language
// Copyright 2026 London Sheard. Apache-2.0.

const PREC = {
  ASSIGNMENT: 1,
  TERNARY: 2,
  LOGICAL_OR: 3,
  LOGICAL_AND: 4,
  BITWISE_OR: 5,
  BITWISE_XOR: 6,
  BITWISE_AND: 7,
  EQUALITY: 8,
  RELATIONAL: 9,
  SHIFT: 10,
  RANGE: 11,
  ADDITIVE: 12,
  MULTIPLICATIVE: 13,
  CAST: 14,
  UNARY: 15,
  POSTFIX: 16,
  CALL: 17,
  MEMBER: 18,
};

module.exports = grammar({
  name: 'lpl',

  extras: $ => [/\s/, $.line_comment, $.block_comment],

  word: $ => $.identifier,

  supertypes: $ => [$._expression, $._statement, $._type, $._top_level_item],

  conflicts: $ => [
    [$._type, $._expression],
  ],

  rules: {
    source_file: $ => repeat($._top_level_item),

    _top_level_item: $ => choice(
      $.include_directive,
      $.namespace_declaration,
      $.class_declaration,
      $.interface_declaration,
      $.function_definition,
      $.variable_declaration,
      $.extern_declaration,
      $.annotation,
      $.expression_statement,
    ),

    // ---------------------------------------------------------------
    // Include
    // ---------------------------------------------------------------
    include_directive: $ => seq(
      'include',
      choice($.system_lib_string, $.string_literal),
      optional(';'),
    ),

    system_lib_string: $ => /<[^>]+>/,

    // ---------------------------------------------------------------
    // Annotations
    // ---------------------------------------------------------------
    annotation: $ => seq(
      '@',
      $.identifier,
      '(',
      optional($.annotation_arguments),
      ')',
    ),

    annotation_arguments: $ => /[^)]*/,

    // ---------------------------------------------------------------
    // Namespace
    // ---------------------------------------------------------------
    namespace_declaration: $ => seq(
      'namespace',
      $.identifier,
      $.block,
    ),

    // ---------------------------------------------------------------
    // Extern
    // ---------------------------------------------------------------
    extern_declaration: $ => prec(1, seq(
      'extern',
      choice(
        seq($.string_literal, $.block),
        $.function_declaration,
        $.variable_declaration,
      ),
    )),

    // ---------------------------------------------------------------
    // Class
    // ---------------------------------------------------------------
    class_declaration: $ => seq(
      repeat($.modifier),
      'class',
      field('name', $.identifier),
      optional($.type_parameters),
      optional(seq('extends', field('superclass', $._type))),
      optional(seq('implements', commaSep1($._type))),
      $.class_body,
    ),

    class_body: $ => seq('{', repeat($._class_member), '}'),

    _class_member: $ => choice(
      $.field_declaration,
      $.method_definition,
      $.constructor_definition,
      $.access_specifier,
      $.annotation,
    ),

    access_specifier: $ => seq(
      choice('public', 'private', 'protected'),
      ':',
    ),

    field_declaration: $ => seq(
      repeat($.modifier),
      field('type', $._type),
      field('name', $.identifier),
      optional(seq('=', field('value', $._expression))),
      ';',
    ),

    method_definition: $ => seq(
      repeat($.modifier),
      field('return_type', $._type),
      field('name', $.identifier),
      $.parameter_list,
      choice($.block, ';'),
    ),

    constructor_definition: $ => seq(
      repeat($.modifier),
      field('name', $.identifier),
      $.parameter_list,
      $.block,
    ),

    // ---------------------------------------------------------------
    // Interface
    // ---------------------------------------------------------------
    interface_declaration: $ => seq(
      repeat($.modifier),
      'interface',
      field('name', $.identifier),
      optional($.type_parameters),
      $.interface_body,
    ),

    interface_body: $ => seq('{', repeat($.method_signature), '}'),

    method_signature: $ => seq(
      repeat($.modifier),
      field('return_type', $._type),
      field('name', $.identifier),
      $.parameter_list,
      ';',
    ),

    // ---------------------------------------------------------------
    // Functions
    // ---------------------------------------------------------------
    function_definition: $ => seq(
      repeat($.modifier),
      field('return_type', $._type),
      field('name', $.identifier),
      $.parameter_list,
      $.block,
    ),

    function_declaration: $ => seq(
      repeat($.modifier),
      field('return_type', $._type),
      field('name', $.identifier),
      $.parameter_list,
      ';',
    ),

    parameter_list: $ => seq('(', commaSep($.parameter), ')'),

    parameter: $ => seq(
      repeat($.modifier),
      field('type', $._type),
      optional(field('name', $.identifier)),
    ),

    // ---------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------
    _type: $ => choice(
      $.primitive_type,
      $.identifier,
      $.generic_type,
      $.qualified_type,
      $.pointer_type,
      $.array_type,
      $.function_type,
      $.auto_type,
    ),

    primitive_type: $ => choice(
      'void', 'bool', 'byte', 'char', 'short',
      'int', 'long', 'float', 'double', 'string',
    ),

    auto_type: $ => 'auto',

    generic_type: $ => prec(1, seq(
      field('name', $.identifier),
      $.type_arguments,
    )),

    type_arguments: $ => seq('<', commaSep1($._type), '>'),

    type_parameters: $ => seq('<', commaSep1($.identifier), '>'),

    qualified_type: $ => prec(-1, seq(
      $.identifier,
      '.',
      $.identifier,
    )),

    pointer_type: $ => prec.left(seq($._type, '*')),

    array_type: $ => prec.left(seq($._type, '[', optional($._expression), ']')),

    function_type: $ => prec.right(seq(
      'func',
      '<',
      field('return_type', $._type),
      optional(seq('(', commaSep($._type), ')')),
      '>',
    )),

    // ---------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------
    modifier: $ => choice(
      'public',
      'private',
      'protected',
      'static',
      'const',
      'owner',
      'squib',
      'abstract',
      'override',
      'extern',
      'virtual',
    ),

    // ---------------------------------------------------------------
    // Statements
    // ---------------------------------------------------------------
    _statement: $ => choice(
      $.block,
      $.variable_declaration,
      $.expression_statement,
      $.return_statement,
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.do_while_statement,
      $.switch_statement,
      $.try_statement,
      $.throw_statement,
      $.break_statement,
      $.continue_statement,
      $.fallthrough_statement,
      $.defer_statement,
      $.delete_statement,
    ),

    block: $ => seq('{', repeat($._statement), '}'),

    variable_declaration: $ => prec(1, seq(
      repeat($.modifier),
      field('type', $._type),
      field('name', $.identifier),
      optional(seq('=', field('value', $._expression))),
      ';',
    )),

    expression_statement: $ => seq($._expression, ';'),

    return_statement: $ => seq('return', optional($._expression), ';'),

    if_statement: $ => prec.right(seq(
      'if',
      '(',
      field('condition', $._expression),
      ')',
      field('consequence', $._statement),
      optional(seq('else', field('alternative', $._statement))),
    )),

    for_statement: $ => seq(
      'for',
      '(',
      choice(
        $.for_range_clause,
        $.for_classic_clause,
      ),
      ')',
      field('body', $._statement),
    ),

    for_classic_clause: $ => seq(
      field('init', choice(
        $.variable_declaration,
        seq($._expression, ';'),
        ';',
      )),
      field('condition', optional($._expression)),
      ';',
      field('update', optional($._expression)),
    ),

    for_range_clause: $ => seq(
      field('type', $._type),
      field('name', $.identifier),
      ':',
      field('iterable', $._expression),
    ),

    while_statement: $ => seq(
      'while',
      '(',
      field('condition', $._expression),
      ')',
      field('body', $._statement),
    ),

    do_while_statement: $ => seq(
      'do',
      field('body', $._statement),
      'while',
      '(',
      field('condition', $._expression),
      ')',
      ';',
    ),

    switch_statement: $ => seq(
      'switch',
      '(',
      field('value', $._expression),
      ')',
      $.switch_body,
    ),

    switch_body: $ => seq('{', repeat(choice($.case_clause, $.default_clause)), '}'),

    case_clause: $ => seq('case', $._expression, ':', repeat($._statement)),

    default_clause: $ => seq('default', ':', repeat($._statement)),

    try_statement: $ => seq(
      'try',
      $.block,
      repeat($.catch_clause),
      optional($.finally_clause),
    ),

    catch_clause: $ => seq(
      'catch',
      '(',
      field('type', $._type),
      optional(field('name', $.identifier)),
      ')',
      $.block,
    ),

    finally_clause: $ => seq('finally', $.block),

    throw_statement: $ => seq('throw', $._expression, ';'),

    break_statement: $ => seq('break', ';'),
    continue_statement: $ => seq('continue', ';'),
    fallthrough_statement: $ => seq('fallthrough', ';'),

    defer_statement: $ => seq('defer', $._statement),

    delete_statement: $ => seq('delete', $._expression, ';'),

    // ---------------------------------------------------------------
    // Expressions
    // ---------------------------------------------------------------
    _expression: $ => choice(
      $.identifier,
      $.this_expression,
      $.super_expression,
      $.number_literal,
      $.string_literal,
      $.char_literal,
      $.boolean_literal,
      $.null_literal,
      $.binary_expression,
      $.unary_expression,
      $.update_expression,
      $.assignment_expression,
      $.ternary_expression,
      $.cast_expression,
      $.call_expression,
      $.member_expression,
      $.subscript_expression,
      $.new_expression,
      $.move_expression,
      $.lambda_expression,
      $.parenthesized_expression,
      $.range_expression,
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    binary_expression: $ => choice(
      ...[
        ['+', PREC.ADDITIVE],
        ['-', PREC.ADDITIVE],
        ['*', PREC.MULTIPLICATIVE],
        ['/', PREC.MULTIPLICATIVE],
        ['%', PREC.MULTIPLICATIVE],
        ['&&', PREC.LOGICAL_AND],
        ['||', PREC.LOGICAL_OR],
        ['&', PREC.BITWISE_AND],
        ['|', PREC.BITWISE_OR],
        ['^', PREC.BITWISE_XOR],
        ['<<', PREC.SHIFT],
        ['>>', PREC.SHIFT],
        ['==', PREC.EQUALITY],
        ['!=', PREC.EQUALITY],
        ['<', PREC.RELATIONAL],
        ['>', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
      ].map(([op, p]) =>
        prec.left(p, seq(
          field('left', $._expression),
          field('operator', op),
          field('right', $._expression),
        )),
      ),
    ),

    unary_expression: $ => prec.left(PREC.UNARY, seq(
      field('operator', choice('!', '-', '~', '*', '&')),
      field('operand', $._expression),
    )),

    update_expression: $ => choice(
      prec.left(PREC.POSTFIX, seq($._expression, choice('++', '--'))),
      prec.right(PREC.UNARY, seq(choice('++', '--'), $._expression)),
    ),

    assignment_expression: $ => prec.right(PREC.ASSIGNMENT, seq(
      field('left', $._expression),
      field('operator', choice('=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=')),
      field('right', $._expression),
    )),

    ternary_expression: $ => prec.right(PREC.TERNARY, seq(
      field('condition', $._expression),
      '?',
      field('consequence', $._expression),
      ':',
      field('alternative', $._expression),
    )),

    cast_expression: $ => prec.left(PREC.CAST, seq(
      field('value', $._expression),
      'as',
      field('type', $._type),
    )),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', $._expression),
      $.argument_list,
    )),

    argument_list: $ => seq('(', commaSep($._expression), ')'),

    member_expression: $ => prec(PREC.MEMBER, seq(
      field('object', $._expression),
      choice('.', '->'),
      field('member', $.identifier),
    )),

    subscript_expression: $ => prec(PREC.POSTFIX, seq(
      field('object', $._expression),
      '[',
      field('index', $._expression),
      ']',
    )),

    new_expression: $ => prec.right(PREC.UNARY, seq(
      'new',
      field('type', $._type),
      optional($.argument_list),
    )),

    move_expression: $ => prec.right(PREC.UNARY, seq(
      'move',
      field('value', $._expression),
    )),

    lambda_expression: $ => seq(
      '(',
      commaSep($.parameter),
      ')',
      optional(seq('->', field('return_type', $._type))),
      $.block,
    ),

    range_expression: $ => prec.left(PREC.RANGE, seq(
      field('start', $._expression),
      field('operator', choice('...', '...=')),
      field('end', $._expression),
    )),

    this_expression: $ => 'this',
    super_expression: $ => 'super',

    // ---------------------------------------------------------------
    // Literals
    // ---------------------------------------------------------------
    number_literal: $ => choice(
      /0[xX][0-9a-fA-F]+/,
      /0[bB][01]+/,
      /0[oO][0-7]+/,
      /[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/,
      /[0-9]+[eE][+-]?[0-9]+/,
      /[0-9]+/,
    ),

    string_literal: $ => seq(
      '"',
      repeat(choice(
        $.escape_sequence,
        /[^"\\]+/,
      )),
      '"',
    ),

    char_literal: $ => seq(
      "'",
      choice($.escape_sequence, /[^'\\]/),
      "'",
    ),

    escape_sequence: $ => /\\['"\\nrtbf0v]|\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}/,

    boolean_literal: $ => choice('true', 'false'),

    null_literal: $ => 'null',

    // ---------------------------------------------------------------
    // Identifiers and comments
    // ---------------------------------------------------------------
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    comment: $ => choice($.line_comment, $.block_comment),

    line_comment: $ => token(seq('//', /[^\n]*/)),

    block_comment: $ => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')),
  },
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
