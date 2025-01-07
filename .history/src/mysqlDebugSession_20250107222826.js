const {
    Logger, logger,
    LoggingDebugSession,
    InitializedEvent,
    StoppedEvent,
    TerminatedEvent,
    Thread,
    StackFrame,
    Scope,
    Source,
    Handles,
    Breakpoint
} = require('vscode-debugadapter');
const { Subject } = require('await-notify');
const mysql = require('mysql2/promise');

class DebugSession extends LoggingDebugSession {
    constructor() {
        super("mysql-debug.txt");
        this._configurationDone = new Subject();
        this._breakpoints = new Map();
        this._connection = null;
        this._variableHandles = new Handles();
    }

    initializeRequest(response, args) {
        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsEvaluateForHovers = true;
        response.body.supportsStepBack = false;
        response.body.supportsSetVariable = false;
        response.body.supportsFunctionBreakpoints = false;
        response.body.supportsConditionalBreakpoints = false;
        response.body.supportsHitConditionalBreakpoints = false;
        response.body.supportsLogPoints = false;

        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
    }

    async launchRequest(response, args) {
        try {
            const { host, user, password, database, sql } = args;

            // 等待配置完成
            await this._configurationDone.wait(1000);

            // 连接数据库
            await this._createMySQLConnection(host, user, password, database);
            
            // 执行 SQL
            await this._executeSQL(sql);

            this.sendEvent(new TerminatedEvent());
            this.sendResponse(response);
        } catch (err) {
            this.sendErrorResponse(response, {
                id: 1,
                format: `Error: ${err.message}`,
                showUser: true
            });
        }
    }

    async _createMySQLConnection(host, user, password, database) {
        this._connection = await mysql.createConnection({
            host,
            user,
            password,
            database
        });
        this._log('Database connection established');
    }

    async _executeSQL(sql) {
        if (!this._connection) {
            throw new Error('No database connection');
        }

        try {
            const [rows] = await this._connection.query(sql);
            this._log(`Query result: ${JSON.stringify(rows, null, 2)}`);
        } finally {
            await this._connection.end();
            this._log('Database connection closed');
        }
    }

    _log(message) {
        this.sendEvent({
            event: 'output',
            body: {
                category: 'console',
                output: `[MySQL Debug] ${message}\n`
            }
        });
    }

    configurationDoneRequest(response, args) {
        this._configurationDone.notify();
        this.sendResponse(response);
    }
}

module.exports = {
    DebugSession
};