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
	primary: StrategyType;
	secondary?: StrategyType;
	rationale: string;
	enhancedPrompt: string;
	fewShotExamples?: string[];
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
	// Mock implementation - returns a complete enhanced prompt result
	// This will be replaced with real LLM logic in subsequent tasks

	const mockResult: EnhancedPromptResult = {
		primary: 'META',
		secondary: 'COT',
		rationale: '用户提示需要结构化改进，结合思维推理可提升质量',
		enhancedPrompt: `Role:
You are an expert code review specialist.

Objectives:
- Analyze the provided code for quality, performance, and best practices
- Identify potential issues and suggest improvements
- Provide constructive feedback

Constraints:
- Keep responses concise and actionable
- Focus on the most impactful issues first
- Include code examples where helpful

Output Format:
1. Summary (1-2 sentences)
2. Issues Found (with severity levels)
3. Suggestions for Improvement
4. Quality Checklist

Reasoning Process:
[PLAN] Identify what needs to be reviewed
[EXECUTE] Analyze the code systematically
[REFINE] Prioritize findings by impact
[FINAL] Generate structured feedback`,
		fewShotExamples: [
			'Example 1: Code with performance issues → Identified O(n²) complexity, suggested optimization',
			'Example 2: Function without type hints → Added proper TypeScript types',
			'Example 3: Missing error handling → Added try-catch blocks with appropriate error messages'
		]
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
			stream.markdown(`**Primary Strategy:** \`${result.primary}\`\n`);
			if (result.secondary) {
				stream.markdown(`**Secondary Strategy:** \`${result.secondary}\`\n`);
			}
			stream.markdown(`**Rationale:** ${result.rationale}\n\n`);

			stream.markdown(`## Enhanced Prompt\n\n`);
			stream.markdown('```\n');
			stream.markdown(result.enhancedPrompt);
			stream.markdown('\n```\n\n');

			if (result.fewShotExamples && result.fewShotExamples.length > 0) {
				stream.markdown(`## Few-Shot Examples\n\n`);
				result.fewShotExamples.forEach((example, index) => {
					stream.markdown(`${index + 1}. ${example}\n`);
				});
			}

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
