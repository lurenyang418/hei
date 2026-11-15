import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';

function normalizeDurationInput(value: string | number | null | undefined): string {
	if (value === null || value === undefined) {
		return '';
	}
	return String(value).trim();
}

function parseDurationInput(
	value: string | number | null | undefined,
	fieldName: string
): number | null {
	const trimmed = normalizeDurationInput(value);
	if (!trimmed) {
		return null;
	}
	if (!/^\d+$/.test(trimmed)) {
		throw new Error(`${fieldName}必须为非负整数秒数`);
	}
	return Number(trimmed);
}

/**
 * 关键词过滤器域：黑白名单、大小写、时长与发布时间过滤。
 * 正则合法性由后端校验；同一关键词不允许同时出现在两个名单。
 */
export class KeywordFilterStore {
	blacklist = $state<string[]>([]);
	whitelist = $state<string[]>([]);
	caseSensitive = $state(true);
	minDuration = $state<string | number>('');
	maxDuration = $state<string | number>('');
	publishedAfter = $state('');
	publishedBefore = $state('');

	newBlacklist = $state('');
	newWhitelist = $state('');
	blacklistError = $state('');
	whitelistError = $state('');
	advancedError = $state('');
	validatingBlacklist = $state(false);
	validatingWhitelist = $state(false);

	showSection = $state(false);
	activeTab = $state<'whitelist' | 'blacklist'>('whitelist');

	/** 已启用的过滤条件数量（用于折叠区徽标） */
	activeFilterCount = $derived.by(() => {
		let count = this.blacklist.length + this.whitelist.length;
		if (normalizeDurationInput(this.minDuration)) count += 1;
		if (normalizeDurationInput(this.maxDuration)) count += 1;
		if (this.publishedAfter) count += 1;
		if (this.publishedBefore) count += 1;
		return count;
	});

	/** 是否配置了任意高级过滤（提交时决定是否写入关键词过滤器） */
	hasAdvancedFilters(): boolean {
		return (
			this.blacklist.length > 0 ||
			this.whitelist.length > 0 ||
			!this.caseSensitive ||
			normalizeDurationInput(this.minDuration) !== '' ||
			normalizeDurationInput(this.maxDuration) !== '' ||
			!!this.publishedAfter ||
			!!this.publishedBefore
		);
	}

	/** 解析时长过滤（非整数秒会抛错，由页面提示） */
	parseDurations(): { min: number | null; max: number | null } {
		return {
			min: parseDurationInput(this.minDuration, '最短时长'),
			max: parseDurationInput(this.maxDuration, '最长时长')
		};
	}

	async addBlacklist(): Promise<void> {
		const pattern = this.newBlacklist.trim();
		if (!pattern) {
			this.blacklistError = '请输入关键词';
			return;
		}

		if (this.blacklist.includes(pattern)) {
			this.blacklistError = '该关键词已存在于黑名单中';
			return;
		}

		const mutualError = this.#checkMutualExclusivity(pattern, 'blacklist');
		if (mutualError) {
			this.blacklistError = mutualError;
			return;
		}

		const result = await runRequest(() => api.validateRegex(pattern), {
			setLoading: (value) => (this.validatingBlacklist = value),
			showErrorToast: false,
			onError: () => {
				this.blacklistError = '网络错误';
			}
		});
		if (!result) return;

		if (result.status_code === 200) {
			if (result.data.valid) {
				this.blacklist = [...this.blacklist, pattern];
				this.newBlacklist = '';
				this.blacklistError = '';
			} else {
				this.blacklistError = result.data.error || '无效的正则表达式';
			}
		} else {
			this.blacklistError = '验证请求失败';
		}
	}

	async addWhitelist(): Promise<void> {
		const pattern = this.newWhitelist.trim();
		if (!pattern) {
			this.whitelistError = '请输入关键词';
			return;
		}

		if (this.whitelist.includes(pattern)) {
			this.whitelistError = '该关键词已存在于白名单中';
			return;
		}

		const mutualError = this.#checkMutualExclusivity(pattern, 'whitelist');
		if (mutualError) {
			this.whitelistError = mutualError;
			return;
		}

		const result = await runRequest(() => api.validateRegex(pattern), {
			setLoading: (value) => (this.validatingWhitelist = value),
			showErrorToast: false,
			onError: () => {
				this.whitelistError = '网络错误';
			}
		});
		if (!result) return;

		if (result.status_code === 200) {
			if (result.data.valid) {
				this.whitelist = [...this.whitelist, pattern];
				this.newWhitelist = '';
				this.whitelistError = '';
			} else {
				this.whitelistError = result.data.error || '无效的正则表达式';
			}
		} else {
			this.whitelistError = '验证请求失败';
		}
	}

	removeBlacklist(index: number): void {
		this.blacklist = this.blacklist.filter((_, i) => i !== index);
	}

	removeWhitelist(index: number): void {
		this.whitelist = this.whitelist.filter((_, i) => i !== index);
	}

	handleBlacklistKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			void this.addBlacklist();
		}
	}

	handleWhitelistKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			void this.addWhitelist();
		}
	}

	/** 清空所有过滤条件（重置表单时用） */
	clear(): void {
		this.blacklist = [];
		this.whitelist = [];
		this.caseSensitive = true;
		this.minDuration = '';
		this.maxDuration = '';
		this.publishedAfter = '';
		this.publishedBefore = '';
		this.newBlacklist = '';
		this.newWhitelist = '';
		this.blacklistError = '';
		this.whitelistError = '';
		this.advancedError = '';
	}

	#checkMutualExclusivity(keyword: string, targetList: 'blacklist' | 'whitelist'): string | null {
		if (targetList === 'blacklist' && this.whitelist.includes(keyword)) {
			return '该关键词已存在于白名单中，同一关键词不能同时出现在黑名单和白名单';
		}
		if (targetList === 'whitelist' && this.blacklist.includes(keyword)) {
			return '该关键词已存在于黑名单中，同一关键词不能同时出现在黑名单和白名单';
		}
		return null;
	}
}
