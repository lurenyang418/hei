import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import type { BangumiSeasonInfo, BangumiSourceOption, VideoCategory } from '$lib/types';

const SEASON_ID_DEBOUNCE_MS = 500;

export type BangumiContext = {
	/** 当前填入的番剧 Season ID */
	getSourceId: () => string;
	/** 当前视频源类型 */
	getSourceType: () => VideoCategory;
	/** 该季度是否已经添加过（来自「已有视频源」集合） */
	isSeasonExists: (seasonId: string) => boolean;
};

/**
 * 番剧季度域：季度列表、季度勾选与合并目标源。
 * 合并时的名称/路径缓存属于表单逻辑，仍留在页面。
 */
export class BangumiSeasonStore {
	seasons = $state<BangumiSeasonInfo[]>([]);
	loading = $state(false);
	selected = $state<string[]>([]);
	fetchAttempted = false;

	existingSources = $state<BangumiSourceOption[]>([]);
	mergeToSourceId = $state<number | null>(null);

	isMerging = $derived.by(
		() => this.#ctx.getSourceType() === 'bangumi' && this.mergeToSourceId !== null
	);

	#ctx: BangumiContext;
	#timeout: ReturnType<typeof setTimeout> | null = null;

	constructor(ctx: BangumiContext) {
		this.#ctx = ctx;
	}

	/** Season ID 变化时防抖刷新季度；清空则重置列表 */
	handleSeasonIdChange(): void {
		if (this.#timeout) clearTimeout(this.#timeout);

		if (this.#ctx.getSourceId().trim() && this.#ctx.getSourceType() === 'bangumi') {
			this.fetchAttempted = false;
			this.#timeout = setTimeout(() => {
				void this.fetchSeasons();
			}, SEASON_ID_DEBOUNCE_MS);
			return;
		}

		this.fetchAttempted = false;
		this.seasons = [];
		this.selected = [];
	}

	/** 拉取当前番剧的全部季度，默认选中当前季度 */
	async fetchSeasons(): Promise<void> {
		const sourceId = this.#ctx.getSourceId();
		if (!sourceId.trim() || this.#ctx.getSourceType() !== 'bangumi') return;

		this.fetchAttempted = true;
		const result = await runRequest(() => api.getBangumiSeasons(sourceId), {
			setLoading: (value) => (this.loading = value),
			context: '获取季度信息失败',
			onError: () => {
				this.seasons = [];
				this.selected = [];
			}
		});
		if (!result) return;

		if (result.data && result.data.success) {
			this.seasons = result.data.data || [];
			// 默认选中当前季度
			if (this.seasons.length > 0) {
				const currentSeason = this.seasons.find((season) => season.season_id === sourceId);
				if (currentSeason) {
					this.selected = [currentSeason.season_id];
				}
			}
			// 如果只有一个季度，自动选中它
			if (this.seasons.length === 1) {
				this.selected = [this.seasons[0].season_id];
			}
		} else {
			this.seasons = [];
		}
	}

	/** 拉取可合并的已有番剧源 */
	async fetchExistingSources(): Promise<void> {
		const result = await runRequest(() => api.getBangumiSourcesForMerge(), {
			context: '获取现有番剧源失败',
			onError: () => {
				this.existingSources = [];
			}
		});
		if (!result) return;

		if (result.data && result.data.success) {
			this.existingSources = result.data.bangumi_sources;
		} else {
			this.existingSources = [];
		}
	}

	/** 切换季度勾选；已添加过的季度给出提示 */
	toggleSeason(seasonId: string): void {
		if (this.#ctx.isSeasonExists(seasonId)) {
			const seasonName =
				this.seasons.find((season) => season.season_id === seasonId)?.season_title || '该季度';
			toast.error('季度已存在', {
				description: `${seasonName}已经添加过了`
			});
			return;
		}

		if (this.selected.includes(seasonId)) {
			this.selected = this.selected.filter((id) => id !== seasonId);
		} else {
			this.selected = [...this.selected, seasonId];
		}
	}

	/** 清空季度与合并状态（切换源类型时用） */
	clear(): void {
		this.seasons = [];
		this.selected = [];
		this.mergeToSourceId = null;
		this.existingSources = [];
	}

	destroy(): void {
		if (this.#timeout) {
			clearTimeout(this.#timeout);
			this.#timeout = null;
		}
	}
}
