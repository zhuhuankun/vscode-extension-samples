import * as vscode from 'vscode';
import { registerChatLibChatParticipant } from './chatUtilsSample';
import { registerSimpleParticipant } from './simple';
import { registerToolUserChatParticipant } from './toolParticipant';
import { registerChatTools } from './tools';
import { registerCodePilotParticipant } from './codePilot';

/**
 * @vv Chat Participant - Prompt Enhancement
 *
 * 测试指南 (对应 src/strategyTestCases.ts 中的6个测试用例):
 *
 * 在 Chat 面板中依次输入以下 prompt，验证返回的策略是否合理：
 *
 * 1. 代码性能优化 (预期: META + COT)
 *    "我有一个处理百万级数据的TypeScript函数，现在性能很差。
 *     [粘贴嵌套循环代码] 请帮我识别问题并给出改进方案。"
 *
 * 2. 简单知识查询 (预期: BASE)
 *    "ES6中Promise有几种状态？"
 *
 * 3. 技术方案对比 (预期: TOT_SIMPLE)
 *    "我的项目需要选择一个关系型数据库。现在在MySQL和PostgreSQL之间犹豫不决。
 *     请对比这两个数据库在高并发、复杂JOIN、成本的优缺点，然后给出最终建议。"
 *
 * 4. 代码实现+示例 (预期: FEWSHOT + META)
 *    "我需要实现一个React组件，要求：
 *     - 支持异步数据加载
 *     - 展示加载状态和错误状态
 *     - 使用TypeScript
 *     - 包含单元测试
 *     但我不太确定最佳实践是什么，希望看到几个参考示例。"
 *
 * 5. 大型系统设计 (预期: CHAIN)
 *    "设计一个系统架构来支持每日百万级用户，具体需求：
 *     - 实时数据处理和聚合
 *     - 支持多地域部署
 *     - 高可用性要求 99.99%
 *     - 成本可控
 *     请给出完整的架构方案。"
 *
 * 6. 代码质量审查 (预期: META + COT) [当前 Mock 数据使用的场景]
 *    "请对以下Node.js服务的代码进行全面审查：
 *     [粘贴代码] 需要识别出所有问题并给出具体改进方案。"
 *
 * 验证步骤：
 * ✓ 每个测试用例的返回策略是否符合预期
 * ✓ 增强后的 prompt 是否包含该策略对应的关键特征
 * ✓ 看是否有明显的策略区分（不是所有请求都返回相同策略）
 */

export function activate(context: vscode.ExtensionContext) {
	registerSimpleParticipant(context);
	registerToolUserChatParticipant(context);
	registerChatLibChatParticipant(context);
	registerCodePilotParticipant(context);

	registerChatTools(context);
}

export function deactivate() { }
