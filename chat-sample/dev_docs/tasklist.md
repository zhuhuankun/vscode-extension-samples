#每次生成新的task遵META_for_prompt.md中的开发规范

## Task 1: 创建 Prompt Enhancement Participant 框架 + Mock 完整效果
**目标**: 实现一个新的 Chat Participant (@vv)，用 mock 数据展示完整的最终效果。

**步骤**:
1. 新建文件 `src/codePilot.ts`，定义接口与 mock 实现：
   - `generateEnhancedPrompt(rawPrompt, context)` 接口
   - Mock 返回一个完整的增强 prompt 结果（包含 primary/secondary 策略、rationale、enhancedPrompt、fewShotExamples）
2. 在 `src/extension.ts` 中导入并注册该 participant，命令别名为 `@vv`
3. 编译验证无误（`npm run compile`）
4. 在 VS Code 中手动测试 @vv chat participant 可以正常启动并返回 mock 数据

**验收**:
- [ ] `codePilot.ts` 创建，包含 mock 实现
- [ ] `extension.ts` 注册 @vv participant
- [ ] 代码编译通过
- [ ] 在 Chat 面板中能调用 @vv 并看到 mock 结果