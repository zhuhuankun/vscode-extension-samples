import * as vscode from 'vscode';
import { strategyTestCases } from './strategyTestCases';

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
 * Result of LLM strategy selection (Step 1)
 * Contains only the strategy choice and rationale, without enhanced prompt
 */
export interface StrategySelectionResult {
	userInput: string;
	selectedStrategy: {
		primary: StrategyType;
		secondary?: StrategyType;
		rationale: string;
	};
	llmAnalysis: string;
}

/**
 * Result of prompt enhancement (Step 2)
 * Contains the fully enhanced prompt based on the selected strategy
 */
export interface EnhancedPromptResult {
	userInput: string;
	selectedStrategy: {
		primary: StrategyType;
		secondary?: StrategyType;
		rationale: string;
	};
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
 * LLM System Prompt for Strategy Selection (Step 1)
 * Only selects the best strategy, does NOT generate enhanced prompt
 */
const STRATEGY_SELECTION_ONLY_PROMPT = `你是一个提示词优化专家。分析用户的原始输入，选择最优的增强策略。

可选策略:
- BASE: 不增强，直接返回原始prompt
- COT: 添加"分步骤推理"指令
- TOT_SIMPLE: 生成两个不同思路（A/B）对比
- META: 提供结构化框架（角色、目标、约束、输出格式等）
- FEWSHOT: 插入2-3个具体示例
- CHAIN: 分阶段结构化（[PLAN] → [EXECUTE] → [REFINE] → [FINAL]）

策略选择规则:
- 优化/改写需求 → META
- 需要步骤推理 → COT 或 CHAIN
- 方案对比 → TOT_SIMPLE
- 需要示例 → FEWSHOT
- 简单问答 → BASE

**重要**: 只返回JSON，不生成增强指令。你的工作是选择策略，真正的增强在下一步。

返回JSON格式（不生成enhancedPrompt）:
{
  "primary": "...",
  "secondary": "...(可选)",
  "rationale": "为什么选择这个策略",
  "analysis": "简要分析这个prompt的特点和为什么适合该策略"
}`;

/**
 * LLM System Prompt for Prompt Enhancement (Step 2)
 * Generates the enhanced prompt based on the selected strategy
 */
const PROMPT_ENHANCEMENT_PROMPT = `你是一个提示词增强专家。根据选定的策略，生成结构化的增强prompt。

策略说明:
- BASE: 直接返回原始prompt，最小改动
- COT: 添加 [PLAN] [EXECUTE] [REFINE] [FINAL] 阶段标签
- TOT_SIMPLE: 包含方案A/B对比和综合决策
- META: 包含 Role: / Objectives: / Constraints: / Output Format: / Quality Checklist:
- FEWSHOT: 包含2-3个具体的代码或示例
- CHAIN: 完整的 [PLAN] → [EXECUTE] → [REFINE] → [FINAL] 结构

直接返回增强后的prompt，不需要JSON。`;

/**
 * Call LLM Step 1: Select the best strategy for the prompt
 * Only returns strategy choice and analysis, no enhanced prompt yet
 */
async function selectStrategy(
	rawPrompt: string,
	context: EnhancementContext,
	model: vscode.LanguageModelChat,
	token: vscode.CancellationToken
): Promise<StrategySelectionResult> {
	try {
		const userMessage = JSON.stringify({
			userPrompt: rawPrompt,
			context: {
				language: context.language,
				selectedCode: context.selectedCode ? '[代码已选中]' : 'N/A',
				userGoalGuess: context.userGoalGuess
			}
		});

		const messages = [
			vscode.LanguageModelChatMessage.User(STRATEGY_SELECTION_ONLY_PROMPT + '\n\n' + userMessage)
		];

		const response = await model.sendRequest(messages, {}, token);

		let llmResponse = '';
		for await (const fragment of response.text) {
			llmResponse += fragment;
		}

		// Parse JSON response
		const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('LLM response does not contain valid JSON');
		}

		const parsed = JSON.parse(jsonMatch[0]);

		if (!parsed.primary) {
			throw new Error('LLM response missing required field: primary');
		}

		return {
			userInput: rawPrompt,
			selectedStrategy: {
				primary: parsed.primary as StrategyType,
				secondary: parsed.secondary as StrategyType | undefined,
				rationale: parsed.rationale || 'No rationale provided'
			},
			llmAnalysis: parsed.analysis || 'No analysis provided'
		};

	} catch (error) {
		console.error('Strategy selection failed:', error);
		return {
			userInput: rawPrompt,
			selectedStrategy: {
				primary: 'BASE',
				rationale: 'Strategy selection failed, defaulting to BASE'
			},
			llmAnalysis: `Error: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}

/**
 * Call LLM Step 2: Generate enhanced prompt based on selected strategy
 */
async function generateEnhancedPromptForStrategy(
	rawPrompt: string,
	strategy: StrategySelectionResult,
	context: EnhancementContext,
	model: vscode.LanguageModelChat,
	token: vscode.CancellationToken
): Promise<string> {
	try {
		const strategyInfo = `Selected Strategy: ${strategy.selectedStrategy.primary}${strategy.selectedStrategy.secondary ? ` + ${strategy.selectedStrategy.secondary}` : ''}`;

		const userMessage = `${PROMPT_ENHANCEMENT_PROMPT}

${strategyInfo}

Original Prompt:
${rawPrompt}

Context:
- Language: ${context.language || 'N/A'}
- Has selected code: ${context.selectedCode ? 'Yes' : 'No'}`;

		const messages = [
			vscode.LanguageModelChatMessage.User(userMessage)
		];

		const response = await model.sendRequest(messages, {}, token);

		let enhancedPrompt = '';
		for await (const fragment of response.text) {
			enhancedPrompt += fragment;
		}

		return enhancedPrompt;

	} catch (error) {
		console.error('Prompt enhancement failed:', error);
		return rawPrompt; // Fallback to original
	}
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

			// Step 1: Strategy selection
			stream.markdown(`# 🔍 Analyzing your prompt...\n\n`);

			const strategySelection = await selectStrategy(
				userMessage,
				enhancementContext,
				request.model,
				token
			);

			// Display strategy selection
			stream.markdown(`## ✅ Strategy Selection Result\n\n`);
			stream.markdown(`**Selected Strategy:** \`${strategySelection.selectedStrategy.primary}\`\n`);
			if (strategySelection.selectedStrategy.secondary) {
				stream.markdown(`**Secondary:** \`${strategySelection.selectedStrategy.secondary}\`\n`);
			}
			stream.markdown(`\n**Rationale:** ${strategySelection.selectedStrategy.rationale}\n\n`);
			stream.markdown(`**Analysis:** ${strategySelection.llmAnalysis}\n\n`);

			// Step 2: Generate enhanced prompt
			stream.markdown(`---\n\n# ✨ Generating enhanced prompt...\n\n`);

			const enhancedPrompt = await generateEnhancedPromptForStrategy(
				userMessage,
				strategySelection,
				enhancementContext,
				request.model,
				token
			);

			// Display enhanced prompt
			stream.markdown(`## 📝 Enhanced Prompt\n\n`);
			stream.markdown('```\n');
			stream.markdown(enhancedPrompt);
			stream.markdown('\n```\n\n');

			return { metadata: { command: 'enhance' } };

		} catch (error) {
			stream.markdown(`❌ Error processing prompt enhancement: ${error}`);
			return { metadata: { command: 'enhance' } };
		}
	};

	// Register the chat participant
	const participant = vscode.chat.createChatParticipant('vv', handler);
	participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'ss.jpg');
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
}
