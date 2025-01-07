const vscode = require('vscode');
const path = require('path');
const { DebugAdapterDescriptorFactory } = require('./mysqlDebugAdapter');

// 创建装饰器类型
let currentLineDecoration;
let hoverProvider; // 声明在外部以便管理生命周期



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
  // 注册高亮更新事件和SQL结果存储
  // 注册高亮更新事件和SQL结果存储
 // 注册高亮更新事件和SQL结果存储
 let debugEventDisposable = vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
    console.log('Debug event received:', event.event); // 添加日志
    
    if (event.event === 'highlightSQL') {
        updateHighlight(event.body.lineNumber);
    }
    
    if (event.event === 'sqlResult') {
        // 存储SQL执行结果
        sqlExecutionResults.set(event.body.lineNumber, {
            sql: event.body.sql,
            result: event.body.result,
            executionTime: event.body.executionTime,
            timestamp: new Date().toISOString()
        });
        
        console.log('SQL result stored for line:', event.body.lineNumber); // 添加日志
        
        // 确保悬停提供程序已注册
        registerHoverProvider(context);
    }
});
context.subscriptions.push(debugEventDisposable);

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
  // 清除之前的结果
  sqlExecutionResults.clear();
        
  // 确保悬停提供程序已注册
  registerHoverProvider(context);
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}
function registerHoverProvider(context) {
    // 如果已经注册过，就不重复注册
    if (hoverProvider) {
        return;
    }

    hoverProvider = vscode.languages.registerHoverProvider({ scheme: 'file', language: 'sql' }, {
        provideHover(document, position, token) {
            console.log('Hover triggered at line:', position.line); // 添加日志
            console.log('Available results:', Array.from(sqlExecutionResults.keys())); // 添加日志
            
            const lineNumber = position.line;
            const result = sqlExecutionResults.get(lineNumber);
            
            if (result) {
                console.log('Found result for line:', lineNumber); // 添加日志
                
                const content = new vscode.MarkdownString();
                content.supportHtml = true;
                content.isTrusted = true;

                // 添加SQL语句和执行信息
                content.appendMarkdown('### SQL Execution Results\n\n');
                content.appendCodeblock(result.sql, 'sql');
                content.appendMarkdown('\n**Execution Time**: ' + result.executionTime + 'ms\n');
                content.appendMarkdown('**Timestamp**: ' + result.timestamp + '\n\n');
                
                // 格式化并添加结果
                content.appendMarkdown('### Results\n\n');
                if (Array.isArray(result.result)) {
                    // 如果结果是数组（SELECT 查询结果）
                    if (result.result.length > 0) {
                        // 创建表格头
                        const headers = Object.keys(result.result[0]);
                        content.appendMarkdown('| ' + headers.join(' | ') + ' |\n');
                        content.appendMarkdown('| ' + headers.map(() => '---').join(' | ') + ' |\n');
                        
                        // 添加表格数据（最多显示10行）
                        result.result.slice(0, 10).forEach(row => {
                            content.appendMarkdown('| ' + headers.map(h => String(row[h] || '')).join(' | ') + ' |\n');
                        });
                        
                        if (result.result.length > 10) {
                            content.appendMarkdown('\n*...and ' + (result.result.length - 10) + ' more rows*\n');
                        }
                    } else {
                        content.appendMarkdown('*No rows returned*\n');
                    }
                } else {
                    // 如果结果是对象（INSERT/UPDATE/DELETE 结果）
                    content.appendCodeblock(JSON.stringify(result.result, null, 2), 'json');
                }

                return new vscode.Hover(content);
            }
            return null;
        }
    });

    context.subscriptions.push(hoverProvider);
    console.log('Hover provider registered'); // 添加日志
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