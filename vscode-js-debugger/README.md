# vscode-js-debugger

这是一个用于在JavaScript代码中设置断点的VS Code插件。该插件允许用户在当前活动的文本编辑器中选择JavaScript代码，并使用Node.js的inspector模块进行调试。

## 功能

- 在选定的JavaScript代码上设置断点
- 执行代码并在断点处暂停
- 提供继续执行、逐步进入和停止调试的选项

## 安装步骤

1. 克隆此仓库到本地：
   ```
   git clone https://github.com/yourusername/vscode-js-debugger.git
   ```
2. 进入项目目录：
   ```
   cd vscode-js-debugger
   ```
3. 安装依赖：
   ```
   npm install
   ```

## 使用说明

1. 打开VS Code并加载此插件。
2. 在JavaScript文件中选择要调试的代码。
3. 使用命令面板（Ctrl+Shift+P）运行命令 `dd.helloWorld`。
4. 根据提示设置断点并开始调试。

## 贡献

欢迎任何形式的贡献！请提交问题或拉取请求。

## 许可证

此项目采用MIT许可证。