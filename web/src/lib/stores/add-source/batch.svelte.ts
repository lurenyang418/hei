import { SvelteMap } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import type { AddVideoSourceRequest, BatchSelectedItem, BatchSelectedItemData, VideoCategory } from '$lib/types';

export type BatchContext = {
	/** 当前选择的视频源类型（search/following 项按它解析） */
	getSourceType: () => VideoCategory;
	/** 当前批量默认路径模板（由页面的快捷订阅模板派生） */
	getSelectedTemplate: () => string;
	/** 按源类型取快捷订阅模板 */
	getQuickTemplate: (type: VideoCategory) => string;
	/** 渲染带变量的路径模板 */
	renderPath: (template: string, name: string) => string;
	/** 源表单的基础参数（批量添加时逐项复用） */
	getBaseParams: () => Partial<AddVideoSourceRequest>;
	/** 批量添加成功后的收尾（刷新扫描并跳转） */
	onBatchAdded: () => Promise<void>;
	/** 清理搜索结果标题里的标记 */
	cleanTitle: (title: string) => string;
	/** 收藏夹显示名 */
	getFavoriteDisplayName: (item: BatchSelectedItemData) => string;
};

/**
 * 批量选择域：选择集合、批量路径、批量添加执行与进度。
 * 列表遍历（全选某类列表）留在页面，因为列表数据属于各自的面板。
 */
export class BatchSelectionStore {
	mode = $state(false);
	selectedItems = new SvelteMap<string, BatchSelectedItem>();
	basePath = $state('/Downloads');
	collectionAggregateEnabled = $state(false);
	adding = $state(false);
	progress = $state({ current: 0, total: 0 });
	dialogOpen = $state(false);

	checkboxStates = $derived.by(() => {
		const states: Record<string, boolean> = {};
		for (const key of this.selectedItems.keys()) {
			states[key] = true;
		}
		return states;
	});

