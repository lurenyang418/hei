<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		RefreshCw,
		ListTodo,
		Settings,
		Plus,
		Trash2,
		Clock,
		CheckCircle,
		AlertCircle,
		WandSparkles,
		X
	} from '@lucide/svelte';
	import api from '$lib/api';
	import type { QueueStatusResponse } from '$lib/types';
	import { setBreadcrumb } from '$lib/stores/breadcrumb';
	import { runRequest } from '$lib/utils/request.js';
	import { formatTimestampOrFallback } from '$lib/utils/timezone';
	import { buildAuthenticatedStreamUrl } from '$lib/utils/live-stream';
	import { createManagedEventSource } from '$lib/utils/live-event-source';
	import { QueueStore } from '$lib/stores/queue/queue.svelte';
	import { toast } from 'svelte-sonner';
	import QueueHelpPanel from '$lib/components/queue-help-panel.svelte';

	const queue = new QueueStore();


	// 设置面包屑
	setBreadcrumb([
		{ label: '首页', href: '/' },
		{ label: '任务队列', href: '/queue' }
	]);







	// 格式化时间
	function formatTime(timeString: string): string {
		return formatTimestampOrFallback(timeString, 'Asia/Shanghai', 'time', '无效时间');
	}

	// 获取任务类型的显示名称
	function getTaskTypeName(taskType: string): string {
		const typeMap: Record<string, string> = {
			delete_video_source: '删除视频源',
			delete_video: '删除视频',
			add_video_source: '添加视频源',
			update_config: '更新配置',
			reload_config: '重载配置',
			refresh_danmaku: '刷新弹幕',
			ai_rename_history: 'AI 批量重命名'
		};
		return typeMap[taskType] || taskType;
	}

	// 获取任务类型的图标
	function getTaskTypeIcon(taskType: string) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const iconMap: Record<string, any> = {
			delete_video_source: Trash2,
			delete_video: Trash2,
			add_video_source: Plus,
			update_config: Settings,
			reload_config: RefreshCw,
			refresh_danmaku: RefreshCw,
			ai_rename_history: WandSparkles
		};
		return iconMap[taskType] || ListTodo;
	}



	// 获取队列状态颜色
	function getQueueStatusVariant(
		isProcessing: boolean,
		hasItems: boolean
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (isProcessing) return 'destructive';
		if (hasItems) return 'secondary';
		return 'outline';
	}

	// 获取队列状态文本
	function getQueueStatusText(isProcessing: boolean, hasItems: boolean): string {
		if (isProcessing) return '处理中';
		if (hasItems) return '等待中';
		return '空闲';
	}


	onMount(() => {
		queue.fetch().finally(() => {
			queue.loading = false;
		});
		queue.startStream();
	});

	onDestroy(() => {
		queue.stopStream();
	});
</script>

