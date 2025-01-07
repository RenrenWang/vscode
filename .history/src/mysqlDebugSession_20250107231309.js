const {
    LoggingDebugSession,
    InitializedEvent,
    StoppedEvent,
    TerminatedEvent,
    OutputEvent
} = require('vscode-debugadapter');
const mysql = require('mysql2/promise');

class DebugSession extends LoggingDebugSession {
    constructor() {
        super("mysql-debug.txt");
        this._connection = null;
        this._statements = [];
        this._currentStatement = 0;
    }

    initializeRequest(response, args) {
        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsStepFeatures = true;
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsSingleThreadExecutionAtBreakpoints = true;
        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
    }

    async launchRequest(response, args) {
        try {
            const { host, user, password, database, statements } = args;
            this._statements = statements;

            // 连接数据库
            await this._createMySQLConnection(host, user, password, database);
            
            // 发送连接成功消息
            this.sendEvent(new OutputEvent(`Connected to MySQL at ${host}\n`));
            this.sendEvent(new OutputEvent(`Database: ${database}\n`));
            this.sendEvent(new OutputEvent(`User: ${user}\n`));
            this.sendEvent(new OutputEvent(`Current Time (UTC): ${new Date().toISOString()}\n\n`));

            // 执行第一条语句
            await this._executeNextStatement();

            this.sendResponse(response);
            thi
        } catch (err) {
            this.sendEvent(new OutputEvent(`Error: ${err.message}\n`, 'stderr'));
            this.sendErrorResponse(response, {
                id: 1,
                format: `Error: ${err.message}`,
                showUser: true
            });
        }
    }

    async nextRequest(response, args) {
        try {
            await this._executeNextStatement();
            this.sendResponse(response);
        } catch (err) {
            this.sendErrorResponse(response, {
                id: 1,
                format: `Error: ${err.message}`,
                showUser: true
            });
        }
    }

    async _executeNextStatement() {
        if (this._currentStatement >= this._statements.length) {
            await this._connection.end();
            this.sendEvent(new OutputEvent('Execution completed.\n'));
            this.sendEvent(new TerminatedEvent());
            return;
        }

        const statement = this._statements[this._currentStatement];
        
        // 发送高亮事件
        this.sendEvent({event: 'highlightSQL', body: { lineNumber: statement.startLine } });

        // 执行SQL
        this.sendEvent(new OutputEvent(`Executing SQL:\n${statement.sql}\n`));
        
        try {
            const [rows] = await this._connection.query(statement.sql);
            this.sendEvent(new OutputEvent(`Results:\n${JSON.stringify(rows, null, 2)}\n\n`));
        } catch (err) {
            this.sendEvent(new OutputEvent(`Error executing SQL: ${err.message}\n`, 'stderr'));
            throw err;
        }

        this._currentStatement++;

        if (this._currentStatement < this._statements.length) {
            this.sendEvent(new StoppedEvent('step', 1));
        } else {
            await this._connection.end();
            this.sendEvent(new OutputEvent('Execution completed.\n'));
            this.sendEvent(new TerminatedEvent());
        }
    }

    async _createMySQLConnection(host, user, password, database) {
        this._connection = await mysql.createConnection({
            host,
            user,
            password,
            database
        });
    }
}

module.exports = DebugSession;