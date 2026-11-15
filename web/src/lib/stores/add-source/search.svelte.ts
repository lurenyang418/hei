import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import type { SearchResultItem, VideoCategory } from '$lib/types';

type SearchApiType = 'video' | 'bili_user' | 'media_bangumi';

export type SearchContext = {
	/** 当前视频源类型，用于默认搜索类型 */
	getSourceType: () => VideoCategory;
	/** 搜索前清空其它面板（关注 / 合集 / 收藏夹 / 投稿选择） */
	onBeforeSearch?: () => void;
};

/**
 * 搜索域：关键词、结果列表与分页拉取。
 * 「选择某个结果后如何填表单」属于源表单逻辑，留在页面。
 */
export class SearchStore {
	keyword = $state('');
	loading = $state(false);
	results = $state<SearchResultItem[]>([]);
	total = $state(0);
	open = $state(false);

	#ctx: SearchContext;

	constructor(ctx: SearchContext) {
		this.#ctx = ctx;
	}

	/** 执行搜索：按源类型决定搜索类型，分页拉全并去重 */
	async search(overrideSearchType?: string): Promise<void> {
		if (!this.keyword.trim()) {
			toast.error('请输入搜索关键词');
			return;
		}

		this.#ctx.onBeforeSearch?.();

		const searchType: SearchApiType = overrideSearchType
			? (overrideSearchType as SearchApiType)
			: this.#resolveSearchType();

		this.results = [];
		this.total = 0;

		const searchResponse = await runRequest(
			async () => {
				// 番剧搜索每页实际可选结果更少，放宽页大小
				const pageSize = searchType === 'media_bangumi' ? 100 : 50;

				const firstResult = await api.searchBilibili({
					keyword: this.keyword,
					search_type: searchType,
					page: 1,
					page_size: pageSize
				});

				if (!firstResult.data.success) {
					toast.error('搜索失败');
					return null;
				}

				const totalResults = firstResult.data.total;
				const allResults = [...firstResult.data.results];

				if (totalResults > pageSize) {
					const totalPages = firstResult.data.num_pages || Math.ceil(totalResults / pageSize);
					const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);

					// 串行拉取剩余页，避免并发过多被限流
					for (const page of remainingPages) {
						try {
							const pageResult = await api.searchBilibili({
								keyword: this.keyword,
								search_type: searchType,
								page,
								page_size: pageSize
							});

							if (pageResult.data.success && pageResult.data.results) {
								allResults.push(...pageResult.data.results);
							}

							await new Promise((resolve) => setTimeout(resolve, 100));
						} catch {
							// 单页失败不阻塞整体搜索
						}
					}
				}

				// 按唯一标识去重
				const uniqueResults = allResults.filter((result, index, arr) => {
					const id = result.season_id || result.bvid || result.mid || `${result.title}_${index}`;
					return (
						arr.findIndex((item) => {
							const itemId =
								item.season_id || item.bvid || item.mid || `${item.title}_${arr.indexOf(item)}`;
							return itemId === id;
						}) === index
					);
				});

				return { uniqueResults, totalResults };
			},
			{
				setLoading: (value) => (this.loading = value),
				context: '搜索失败'
			}
		);
		if (!searchResponse) return;

		const { uniqueResults, totalResults } = searchResponse;
		this.total = totalResults;
		this.results = uniqueResults;
		this.open = true;

		const successRate = ((uniqueResults.length / totalResults) * 100).toFixed(1);
		if (uniqueResults.length < totalResults) {
			toast.success(
				`搜索完成，获取到 ${uniqueResults.length}/${totalResults} 个结果 (${successRate}%)`
			);
		} else {
			toast.success(`搜索完成，共获取到 ${uniqueResults.length} 个结果`);
		}
	}

	/** 关闭结果面板；可选同时清空关键词 */
	clear(options: { clearKeyword?: boolean } = {}): void {
		this.open = false;
		this.results = [];
		this.total = 0;
		if (options.clearKeyword) {
			this.keyword = '';
		}
	}

	#resolveSearchType(): SearchApiType {
		switch (this.#ctx.getSourceType()) {
			case 'collection':
			case 'submission':
			case 'favorite':
			case 'pugv':
				return 'bili_user';
			case 'bangumi':
				return 'media_bangumi';
			default:
				return 'video';
		}
	}
}
