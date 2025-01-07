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
    }

    initializeRequest(response, args) {
        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = true;
        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
    }

    async launchRequest(response, args) {
        try {
            const { host, user, password, database, sql } = args;

            // 发送开始执行的消息
            this.sendEvent(new OutputEvent(`Connecting to MySQL at ${host}...\n`));

            // 连接数据库
            await this._createMySQLConnection(host, user, password, database);
            
            // 发送正在执行 SQL 的消息
            this.sendEvent(new OutputEvent(`Executing SQL:\n${sql}\n`));

            // 执行 SQL
            const results = await this._executeSQL(sql);

            // 发送执行结果
            this.sendEvent(new OutputEvent(`Results:\n${JSON.stringify(results, null, 2)}\n`));

            // 发送执行完成事件
            this.sendEvent(new TerminatedEvent());
            this.sendResponse(response);
        } catch (err) {
            // 发送错误信息
            this.sendEvent(new OutputEvent(`Error: ${err.message}\n`, 'stderr'));
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
        this.sendEvent(new OutputEvent('Database connection established\n'));
    }

    async _executeSQL(sql) {
        if (!this._connection) {
            throw new Error('No database connection');
        }

        try {
            const [rows] = await this._connection.query(sql);
            return rows;
        } finally {
            await this._connection.end();
            this.sendEvent(new OutputEvent('Database connection closed\n'));
        }
    }
}

module.exports = DebugSession;