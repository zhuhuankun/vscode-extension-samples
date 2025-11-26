import * as vscode from 'vscode';

/**
 * Strategy types for prompt enhancement
 */
export type StrategyType = 'BASE' | 'COT' | 'TOT_SIMPLE' | 'META' | 'FEWSHOT' | 'CHAIN';

/**
 * Context information passed to the prompt enhancement function
 */
export interface EnhancementContext {
	recentMessages?: string[];
	language?: string;
	selectedCode?: string;
	userGoalGuess?: string;
}

/**
 * Result of prompt enhancement with strategy and enhanced prompt
 */
export interface EnhancedPromptResult {
	userInput: string;
	llmThinkingProcess: string;
	selectedStrategy: {
		primary: StrategyType;
		secondary?: StrategyType;
		rationale: string;
	};
	enhancementProcess: string;
	enhancedPrompt: string;
}

/**
 * Chat result for CodePilot participant
 */
interface ICodePilotChatResult extends vscode.ChatResult {
	metadata: {
		command: string;
	}
}

/**
 * Generate an enhanced prompt using LLM-based strategy selection (mock implementation)
 * @param rawPrompt The original prompt from the user
 * @param context Additional context for enhancement
 * @returns Enhanced prompt result with strategy information
 */
export async function generateEnhancedPrompt(
	rawPrompt: string,
	context: EnhancementContext
): Promise<EnhancedPromptResult> {
	// Mock implementation - returns a complete enhanced prompt result with detailed process
	// This will be replaced with real LLM logic in subsequent tasks

	const mockResult: EnhancedPromptResult = {
		userInput: rawPrompt,
		llmThinkingProcess: `
分析用户输入：用户要求对代码进行审查，需要识别问题和改进建议。
- 任务复杂度：中等（需要代码分析和结构化反馈）
- 涉及领域：代码质量、最佳实践
- 预期输出形式：结构化报告
- 用户需要对比吗？否
- 用户需要步骤推理吗？是的，需要系统性分析
- 用户需要示例吗？是的，helps with understanding
		`,
		selectedStrategy: {
			primary: 'META',
			secondary: 'COT',
			rationale: '用户提示需要结构化改进和系统性分析。使用 META 提供清晰的框架（角色、目标、约束），结合 COT 展示分步骤推理过程。这样能确保代码审查既有条理又有深度。'
		},
		enhancementProcess: `
步骤 1: 应用 META 框架
- 定义角色：代码审查专家
- 设定目标：质量分析、问题识别、改进建议
- 建立约束：简洁、可执行、优先级排序

步骤 2: 融合 COT 逻辑
- 添加 [PLAN] 阶段：明确审查范围
- 添加 [EXECUTE] 阶段：系统性分析
- 添加 [REFINE] 阶段：优先级排序
- 添加 [FINAL] 阶段：生成结构化反馈

步骤 3: 增加输出格式规范
- Summary：关键发现总结
- Issues：问题列表（按严重程度）
- Suggestions：改进方案（可执行）
- Checklist：质量检查清单

步骤 4: 添加示例
- 提供 3 个代表性示例，展示不同问题类型的处理方式
		`,
		enhancedPrompt: `Role:
You are an expert code review specialist with deep knowledge of best practices, performance optimization, and code maintainability.

Objectives:
- Analyze the provided code for quality, performance, and best practices
- Identify potential issues and suggest improvements
- Provide constructive feedback with actionable recommendations
- Prioritize findings by business impact and severity

Constraints:
- Keep responses concise and actionable
- Focus on the most impactful issues first
- Include code examples where helpful
- Avoid nitpicking on style (use linters for that)
- Provide specific, testable recommendations

Output Format:
1. Summary (1-2 sentences on overall code quality)
2. Issues Found (categorized by: Critical | Warning | Minor, with severity levels)
3. Suggestions for Improvement (with before/after code examples)
4. Quality Checklist (testability, maintainability, performance, security)

Reasoning Process:
[PLAN] Identify code scope, language, and review focus areas
[EXECUTE] Analyze systematically: complexity → design patterns → error handling → performance
[REFINE] Prioritize findings by impact (business value, risk, effort to fix)
[FINAL] Generate structured feedback with recommended next steps

Few-Shot Examples:

Example 1: Inefficient Loop
Input: for (let i = 0; i < arr.length; i++) { for (let j = 0; j < arr.length; j++) { ... } }
Issue: O(n²) complexity
Suggestion: Use Map or Set for O(n) lookup instead of nested iteration

Example 2: Missing Type Safety
Input: function process(data) { return data.value * 2; }
Issue: No type hints, potential runtime errors
Suggestion: Add TypeScript types: function process(data: { value: number }): number

Example 3: Error Handling Gap
Input: const result = await fetch(url);
Issue: No error handling for network failures
Suggestion: Wrap in try-catch with specific error messages`

	};

	return mockResult;
}

/**
 * Register the CodePilot Chat Participant
 * @param context VS Code extension context
 */
export function registerCodePilotParticipant(context: vscode.ExtensionContext): void {
	const handler: vscode.ChatRequestHandler = async (
		request: vscode.ChatRequest,
		chatContext: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<ICodePilotChatResult> => {
		try {
			// Get the user's message
			const userMessage = request.prompt;

			// Prepare context for enhancement
			const enhancementContext: EnhancementContext = {
				language: vscode.window.activeTextEditor?.document.languageId,
				selectedCode: vscode.window.activeTextEditor?.document.getText(
					vscode.window.activeTextEditor.selection
				),
				userGoalGuess: userMessage
			};

			// Generate enhanced prompt
			const result = await generateEnhancedPrompt(userMessage, enhancementContext);

			// Stream the response
			stream.markdown(`# Prompt Enhancement Result\n\n`);

			stream.markdown(`## 1️⃣ User Input\n`);
			stream.markdown(`\`\`\`\n${result.userInput}\n\`\`\`\n\n`);

			stream.markdown(`## 2️⃣ LLM Thinking Process\n`);
			stream.markdown(`${result.llmThinkingProcess}\n\n`);

			stream.markdown(`## 3️⃣ Selected Strategy\n`);
			stream.markdown(`**Primary:** \`${result.selectedStrategy.primary}\`\n`);
			if (result.selectedStrategy.secondary) {
				stream.markdown(`**Secondary:** \`${result.selectedStrategy.secondary}\`\n`);
			}
			stream.markdown(`**Rationale:** ${result.selectedStrategy.rationale}\n\n`);

			stream.markdown(`## 4️⃣ Enhancement Process\n`);
			stream.markdown(`${result.enhancementProcess}\n\n`);

			stream.markdown(`## 5️⃣ Enhanced Prompt\n\n`);
			stream.markdown('```\n');
			stream.markdown(result.enhancedPrompt);
			stream.markdown('\n```\n\n');

			return { metadata: { command: 'enhance' } };

		} catch (error) {
			stream.markdown(`Error processing prompt enhancement: ${error}`);
			return { metadata: { command: 'enhance' } };
		}
	};

	// Register the chat participant
	const participant = vscode.chat.createChatParticipant('vv', handler);
	participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'codepilot-icon.svg');
	participant.followupProvider = {
		provideFollowups(_result: ICodePilotChatResult, _chatContext: vscode.ChatContext, _token: vscode.CancellationToken) {
			return [
				{
					prompt: 'Show me another enhancement strategy',
					label: vscode.l10n.t('Try different strategy'),
				} satisfies vscode.ChatFollowup
			];
		}
	};

	context.subscriptions.push(participant);
}