<div class="container mx-auto px-4">
	<div class="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<p class="text-muted-foreground mt-2">查看和管理系统任务队列状态</p>
		<Button variant="outline" size="sm" onclick={() => queue.refresh()} disabled={queue.loading}>
			<RefreshCw class="mr-2 h-4 w-4 {queue.loading ? 'animate-spin' : ''}" />
			刷新
		</Button>
	</div>

	{#if queue.error}
		<Card class="border-destructive">
			<CardContent class="pt-6">
				<div class="text-destructive flex items-center gap-3">
					<AlertCircle class="h-5 w-5" />
					<span>{queue.error}</span>
				</div>
			</CardContent>
		</Card>
	{:else if queue.loading && !queue.status}
		<div class="flex justify-center py-8">
			<div class="flex items-center gap-3">
				<RefreshCw class="h-5 w-5 animate-spin" />
				<span>加载队列状态中...</span>
			</div>
		</div>
	{:else if queue.status}
		<!-- 系统状态总览 -->
		<div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
			<Card class="gap-2 py-3">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
					<CardTitle class="text-sm font-medium">扫描状态</CardTitle>
					{#if queue.status.is_scanning}
						<Clock class="h-4 w-4 text-orange-500" />
					{:else}
						<CheckCircle class="h-4 w-4 text-green-500" />
					{/if}
				</CardHeader>
				<CardContent class="px-4 pb-3">
					<div class="text-xl font-bold">
						{queue.status.is_scanning ? '扫描中' : '空闲'}
					</div>
					<p class="text-muted-foreground text-xs">
						{queue.status.is_scanning ? '正在扫描视频源' : '等待下次扫描'}
					</p>
				</CardContent>
			</Card>


			<Card class="gap-2 py-3">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
					<CardTitle class="text-sm font-medium">视频源删除队列</CardTitle>
					<Trash2 class="text-muted-foreground h-4 w-4" />
				</CardHeader>
				<CardContent class="px-4 pb-3">
					<div class="text-xl font-bold">{queue.status.delete_queue.length}</div>
					<div class="mt-1 flex items-center gap-2">
						<Badge
							variant={getQueueStatusVariant(
								queue.status.delete_queue.is_processing,
								queue.status.delete_queue.length > 0
							)}
						>
							{getQueueStatusText(
								queue.status.delete_queue.is_processing,
								queue.status.delete_queue.length > 0
							)}
						</Badge>
					</div>
				</CardContent>
			</Card>

			<Card class="gap-2 py-3">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
					<CardTitle class="text-sm font-medium">视频删除队列</CardTitle>
					<Trash2 class="text-muted-foreground h-4 w-4" />
				</CardHeader>
				<CardContent class="px-4 pb-3">
					<div class="text-xl font-bold">{queue.status.video_delete_queue.length}</div>
					<div class="mt-1 flex items-center gap-2">
						<Badge
							variant={getQueueStatusVariant(
								queue.status.video_delete_queue.is_processing,
								queue.status.video_delete_queue.length > 0
							)}
						>
							{getQueueStatusText(
								queue.status.video_delete_queue.is_processing,
								queue.status.video_delete_queue.length > 0
							)}
						</Badge>
					</div>
				</CardContent>
			</Card>

			<Card class="gap-2 py-3">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
					<CardTitle class="text-sm font-medium">添加队列</CardTitle>
					<Plus class="text-muted-foreground h-4 w-4" />
				</CardHeader>
				<CardContent class="px-4 pb-3">
					<div class="text-xl font-bold">{queue.status.add_queue.length}</div>
					<div class="mt-1 flex items-center gap-2">
						<Badge
							variant={getQueueStatusVariant(
								queue.status.add_queue.is_processing,
								queue.status.add_queue.length > 0
							)}
						>
							{getQueueStatusText(
								queue.status.add_queue.is_processing,
								queue.status.add_queue.length > 0
							)}
						</Badge>
					</div>
				</CardContent>
			</Card>

			<Card class="gap-2 py-3">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
					<CardTitle class="text-sm font-medium">配置队列</CardTitle>
					<Settings class="text-muted-foreground h-4 w-4" />
				</CardHeader>
				<CardContent class="px-4 pb-3">
					<div class="text-xl font-bold">
						{queue.status.config_queue.update_length + queue.status.config_queue.reload_length}
					</div>
					<div class="mt-1 flex items-center gap-2">
						<Badge
							variant={getQueueStatusVariant(
								queue.status.config_queue.is_processing,
								queue.status.config_queue.update_length + queue.status.config_queue.reload_length > 0
							)}
						>
							{getQueueStatusText(
								queue.status.config_queue.is_processing,
								queue.status.config_queue.update_length + queue.status.config_queue.reload_length > 0
							)}
						</Badge>
					</div>
				</CardContent>
			</Card>

			<Card class="gap-2 py-3">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
					<CardTitle class="text-sm font-medium">弹幕刷新队列</CardTitle>
					<RefreshCw class="text-muted-foreground h-4 w-4" />
				</CardHeader>
				<CardContent class="px-4 pb-3">
					<div class="text-xl font-bold">{queue.status.danmaku_queue.length}</div>
					<div class="mt-1 flex items-center gap-2">
						<Badge
							variant={getQueueStatusVariant(
								queue.status.danmaku_queue.is_processing,
								queue.status.danmaku_queue.length > 0
							)}
						>
							{getQueueStatusText(
								queue.status.danmaku_queue.is_processing,
								queue.status.danmaku_queue.length > 0
							)}
						</Badge>
					</div>
				</CardContent>
			</Card>

			<Card class="gap-2 py-3">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
					<CardTitle class="text-sm font-medium">AI 重命名队列</CardTitle>
					<WandSparkles class="text-muted-foreground h-4 w-4" />
				</CardHeader>
				<CardContent class="px-4 pb-3">
					<div class="text-xl font-bold">{queue.status.ai_rename_queue.length}</div>
					<div class="mt-1 flex items-center gap-2">
						<Badge
							variant={getQueueStatusVariant(
								queue.status.ai_rename_queue.is_processing,
								queue.status.ai_rename_queue.length > 0
							)}
						>
							{getQueueStatusText(
								queue.status.ai_rename_queue.is_processing,
								queue.status.ai_rename_queue.length > 0
							)}
						</Badge>
					</div>
				</CardContent>
			</Card>
		</div>


		<!-- 队列详情 -->
		<div class="grid gap-6 lg:grid-cols-3">
			<div class="space-y-6 lg:col-span-2">
				<!-- 视频源删除队列 -->
				<Card class="gap-2 py-3">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
						<CardTitle class="flex items-center gap-2 text-sm font-medium">
							<Trash2 class="h-4 w-4" />
							视频源删除队列
						</CardTitle>
					</CardHeader>
					<CardContent class="px-4 pb-3">
						{#if queue.status.delete_queue.tasks.length === 0}
							<p class="text-muted-foreground py-1 text-sm">队列为空</p>
						{:else}
							<div class="space-y-2">
								{#each queue.status.delete_queue.tasks as task (task.task_id)}
									<div class="bg-muted/50 flex items-center justify-between rounded-lg p-3">
										<div class="flex items-center gap-3">
											<svelte:component
												this={getTaskTypeIcon(task.task_type)}
												class="text-muted-foreground h-4 w-4"
											/>
											<div>
												<p class="text-sm font-medium">{getTaskTypeName(task.task_type)}</p>
												<p class="text-muted-foreground text-xs">ID: {task.task_id}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<p class="text-muted-foreground text-xs">{formatTime(task.created_at)}</p>
											<Button
												variant="outline"
												size="sm"
												class="h-7 px-2 text-xs"
												data-glossary-term="取消任务"
												disabled={queue.isCancelling(task.task_id)}
												onclick={() => queue.cancelTask(task.task_id)}
											>
												<X class="mr-1 h-3.5 w-3.5" />
												{queue.isCancelling(task.task_id) ? '取消中' : '取消'}
											</Button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- 视频删除队列 -->
				<Card class="gap-2 py-3">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
						<CardTitle class="flex items-center gap-2 text-sm font-medium">
							<Trash2 class="h-4 w-4" />
							视频删除队列
						</CardTitle>
					</CardHeader>
					<CardContent class="px-4 pb-3">
						{#if queue.status.video_delete_queue.tasks.length === 0}
							<p class="text-muted-foreground py-1 text-sm">队列为空</p>
						{:else}
							<div class="space-y-2">
								{#each queue.status.video_delete_queue.tasks as task (task.task_id)}
									<div class="bg-muted/50 flex items-center justify-between rounded-lg p-3">
										<div class="flex items-center gap-3">
											<svelte:component
												this={getTaskTypeIcon(task.task_type)}
												class="text-muted-foreground h-4 w-4"
											/>
											<div>
												<p class="text-sm font-medium">{getTaskTypeName(task.task_type)}</p>
												<p class="text-muted-foreground text-xs">ID: {task.task_id}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<p class="text-muted-foreground text-xs">{formatTime(task.created_at)}</p>
											<Button
												variant="outline"
												size="sm"
												class="h-7 px-2 text-xs"
												data-glossary-term="取消任务"
												disabled={queue.isCancelling(task.task_id)}
												onclick={() => queue.cancelTask(task.task_id)}
											>
												<X class="mr-1 h-3.5 w-3.5" />
												{queue.isCancelling(task.task_id) ? '取消中' : '取消'}
											</Button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- 添加队列 -->
				<Card class="gap-2 py-3">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
						<CardTitle class="flex items-center gap-2 text-sm font-medium">
							<Plus class="h-4 w-4" />
							添加队列
						</CardTitle>
					</CardHeader>
					<CardContent class="px-4 pb-3">
						{#if queue.status.add_queue.tasks.length === 0}
							<p class="text-muted-foreground py-1 text-sm">队列为空</p>
						{:else}
							<div class="space-y-2">
								{#each queue.status.add_queue.tasks as task (task.task_id)}
									<div class="bg-muted/50 flex items-center justify-between rounded-lg p-3">
										<div class="flex items-center gap-3">
											<svelte:component
												this={getTaskTypeIcon(task.task_type)}
												class="text-muted-foreground h-4 w-4"
											/>
											<div>
												<p class="text-sm font-medium">{getTaskTypeName(task.task_type)}</p>
												<p class="text-muted-foreground text-xs">ID: {task.task_id}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<p class="text-muted-foreground text-xs">{formatTime(task.created_at)}</p>
											<Button
												variant="outline"
												size="sm"
												class="h-7 px-2 text-xs"
												data-glossary-term="取消任务"
												disabled={queue.isCancelling(task.task_id)}
												onclick={() => queue.cancelTask(task.task_id)}
											>
												<X class="mr-1 h-3.5 w-3.5" />
												{queue.isCancelling(task.task_id) ? '取消中' : '取消'}
											</Button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>

				<Card class="gap-2 py-3">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
						<CardTitle class="flex items-center gap-2 text-sm font-medium">
							<RefreshCw class="h-4 w-4" />
							弹幕刷新队列
						</CardTitle>
					</CardHeader>
					<CardContent class="px-4 pb-3">
						{#if queue.status.danmaku_queue.tasks.length === 0}
							<p class="text-muted-foreground py-1 text-sm">队列为空</p>
						{:else}
							<div class="space-y-2">
								{#each queue.status.danmaku_queue.tasks as task (task.task_id)}
									<div class="bg-muted/50 flex items-center justify-between rounded-lg p-3">
										<div class="flex items-center gap-3">
											<svelte:component
												this={getTaskTypeIcon(task.task_type)}
												class="text-muted-foreground h-4 w-4"
											/>
											<div>
												<p class="text-sm font-medium">{getTaskTypeName(task.task_type)}</p>
												<p class="text-muted-foreground text-xs">ID: {task.task_id}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<p class="text-muted-foreground text-xs">{formatTime(task.created_at)}</p>
											<Button
												variant="outline"
												size="sm"
												class="h-7 px-2 text-xs"
												data-glossary-term="取消任务"
												disabled={queue.isCancelling(task.task_id)}
												onclick={() => queue.cancelTask(task.task_id)}
											>
												<X class="mr-1 h-3.5 w-3.5" />
												{queue.isCancelling(task.task_id) ? '取消中' : '取消'}
											</Button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- AI 重命名队列 -->
				<Card class="gap-2 py-3">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
						<CardTitle class="flex items-center gap-2 text-sm font-medium">
							<WandSparkles class="h-4 w-4" />
							AI 重命名队列
						</CardTitle>
					</CardHeader>
					<CardContent class="px-4 pb-3">
						{#if queue.status.ai_rename_queue.tasks.length === 0}
							<p class="text-muted-foreground py-1 text-sm">队列为空</p>
						{:else}
							<div class="space-y-2">
								{#each queue.status.ai_rename_queue.tasks as task (task.task_id)}
									<div class="bg-muted/50 flex items-center justify-between rounded-lg p-3">
										<div class="flex items-center gap-3">
											<svelte:component
												this={getTaskTypeIcon(task.task_type)}
												class="text-muted-foreground h-4 w-4"
											/>
											<div>
												<p class="text-sm font-medium">
													{task.description || getTaskTypeName(task.task_type)}
												</p>
												<p class="text-muted-foreground text-xs">ID: {task.task_id}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<p class="text-muted-foreground text-xs">{formatTime(task.created_at)}</p>
											<Button
												variant="outline"
												size="sm"
												class="h-7 px-2 text-xs"
												data-glossary-term="取消任务"
												disabled={queue.isCancelling(task.task_id)}
												onclick={() => queue.cancelTask(task.task_id)}
											>
												<X class="mr-1 h-3.5 w-3.5" />
												{queue.isCancelling(task.task_id) ? '取消中' : '取消'}
											</Button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- 配置队列 -->
				<Card class="gap-2 py-3">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2">
						<CardTitle class="flex items-center gap-2 text-sm font-medium">
							<Settings class="h-4 w-4" />
							配置队列
						</CardTitle>
					</CardHeader>
					<CardContent class="px-4 pb-3">
						{#if queue.status.config_queue.update_tasks.length === 0 && queue.status.config_queue.reload_tasks.length === 0}
							<p class="text-muted-foreground py-1 text-sm">队列为空</p>
						{:else}
							<div class="grid gap-3 md:grid-cols-2">
								<!-- 更新配置任务 -->
								<div>
									<h4 class="mb-3 text-sm font-medium">
										更新配置任务 ({queue.status.config_queue.update_length})
									</h4>
									{#if queue.status.config_queue.update_tasks.length === 0}
										<p class="text-muted-foreground text-sm">暂无任务</p>
									{:else}
										<div class="space-y-2">
											{#each queue.status.config_queue.update_tasks as task (task.task_id)}
												<div class="bg-muted/50 flex items-center justify-between rounded-lg p-3">
													<div class="flex items-center gap-3">
														<svelte:component
															this={getTaskTypeIcon(task.task_type)}
															class="text-muted-foreground h-4 w-4"
														/>
														<div>
															<p class="text-sm font-medium">{getTaskTypeName(task.task_type)}</p>
															<p class="text-muted-foreground text-xs">ID: {task.task_id}</p>
														</div>
													</div>
													<div class="flex items-center gap-2">
														<p class="text-muted-foreground text-xs">
															{formatTime(task.created_at)}
														</p>
														<Button
															variant="outline"
															size="sm"
															class="h-7 px-2 text-xs"
															data-glossary-term="取消任务"
															disabled={queue.isCancelling(task.task_id)}
															onclick={() => queue.cancelTask(task.task_id)}
														>
															<X class="mr-1 h-3.5 w-3.5" />
															{queue.isCancelling(task.task_id) ? '取消中' : '取消'}
														</Button>
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>

								<!-- 重载配置任务 -->
								<div>
									<h4 class="mb-3 text-sm font-medium">
										重载配置任务 ({queue.status.config_queue.reload_length})
									</h4>
									{#if queue.status.config_queue.reload_tasks.length === 0}
										<p class="text-muted-foreground text-sm">暂无任务</p>
									{:else}
										<div class="space-y-2">
											{#each queue.status.config_queue.reload_tasks as task (task.task_id)}
												<div class="bg-muted/50 flex items-center justify-between rounded-lg p-3">
													<div class="flex items-center gap-3">
														<svelte:component
															this={getTaskTypeIcon(task.task_type)}
															class="text-muted-foreground h-4 w-4"
														/>
														<div>
															<p class="text-sm font-medium">{getTaskTypeName(task.task_type)}</p>
															<p class="text-muted-foreground text-xs">ID: {task.task_id}</p>
														</div>
													</div>
													<div class="flex items-center gap-2">
														<p class="text-muted-foreground text-xs">
															{formatTime(task.created_at)}
														</p>
														<Button
															variant="outline"
															size="sm"
															class="h-7 px-2 text-xs"
															data-glossary-term="取消任务"
															disabled={queue.isCancelling(task.task_id)}
															onclick={() => queue.cancelTask(task.task_id)}
														>
															<X class="mr-1 h-3.5 w-3.5" />
															{queue.isCancelling(task.task_id) ? '取消中' : '取消'}
														</Button>
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>

			<!-- 右侧说明面板 -->
			<QueueHelpPanel />
		</div>

		<!-- 简化版说明信息 -->
		<Card class="mt-6">
			<CardHeader>
				<CardTitle class="text-lg">快速参考</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<h4 class="mb-2 font-medium">常见任务类型</h4>
						<ul class="text-muted-foreground space-y-1 text-sm">
							<li>• <strong>delete_video_source:</strong> 删除视频源</li>
							<li>• <strong>add_video_source:</strong> 添加视频源</li>
							<li>• <strong>update_config:</strong> 更新系统配置</li>
							<li>• <strong>reload_config:</strong> 重载配置文件</li>
							<li>• <strong>ai_rename_history:</strong> AI 批量重命名</li>
						</ul>
					</div>
					<div>
						<h4 class="mb-2 font-medium">性能提示</h4>
						<ul class="text-muted-foreground space-y-1 text-sm">
							<li>• 批量操作会自动合并到队列中</li>
							<li>• 避免在扫描期间进行大量操作</li>
							<li>• 队列处理期间系统性能可能下降</li>
							<li>• 建议在空闲时间进行配置更改</li>
						</ul>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
