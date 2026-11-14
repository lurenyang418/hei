<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';

	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;

	export let parallelDownloadEnabled = false;
	export let parallelDownloadThreads = 4;
	export let parallelDownloadUseAria2 = false;
	export let concurrentVideo = 3;
	export let concurrentPage = 2;
	export let rateLimit = 4;
	export let rateDuration = 250;

	export let effectiveMaxFileConnections = 4;
	export let effectiveConcurrentVideo = 3;
	export let effectiveConcurrentPage = 2;
	export let estimatedMaxConnections = 24;

	export let saving = false;
	export let onSave: () => void = () => {};
</script>

<!-- 下载设置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="下载设置"
	description="并行下载、并发控制、速率限制配置"
	titleTooltip="控制下载并发、速率限制、任务执行方式和下载器行为。"
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			onSave();
		}}
		class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}"
	>
		<div class="flex-1 space-y-4 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			<div class="mt-2 space-y-4">
				<h3 class="text-base font-semibold">下载配置</h3>

				<div class="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-4">
					<div class="flex items-center space-x-2 md:pb-2">
						<input
							type="checkbox"
							id="parallel-download"
							bind:checked={parallelDownloadEnabled}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label
							for="parallel-download"
							class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							启用多线程下载
						</Label>
					</div>

					{#if parallelDownloadEnabled}
						<div class="space-y-2">
							<Label for="threads">下载线程数</Label>
							<Input
								id="threads"
								type="number"
								bind:value={parallelDownloadThreads}
								min="1"
								max="32"
								placeholder="4"
							/>
						</div>

						<div class="flex items-center space-x-2 md:pb-2">
							<input
								type="checkbox"
								id="use-aria2"
								bind:checked={parallelDownloadUseAria2}
								class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
							/>
							<Label for="use-aria2" class="text-sm leading-none font-medium">优先使用aria2</Label>
						</div>
					{/if}
				</div>

				{#if parallelDownloadEnabled}
					<p class="text-muted-foreground text-xs">
						关闭后将使用原生分片多线程下载（不依赖aria2 RPC）。
					</p>
				{/if}
			</div>

			<div class="mt-2 space-y-4">
				<h3 class="text-base font-semibold">并发控制</h3>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
					<div class="space-y-2">
						<Label for="concurrent-video">同时处理视频数</Label>
						<Input
							id="concurrent-video"
							type="number"
							bind:value={concurrentVideo}
							min="1"
							max="10"
							placeholder="3"
						/>
					</div>

					<div class="space-y-2">
						<Label for="concurrent-page">每个视频并发分页数</Label>
						<Input
							id="concurrent-page"
							type="number"
							bind:value={concurrentPage}
							min="1"
							max="10"
							placeholder="2"
						/>
					</div>

					<div class="space-y-2">
						<Label for="rate-limit">请求频率限制</Label>
						<Input
							id="rate-limit"
							type="number"
							bind:value={rateLimit}
							min="1"
							max="100"
							placeholder="4"
						/>
						<p class="text-muted-foreground text-sm">每个时间窗口内的最大请求数</p>
					</div>

					<div class="space-y-2">
						<Label for="rate-duration">时间窗口（毫秒）</Label>
						<Input
							id="rate-duration"
							type="number"
							bind:value={rateDuration}
							min="100"
							max="5000"
							placeholder="250"
						/>
						<p class="text-muted-foreground text-sm">请求频率限制的时间窗口</p>
					</div>
				</div>

				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-200"
				>
					<p class="font-medium">
						预估最大连接数：{estimatedMaxConnections}（单文件最多 {effectiveMaxFileConnections} 条 ×
						同时处理视频数 {effectiveConcurrentVideo} × 每视频并发分页数 {effectiveConcurrentPage}）
					</p>
					<p class="mt-1 opacity-80">
						这是理论峰值，实际连接数受网络带宽和源站限制，通常达不到这个数字。
					</p>
				</div>
			</div>

			<div
				class="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/20"
			>
				<h5 class="mb-2 font-medium text-purple-800 dark:text-purple-200">并发控制说明</h5>
				<div class="space-y-1 text-sm text-purple-700 dark:text-purple-300">
					<p><strong>视频并发数：</strong>同时处理的视频数量（建议1-5）</p>
					<p><strong>分页并发数：</strong>每个视频内的并发分页数（建议1-3）</p>
					<p>
						<strong>请求频率限制：</strong>防止API请求过频繁导致风控，调小limit可减少被限制
					</p>
					<p><strong>总并行度：</strong>约等于 视频并发数 × 分页并发数</p>
				</div>
			</div>
		</div>
		<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
			<Button type="submit" disabled={saving} class="w-full">
				{saving ? '保存中...' : '保存设置'}
			</Button>
		</SheetFooter>
	</form>
</ResponsiveSheet>
