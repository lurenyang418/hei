<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';
	import Loading from '$lib/components/ui/Loading.svelte';

	import type { DatabaseSettingsStore } from '$lib/stores/settings/database.svelte';
	import { formatBytes } from '$lib/stores/settings/database.svelte';

	export let store: DatabaseSettingsStore;
	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;

	// 文件选择框属于 DOM，由抽屉自己持有；store 只接收选中的 File
	let importFileInput: HTMLInputElement | undefined = undefined;

	function selectImportFile() {
		importFileInput?.click();
	}

	function handleImportPicked(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		store.requestImportRestore(file);
	}
</script>

<!-- 数据库管理抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="数据库管理"
	titleTooltip="查看数据库文件信息与各表数据量；可清理缓存、压缩或备份数据库。"
	{isMobile}
>
	<div class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}">
		<div class="min-h-0 flex-1 space-y-6 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			{#if store.loading && !store.status}
				<div class="flex justify-center py-12">
					<Loading />
				</div>
			{:else if store.status}
				<!-- 数据库信息 -->
				<div class="space-y-3">
					<h3 class="text-base font-semibold">数据库信息</h3>
					<div class="rounded-lg border p-4">
						<div class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
							<div>
								<span class="text-muted-foreground">主库大小：</span>
								<span class="font-medium">{formatBytes(store.status.db_size_bytes)}</span>
							</div>
							<div>
								<span class="text-muted-foreground">WAL：</span>
								<span class="font-medium">{formatBytes(store.status.wal_size_bytes)}</span>
							</div>
							<div>
								<span class="text-muted-foreground">可回收空间：</span>
								<span class="font-medium">{formatBytes(store.status.reclaimable_bytes)}</span>
							</div>
						</div>
						<p class="text-muted-foreground mt-2 text-xs break-all">{store.status.path}</p>
						{#if store.status.reclaimable_bytes > 1024 * 1024}
							<div
								class="mt-2 rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
							>
								可回收空间较大，建议执行「压缩数据库」释放磁盘空间。
							</div>
						{/if}
					</div>
				</div>

				<!-- 数据量统计 -->
				<div class="space-y-3">
					<h3 class="text-base font-semibold">数据量统计</h3>
					<div class="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6">
						{#each store.status.tables as stat (stat.table)}
							<div class="flex items-center justify-between gap-1 rounded border px-2 py-1">
								<span class="text-muted-foreground truncate text-[11px]">{stat.label}</span>
								<span class="text-xs font-semibold tabular-nums">{stat.rows}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- 维护操作 -->
				<div class="space-y-3">
					<h3 class="text-base font-semibold">维护操作</h3>
					<div class="grid grid-cols-2 gap-2 md:grid-cols-4">
						<button
							type="button"
							class="hover:bg-accent flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors"
							onclick={() =>
								store.requestAction(
									'clear_image_cache',
									'清理图片代理缓存',
									'清空网页图片代理缓存，图片将按需重新拉取。'
								)}
						>
							<span class="text-sm font-medium">清理图片代理缓存</span>
							<span class="text-muted-foreground text-xs">清空 image_proxy_cache 表</span>
						</button>
						<button
							type="button"
							class="hover:bg-accent flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors"
							onclick={() =>
								store.requestAction(
									'clear_ai_history',
									'清理 AI 对话历史',
									'清空 AI 重命名使用的历史对话记录，不影响已完成的命名。'
								)}
						>
							<span class="text-sm font-medium">清理 AI 对话历史</span>
							<span class="text-muted-foreground text-xs">清空 ai_conversation_history 表</span>
						</button>
						<button
							type="button"
							class="hover:bg-accent flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors"
							onclick={() =>
								store.requestAction(
									'clear_queue_history',
									'清理任务队列历史',
									'删除已经完成或失败的任务队列记录（删除来源/添加来源等历史任务）。'
								)}
						>
							<span class="text-sm font-medium">清理任务队列历史</span>
							<span class="text-muted-foreground text-xs">删除已完成/失败的任务队列记录</span>
						</button>
						<button
							type="button"
							class="hover:bg-accent flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors"
							onclick={() =>
								store.requestAction('clean_orphans', '清理孤立记录', '删除无主分P记录。', true)}
						>
							<span class="text-sm font-medium">清理孤立记录</span>
							<span class="text-muted-foreground text-xs">无主分P</span>
						</button>
						<button
							type="button"
							class="hover:bg-accent flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors"
							onclick={() =>
								store.requestAction(
									'vacuum',
									'压缩数据库',
									'执行 VACUUM 回收删除数据后留下的磁盘空间，可能需要几秒到几十秒。'
								)}
						>
							<span class="text-sm font-medium">压缩数据库</span>
							<span class="text-muted-foreground text-xs">
								回收可释放空间（当前约 {formatBytes(store.status.reclaimable_bytes)}）
							</span>
						</button>
						<button
							type="button"
							class="hover:bg-accent flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors"
							onclick={() =>
								store.requestAction(
									'backup',
									'备份数据库',
									'生成一份完整数据库快照到配置目录（data-backup-时间戳.sqlite），不影响当前运行。'
								)}
						>
							<span class="text-sm font-medium">备份数据库</span>
							<span class="text-muted-foreground text-xs">VACUUM INTO 快照，不锁库</span>
						</button>
						<button
							type="button"
							class="hover:bg-accent flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors"
							onclick={() =>
								store.requestAction(
									'clean_logs',
									'清理旧日志',
									'删除保留期以外的旧日志文件，释放磁盘空间；保留天数可在确认框中自由调整（1-365 天），当前正在写入的日志不受影响。',
									false,
									7
								)}
						>
							<span class="text-sm font-medium">清理旧日志</span>
							<span class="text-muted-foreground text-xs">保留最近 7 天的 logs/*.csv</span>
						</button>
					</div>
				</div>

				<!-- 数据库备份与恢复 -->
				<div class="space-y-3">
					<div class="rounded-lg border p-3">
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0">
								<p class="text-sm font-medium">导入备份包</p>
								<p class="text-muted-foreground text-xs">
									选择其他电脑导出的 .sqlite
									备份文件，导入后即可恢复；外部备份也会保留在本机备份列表中。
								</p>
							</div>
							<input
								bind:this={importFileInput}
								type="file"
								accept=".sqlite,.db"
								class="hidden"
								onchange={handleImportPicked}
							/>
							<button
								type="button"
								class="hover:bg-accent flex-shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
								onclick={selectImportFile}
							>
								选择文件
							</button>
						</div>
					</div>
					<div class="flex items-center justify-between">
						<h3 class="text-base font-semibold">数据库备份</h3>
						<button
							type="button"
							class="text-muted-foreground hover:text-foreground text-xs transition-colors"
							onclick={() => store.loadBackups()}
							disabled={store.backupsLoading}
						>
							{store.backupsLoading ? '刷新中...' : '刷新列表'}
						</button>
					</div>
					{#if store.backups.length === 0}
						<div
							class="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm"
						>
							暂无备份。点击上方「备份数据库」生成一份快照。
						</div>
					{:else}
						<div class="space-y-2">
							{#each store.backups as backup (backup.name)}
								<div
									class="hover:bg-accent flex items-center justify-between rounded-lg border p-3 transition-colors"
								>
									<div class="min-w-0">
										<p class="truncate font-mono text-sm">
											{backup.name}
											{#if backup.is_import}
												<span
													class="ml-2 rounded bg-blue-500/15 px-1.5 py-0.5 text-xs font-normal text-blue-600 dark:text-blue-400"
													>外部导入</span
												>
											{/if}
										</p>
										<p class="text-muted-foreground text-xs">
											{formatBytes(backup.size_bytes)} · {backup.created_at}
										</p>
									</div>
									<button
										type="button"
										class="text-destructive hover:text-destructive/80 border-destructive/40 flex-shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
										onclick={() => store.confirmRestore(backup)}
									>
										恢复
									</button>
								</div>
							{/each}
						</div>
						<p class="text-muted-foreground text-xs">
							恢复会替换当前数据库，重启后生效；恢复前会自动保留一份当前库的快照（data.sqlite.pre-restore-*）。
						</p>
					{/if}
				</div>
			{/if}
		</div>
		<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
			<Button type="button" variant="outline" onclick={() => store.loadStatus()} disabled={store.loading} class="w-full">
				{store.loading ? '刷新中...' : '刷新统计'}
			</Button>
		</SheetFooter>
	</div>
</ResponsiveSheet>

<!-- 数据库维护确认对话框 -->
<AlertDialog.Root
	open={!!store.action}
	onOpenChange={(next) => {
		if (!next) store.action = null;
	}}
>
	<AlertDialog.Content class="max-w-md">
		<AlertDialog.Header>
			<AlertDialog.Title class={store.action?.danger ? 'text-destructive dark:text-red-400' : ''}>
				{store.action?.label}
			</AlertDialog.Title>
			<AlertDialog.Description>{store.action?.description}</AlertDialog.Description>
			{#if store.action?.action === 'clean_logs'}
				<div class="mt-3 flex items-center gap-2">
					<label for="keep-log-days" class="text-muted-foreground text-sm whitespace-nowrap"
						>保留天数</label
					>
					<input
						id="keep-log-days"
						type="number"
						min="1"
						max="365"
						value={store.action.keepDays}
						oninput={(e) => {
							const value = Number((e.currentTarget as HTMLInputElement).value);
							if (store.action) store.action.keepDays = value >= 1 ? Math.min(value, 365) : 1;
						}}
						class="border-input bg-background w-28 rounded-md border px-3 py-1.5 text-sm"
					/>
					<span class="text-muted-foreground text-xs">删除更早的日志文件</span>
				</div>
			{/if}
		</AlertDialog.Header>
		<AlertDialog.Footer class="flex justify-end gap-3 pt-4">
			<button
				type="button"
				class="hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				disabled={store.actionRunning}
				onclick={() => (store.action = null)}
			>
				取消
			</button>
			<button
				type="button"
				class="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={store.actionRunning}
				onclick={() => store.runAction()}
			>
				{store.actionRunning ? '执行中...' : '确认执行'}
			</button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- 数据库恢复确认对话框 -->
<AlertDialog.Root
	open={!!store.restoreTarget}
	onOpenChange={(next) => {
		if (!next) store.restoreTarget = null;
	}}
>
	<AlertDialog.Content class="max-w-md">
		<AlertDialog.Header>
			<AlertDialog.Title class="text-destructive dark:text-red-400">恢复数据库</AlertDialog.Title>
			<AlertDialog.Description>
				<p class="mb-2">确定要用以下备份替换当前数据库吗？</p>
				<div class="bg-muted/50 rounded-md border p-3 font-mono text-xs">
					<p class="break-all">{store.restoreTarget?.name}</p>
					<p class="text-muted-foreground mt-1">
						{formatBytes(store.restoreTarget?.size_bytes ?? 0)} · {store.restoreTarget?.created_at}
					</p>
				</div>
				<div
					class="mt-3 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
				>
					<strong>注意：</strong
					>恢复将在重启后生效。当前数据库会先自动保留一份快照，但请确认无需保留其它数据。
				</div>
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="flex justify-end gap-3 pt-4">
			<button
				type="button"
				class="hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				disabled={store.restoreRunning}
				onclick={() => (store.restoreTarget = null)}
			>
				取消
			</button>
			<button
				type="button"
				class="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={store.restoreRunning}
				onclick={() => store.runRestore()}
			>
				{store.restoreRunning ? '安排中...' : '确认恢复'}
			</button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- 数据库导入备份确认对话框 -->
<AlertDialog.Root
	open={!!store.importRestoreTarget}
	onOpenChange={(next) => {
		if (!next) store.importRestoreTarget = null;
	}}
>
	<AlertDialog.Content class="max-w-md">
		<AlertDialog.Header>
			<AlertDialog.Title class="text-destructive dark:text-red-400"
				>导入备份包并恢复</AlertDialog.Title
			>
			<AlertDialog.Description>
				<p class="mb-2">确定要导入以下备份包并替换当前数据库吗？</p>
				<div class="bg-muted/50 rounded-md border p-3 font-mono text-xs">
					<p class="break-all">{store.importRestoreTarget?.name}</p>
					<p class="text-muted-foreground mt-1">
						{formatBytes(store.importRestoreTarget?.size_bytes ?? 0)}
					</p>
				</div>
				<div
					class="mt-3 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
				>
					<strong>注意：</strong
					>导入后会校验备份包有效性，恢复将在重启后生效。当前数据库会先自动保留一份快照，但请确认无需保留其它数据。
				</div>
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="flex justify-end gap-3 pt-4">
			<button
				type="button"
				class="hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				disabled={store.importRestoreRunning}
				onclick={() => (store.importRestoreTarget = null)}
			>
				取消
			</button>
			<button
				type="button"
				class="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={store.importRestoreRunning}
				onclick={() => store.runImportRestore()}
			>
				{store.importRestoreRunning ? '导入中...' : '确认导入并恢复'}
			</button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
