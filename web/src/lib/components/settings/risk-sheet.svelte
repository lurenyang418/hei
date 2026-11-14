<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';

	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;

	export let largeSubmissionThreshold = 100;
	export let baseRequestDelay = 200;
	export let largeSubmissionDelayMultiplier = 2;
	export let maxDelayMultiplier = 4;
	export let enableProgressiveDelay = false;
	export let dynamicApiDelayMultiplier = 1.5;
	export let enableDynamicApiDelay = false;
	export let enableIncrementalFetch = false;
	export let incrementalFallbackToFull = false;
	export let enableBatchProcessing = false;
	export let batchSize = 5;
	export let batchDelaySeconds = 2;
	export let enableAutoBackoff = false;
	export let autoBackoffBaseSeconds = 10;
	export let autoBackoffMaxMultiplier = 5;
	export let sourceDelaySeconds = 2;
	export let submissionSourceDelaySeconds = 5;
	export let enableLargeSourceDownloadLimit = false;
	export let largeSourceDownloadThreshold = 1000;
	export let largeSourceDownloadPageThreshold = 1000;
	export let largeSourceMaxVideosPerRound = 0;
	export let largeSourceMaxPagesPerRound = 2000;
	export let largeSourceConcurrentVideo = 1;
	export let largeSourceConcurrentPage = 1;
	export let largeSourcePlayurlLimit = 1;
	export let largeSourcePlayurlDurationMs = 1000;
	export let audioOnlyUseLowQnForPlayurl = false;

	export let saving = false;
	export let onSave: () => void = () => {};
</script>

