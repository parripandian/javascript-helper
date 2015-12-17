/**
 * Created by Parri on 12/16/2015.
 */

/*global exports:true, require:true, global:true*/
(function () {
    'use strict';

    var esprima = require('esprima');
    var escodegen = require('escodegen');
    var _ = require('lodash');

    exports.findComponent = findComponent;
    exports.processProgram = processProgram;

    var fileList = [];
    var currentFile = {};

    var ANGULAR_COMPONENT = {
        MODULE: 'module',
        CONTROLLER: 'controller',
        SERVICE: 'service',
        FACTORY: 'factory',
        FILTER: 'filter',
        DIRECTIVE: 'directive',
        CONFIG: 'config'
    };

    var STATEMENT_TYPE = {
        "EXPRESSION": 'ExpressionStatement',
        "BLOCK": 'BlockStatement',
        "EMPTY": 'EmptyStatement',
        "DEBUGGER": 'DebuggerStatement',
        "WITH": 'WithStatement',
        "RETURN": 'ReturnStatement',
        "LABELED": 'LabeledStatement',
        "BREAK": 'BreakStatement',
        "CONTINUE": 'ContinueStatement',
        "IF": 'IfStatement',
        "SWITCH": 'SwitchStatement',
        "THROW": 'ThrowStatement',
        "TRY": 'TryStatement',
        "WHILE": 'WhileStatement',
        "DO_WHILE": 'DoWhileStatement',
        "FOR": 'ForStatement',
        "FOR_IN": 'ForInStatement'
    };

    var EXPRESSION_TYPE = {
        "THIS": 'ThisExpression',
        "ARRAY": 'ArrayExpression',
        "OBJECT": 'ObjectExpression',
        "FUNCTION": 'FunctionExpression',
        "UNARY": 'UnaryExpression',
        "UPDATE": 'UpdateExpression',
        "BINARY": 'BinaryExpression',
        "ASSIGNMENT": 'AssignmentExpression',
        "LOGICAL": 'LogicalExpression',
        "MEMBER": 'MemberExpression',
        "CONDITION": 'ConditionalExpression',
        "CALL": 'CallExpression',
        "NEW": 'NewExpression',
        "SEQUENCE": 'SequenceExpression'
    };

    var OTHER_TYPE = {
        "LITERAL": 'Literal',
        "IDENTIFIER": 'Identifier'
    };

    var DECLARATION_TYPE = {
        "FUNCTION_DECLARATION": 'FunctionDeclaration',
        "VARIABLE_DECLARATION": 'VariableDeclaration',
        "VARIABLE_DECLARATOR": 'VariableDeclarator'
    };

    var STATEMENT_TYPE_VALUES = _.values(STATEMENT_TYPE);
    var EXPRESSION_TYPE_VALUES = _.values(EXPRESSION_TYPE);
    var OTHER_TYPE_VALUES = _.values(OTHER_TYPE);
    var DECLARATION_TYPE_VALUES = _.values(DECLARATION_TYPE);

    var programJson = {
        "type": "Program",
        "body": [],
        "sourceType": "script"
    };

    var expressionStatementJson = {
        "type": "ExpressionStatement",
        "expression": {}
    };

    var callExpressionJson = {
        "type": "CallExpression",
        "callee": {},
        "arguments": []
    };

    var calleeDescribeJson = {
        "type": "Identifier",
        "name": "describe"
    };

    var calleeBeforeEachJson = {
        "type": "Identifier",
        "name": "beforeEach"
    };

    var calleeItJson = {
        "type": "Identifier",
        "name": "it"
    };

    var literalJson = {
        "type": "Literal",
        "value": "",
        "raw": ""
    };

    var functionExpressionJson = {
        "type": "FunctionExpression",
        "id": null,
        "params": [],
        "defaults": [],
        "body": {},
        "generator": false,
        "expression": false
    };

    var assignmentExpressionJson = {
        "type": "AssignmentExpression",
        "operator": "=",
        "left": {
            "type": "MemberExpression",
            "computed": false,
            "object": {
                "type": "ThisExpression"
            },
            "property": {
                "type": "Identifier",
                "name": "foo"
            }
        },
        "right": {
            "type": "Literal",
            "value": 0,
            "raw": "0"
        }
    };

    var blockStatementJson = {
        "type": "BlockStatement",
        "body": []
    };

    function processProgram(program) {
        console.log(program.type);

        currentFile.functionDeclarationList = currentFile.functionDeclarationList || [];
        currentFile.functionExpressionList = currentFile.functionExpressionList || [];
        currentFile.calleeList = currentFile.calleeList || [];
        currentFile.assignmentList = currentFile.assignmentList || [];
        currentFile.arrayList = currentFile.arrayList || [];
        currentFile.memberList = currentFile.memberList || [];
        currentFile.scopeFunctionList = currentFile.scopeFunctionList || [];

        processObjectList(program.body);
        // findComponent(program);
    }

    function processStatement(statement) {
        console.log(statement.type);

        if (statement.type === STATEMENT_TYPE.EXPRESSION) {
            processObject(statement.expression);
        } else if (statement.type === STATEMENT_TYPE.BLOCK) {
            processObject(statement.expression);

            processObjectList(statement.body);
        }
    }

    function processExpression(expression) {

        if (expression === null) {
            return;
        }

        console.log(expression.type);

        if (expression.type === EXPRESSION_TYPE.CALL) {
            //  console.log('arguments - ' + expression.arguments);
            processObject(expression.callee);

            processObjectList(expression.arguments);
            currentFile.calleeList.push(expression);
        } else if (expression.type === EXPRESSION_TYPE.FUNCTION) {
            //  console.log('id - ' + expression.id);
            //  console.log('params - ' + expression.params);
            console.log('defaults - ' + expression.defaults);
            console.log('generator - ' + expression.generator);
            console.log('expression - ' + expression.expression);

            processObject(expression.id);
            processObjectList(expression.params);
            processObjectList(expression.defaults);
            processObject(expression.body);

            currentFile.functionExpressionList.push(expression);
            // processObjectList(expression.body);
        } else if (expression.type === EXPRESSION_TYPE.ASSIGNMENT) {
            console.log('operator - ' + expression.operator);

            processObject(expression.left);
            processObject(expression.right);
            currentFile.assignmentList.push(expression);

            checkScopeFunctionDeclaration(expression);
        } else if (expression.type === EXPRESSION_TYPE.ARRAY) {
            console.log('operator - ' + expression.operator);

            processObjectList(expression.elements);
            currentFile.arrayList.push(expression);
        } else if (expression.type === EXPRESSION_TYPE.MEMBER) {
            console.log('computed - ' + expression.computed);

            processObject(expression.object);
            processObject(expression.property);
            currentFile.memberList.push(expression);
        }

    }

    function checkScopeFunctionDeclaration(expression) {
        if (expression.type === EXPRESSION_TYPE.ASSIGNMENT) {

            if (expression.left.type === EXPRESSION_TYPE.MEMBER && expression.right.type === EXPRESSION_TYPE.FUNCTION) {
                currentFile.scopeFunctionList.push(expression);
            }
        }
    }

    function processObjectList(objectList) {

        if (objectList === null) {
            return;
        }

        _.forEach(objectList, function (object, key) {
            console.log(object.type);
            processObject(object);
        });
    }

    function processObject(object) {

        if (object === null || object === undefined) {
            return;
        }

        if (_.includes(STATEMENT_TYPE_VALUES, object.type)) {
            processStatement(object);
        } else if (_.includes(EXPRESSION_TYPE_VALUES, object.type)) {
            processExpression(object);
        } else if (_.includes(OTHER_TYPE_VALUES, object.type)) {
            processOther(object);
        } else if (_.includes(DECLARATION_TYPE_VALUES, object.type)) {
            processDeclaration(object);
        }
    }

    function processDeclaration(declaration) {
        if (declaration === null) {
            return;
        }

        if (declaration.type === DECLARATION_TYPE.VARIABLE_DECLARATION) {
            console.log('kind - ' + declaration.kind);
            processObjectList(declaration.declarations);
        } else if (declaration.type === DECLARATION_TYPE.VARIABLE_DECLARATOR) {
            processObject(declaration.id);
            processObject(declaration.init);
        } else if (declaration.type === DECLARATION_TYPE.FUNCTION_DECLARATION) {
            console.log('defaults - ' + declaration.defaults);
            console.log('generator - ' + declaration.generator);
            console.log('expression - ' + declaration.expression);

            processObject(declaration.id);
            processObjectList(declaration.params);
            processObjectList(declaration.defaults);
            processObject(declaration.body);
            currentFile.functionDeclarationList.push(declaration);
        }
    }

    function processOther(other) {
        if (other.type === OTHER_TYPE.LITERAL) {
            console.log('value - ' + other.value);
            console.log('raw - ' + other.raw);
        } else if (other.type === OTHER_TYPE.IDENTIFIER) {
            console.log('name - ' + other.name);
        }
    }

    function findComponent(program) {
        var programBody;
        var bodyExpression;
        var calleeBody;
        var bodyStatements;

        var componentDeclarations;
        var componentDefinition;
        var componentFunction;
        var componentType;

        if (program.type === 'Program' && program.body[0].type === STATEMENT_TYPE.EXPRESSION) {
            programBody = program.body[0];
            bodyExpression = programBody.expression;

            if (bodyExpression.type === EXPRESSION_TYPE.CALL && bodyExpression.callee.type === EXPRESSION_TYPE.FUNCTION) {
                calleeBody = bodyExpression.callee.body;
            }

            if (calleeBody.type === STATEMENT_TYPE.BLOCK) {
                bodyStatements = calleeBody.body;

                _.forEach(bodyStatements, function (statement, key) {
                    if (statement.type === STATEMENT_TYPE.EXPRESSION && statement.expression.type === EXPRESSION_TYPE.CALL) {
                        componentDefinition = statement.expression;
                        componentType = componentDefinition.callee.property.name;
                    }

                    if (statement.type === DECLARATION_TYPE.FUNCTION_DECLARATION) {
                        componentFunction = statement.expression;
                    }
                });

                componentDeclarations = _.find(bodyStatements, function (statement, key) {
                    return statement.type === DECLARATION_TYPE.FUNCTION_DECLARATION;
                });

                console.log(componentDeclarations);
                console.log(componentDefinition);
                console.log(componentFunction);
            }
        }

        return {
            definition: componentDefinition,
            function: componentFunction,
            type: componentType
        };
    }

    function prepareSpec(component) {
        if (ANGULAR_COMPONENT.CONTROLLER === component.type) {

        }
    }

    function prepareDescribe(componentDefinition) {

    }

    function prepareIt() {

    }

    function prepareBeforeEach() {

    }

}());
