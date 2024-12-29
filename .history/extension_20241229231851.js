const vscode = require('vscode');

function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("JS Debug");

    const disposable = vscode.commands.registerCommand('dd.helloWorld', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        // 获取选中的代码
        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showWarningMessage('No code selected!');
            return;
        }

        try {
            // 重定向 console.log 到 OutputChannel
            const originalConsoleLog = console.log;
            console.log = (...args) => {
                outputChannel.appendLine(args.map(String).join(' '));
            };

            outputChannel.appendLine(`Executing:\n${code}`);
            const result = eval(code);
            outputChannel.appendLine(`Result: ${result}`);

            // 恢复原始 console.log
            console.log = originalConsoleLog;
        } catch (err) {
            outputChannel.appendLine(`Error: ${err}`);
        }

        // 展示输出通道
        outputChannel.show();
    });

    context.subscriptions.push(disposable, outputChannel);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
