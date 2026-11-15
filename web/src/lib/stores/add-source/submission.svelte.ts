import { SvelteSet } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import type { SubmissionVideoInfo } from '$lib/types';

const SUBMISSION_PAGE_SIZE = 20;
const INITIAL_LOAD_SIZE = 100;
const LOAD_MORE_SIZE = 200;
const PAGE_DELAY = 500;
const SEARCH_DEBOUNCE_MS = 500;

export type SubmissionContext = {
	/** 当前 UP 主 mid（页面上的 sourceId） */
	getUpId: () => string;
	/** 当前平台（决定确认选择后是否提示） */
	getPlatform: () => string;
};

/**
 * 历史投稿选择域：投稿列表分页加载、关键词搜索、勾选与确认。
 * 面板组件只负责渲染，状态与请求都在这里。
 */
export class SubmissionSelectionStore {
	open = $state(false);
	selectedUpName = $state('');
	selectedVideos = $state<string[]>([]);

	videos = $state<SubmissionVideoInfo[]>([]);
	filtered = $state<SubmissionVideoInfo[]>([]);
	readonly selected = new SvelteSet<string>();

	loading = $state(false);
	loadingMore = $state(false);
	error = $state<string | null>(null);
	totalCount = $state(0);
	searchQuery = $state('');
	searching = $state(false);
	hasMore = $state(true);
	showLoadMore = $state(false);

	currentLoadedPage = 0;
	#searchTimer: ReturnType<typeof setTimeout> | null = null;
	#ctx: SubmissionContext;

	selectedCount = $derived(
		Array.from(this.selected).filter((bvid) => this.filtered.some((video) => video.bvid === bvid))
			.length
	);

	constructor(ctx: SubmissionContext) {
		this.#ctx = ctx;

		// 搜索词变化时防抖请求；清空则回退到完整列表
		$effect(() => {
			const query = this.searchQuery;
			if (this.#searchTimer) {
				clearTimeout(this.#searchTimer);
				this.#searchTimer = null;
			}
			if (query.trim()) {
				this.#searchTimer = setTimeout(() => {
					void this.#performSearch();
				}, SEARCH_DEBOUNCE_MS);
			} else {
				this.filtered = this.videos;
			}
			return () => {
				if (this.#searchTimer) {
					clearTimeout(this.#searchTimer);
					this.#searchTimer = null;
				}
			};
		});
	}

	/** 打开投稿选择面板（记录 UP 主名称并开始加载） */
	openSelection(upName: string): void {
		this.selectedUpName = upName;
		this.open = true;
	}

	close(): void {
		this.open = false;
	}

	/** 面板打开时重置并加载首屏 */
	async start(): Promise<void> {
		if (!this.#ctx.getUpId()) return;
		this.reset();
		await this.load();
	}

	reset(): void {
		this.videos = [];
		this.selected.clear();
		for (const bvid of this.selectedVideos) {
			this.selected.add(bvid);
		}
		this.loading = false;
		this.error = null;
		this.totalCount = 0;
		this.searchQuery = '';
		this.filtered = [];
		this.currentLoadedPage = 0;
		this.hasMore = true;
		this.showLoadMore = false;
	}

	async load(): Promise<void> {
		const upId = this.#ctx.getUpId();
		if (!upId) return;

		this.error = null;
		this.videos = [];
		this.totalCount = 0;
		this.currentLoadedPage = 0;
		this.hasMore = true;
		this.showLoadMore = false;

		await runRequest(
			async () => {
				await this.#loadInBatch(INITIAL_LOAD_SIZE);
				return true;
			},
			{
				setLoading: (value) => (this.loading = value),
				context: '加载投稿列表失败',
				showErrorToast: false,
				onError: (error) => {
					this.error =
						error && typeof error === 'object' && 'message' in error
							? String(error.message)
							: error instanceof Error
								? error.message
								: '网络请求失败';
				}
			}
		);
	}

	/** 串行批量加载，页间带延迟 */
	async #loadInBatch(loadCount: number): Promise<void> {
		const upId = this.#ctx.getUpId();
		const startPage = this.currentLoadedPage + 1;
		const targetVideos = Math.min(this.videos.length + loadCount, this.totalCount || Infinity);
		const neededPages = Math.ceil(targetVideos / SUBMISSION_PAGE_SIZE);

		for (let page = startPage; page <= neededPages; page++) {
			if (page > startPage) {
				await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY));
			}

