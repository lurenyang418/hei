<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		AlertCircle,
		Clock,
		ListTodo,
		Plus,
		RefreshCw,
		Settings,
		Trash2,
		WandSparkles
	} from '@lucide/svelte';
</script>

<!-- 右侧说明面板 -->
<div class="space-y-6">
	<!-- 任务队列说明 -->
	<Card class="sticky top-6">
		<CardHeader>
			<CardTitle class="text-lg">📋 任务队列说明</CardTitle>
			<CardDescription>了解任务队列的工作原理和状态含义</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			<!-- 队列类型说明 -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 font-medium">
					<ListTodo class="h-4 w-4" />
					队列类型
				</h4>
				<div class="space-y-3 text-sm">
					<div class="flex items-start gap-3 rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
						<Trash2 class="mt-0.5 h-4 w-4 text-red-600" />
						<div>
							<p class="font-medium text-red-900 dark:text-red-100">视频源删除队列</p>
							<p class="text-xs text-red-700 dark:text-red-300">
								处理视频源删除操作，确保数据一致性
							</p>
						</div>
					</div>
					<div class="flex items-start gap-3 rounded-lg bg-rose-50 p-3 dark:bg-rose-950/20">
						<Trash2 class="mt-0.5 h-4 w-4 text-rose-600" />
						<div>
							<p class="font-medium text-rose-900 dark:text-rose-100">视频删除队列</p>
							<p class="text-xs text-rose-700 dark:text-rose-300">
								处理扫描中或冲突状态下的视频删除请求
							</p>
						</div>
					</div>
					<div class="flex items-start gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
						<Plus class="mt-0.5 h-4 w-4 text-green-600" />
						<div>
							<p class="font-medium text-green-900 dark:text-green-100">添加队列</p>
							<p class="text-xs text-green-700 dark:text-green-300">
								处理新视频源的添加和初始化
							</p>
						</div>
					</div>
					<div class="flex items-start gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
						<Settings class="mt-0.5 h-4 w-4 text-blue-600" />
						<div>
							<p class="font-medium text-blue-900 dark:text-blue-100">配置队列</p>
							<p class="text-xs text-blue-700 dark:text-blue-300">处理系统配置的更新和重载</p>
						</div>
					</div>
				</div>
			</div>

			<div class="flex items-start gap-3 rounded-lg bg-violet-50 p-3 dark:bg-violet-950/20">
				<WandSparkles class="mt-0.5 h-4 w-4 text-violet-600" />
				<div>
					<p class="font-medium text-violet-900 dark:text-violet-100">AI 重命名队列</p>
					<p class="text-xs text-violet-700 dark:text-violet-300">
						处理视频源的 AI 批量重命名历史文件任务
					</p>
				</div>
			</div>

			<!-- 状态说明 -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 font-medium">
					<Clock class="h-4 w-4" />
					状态说明
				</h4>
				<div class="space-y-2 text-sm">
					<div class="flex items-center gap-3">
						<Badge variant="outline" class="w-16 justify-center">空闲</Badge>
						<span class="text-muted-foreground">队列为空，没有待处理任务</span>
					</div>
					<div class="flex items-center gap-3">
						<Badge variant="secondary" class="w-16 justify-center">等待中</Badge>
						<span class="text-muted-foreground">有任务排队，等待处理</span>
					</div>
					<div class="flex items-center gap-3">
						<Badge variant="destructive" class="w-16 justify-center">处理中</Badge>
						<span class="text-muted-foreground">正在执行队列中的任务</span>
					</div>
				</div>
			</div>

			<!-- 处理机制 -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 font-medium">
					<RefreshCw class="h-4 w-4" />
					处理机制
				</h4>
				<div class="text-muted-foreground space-y-2 text-sm">
					<div class="flex items-start gap-2">
						<span class="font-mono text-blue-600">1.</span>
						<span>扫描期间的所有操作会自动进入对应队列</span>
					</div>
					<div class="flex items-start gap-2">
						<span class="font-mono text-blue-600">2.</span>
						<span>扫描完成后按优先级处理：配置 → 删除 → 添加</span>
					</div>
					<div class="flex items-start gap-2">
						<span class="font-mono text-blue-600">3.</span>
						<span>同类型任务按时间顺序依次执行</span>
					</div>
					<div class="flex items-start gap-2">
						<span class="font-mono text-blue-600">4.</span>
						<span>页面每5秒自动刷新状态</span>
					</div>
				</div>
			</div>

			<!-- 注意事项 -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 font-medium">
					<AlertCircle class="h-4 w-4" />
					注意事项
				</h4>
				<div
					class="text-muted-foreground space-y-2 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/20"
				>
					<p>• 扫描进行时，手动操作会进入队列等待</p>
					<p>• 队列处理期间请避免频繁操作</p>
					<p>• 配置更改会影响所有后续任务执行</p>
					<p>• 删除操作不可逆，请谨慎操作</p>
				</div>
			</div>
		</CardContent>
	</Card>
</div>
