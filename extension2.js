const vscode = require('vscode');
const { spawn } = require('child_process');

function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("MySQL Debug");

    const disposable = vscode.commands.registerCommand('dd.helloWorld', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const sqlQuery = editor.document.getText(); // 获取当前编辑器的内容
        if (!sqlQuery.trim()) {
            vscode.window.showErrorMessage('No SQL query found in the active editor!');
            return;
        }

        const mysqlConfig = {
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            password: '123456',
            database: 'table_name',
            // mysqlPath: `C:\Program Files\MySQL\MySQL Shell 8.0\bin\mysql.exe` // MySQL 客户端的完整路径
        };

        // 调用 MySQL 客户端工具
        const mysqlProcess = spawn(mysqlConfig.mysqlPath, [
            '-h', mysqlConfig.host,
            '-P', mysqlConfig.port.toString(),
            '-u', mysqlConfig.user,
            `-p${mysqlConfig.password}`,
            '-D', mysqlConfig.database,
            '-e', sqlQuery
        ]);

        mysqlProcess.stdout.on('data', (data) => {
            outputChannel.appendLine(data.toString());
        });

        mysqlProcess.stderr.on('data', (data) => {
            outputChannel.appendLine(`Error: ${data.toString()}`);
        });

        mysqlProcess.on('close', (code) => {
            outputChannel.appendLine(`MySQL process exited with code ${code}`);
        });

        outputChannel.show();
    });

    context.subscriptions.push(disposable, outputChannel);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
