const vscode = require('vscode');
const path = require('path');
const { DebugAdapterDescriptorFactory } = require('./mysqlDebugAdapter');

// 创建装饰器类型
let currentLineDecoration;

const vscode = require('vscode');

let currentLineDecoration;
let sqlExecutionResults = new Map(); // 存储SQL执行结果

function createDecorations() {
    currentLineDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 255, 0, 0.2)',
        isWholeLine: true,
        borderColor: 'rgba(255, 165, 0, 0.5)',
        borderStyle: 'solid',
        borderWidth: '1px'
    });
}


async function activate(context) {
    console.log('MySQL debugger is now active!');

    // 创建装饰器
    createDecorations();

    // 注册调试适配器工厂
    const factory = new DebugAdapterDescriptorFactory();
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('mysql-debug', factory)
    );

    // 注册高亮更新事件
    let highlightDisposable = vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
        if (event.event === 'highlightSQL') {
            updateHighlight(event.body.lineNumber);
        }
    });
    context.subscriptions.push(highlightDisposable);

    // 注册启动调试的命令
    let disposable = vscode.commands.registerCommand('mysql-debug.start', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('Please open a SQL file first');
                return;
            }

            // if (editor.document.languageId !== 'sql') {
            //     vscode.window.showErrorMessage('This file is not a SQL file');
            //     return;
            // }

            // 解析SQL语句
            const sqlContent = editor.document.getText();
            const statements = parseSQLStatements(sqlContent);
            
            if (statements.length === 0) {
                vscode.window.showErrorMessage('No valid SQL statements found');
                return;
            }

            // 获取数据库连接信息
            const host = await vscode.window.showInputBox({
                prompt: 'Enter MySQL host',
                value: 'localhost'
            });
            // if (!host) return;

            // const user = await vscode.window.showInputBox({
            //     prompt: 'Enter MySQL username',
            //     value: 'root'
            // });
            // if (!user) return;

            // const password = await vscode.window.showInputBox({
            //     prompt: 'Enter MySQL password',
            //     password: true
            // });
            // if (!password) return;

            // const database = await vscode.window.showInputBox({
            //     prompt: 'Enter database name'
            // });
            // if (!database) return;

            // 创建调试配置
            const debugConfig = {
                type: 'mysql-debug',
                name: 'Debug MySQL Query',
                request: 'launch',
                host,
                user:'root',
                password:'123456',
                database:'admin',
                sql: sqlContent,
                statements: statements,
                program: editor.document.uri.fsPath  // 添加这行
            };

            // 启动调试会话
            vscode.debug.startDebugging(undefined, debugConfig);

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

function parseSQLStatements(sqlContent) {
    // 简单的SQL语句解析
    return sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0)
        .map((stmt, index) => ({
            sql: stmt + ';',
            startLine: sqlContent.substr(0, sqlContent.indexOf(stmt)).split('\n').length - 1,
            endLine: sqlContent.substr(0, sqlContent.indexOf(stmt) + stmt.length).split('\n').length - 1
        }));
}

function updateHighlight(lineNumber) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const range = new vscode.Range(
            new vscode.Position(lineNumber, 0),
            new vscode.Position(lineNumber, Number.MAX_VALUE)
        );
        editor.setDecorations(currentLineDecoration, [range]);
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};