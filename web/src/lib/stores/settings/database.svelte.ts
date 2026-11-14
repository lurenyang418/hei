import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';

export type DatabaseStatus = {
	path: string;
	db_size_bytes: number;
	wal_size_bytes: number;
	reclaimable_bytes: number;
	tables: { table: string; rows: number; label: string }[];
} | null;

export type DatabaseBackup = {
	name: string;
	path: string;
	size_bytes: number;
	created_at: string;
	is_import: boolean;
};

export type DatabaseActionType =
	| 'clear_image_cache'
	| 'clear_ai_history'
	| 'clear_queue_history'
	| 'clean_orphans'
	| 'vacuum'
	| 'backup'
	| 'clean_logs';

export type DatabaseAction = {
	action: DatabaseActionType;
	label: string;
	description: string;
	danger: boolean;
	keepDays: number;
} | null;

export type DatabaseRestoreTarget = { name: string; size_bytes: number; created_at: string } | null;

export type DatabaseImportTarget = { file: File; name: string; size_bytes: number } | null;

export function formatBytes(bytes: number): string {
	if (!bytes || bytes <= 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / Math.pow(1024, index);
	return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
}

/**
 * 数据库管理域：状态统计、备份列表、恢复、导入备份包与维护动作。
 * 文件选择框属于 DOM，由抽屉组件自己持有，这里只接收选中的 File。
 */
export class DatabaseSettingsStore {
	status = $state<DatabaseStatus>(null);
	loading = $state(false);
	backups = $state<DatabaseBackup[]>([]);
	backupsLoading = $state(false);

	action = $state<DatabaseAction>(null);
	actionRunning = $state(false);

	restoreTarget = $state<DatabaseRestoreTarget>(null);
	restoreRunning = $state(false);

	importRestoreTarget = $state<DatabaseImportTarget>(null);
	importRestoreRunning = $state(false);

	/** 打开抽屉时并发刷新状态与备份列表 */
	loadAll(): void {
		void this.loadStatus();
		void this.loadBackups();
	}

	async loadStatus(): Promise<void> {
		this.loading = true;
		try {
			const response = await runRequest(() => api.getDatabaseStatus(), {
				context: '获取数据库状态失败'
			});
			if (response) this.status = response.data;
		} finally {
			this.loading = false;
		}
	}

	async loadBackups(): Promise<void> {
		this.backupsLoading = true;
		try {
			const response = await runRequest(() => api.getDatabaseBackups(), {
				context: '获取数据库备份列表失败'
			});
			if (response) this.backups = response.data.backups;
		} finally {
			this.backupsLoading = false;
		}
	}

	/** 点击「恢复」时先选中目标，再由确认框调用 runRestore */
	confirmRestore(backup: DatabaseRestoreTarget): void {
		this.restoreTarget = backup;
	}

	async runRestore(): Promise<void> {
		if (!this.restoreTarget) return;
		const name = this.restoreTarget.name;
		this.restoreRunning = true;
		try {
			const response = await runRequest(() => api.restoreDatabase(name), {
				context: '恢复数据库失败'
			});
			if (response?.data?.success) {
				toast.success('恢复已安排', { description: response.data.message });
			} else if (response?.data) {
				toast.error('恢复失败', { description: response.data.message });
			}
		} finally {
			this.restoreRunning = false;
			this.restoreTarget = null;
		}
	}

	/** 维护动作确认框：先记录动作，再由确认框执行 */
	requestAction(
		action: DatabaseActionType,
		label: string,
		description: string,
		danger = false,
		keepDays = 7
	): void {
		this.action = { action, label, description, danger, keepDays };
	}

	async runAction(): Promise<void> {
		if (!this.action) return;
		const { action, label } = this.action;
		const keepDays = action === 'clean_logs' ? this.action.keepDays : undefined;
		this.actionRunning = true;
		try {
			const response = await runRequest(() => api.runDatabaseMaintenance(action, keepDays), {
				context: `${label}失败`
			});
			if (response?.data?.success) {
				toast.success(`${label}成功`, { description: response.data.message });
				await this.loadStatus();
			} else if (response?.data) {
				toast.error(`${label}失败`, { description: response.data.message });
			}
		} finally {
			this.actionRunning = false;
			this.action = null;
		}
	}

	/** 抽屉里选择完备份文件后登记待导入目标 */
	requestImportRestore(file: File): void {
		this.importRestoreTarget = { file, name: file.name, size_bytes: file.size };
	}

	async runImportRestore(): Promise<void> {
		if (!this.importRestoreTarget) return;
		const target = this.importRestoreTarget;
		this.importRestoreRunning = true;
		try {
			const response = await runRequest(() => api.uploadRestoreBackup(target.file, target.name), {
				context: '导入备份包失败'
			});
			if (response?.data?.success) {
				toast.success('备份包已导入', { description: response.data.message });
				await this.loadBackups();
			} else if (response?.data) {
				toast.error('导入备份包失败', { description: response.data.message });
			}
		} finally {
			this.importRestoreRunning = false;
			this.importRestoreTarget = null;
		}
	}
}
