import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';

/**
 * B 站源扫描策略域：分批扫描数量与自适应降频参数。
 * 配置读写都走全局 config 接口，这里只负责表单状态与校验。
 */
export class VideoSourceScanConfigStore {
	batchSize = $state('0');
	adaptiveScan = $state(false);
	adaptiveMaxHours = $state('24');

	loading = $state(false);
	saving = $state(false);
	dialogOpen = $state(false);

	async load(): Promise<void> {
		const response = await runRequest(() => api.getConfig(), {
			setLoading: (value) => (this.loading = value),
			context: '加载B站源扫描策略失败'
		});
		if (!response) return;

		const config = response.data;
		this.batchSize = String(config.submission_scan_batch_size ?? 0);
		this.adaptiveScan = Boolean(config.submission_adaptive_scan ?? false);
		this.adaptiveMaxHours = String(config.submission_adaptive_max_hours ?? 24);
	}

	async save(): Promise<void> {
		const batchSize = Number(this.batchSize);
		const maxHours = Number(this.adaptiveMaxHours);

		if (!Number.isFinite(batchSize) || batchSize < 0) {
			toast.error('每轮扫描数量必须是非负数字');
			return;
		}
		if (!Number.isFinite(maxHours) || maxHours < 1) {
			toast.error('最大间隔必须大于等于 1 小时');
			return;
		}

		this.saving = true;
		const result = await runRequest(
			() =>
				api.updateConfig({
					submission_scan_batch_size: batchSize,
					submission_adaptive_scan: this.adaptiveScan,
					submission_adaptive_max_hours: maxHours
				}),
			{ context: '保存B站源扫描策略失败' }
		);
		this.saving = false;
		if (!result) return;

		if (result.data.success) {
			toast.success(result.data.message || '保存成功');
		} else {
			toast.error('保存失败', { description: result.data.message });
		}

		await this.load();
	}

	/** 打开弹窗前先拉一次最新配置 */
	async open(): Promise<void> {
		this.dialogOpen = true;
		await this.load();
	}
}
