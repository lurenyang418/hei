import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import { buildAuthenticatedStreamUrl } from '$lib/utils/live-stream';
import { createManagedEventSource } from '$lib/utils/live-event-source';
import type { QueueStatusResponse } from '$lib/types';

/**
 * 任务队列页的数据域：状态拉取、SSE 实时更新、手动刷新与取消任务。
 * 展示用的格式化函数仍留在页面。
 */
export class QueueStore {
	status = $state<QueueStatusResponse | null>(null);
	loading = $state(true);
	error = $state<string | null>(null);
	cancellingTaskIds = $state<Record<string, boolean>>({});

	#stream = createManagedEventSource();

	async fetch(): Promise<void> {
		const response = await runRequest(() => api.getQueueStatus(), {
			context: '获取队列状态失败',
			onError: (err) => {
				this.error =
					err && typeof err === 'object' && 'message' in err
						? String(err.message)
						: '获取队列状态失败';
			}
		});
		if (!response) return;

		this.status = this.#normalize(response.data);
		this.error = null;
	}

	buildStreamUrl(): string | null {
		return buildAuthenticatedStreamUrl('/api/queue/live');
	}

	/** 手动刷新：显示 loading 并重新拉取 */
	async refresh(): Promise<void> {
		this.loading = true;
		await this.fetch();
		this.loading = false;
	}

	startStream(): void {
		this.#stream.start({
			url: this.buildStreamUrl(),
			handlers: {
				queue: (event) => {
					try {
						this.status = this.#normalize(JSON.parse(event.data) as QueueStatusResponse);
						this.error = null;
						this.loading = false;
					} catch (err) {
						console.error('解析任务队列实时更新失败:', err);
					}
				}
			}
		});
	}

	stopStream(): void {
		this.#stream.stop();
	}

	isCancelling(taskId: string): boolean {
		return !!this.cancellingTaskIds[taskId];
	}

	async cancelTask(taskId: string): Promise<void> {
		if (!taskId || this.isCancelling(taskId)) return;

		this.cancellingTaskIds = { ...this.cancellingTaskIds, [taskId]: true };
		try {
			const response = await runRequest(() => api.cancelQueueTask(taskId), {
				context: '取消任务失败'
			});
			if (!response) return;

			toast.success('任务已取消', {
				description: response.data.message
			});
		} finally {
			const rest = { ...this.cancellingTaskIds };
			delete rest[taskId];
			this.cancellingTaskIds = rest;
		}
	}

	/** 兼容老后端：没有 ai_rename_queue 字段时补空队列，避免渲染读 undefined */
	#normalize(status: QueueStatusResponse): QueueStatusResponse {
		return {
			...status,
			ai_rename_queue: status.ai_rename_queue ?? { length: 0, is_processing: false, tasks: [] }
		};
	}
}
