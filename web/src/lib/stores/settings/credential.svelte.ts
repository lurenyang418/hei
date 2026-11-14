import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import type { ConfigResponse, CredentialRefreshTestResponse, UserInfo } from '$lib/types';
import type { SettingsPageContext } from './context';

/**
 * B站凭证设置域：凭证表单、保存、凭据刷新测试、扫码登录与当前用户。
 */
export class CredentialSettingsStore {
	sessdata = $state('');
	biliJct = $state('');
	buvid3 = $state('');
	dedeUserId = $state('');
	acTimeValue = $state('');
	buvid4 = $state('');
	dedeUserIdCkMd5 = $state('');

	saving = $state(false);
	refreshTesting = $state(false);
	refreshForceTesting = $state(false);
	testResult = $state<CredentialRefreshTestResponse | null>(null);
	currentUser = $state<UserInfo | null>(null);

	#ctx: SettingsPageContext;

	constructor(ctx: SettingsPageContext) {
		this.#ctx = ctx;
	}

	/** 用配置接口的返回值填充凭证表单 */
	applyFromConfig(config: ConfigResponse): void {
		this.sessdata = config.credential?.sessdata || '';
		this.biliJct = config.credential?.bili_jct || '';
		this.buvid3 = config.credential?.buvid3 || '';
		this.dedeUserId = config.credential?.dedeuserid || '';
		this.acTimeValue = config.credential?.ac_time_value || '';
		this.buvid4 = config.credential?.buvid4 || '';
		this.dedeUserIdCkMd5 = config.credential?.dedeuserid_ckmd5 || '';
	}

	/** 保存 B 站凭证 */
	async save(): Promise<void> {
		const params = {
			sessdata: this.sessdata.trim(),
			bili_jct: this.biliJct.trim(),
			buvid3: this.buvid3.trim(),
			dedeuserid: this.dedeUserId.trim(),
			ac_time_value: this.acTimeValue.trim(),
			buvid4: this.buvid4.trim() || undefined,
			dedeuserid_ckmd5: this.dedeUserIdCkMd5.trim() || undefined
		};

		const response = await runRequest(() => api.updateCredential(params), {
			setLoading: (value) => (this.saving = value),
			context: '保存B站凭证失败'
		});
		if (!response) return;

		if (response.data.success) {
			toast.success('B站凭证保存成功', { description: response.data.message });
			await this.#ctx.reloadConfig();
			this.#ctx.closeSheet();
		} else {
			toast.error('保存失败', { description: response.data.message });
		}
	}

	/** 测试（或强制）刷新 B 站凭据 */
	async testRefresh(force = false): Promise<void> {
		const response = await runRequest(() => api.testCredentialRefresh(force), {
			setLoading: (value) =>
				force ? (this.refreshForceTesting = value) : (this.refreshTesting = value),
			context: force ? '强制刷新B站凭据失败' : '测试B站凭据刷新失败'
		});
		if (!response) return;

		this.testResult = response.data;
		if (response.data.success) {
			toast.success(force ? '凭据强制刷新完成' : '凭据刷新测试通过', {
				description: response.data.message
			});
			if (force) await this.#ctx.reloadConfig();
		} else {
			toast.error(force ? '凭据强制刷新失败' : '凭据刷新测试失败', {
				description: response.data.diagnosis
			});
		}
	}

	/** 扫码登录成功：凭证已由后端保存，这里同步用户信息并刷新配置 */
	async handleQrLoginSuccess(userInfo: UserInfo): Promise<void> {
		toast.success(`欢迎，${userInfo.username}！登录成功`);
		this.currentUser = userInfo;
		await this.#ctx.reloadConfig();
		this.#ctx.closeSheet();
	}

	handleQrLoginError(error: string): void {
		toast.error('扫码登录失败: ' + error);
	}

	/** 退出登录：通常用户只是想切换账号，提示扫码即可 */
	handleLogout(): void {
		toast.info('请扫码登录新账号');
	}

	/** 读取当前登录用户（未登录时置空） */
	async checkCurrentUser(): Promise<void> {
		const response = await runRequest(() => fetch('/api/auth/current-user'), {
			showErrorToast: false
		});
		if (!response) {
			this.currentUser = null;
			return;
		}

		if (response.ok) {
			const result = await response.json();
			if (result.status_code === 200 && result.data) {
				this.currentUser = result.data;
				return;
			}
		}

		this.currentUser = null;
	}
}
