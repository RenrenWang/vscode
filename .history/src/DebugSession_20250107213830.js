
const {
  LoggingDebugSession,
  InitializedEvent,
  StoppedEvent,
  Breakpoint
} = require('vscode-debugadapter');
const { DebugProtocol } = require('vscode-debugprotocol');
const mysql = require('mysql2/promise');

class MySQLDebugSession extends LoggingDebugSession {
  constructor() {
    // 日志输出到名为 "mysql-debug-log.txt" 的文件
    super('mysql-debug-log.txt');
    this._breakpoints = new Map();
    this._connection = null;
  }

  /**
   * VS Code 首先会发送 initialize 请求
   */
  initializeRequest(response, args) {
    response.body = response.body || {};
    // 支持配置完成请求
    response.body.supportsConfigurationDoneRequest = true;
    this.sendResponse(response);

    // 通知 VS Code 初始化完成
    this.sendEvent(new InitializedEvent());
  }

  /**
   * 设置或移除断点时，会调用此方法
   */
  setBreakPointsRequest(response, args) {
    const filePath = args.source.path || '';
    const breakpoints = args.breakpoints || [];

    // 将断点信息保存在内存 Map
    this._breakpoints.set(filePath, breakpoints);

    // 此示例简单地将所有断点标记为“已验证”
    const actualBreakpoints = breakpoints.map(bp => {
      return new Breakpoint(true, bp.line);
    });

    response.body = {
      breakpoints: actualBreakpoints
    };
    this.sendResponse(response);
  }

  /**
   * 当用户点击“开始调试”后，会调用 launchRequest
   */
  async launchRequest(response, args) {
    try {
      // 从 launch.json 或 UI 中读取自定义配置
      const { host, user, password, database, sql } = args;

      // 建立数据库连接
      await this._createMySQLConnection(host, user, password, database);
      this._log(`开始执行 SQL: ${sql}`);

      // 执行 SQL，简单示例：一次性运行整段 sql
      await this._executeSQL(sql);

      // 执行完成后，给 VS Code 发送一个“停止”事件
      this.sendEvent(new StoppedEvent('end', 1));
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(response, 1, err.message);
    }
  }

  async _createMySQLConnection(host, user, password, database) {
    this._connection = await mysql.createConnection({ host, user, password, database });
    this._log('数据库连接已建立');
  }

  async _executeSQL(sql) {
    if (!this._connection) {
      throw new Error('尚未建立数据库连接');
    }
    try {
      const [rows] = await this._connection.query(sql);
      this._log(`执行结果: ${JSON.stringify(rows)}`);
    } finally {
      await this._connection.end();
      this._connection = null;
      this._log('数据库连接已关闭');
    }
  }

  _log(message) {
    // 通过事件向 VS Code 输出日志
    this.sendEvent({
      event: 'output',
      body: {
        category: 'console',
        output: `[MySQLDebug] ${message}\n`
      },
      seq: 0,
      type: 'event'
    });
  }
}

// 如果直接用 Node.js 启动该脚本，可以用这行
if (require.main === module) {
  MySQLDebugSession.run(MySQLDebugSession);
} else {
  module.exports = MySQLDebugSession;
}