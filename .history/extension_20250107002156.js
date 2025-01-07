import { Console } from 'console';

const vscode = require('vscode');
const mysql = require('mysql2/promise');
const fs = require('fs');

// 数据库连接配置
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'admin'
};

// 执行 SQL 文件
async function executeSQL(filePath) {
    if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage('SQL file not found!');
        return;
    }

    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    let queries = sqlContent
        .split(';') // 按分号分割 SQL 语句
        .map(query => query.trim()) // 去除多余空白
        .filter(Boolean); // 移除空白行

    if (queries.length === 0) {
        vscode.window.showErrorMessage('No valid SQL statements found!');
        return;
    } 
    console.log("queries",queries)
    const connection = await mysql.createConnection(dbConfig);

    try {
        for (let [index, query] of queries.entries()) {
            // 检查是否有调试标记
            if (query.includes('--debug')) {
                console.log(`Breakpoint found at statement ${index + 1}:`);
                // 去除 debug 标记
                query = query.replace('--debug', '').trim();
                await pauseForDebug(); // 暂停，等待用户输入继续
            }

            try {
                console.log(`Executing statement ${index + 1}:`, query);
                const [results] = await connection.query(query);
                console.log(`Results for statement ${index + 1}:`, results);
            } catch (err) {
                console.error(`Error executing statement ${index + 1}:`, err.message);
            } 
        }
    } finally {
        await connection.end();
        console.log('Connection closed.');
    }
}

// 暂停调试，等待用户输入继续
async function pauseForDebug() {
    return new Promise(resolve => {
        // 弹出一个输入框，让用户确认继续执行
        vscode.window.showInputBox({
            prompt: 'Press ENTER to continue to the next statement...',
            placeHolder: 'Press ENTER to continue'
        }).then(input => {
            resolve(); // 当用户按下回车时，继续执行
        });
    });
} 

// 扩展激活时注册命令
function activate(context) {
    const disposable = vscode.commands.registerCommand('sqlDebugger.executeSQL', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const filePath = editor.document.uri.fsPath;
        await executeSQL(filePath);
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