	selectedCount = $derived(this.selectedItems.size);
	canStart = $derived.by(() => !!this.#ctx.getSelectedTemplate() || !!this.basePath.trim());
	selectedSourceType = $derived.by(() => this.#resolveSelectedSourceType());

	#ctx: BatchContext;

	constructor(ctx: BatchContext) {
		this.#ctx = ctx;
	}

	/** 切换批量模式；退出时清空选择 */
	toggleMode(): void {
		this.mode = !this.mode;
		if (!this.mode) {
			this.clear();
		}
	}

	clear(): void {
		this.selectedItems.clear();
	}

	isSelected(itemKey: string): boolean {
		return this.selectedItems.has(itemKey);
	}

	/** 勾选/取消勾选；跨源类型时拒绝并提示 */
	toggle(itemKey: string, item: BatchSelectedItemData, itemType: string): void {
		if (this.selectedItems.has(itemKey)) {
			this.selectedItems.delete(itemKey);
			return;
		}

		const newItemSourceType = this.#resolveRawType(itemType);
		if (this.selectedItems.size > 0) {
			const first = this.selectedItems.values().next().value;
			if (!first) return;
			const currentBatchSourceType = this.getSourceTypeFromBatchItem(first);
			if (newItemSourceType !== currentBatchSourceType) {
				toast.error('批量模式不支持跨源类型选择', {
					description: '请先清空已选项，再选择其他源类型的内容'
				});
				return;
			}
		}

		this.selectedItems.set(itemKey, {
			type: itemType,
			data: item,
			name: this.#displayName(item, itemType)
		});
	}

	getSourceTypeFromBatchItem(item: BatchSelectedItem): string {
		switch (item.type) {
			case 'search':
			case 'following':
				return this.#ctx.getSourceType();
			case 'favorite':
				return 'favorite';
			case 'collection':
				return 'collection';
			case 'bangumi':
				return 'bangumi';
			default:
				return this.#ctx.getSourceType();
		}
	}

	getSourceIdFromBatchItem(item: BatchSelectedItem): string {
		switch (item.type) {
			case 'search':
				return (item.data.mid ?? item.data.season_id ?? item.data.id ?? item.data.bvid ?? '').toString();
			case 'favorite':
				return (item.data.id ?? item.data.fid ?? '').toString();
			case 'collection':
				return (item.data.sid ?? item.data.season_id ?? item.data.id ?? '').toString();
			case 'following':
				return (item.data.mid ?? '').toString();
			case 'bangumi':
				return (item.data.season_id ?? '').toString();
			default:
				return (item.data.mid ?? item.data.id ?? '').toString();
		}
	}

	getItemTypeLabel(item: BatchSelectedItem): string {
		switch (item.type) {
			case 'search':
			case 'following':
				return this.#sourceTypeLabel(this.getSourceTypeFromBatchItem(item));
			case 'favorite':
				return '收藏夹';
			case 'collection':
				return '合集';
			case 'bangumi':
				return '番剧';
			default:
				return this.#sourceTypeLabel(item.type);
		}
	}

	openDialog(): void {
		const defaultTemplate = this.#ctx.getSelectedTemplate();
		if (!this.basePath.trim() || this.basePath === '/Downloads') {
			this.basePath = defaultTemplate || '/Downloads';
		}
		this.dialogOpen = true;
	}

	closeDialog(): void {
		this.dialogOpen = false;
		this.collectionAggregateEnabled = false;
	}

	/** 按当前批量路径与源类型渲染单项保存路径 */
	getPathForItem(item: BatchSelectedItem): string {
		const customPathOrTemplate = this.basePath.trim();
		const fallbackTemplate = this.#ctx
			.getQuickTemplate(this.getSourceTypeFromBatchItem(item) as VideoCategory)
			.trim();
		const effectivePathOrTemplate = customPathOrTemplate || fallbackTemplate;
		if (!effectivePathOrTemplate) {
			return '';
		}
		if (effectivePathOrTemplate.includes('{{') && item.name.trim()) {
			const renderedPath = this.#ctx.renderPath(effectivePathOrTemplate, item.name).trim();
			if (renderedPath) {
				return renderedPath;
			}
		}
		return effectivePathOrTemplate;
	}

	/** 执行批量添加（逐项串行，带进度与结果提示） */
	async addAll(): Promise<void> {
		if (this.selectedItems.size === 0) {
			toast.error('未选择任何视频源');
			return;
		}

		const resolvedTypes = new Set(
			Array.from(this.selectedItems.values()).map((item) => this.getSourceTypeFromBatchItem(item))
		);
		if (resolvedTypes.size > 1) {
			toast.error('不能跨源类型批量添加', {
				description: '已检测到多种源类型，请清空后按类型分别添加'
			});
			return;
		}

		this.progress = { current: 0, total: this.selectedItems.size };
		const selectedItems = Array.from(this.selectedItems.entries());
		const baseParams = this.#ctx.getBaseParams();

		const batchResult = await runRequest(
			async () => {
				let successCount = 0;
				let failedCount = 0;

				for (let i = 0; i < selectedItems.length; i++) {
					const [itemKey, item] = selectedItems[i];
					this.progress.current = i + 1;

					const params: AddVideoSourceRequest = {
						...baseParams,
						source_type: this.getSourceTypeFromBatchItem(item),
						source_id: this.getSourceIdFromBatchItem(item),
						name: item.name,
						path: this.getPathForItem(item)
					} as AddVideoSourceRequest;

					if (item.type === 'following') {
						if (this.#ctx.getSourceType() === 'collection') {
							params.up_id = (item.data.mid ?? '').toString();
							params.collection_type = 'season';
							params.collection_aggregate_enabled = this.collectionAggregateEnabled;
						}
					} else if (item.type === 'collection') {
						if (itemKey.startsWith('subscribed-collection_')) {
							params.up_id = (item.data.up_mid ?? '').toString();
							params.collection_type = item.data.collection_type || 'season';
							params.collection_aggregate_enabled = this.collectionAggregateEnabled;
						} else {
							params.up_id = (item.data.mid ?? '').toString();
							params.collection_type = item.data.collection_type || 'season';
							params.collection_aggregate_enabled = this.collectionAggregateEnabled;
						}
					}

					if (item.data.cover) {
						params.cover = item.data.cover;
					}

					const result = await runRequest(() => api.addVideoSource(params), {
						showErrorToast: false
					});

					if (result?.data.success) {
						successCount++;
					} else {
						failedCount++;
					}

					// 添加小延迟避免请求过于频繁
					await new Promise((resolve) => setTimeout(resolve, 200));
				}

				return { successCount, failedCount };
			},
			{
				setLoading: (value) => (this.adding = value),
				context: '批量添加失败'
			}
		);

		this.progress = { current: 0, total: 0 };
		if (!batchResult) return;

		const { successCount, failedCount } = batchResult;

		if (successCount > 0 && failedCount === 0) {
			toast.success('批量添加完成', {
				description: `成功添加 ${successCount} 个视频源`
			});
		} else if (successCount > 0) {
			toast.success('批量添加部分成功', {
				description: `成功添加 ${successCount} 个，失败 ${failedCount} 个`
			});
		} else {
			toast.error('批量添加失败', {
				description: '所有视频源都添加失败'
			});
		}

		this.clear();
		this.mode = false;
		this.dialogOpen = false;
		this.collectionAggregateEnabled = false;

		if (successCount > 0) {
			await this.#ctx.onBatchAdded();
		}
	}

	/** 切换源类型时清空选择，避免跨类型残留 */
	onSourceTypeChanged(): void {
		if (this.mode && this.selectedItems.size > 0) {
			this.clear();
			toast('已切换源类型，已清空批量选择，请重新选择');
		}
	}

	#resolveRawType(itemType: string): string {
		switch (itemType) {
			case 'search':
			case 'following':
				return this.#ctx.getSourceType();
			case 'favorite':
				return 'favorite';
			case 'collection':
				return 'collection';
			case 'bangumi':
				return 'bangumi';
			default:
				return this.#ctx.getSourceType();
		}
	}

	#resolveSelectedSourceType(): string | null {
		if (this.selectedItems.size === 0) return null;
		const firstItem = Array.from(this.selectedItems.values())[0];
		return this.getSourceTypeFromBatchItem(firstItem);
	}

	#displayName(item: BatchSelectedItemData, itemType: string): string {
		switch (itemType) {
			case 'search':
				return this.#ctx.cleanTitle(item.title ?? '');
			case 'favorite':
				return this.#ctx.getFavoriteDisplayName(item);
			case 'collection':
				return item.name || item.title || '';
			case 'following':
				return item.name || '';
			case 'bangumi':
				return item.season_title || item.title || item.full_title || '';
			default:
				return item.name || item.title || '';
		}
	}

	#sourceTypeLabel(type: string): string {
		switch (type) {
			case 'favorite':
				return '收藏夹';
			case 'collection':
				return '合集';
			case 'submission':
				return 'UP主投稿';
			case 'bangumi':
				return '番剧';
			case 'pugv':
				return '课程';
			case 'watch_later':
				return '稍后再看';
			default:
				return type;
		}
	}
}
