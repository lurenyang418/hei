<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';

	import type { MainConfigStore } from '$lib/stores/settings/config.svelte';

	export let store: MainConfigStore;
	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;
</script>

<!-- Aria2监控设置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="Aria2监控设置"
	description="下载器健康检查和自动重启配置"
	titleTooltip="配置外部 Aria2 的健康检查、自动重启和监控策略。"
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			store.save();
		}}
		class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}"
	>
		<div class="min-h-0 flex-1 space-y-6 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			<!-- Aria2监控配置 -->
			<div
				class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-blue-800 dark:text-blue-200">🔍 健康检查配置</h3>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="enable-aria2-health-check"
							bind:checked={store.enableAria2HealthCheck}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="enable-aria2-health-check" class="text-sm">启用Aria2健康检查</Label>
						<p class="text-muted-foreground ml-2 text-xs">定期检查下载器进程状态和RPC连接</p>
					</div>

					{#if store.enableAria2HealthCheck}
						<div class="ml-6 space-y-4">
							<div class="space-y-2">
								<Label for="aria2-health-check-interval">健康检查间隔（秒）</Label>
								<Input
									id="aria2-health-check-interval"
									type="number"
									bind:value={store.aria2HealthCheckInterval}
									min="30"
									max="600"
									placeholder="300"
								/>
								<p class="text-muted-foreground text-xs">
									检查频率，范围：30-600秒，推荐：300秒（5分钟）
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- 自动重启配置 -->
			<div
				class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-green-800 dark:text-green-200">🔄 自动重启配置</h3>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="enable-aria2-auto-restart"
							bind:checked={store.enableAria2AutoRestart}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="enable-aria2-auto-restart" class="text-sm">启用自动重启</Label>
						<p class="text-muted-foreground ml-2 text-xs">检测到下载器异常时自动重启实例</p>
					</div>

					{#if !store.enableAria2AutoRestart}
						<div
							class="ml-6 rounded border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/20"
						>
							<p class="text-sm text-orange-700 dark:text-orange-300">
								<strong>注意：</strong
								>禁用自动重启后，检测到下载器异常时只会记录日志，不会自动恢复。
								如果下载器进程意外退出，需要手动重启应用程序。
							</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- 配置说明 -->
			<div
				class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-amber-800 dark:text-amber-200">⚠️ 重要说明</h3>
				<div class="space-y-2 text-sm text-amber-700 dark:text-amber-300">
					<p>
						<strong>为什么要禁用监控？</strong>
						原有的Aria2监控机制可能会误判下载器状态，导致不必要的重启，反而中断正在进行的下载任务。
					</p>
					<p>
						<strong>推荐配置：</strong>
					</p>
					<ul class="ml-4 list-disc space-y-1">
						<li><strong>稳定环境</strong>：建议禁用健康检查和自动重启</li>
						<li>
							<strong>不稳定环境</strong>：可启用健康检查，将间隔设为较长时间（5-10分钟）
						</li>
						<li><strong>测试环境</strong>：可启用全部功能进行调试</li>
					</ul>
					<p>
						<strong>注意事项：</strong> 修改这些设置需要重启应用程序才能生效。
					</p>
				</div>
			</div>

			<!-- 故障排除指南 -->
			<div
				class="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-purple-800 dark:text-purple-200">🔧 故障排除</h3>
				<div class="space-y-2 text-sm text-purple-700 dark:text-purple-300">
					<p><strong>常见问题及解决方案：</strong></p>
					<ul class="ml-4 list-disc space-y-1">
						<li>
							<strong>下载频繁中断：</strong> 禁用健康检查，或增加检查间隔到600秒
						</li>
						<li>
							<strong>下载器启动失败：</strong> 检查系统防火墙和端口占用，禁用自动重启
						</li>
						<li>
							<strong>系统资源占用高：</strong> 增加健康检查间隔，减少监控频率
						</li>
						<li>
							<strong>下载任务丢失：</strong> 禁用自动重启，避免任务队列被重置
						</li>
					</ul>
				</div>
			</div>
		</div>
		<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
			<Button type="submit" disabled={store.saving} class="w-full">
				{store.saving ? '保存中...' : '保存设置'}
			</Button>
		</SheetFooter>
	</form>
</ResponsiveSheet>
