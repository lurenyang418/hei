import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import { normalizeNumberInput } from '$lib/utils/number';
import type { ConfigResponse, UpdateConfigRequest } from '$lib/types';
import type { SettingsPageContext } from './context';

// 与 DEFAULT_CONFIG_VALUES 保持一致，避免与页面默认值表冲突
const DEFAULT_RISK_TIMEOUT = 300;
const DEFAULT_AUTO_SOLVE_MAX_RETRIES = 3;
const DEFAULT_AUTO_SOLVE_TIMEOUT = 120;

/**
 * 验证码风控设置域：v_voucher 风控与自动识别配置。
 * 字段同时参与主配置保存，因此拆成 toMainConfigPayload / toPayload 两种载荷。
 */
export class CaptchaSettingsStore {
	enabled = $state(false);
	mode = $state('manual');
	timeout = $state(DEFAULT_RISK_TIMEOUT);

	autoSolveService = $state('2captcha');
	autoSolveApiKey = $state('');
	autoSolveMaxRetries = $state(DEFAULT_AUTO_SOLVE_MAX_RETRIES);
	autoSolveTimeout = $state(300);

	saving = $state(false);

	#ctx: SettingsPageContext;

	constructor(ctx: SettingsPageContext) {
		this.#ctx = ctx;
	}

	/** 用配置接口的返回值填充风控表单 */
	applyFromConfig(config: ConfigResponse): void {
		this.enabled = config.risk_control?.enabled ?? false;
		this.mode = config.risk_control?.mode || 'manual';
		this.timeout = config.risk_control?.timeout || DEFAULT_RISK_TIMEOUT;
		this.autoSolveService = config.risk_control?.auto_solve?.service || '2captcha';
		this.autoSolveApiKey = config.risk_control?.auto_solve?.api_key || '';
		this.autoSolveMaxRetries =
			config.risk_control?.auto_solve?.max_retries || DEFAULT_AUTO_SOLVE_MAX_RETRIES;
		this.autoSolveTimeout = config.risk_control?.auto_solve?.solve_timeout || DEFAULT_RISK_TIMEOUT;
	}

	/** 主配置保存时提交的风控字段（与页面原有主保存载荷一致） */
	toMainConfigPayload() {
		return {
			risk_control_enabled: this.enabled,
			risk_control_mode: this.mode,
			risk_control_timeout: normalizeNumberInput(this.timeout, DEFAULT_RISK_TIMEOUT)
		};
	}

	/** 完整风控载荷（独立保存用） */
	toPayload() {
		return {
			...this.toMainConfigPayload(),
			risk_control_auto_solve_service: this.autoSolveService,
			risk_control_auto_solve_api_key: this.autoSolveApiKey.trim(),
			risk_control_auto_solve_max_retries: normalizeNumberInput(
				this.autoSolveMaxRetries,
				DEFAULT_AUTO_SOLVE_MAX_RETRIES
			),
			risk_control_auto_solve_timeout: normalizeNumberInput(
				this.autoSolveTimeout,
				DEFAULT_AUTO_SOLVE_TIMEOUT
			)
		};
	}

	/** 抽屉里的「保存」：只提交风控相关字段 */
	async save(): Promise<void> {
		const payload: UpdateConfigRequest = this.toPayload();

		const response = await runRequest(() => api.updateConfig(payload), {
			setLoading: (value) => (this.saving = value),
			context: '保存验证码风控配置失败'
		});
		if (!response) return;

		if (response.data.success) {
			toast.success('验证码风控配置保存成功');
			await this.#ctx.reloadConfig();
			this.#ctx.closeSheet();
		} else {
			toast.error('保存失败', { description: response.data.message });
		}
	}
}
