import { SvelteSet } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import type { VideoSource } from '$lib/types';

export type BulkContext = {
	/** 批量操作成功后更新本地列表（页面持有的 videoSourceStore） */
	updateSources: (
		sourceType: string,
		ids: number[],
		updater: (source: VideoSource) => VideoSource
	) => void;
};

/**
 * 视频源批量选择域：按分区（源类型）维护折叠式批量选择与批量启停。
 * 列表数据本身仍由页面的 videoSourceStore 管理，这里只负责选择集合。
 */
export class VideoSourceBulkStore {
	updating = $state(false);
	modeSections = $state<Record<string, boolean>>({});
	selectedIds = $state<Record<string, SvelteSet<number>>>({});

	#ctx: BulkContext;

	constructor(ctx: BulkContext) {
		this.#ctx = ctx;
	}

	getSelectedSet(sectionKey: string): SvelteSet<number> {
		return this.selectedIds[sectionKey] ?? new SvelteSet<number>();
	}

	setSelectedSet(sectionKey: string, set: SvelteSet<number>): void {
		this.selectedIds = { ...this.selectedIds, [sectionKey]: set };
	}

	clearSelection(sectionKey: string): void {
		const { [sectionKey]: removed, ...rest } = this.selectedIds;
		void removed;
		this.selectedIds = rest;
	}

	toggleBulkMode(sectionKey: string): void {
		const next = !(this.modeSections[sectionKey] === true);
		this.modeSections = { ...this.modeSections, [sectionKey]: next };
		if (!next) {
			this.clearSelection(sectionKey);
		}
	}

	toggleSelect(sectionKey: string, sourceId: number): void {
		const current = this.getSelectedSet(sectionKey);
		const next = new SvelteSet(current);
		if (next.has(sourceId)) {
			next.delete(sourceId);
		} else {
			next.add(sourceId);
		}
		this.setSelectedSet(sectionKey, next);
	}

	selectAll(sectionKey: string, sources: { id: number }[]): void {
		this.setSelectedSet(sectionKey, new SvelteSet(sources.map((source) => source.id)));
	}

	clearAll(sectionKey: string): void {
		this.setSelectedSet(sectionKey, new SvelteSet());
	}

	/** 批量启用/禁用，逐项请求并汇总结果 */
	async setEnabled(sectionKey: string, sourceType: string, enabled: boolean): Promise<void> {
		const ids = Array.from(this.getSelectedSet(sectionKey));
		if (ids.length === 0) {
			toast.error('请先选择要操作的视频源');
			return;
		}

		this.updating = true;
		let successCount = 0;
		const failed: { id: number; message: string }[] = [];

		for (const id of ids) {
			const result = await runRequest(() => api.updateVideoSourceEnabled(sourceType, id, enabled), {
				showErrorToast: false,
				onError: (error) => {
					console.error('批量更新失败:', error);
				}
			});

			if (!result) {
				failed.push({ id, message: '请求失败' });
				continue;
			}

			if (result.data.success) {
				successCount += 1;
			} else {
				failed.push({ id, message: result.data.message });
			}
		}

		const actionLabel = enabled ? '启用' : '禁用';
		if (failed.length === 0) {
			toast.success(`批量${actionLabel}成功`, { description: `共 ${successCount} 个视频源` });
		} else {
			const preview = failed
				.slice(0, 3)
				.map((item) => `#${item.id} ${item.message}`)
				.join('；');
			toast.error(`批量${actionLabel}完成（成功 ${successCount}，失败 ${failed.length}）`, {
				description: preview + (failed.length > 3 ? '…' : '')
			});
		}

		if (successCount > 0) {
			const failedIds = new SvelteSet(failed.map((item) => item.id));
			this.#ctx.updateSources(sourceType, ids, (source) =>
				failedIds.has(source.id) ? source : { ...source, enabled }
			);
		}

		this.clearSelection(sectionKey);
		this.updating = false;
	}
}
