const vscode = require('vscode');
const path = require('path');
const { DebugAdapterDescriptorFactory } = require('./mysqlDebugAdapter');

async function activate(context) {
    console.log('MySQL debugger is now active!');

    // 注册调试适配器工厂
    const factory = new DebugAdapterDescriptorFactory();
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('mysql-debug', factory)
    );

    // 注册启动调试的命令
    let disposable = vscode.commands.registerCommand('mysql-debug.start', async () => {
        try {
            // 获取当前活动的文本编辑器
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('Please open a SQL file first');
                return;
            }

            // if (editor.document.languageId !== 'sql') {
            //     vscode.window.showErrorMessage('This file is not a SQL file');
            //     return;
            // }

            // 获取数据库连接信息
            // const host = await vscode.window.showInputBox({
            //     prompt: 'Enter MySQL host',
            //     value: 'localhost'
            // });
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

            // 获取当前文件内容作为 SQL
            const sql = editor.document.getText();

            // 创建调试配置
            const debugConfig = {
                type: 'mysql-debug',
                name: 'Debug MySQL Query',
                request: 'launch',
                host:'root',
                user:'root',
                password:'123456',
                database:'',
                sql
            };

            // 启动调试会话
            vscode.debug.startDebugging(undefined, debugConfig);

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};