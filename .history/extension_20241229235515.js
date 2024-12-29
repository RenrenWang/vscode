const vscode = require('vscode');
const vm = require('vm');

function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("JS Debug");

    const disposable = vscode.commands.registerCommand('dd.helloWorld', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showWarningMessage('No code selected!');
            return;
        }

        // 输入断点信息
        const breakpointLine = await vscode.window.showInputBox({
            prompt: "Enter line number for breakpoint",
            placeHolder: "e.g., 1",
            ignoreFocusOut: true
        });

        if (!breakpointLine || isNaN(breakpointLine)) {
            vscode.window.showErrorMessage("Invalid line number for breakpoint!");
            return;
        }

        try {
            outputChannel.appendLine(`Executing:\n${code}`);
            outputChannel.appendLine(`Setting breakpoint at line ${breakpointLine}`);

            // 调试上下文
            const script = new vm.Script(code);
            const context = vm.createContext({ console });

            // 执行脚本并监听调试事件.runInDebugContext('Debug');
            let stepCount = 0;
            const debugListener = vm.runInDebugContext('Debug')
            debugListener.debuggerStatement = (event) => {
                if (stepCount === parseInt(breakpointLine) - 1) {
                    outputChannel.appendLine("Breakpoint reached!");
                    outputChannel.appendLine(`Debug info:\n${JSON.stringify(event)}`);
                }
                stepCount++;
            };

            script.runInContext(context, { breakOnSigint: true });
            outputChannel.appendLine(`Code execution completed.`);
        } catch (err) {
            outputChannel.appendLine(`Error: ${err.message}`);
        }

        outputChannel.show();
    });

    context.subscriptions.push(disposable, outputChannel);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
