// 需要安装: npm install vscode-debugadapter --save
//         npm install vscode-debugprotocol --save
import {
    LoggingDebugSession,
    InitializedEvent,
    StoppedEvent,
    Breakpoint,
    Source
  } from 'vscode-debugadapter';
  import { DebugProtocol } from 'vscode-debugprotocol';
  import * as mysql from 'mysql2/promise';
  
  /**
   * 继承 LoggingDebugSession 可以方便调试和日志输出
   */
  export class MySQLDebugSession extends LoggingDebugSession {
    private _breakpoints: Map<string, DebugProtocol.SourceBreakpoint[]> = new Map();
    private _connection: mysql.Connection | undefined;
  
    public constructor() {
      super("mysql-debug.txt"); // 你可以在此指定日志文件输出
    }
  
    /**
     * 当调试会话启动时，VS Code 首先会发送 initialize 请求
     */
    protected initializeRequest(
      response: DebugProtocol.InitializeResponse,
      args: DebugProtocol.InitializeRequestArguments
    ): void {
      response.body = response.body || {};
      response.body.supportsConfigurationDoneRequest = true;
      this.sendResponse(response);
  
      // 通知 VS Code 初始化完毕
      this.sendEvent(new InitializedEvent());
    }
  
    /**
     * 在 VS Code 里设置或移除断点时，会调用此方法
     */
    protected setBreakPointsRequest(
      response: DebugProtocol.SetBreakpointsResponse,
      args: DebugProtocol.SetBreakpointsArguments
    ): void {
      const path = args.source.path || "";
      const clientBreakpoints = args.breakpoints || [];
  
      // 这里只是把断点信息存储在本地 Map 中
      this._breakpoints.set(path, clientBreakpoints);
  
      // 返回给客户端实际确认过的断点信息（本示例简单起见全部认为有效）
      const vsBreakpoints = clientBreakpoints.map(bp => {
        return new Breakpoint(true, bp.line);
      });
  
      response.body = {
        breakpoints: vsBreakpoints
      };
  
      this.sendResponse(response);
    }
  
    /**
     * 当用户启动 debug（例如“开始调试”），会调用此方法
     */
    protected launchRequest(
      response: DebugProtocol.LaunchResponse,
      args: any
    ): void {
      // 示例参数：args 里包含数据库连接信息、要调试的 SQL 等
      const { host, user, password, database, sql } = args;
      this.createMySQLConnection(host, user, password, database)
        .then(() => {
          // 模拟执行 SQL
          // 实际要做断点逻辑，需要对 SQL 进行分段或插入钩子
          this.log(`开始执行 SQL: ${sql}`);
          return this.executeSQL(sql);
        })
        .then(() => {
          // 执行完成后，模拟一个 StoppedEvent，告知 VS Code 可以停止调试
          this.sendEvent(new StoppedEvent("end", 1));
          this.sendResponse(response);
        })
        .catch((err: any) => {
          this.sendErrorResponse(response, 1, err.message);
        });
    }
  
    private async createMySQLConnection(host: string, user: string, password: string, database: string) {
      this._connection = await mysql.createConnection({
        host,
        user,
        password,
        database
      });
      this.log("数据库连接已建立");
    }
  
    private async executeSQL(sql: string) {
      if (!this._connection) {
        throw new Error("尚未建立数据库连接");
      }
      try {
        const [rows] = await this._connection.query(sql);
        this.log(`执行结果: ${JSON.stringify(rows)}`);
      } finally {
        await this._connection.end();
        this.log("数据库连接已关闭");
      }
    }
  
    private log(message: string) {
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
  
  // 如果要将此作为一个独立脚本来启动，可以这样写：
  if (require.main === module) {
    // 直接启动调试适配器
    const DebugAdapter = MySQLDebugSession;
    DebugAdapter.run(DebugAdapter);
  }