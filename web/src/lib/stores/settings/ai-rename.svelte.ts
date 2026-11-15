import { SvelteSet } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import { normalizeNumberInput } from '$lib/utils/number';
import type { ConfigResponse, UpdateConfigRequest } from '$lib/types';
import type { SettingsPageContext } from './context';

const DEFAULT_PROVIDER = 'deepseek';
const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-v4-flash';
const DEFAULT_TIMEOUT_SECONDS = 30;
// 与 DEFAULT_CONFIG_VALUES.aiRenameTimeoutSeconds 保持一致（保存时的兜底值）
const SAVE_TIMEOUT_FALLBACK = 20;

/**
 * AI 重命名设置域：启用范围、服务商连接信息、提示词与模型列表。
 * 字段同时参与主配置保存，抽屉里也提供独立保存。
 */
export class AiRenameSettingsStore {
	enabled = $state(false);
	provider = $state(DEFAULT_PROVIDER);
	baseUrl = $state(DEFAULT_BASE_URL);
	apiKey = $state('');
	model = $state(DEFAULT_MODEL);
	timeoutSeconds = $state(DEFAULT_TIMEOUT_SECONDS);
	videoPromptHint = $state('');
	audioPromptHint = $state('');
	renameParentDir = $state(false);

	saving = $state(false);
	clearingCache = $state(false);
	models = $state<string[]>([]);
	modelsLoading = $state(false);

	#ctx: SettingsPageContext;

	constructor(ctx: SettingsPageContext) {
		this.#ctx = ctx;
	}

	/** 用配置接口的返回值填充 AI 重命名表单 */
	applyFromConfig(config: ConfigResponse): void {
		this.enabled = config.ai_rename?.enabled ?? false;
		this.provider = config.ai_rename?.provider === 'custom' ? 'custom' : DEFAULT_PROVIDER;
		this.baseUrl = config.ai_rename?.base_url || DEFAULT_BASE_URL;
		this.apiKey = config.ai_rename?.api_key || '';
		this.model = config.ai_rename?.model || DEFAULT_MODEL;
		this.timeoutSeconds = config.ai_rename?.timeout_seconds ?? DEFAULT_TIMEOUT_SECONDS;
		this.videoPromptHint = config.ai_rename?.video_prompt_hint || '';
		this.audioPromptHint = config.ai_rename?.audio_prompt_hint || '';
		this.renameParentDir = config.ai_rename?.rename_parent_dir ?? false;
	}

	/** 主配置保存与独立保存共用的载荷 */
	toPayload() {
		return {
			ai_rename_enabled: this.enabled,
			ai_rename_provider: this.provider.trim(),
			ai_rename_base_url: this.baseUrl.trim(),
			ai_rename_api_key: this.apiKey.trim(),
			ai_rename_model: this.model.trim(),
			ai_rename_timeout_seconds: normalizeNumberInput(this.timeoutSeconds, SAVE_TIMEOUT_FALLBACK),
			ai_rename_video_prompt_hint: this.videoPromptHint,
			ai_rename_audio_prompt_hint: this.audioPromptHint,
			ai_rename_rename_parent_dir: this.renameParentDir
		};
	}

	/** 抽屉里的「保存」 */
	async save(): Promise<void> {
		const payload: UpdateConfigRequest = this.toPayload();

		const response = await runRequest(() => api.updateConfig(payload), {
			setLoading: (value) => (this.saving = value),
			context: '保存AI重命名配置失败'
		});
		if (!response) return;

		if (response.data.success) {
			toast.success('AI重命名配置保存成功');
			await this.#ctx.reloadConfig();
			this.#ctx.closeSheet();
		} else {
			toast.error('保存失败', { description: response.data.message });
		}
	}

	/** 清除所有 AI 对话历史缓存 */
	async clearCache(): Promise<void> {
		const response = await runRequest(() => api.clearAiRenameCache(), {
			setLoading: (value) => (this.clearingCache = value),
			context: '清除AI缓存失败'
		});
		if (!response) return;

		if (response.data.success) {
			toast.success('已清除所有AI对话历史缓存');
		} else {
			toast.error('清除失败', { description: response.data.message });
		}
	}

	/** 从服务商 /models 端点获取可用模型（前端直连，需服务商允许跨域） */
	async fetchModels(): Promise<void> {
		const base = this.baseUrl.trim().replace(/\/+$/, '');
		const key = this.apiKey.trim();
		if (!base) {
			toast.error('请先填写 API Base URL');
			return;
		}
		if (!key) {
			toast.error('请先填写 API Key');
			return;
		}

		this.modelsLoading = true;
		try {
			const response = await fetch(`${base}/models`, {
				headers: { Authorization: `Bearer ${key}` }
			});
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			const payload = await response.json();
			const models: string[] = Array.isArray(payload?.data)
				? payload.data
						.map((item: { id?: string }) => item?.id)
						.filter((id: string | undefined): id is string => Boolean(id))
				: [];
			if (models.length === 0) {
				throw new Error('服务商未返回模型列表');
			}
			this.models = [...new SvelteSet(models)].sort((a, b) => a.localeCompare(b));
			toast.success(`已获取 ${this.models.length} 个模型`);
		} catch (error) {
			toast.error('获取模型列表失败', {
				description: `${error instanceof Error ? error.message : String(error)}；可手动填写模型名称`
			});
		} finally {
			this.modelsLoading = false;
		}
	}
}