			const response = await api.getSubmissionVideos({
				up_id: upId,
				page,
				page_size: SUBMISSION_PAGE_SIZE
			});

			if (!response.data) {
				throw new Error('获取投稿列表失败');
			}

			this.totalCount = Math.max(this.totalCount, response.data.total);

			const newVideos = response.data.videos || [];
			const existingBvids = new SvelteSet(this.videos.map((video) => video.bvid));
			const uniqueNewVideos = newVideos.filter((video) => !existingBvids.has(video.bvid));

			this.videos = [...this.videos, ...uniqueNewVideos];
			this.currentLoadedPage = page;

			if (this.videos.length >= targetVideos || this.videos.length >= this.totalCount) {
				break;
			}
		}

		this.hasMore = this.videos.length < this.totalCount;
		// 搜索词为空时，过滤列表跟随完整列表
		if (!this.searchQuery.trim()) {
			this.filtered = this.videos;
		}
	}

	async loadMore(): Promise<void> {
		if (!this.hasMore || this.loadingMore) return;

		this.showLoadMore = false;
		await runRequest(
			async () => {
				await this.#loadInBatch(LOAD_MORE_SIZE);
				return true;
			},
			{
				setLoading: (value) => (this.loadingMore = value),
				context: '加载更多视频失败'
			}
		);
	}

	toggle(bvid: string): void {
		if (this.selected.has(bvid)) {
			this.selected.delete(bvid);
		} else {
			this.selected.add(bvid);
		}
	}

	handleKeydown(event: KeyboardEvent, bvid: string): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			this.toggle(bvid);
		}
	}

	selectAll(): void {
		this.filtered.forEach((video) => this.selected.add(video.bvid));
	}

	selectNone(): void {
		this.filtered.forEach((video) => this.selected.delete(video.bvid));
	}

	invert(): void {
		this.filtered.forEach((video) => {
			if (this.selected.has(video.bvid)) {
				this.selected.delete(video.bvid);
			} else {
				this.selected.add(video.bvid);
			}
		});
	}

	/** 确认选择：写回 selectedVideos 并关闭面板 */
	confirm(): void {
		this.selectedVideos = Array.from(this.selected);
		this.open = false;

		if (this.#ctx.getPlatform() !== 'bilibili') return;

		if (this.selectedVideos.length > 0) {
			toast.success('已选择投稿', {
				description: `选择了 ${this.selectedVideos.length} 个历史投稿，新投稿将自动下载`
			});
		} else {
			toast.info('未选择投稿', {
				description: '将下载所有历史投稿和新投稿'
			});
		}
	}

	/** 取消选择：保留已有选择，仅关闭面板 */
	cancel(): void {
		this.open = false;
	}

	destroy(): void {
		if (this.#searchTimer) {
			clearTimeout(this.#searchTimer);
			this.#searchTimer = null;
		}
	}

	async #performSearch(): Promise<void> {
		const upId = this.#ctx.getUpId();
		if (!upId || !this.searchQuery.trim()) {
			this.filtered = this.videos;
			return;
		}

		const keyword = this.searchQuery.trim();
		const response = await runRequest(
			() =>
				api.getSubmissionVideos({
					up_id: upId,
					page: 1,
					page_size: 30,
					keyword
				}),
			{
				setLoading: (value) => (this.searching = value),
				context: '搜索失败',
				showErrorToast: false,
				onError: () => {
					toast.error('搜索失败', { description: '请稍后重试' });
					this.filtered = this.videos.filter((video) =>
						video.title.toLowerCase().includes(keyword.toLowerCase())
					);
				}
			}
		);
		if (!response) return;

		this.filtered = response.data?.videos ?? [];
	}
}
