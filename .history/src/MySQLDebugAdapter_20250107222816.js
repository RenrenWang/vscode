const vscode = require('vscode');
const { DebugSession } = require('./mysqlDebugSession');
const path = require('path');

class DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(session) {
        const debuggerPath = path.join(__dirname, 'mysqlDebugSession.js');
        return new vscode.DebugAdapterExecutable(
            process.execPath,
            [debuggerPath],
            { cwd: process.cwd() }
        );
    }

    dispose() {}
}

if (require.main === module) {
    DebugSession.run(DebugSession);
}

module.exports = {
    DebugAdapterDescriptorFactory
};