<!-- 风控配置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="风控配置"
	description="UP主投稿获取风控策略，用于优化大量视频UP主的获取"
	titleTooltip="调整投稿源扫描时的风控规避策略、批量设置和延迟参数。"
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			onSave();
		}}
		class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}"
	>
		<div class="min-h-0 flex-1 space-y-6 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			<!-- 基础优化配置 -->
			<div
				class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-blue-800 dark:text-blue-200">🎯 基础优化配置</h3>
				<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
					<div class="space-y-2">
						<Label for="large-submission-threshold">大量视频UP主阈值</Label>
						<Input
							id="large-submission-threshold"
							type="number"
							bind:value={largeSubmissionThreshold}
							min="10"
							max="1000"
							placeholder="100"
						/>
						<p class="text-muted-foreground text-xs">超过此视频数量的UP主将启用风控策略</p>
					</div>

					<div class="space-y-2">
						<Label for="base-request-delay">基础请求间隔（毫秒）</Label>
						<Input
							id="base-request-delay"
							type="number"
							bind:value={baseRequestDelay}
							min="50"
							max="2000"
							placeholder="200"
						/>
						<p class="text-muted-foreground text-xs">每个请求之间的基础延迟时间</p>
					</div>

					<div class="space-y-2">
						<Label for="large-submission-delay-multiplier">大量视频延迟倍数</Label>
						<Input
							id="large-submission-delay-multiplier"
							type="number"
							bind:value={largeSubmissionDelayMultiplier}
							min="1"
							max="10"
							step="0.5"
							placeholder="2"
						/>
						<p class="text-muted-foreground text-xs">大量视频UP主的延迟倍数</p>
					</div>

					<div class="space-y-2">
						<Label for="max-delay-multiplier">最大延迟倍数</Label>
						<Input
							id="max-delay-multiplier"
							type="number"
							bind:value={maxDelayMultiplier}
							min="1"
							max="20"
							step="0.5"
							placeholder="4"
						/>
						<p class="text-muted-foreground text-xs">渐进式延迟的最大倍数限制</p>
					</div>
				</div>

				<div class="mt-4 flex items-center space-x-2">
					<input
						type="checkbox"
						id="enable-progressive-delay"
						bind:checked={enableProgressiveDelay}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label for="enable-progressive-delay" class="text-sm">启用渐进式延迟</Label>
					<p class="text-muted-foreground ml-2 text-xs">随着请求次数增加逐步延长延迟时间</p>
				</div>

				<div class="mt-4 space-y-4 border-t border-blue-200 pt-4 dark:border-blue-800">
					<h4 class="text-sm font-medium text-blue-700 dark:text-blue-300">动态API配置</h4>
					<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
						<div class="space-y-2">
							<Label for="dynamic-api-delay-multiplier">动态API延迟倍数</Label>
							<Input
								id="dynamic-api-delay-multiplier"
								type="number"
								bind:value={dynamicApiDelayMultiplier}
								min="0.1"
								max="10"
								step="0.1"
								placeholder="1.5"
							/>
							<p class="text-muted-foreground text-xs">相对于基础请求间隔的倍率（推荐 1.2~2.0）</p>
						</div>

						<div class="flex items-center space-x-2">
							<input
								type="checkbox"
								id="enable-dynamic-api-delay"
								bind:checked={enableDynamicApiDelay}
								class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
							/>
							<Label for="enable-dynamic-api-delay" class="text-sm">启用动态API延迟</Label>
						</div>
					</div>
					<div class="rounded-md bg-yellow-50 p-3 dark:bg-yellow-950/20">
						<p class="text-xs text-yellow-800 dark:text-yellow-200">
							动态API每次最多返回 12
							条记录。首次全量扫描请求次数多，建议保持启用延迟，后续增量扫描耗时较小。
						</p>
					</div>
				</div>
			</div>

			<!-- 增量获取配置 -->
			<div
				class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-green-800 dark:text-green-200">📈 增量获取配置</h3>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="enable-incremental-fetch"
							bind:checked={enableIncrementalFetch}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="enable-incremental-fetch" class="text-sm">启用增量获取</Label>
						<p class="text-muted-foreground ml-2 text-xs">优先获取最新视频，减少不必要的请求</p>
					</div>

					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="incremental-fallback-to-full"
							bind:checked={incrementalFallbackToFull}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="incremental-fallback-to-full" class="text-sm"
							>增量获取失败时回退到全量获取</Label
						>
						<p class="text-muted-foreground ml-2 text-xs">确保数据完整性</p>
					</div>
				</div>
			</div>

			<!-- 分批处理配置 -->
			<div
				class="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-purple-800 dark:text-purple-200">
					📦 分批处理配置
				</h3>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="enable-batch-processing"
							bind:checked={enableBatchProcessing}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="enable-batch-processing" class="text-sm">启用分批处理</Label>
						<p class="text-muted-foreground ml-2 text-xs">将大量请求分批处理，降低服务器压力</p>
					</div>

					{#if enableBatchProcessing}
						<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
							<div class="space-y-2">
								<Label for="batch-size">分批大小（页数）</Label>
								<Input
									id="batch-size"
									type="number"
									bind:value={batchSize}
									min="1"
									max="20"
									placeholder="5"
								/>
								<p class="text-muted-foreground text-xs">每批处理的页数</p>
							</div>

							<div class="space-y-2">
								<Label for="batch-delay-seconds">批次间延迟（秒）</Label>
								<Input
									id="batch-delay-seconds"
									type="number"
									bind:value={batchDelaySeconds}
									min="1"
									max="60"
									placeholder="2"
								/>
								<p class="text-muted-foreground text-xs">每批之间的等待时间</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- 自动退避配置 -->
			<div
				class="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-orange-800 dark:text-orange-200">
					🔄 自动退避配置
				</h3>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="enable-auto-backoff"
							bind:checked={enableAutoBackoff}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="enable-auto-backoff" class="text-sm">启用自动退避</Label>
						<p class="text-muted-foreground ml-2 text-xs">遇到错误时自动增加延迟时间</p>
					</div>

					{#if enableAutoBackoff}
						<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
							<div class="space-y-2">
								<Label for="auto-backoff-base-seconds">自动退避基础时间（秒）</Label>
								<Input
									id="auto-backoff-base-seconds"
									type="number"
									bind:value={autoBackoffBaseSeconds}
									min="1"
									max="300"
									placeholder="10"
								/>
								<p class="text-muted-foreground text-xs">遇到错误时的基础等待时间</p>
							</div>

							<div class="space-y-2">
								<Label for="auto-backoff-max-multiplier">自动退避最大倍数</Label>
								<Input
									id="auto-backoff-max-multiplier"
									type="number"
									bind:value={autoBackoffMaxMultiplier}
									min="1"
									max="20"
									placeholder="5"
								/>
								<p class="text-muted-foreground text-xs">退避时间的最大倍数限制</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- 视频源间延迟配置 -->
			<div
				class="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-indigo-800 dark:text-indigo-200">
					⏱️ 视频源间延迟配置
				</h3>
				<div class="space-y-4">
					<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
						<div class="space-y-2">
							<Label for="source-delay-seconds">通用视频源间延迟（秒）</Label>
							<Input
								id="source-delay-seconds"
								type="number"
								bind:value={sourceDelaySeconds}
								min="0"
								max="60"
								placeholder="2"
							/>
							<p class="text-muted-foreground text-xs">
								每个视频源之间的基础延迟时间（收藏夹、合集等）
							</p>
						</div>

						<div class="space-y-2">
							<Label for="submission-source-delay-seconds">UP主投稿源间延迟（秒）</Label>
							<Input
								id="submission-source-delay-seconds"
								type="number"
								bind:value={submissionSourceDelaySeconds}
								min="0"
								max="60"
								placeholder="5"
							/>
							<p class="text-muted-foreground text-xs">
								UP主投稿之间的特殊延迟时间（建议设置更长）
							</p>
						</div>
					</div>

					<div class="rounded-lg bg-indigo-100 p-3 dark:bg-indigo-900/20">
						<p class="text-sm text-indigo-700 dark:text-indigo-300">
							<strong>说明：</strong
							>在扫描多个视频源时，系统会在每个源之间自动添加延迟，避免连续请求触发风控。
							UP主投稿通常需要更长的延迟，因为其视频数量可能较多。设置为0可禁用延迟。
						</p>
					</div>
				</div>
			</div>

			<!-- 大源下载限制配置 -->
			<div
				class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-red-800 dark:text-red-200">🧯 大源下载限制配置</h3>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="enable-large-source-download-limit"
							bind:checked={enableLargeSourceDownloadLimit}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="enable-large-source-download-limit" class="text-sm">启用大源下载保护</Label>
						<p class="text-muted-foreground ml-2 text-xs">
							针对视频数或分P数较大的投稿源限制下载并发、每轮下载数量和 playurl 请求频率
						</p>
					</div>

					{#if enableLargeSourceDownloadLimit}
						<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
							<div class="space-y-2">
								<Label for="large-source-download-threshold">大源判定阈值（视频数）</Label>
								<Input
									id="large-source-download-threshold"
									type="number"
									bind:value={largeSourceDownloadThreshold}
									min="1"
									max="100000"
									placeholder="1000"
								/>
								<p class="text-muted-foreground text-xs">源内视频数超过该值时启用下载阶段保护</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-download-page-threshold">大源判定阈值（分P数）</Label>
								<Input
									id="large-source-download-page-threshold"
									type="number"
									bind:value={largeSourceDownloadPageThreshold}
									min="0"
									max="100000"
									placeholder="1000"
								/>
								<p class="text-muted-foreground text-xs">
									源内已识别分P数或本轮待处理分P数超过该值时启用下载阶段保护；0 表示关闭分P阈值判定
								</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-max-videos-per-round">每轮最多下载视频数</Label>
								<Input
									id="large-source-max-videos-per-round"
									type="number"
									bind:value={largeSourceMaxVideosPerRound}
									min="0"
									max="10000"
									placeholder="0"
								/>
								<p class="text-muted-foreground text-xs">0 表示不限制；未下载的视频下轮继续处理</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-max-pages-per-round">每轮最多下载分页数</Label>
								<Input
									id="large-source-max-pages-per-round"
									type="number"
									bind:value={largeSourceMaxPagesPerRound}
									min="0"
									max="100000"
									placeholder="2000"
								/>
								<p class="text-muted-foreground text-xs">按整视频截断，避免半个多P视频被误标完成</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-concurrent-video">下载视频并发</Label>
								<Input
									id="large-source-concurrent-video"
									type="number"
									bind:value={largeSourceConcurrentVideo}
									min="1"
									max="32"
									placeholder="1"
								/>
								<p class="text-muted-foreground text-xs">
									大源下载阶段建议保持 1，降低连续取流压力
								</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-concurrent-page">单视频分页并发</Label>
								<Input
									id="large-source-concurrent-page"
									type="number"
									bind:value={largeSourceConcurrentPage}
									min="1"
									max="32"
									placeholder="1"
								/>
								<p class="text-muted-foreground text-xs">控制同一视频多P分页并发下载数量</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-playurl-limit">playurl 请求数</Label>
								<Input
									id="large-source-playurl-limit"
									type="number"
									bind:value={largeSourcePlayurlLimit}
									min="1"
									max="100"
									placeholder="1"
								/>
								<p class="text-muted-foreground text-xs">每个限制窗口内允许的取流请求数</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-playurl-duration-ms">playurl 限制窗口（毫秒）</Label>
								<Input
									id="large-source-playurl-duration-ms"
									type="number"
									bind:value={largeSourcePlayurlDurationMs}
									min="1"
									max="60000"
									placeholder="1000"
								/>
								<p class="text-muted-foreground text-xs">默认 1000 毫秒，即每秒最多 1 次取流请求</p>
							</div>

							<div class="flex items-center space-x-2">
								<input
									type="checkbox"
									id="audio-only-use-low-qn-for-playurl"
									bind:checked={audioOnlyUseLowQnForPlayurl}
									class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
								/>
								<Label for="audio-only-use-low-qn-for-playurl" class="text-sm"
									>仅音频下载使用低清晰度取流</Label
								>
							</div>
						</div>

						<div class="rounded-lg bg-red-100 p-3 dark:bg-red-900/20">
							<p class="text-sm text-red-700 dark:text-red-300">
								<strong>说明：</strong
								>大源保护只限制下载阶段；视频数或分P数超过阈值都会触发。已下载成功的视频会正常更新状态，未进入本轮预算的视频不会误写断点，下次扫描会继续从未完成部分处理。
								默认 playurl 限速为 1 次/秒。
							</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- 使用建议 -->
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
			>
				<h3 class="mb-3 text-sm font-medium text-gray-800 dark:text-gray-200">💡 使用建议</h3>
				<div class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
					<p><strong>小型UP主（&lt;100视频）：</strong> 使用默认设置即可</p>
					<p><strong>中型UP主（100-500视频）：</strong> 启用渐进式延迟和增量获取</p>
					<p><strong>大型UP主（500-1000视频）：</strong> 启用分批处理，设置较大的延迟倍数</p>
					<p>
						<strong>超大型UP主（&gt;1000视频）：</strong> 启用所有风控策略，适当增加各项延迟参数
					</p>
					<p><strong>频繁遇到412错误：</strong> 增加基础请求间隔和延迟倍数</p>
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
