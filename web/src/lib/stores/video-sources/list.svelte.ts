import { SvelteMap } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import { buildAuthenticatedStreamUrl } from '$lib/utils/live-stream';
import { createManagedEventSource } from '$lib/utils/live-event-source';
import { setVideoSources } from '$lib/stores/video-source';
import type { VideoSourcesResponse } from '$lib/types';
import type { VideoSourceType } from '$lib/consts';

type PendingDelete = { sourceType: VideoSourceType; sourceId: number; sourceName: string };

/**
 * 视频源列表域：首屏加载、SSE 实时更新与「队列删除完成」提示。
 * 列表数据本体仍写回 $lib/stores/video-source 的共享 store。
 */
export class VideoSourceListStore {
	loading = $state(false);
	queuedDeleteNoticeMap = new SvelteMap<string, PendingDelete>();

	#stream = createManagedEventSource();

	async load(silent = false): Promise<void> {
		const response = await runRequest(() => api.getVideoSources(), {
			setLoading: silent ? undefined : (value) => (this.loading = value),
			context: '加载视频源失败'
		});
		if (!response) return;
		setVideoSources(response.data);
	}

	buildStreamUrl(): string | null {
		return buildAuthenticatedStreamUrl('/api/video-sources/live');
	}

	sourceStillExists(
		sources: VideoSourcesResponse,
		sourceType: VideoSourceType,
		sourceId: number
	): boolean {
		return sources[sourceType]?.some((source) => source.id === sourceId) ?? false;
	}

	markQueuedDeletePending(sourceType: VideoSourceType, sourceId: number, sourceName: string): void {
		this.queuedDeleteNoticeMap.set(`${sourceType}:${sourceId}`, {
			sourceType,
			sourceId,
			sourceName
		});
	}

	startStream(): void {
		this.#stream.start({
			url: this.buildStreamUrl(),
			handlers: {
				sources: (event) => {
					try {
						const payload = JSON.parse(event.data) as VideoSourcesResponse;
						this.#notifyCompletedQueuedDeletions(payload);
						setVideoSources({ ...payload });
					} catch (error) {
						console.error('解析视频源实时更新失败:', error);
					}
				}
			},
			onError: () => {
				console.warn('视频源实时更新连接异常，等待浏览器自动重连');
			}
		});
	}

	stopStream(): void {
		this.#stream.stop();
	}

	#notifyCompletedQueuedDeletions(sources: VideoSourcesResponse): void {
		for (const [key, pendingDelete] of this.queuedDeleteNoticeMap.entries()) {
			if (this.sourceStillExists(sources, pendingDelete.sourceType, pendingDelete.sourceId)) {
				continue;
			}

			this.queuedDeleteNoticeMap.delete(key);
			toast.success('删除完成', {
				description: `视频源「${pendingDelete.sourceName}」已从列表移除`
			});
		}
	}
}
