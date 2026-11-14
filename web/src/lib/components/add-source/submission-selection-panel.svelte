<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Search, X } from '@lucide/svelte';
	import BiliImage from '$lib/components/bili-image.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import SidePanel from '$lib/components/side-panel.svelte';
	import SubmissionSelectionToolbar from '$lib/components/submission-selection-toolbar.svelte';
	import Loading from '$lib/components/ui/Loading.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatSubmissionDateLabel, formatSubmissionMetricLabel } from '$lib/utils/submission';
	import type { SubmissionVideoInfo } from '$lib/types';

	export let isCompactLayout = false;
	export let isMobile = false;

	export let submissionLoading = false;
	export let submissionError = '';
	export let submissionTotalCount = 0;
	export let submissionVideos: SubmissionVideoInfo[] = [];
	export let filteredSubmissionVideos: SubmissionVideoInfo[] = [];
	export let selectedSubmissionVideos: Set<string> = new Set();
	export let selectedSubmissionCount = 0;
	export let submissionSearchQuery = '';
	export let isSearching = false;
	export let showLoadMoreButton = false;
	export let hasMoreVideos = false;
	export let isLoadingMore = false;

	export let onCancel: () => void = () => {};
	export let onRetry: () => void = () => {};
	export let onSelectAll: () => void = () => {};
	export let onSelectNone: () => void = () => {};
	export let onInvert: () => void = () => {};
	export let onToggleVideo: (bvid: string) => void = () => {};
	export let onCardKeydown: (event: KeyboardEvent, bvid: string) => void = () => {};
	export let onScrollNearBottom: () => void = () => {};
	export let onLoadMore: () => void = () => {};
	export let onConfirm: () => void = () => {};

	// 处理滚动事件，检测是否需要显示加载更多按钮
	function handleScroll(event: Event) {
		const container = event.target as HTMLElement | null;
		if (!container || !hasMoreVideos) return;

		const { scrollTop, scrollHeight, clientHeight } = container;
		const threshold = 100; // 距离底部100px时显示按钮

		// 当滚动接近底部时显示加载更多按钮
		if (scrollHeight - scrollTop - clientHeight < threshold) {
			onScrollNearBottom();
		}
	}
</script>

<div class={isCompactLayout ? 'w-full' : 'flex-1'} transition:fly={{ x: 300, duration: 300 }}>
	<SidePanel
		isMobile={isCompactLayout}
		maxHeightClass="max-h-[750px]"
		headerClass="bg-blue-50 dark:bg-blue-950"
		bodyClass="flex min-h-0 flex-1 flex-col overflow-hidden"
	>
		{#snippet header()}
			<div>
				<div class="flex items-center gap-2">
					<span class="text-base font-medium text-blue-800 dark:text-blue-200"
						>📹 选择历史投稿</span
					>
					<span class="text-xs text-blue-600 dark:text-blue-400"
						>选择您希望下载的历史投稿。未选择的视频不会下载和显示。新发布的视频会自动下载。</span
					>
				</div>
				<span class="text-sm text-blue-600 dark:text-blue-400 {isMobile ? 'block' : 'ml-2'} mt-1">
					{#if submissionLoading && submissionVideos.length === 0}
						正在加载...
					{:else if submissionTotalCount > 0}
						共 {submissionTotalCount} 个投稿
					{:else}
						暂无投稿
					{/if}
				</span>
			</div>
		{/snippet}
		{#snippet actions()}
			<button
				onclick={onCancel}
				class="p-1 text-xl text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
			>
				<X class="h-5 w-5" />
			</button>
		{/snippet}

		{#if submissionError}
			<div class="m-3 rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="flex items-center gap-2">
					<svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span class="text-sm font-medium text-red-800 dark:text-red-200">加载失败</span>
				</div>
				<p class="mt-1 text-sm text-red-700 dark:text-red-300">{submissionError}</p>
				<button
					type="button"
					class="mt-2 text-sm text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
					onclick={onRetry}
				>
					重试
				</button>
			</div>
		{:else}
			<!-- 搜索和操作栏 -->
			<SubmissionSelectionToolbar
				bind:query={submissionSearchQuery}
				placeholder="搜索视频标题（支持关键词搜索UP主所有视频）..."
				{isSearching}
				statusText={isSearching
					? '搜索中...'
					: `搜索模式：在UP主所有视频中搜索 "${submissionSearchQuery}"`}
				selectedCount={selectedSubmissionCount}
				totalCount={filteredSubmissionVideos.length}
				itemLabel="视频"
				onSelectAll={onSelectAll}
				onSelectNone={onSelectNone}
				onInvert={onInvert}
				selectAllDisabled={filteredSubmissionVideos.length === 0}
				selectNoneDisabled={selectedSubmissionCount === 0}
				invertDisabled={filteredSubmissionVideos.length === 0}
			/>

			<!-- 视频列表 -->
			<div class="min-h-0 flex-1 overflow-y-auto p-3 pt-0" onscroll={handleScroll}>
				{#if submissionLoading && submissionVideos.length === 0}
					<Loading
						showSpinner={true}
						spinnerClass="text-blue-600 dark:text-blue-400"
						textClass="text-sm"
						class="py-8"
					/>
				{:else if filteredSubmissionVideos.length === 0}
					<EmptyState
						icon={Search}
						iconClass="h-12 w-12"
						title={submissionSearchQuery.trim() ? '没有找到视频' : '暂无投稿'}
						description={submissionSearchQuery.trim()
							? `没有找到包含 "${submissionSearchQuery}" 的视频`
							: '该UP主暂无投稿'}
						class="border-0 bg-transparent p-0 py-8"
					>
						{#snippet actions()}
							{#if submissionSearchQuery.trim()}
								<Button
									type="button"
									size="sm"
									variant="outline"
									onclick={() => (submissionSearchQuery = '')}
								>
									清空搜索
								</Button>
							{/if}
						{/snippet}
					</EmptyState>
				{:else}
					<div
						class="grid gap-4 {isMobile ? 'grid-cols-1' : ''}"
						style={isMobile
							? ''
							: 'grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));'}
					>
						{#each filteredSubmissionVideos as video (video.bvid)}
							<div
								role="button"
								tabindex="0"
								class="hover:bg-muted relative rounded-lg border p-4 transition-all duration-300 hover:shadow-md {selectedSubmissionVideos.has(
									video.bvid
								)
									? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-950'
									: 'border-gray-200 dark:border-gray-700'} {isMobile
									? 'h-auto'
									: 'h-[100px]'}"
								onclick={() => onToggleVideo(video.bvid)}
								onkeydown={(event) => onCardKeydown(event, video.bvid)}
							>
								<div class="flex h-full gap-3">
									<div class="relative flex-shrink-0">
										<BiliImage
											src={video.cover}
											alt={video.title}
											class="h-[63px] w-28 rounded object-cover"
											placeholder="无封面"
										/>
									</div>
									<div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
										<input
											type="checkbox"
											checked={selectedSubmissionVideos.has(video.bvid)}
											onchange={() => onToggleVideo(video.bvid)}
											onclick={(event) => event.stopPropagation()}
											class="absolute top-1 right-1 z-10 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:text-blue-400"
										/>
										<h4 class="text-foreground mb-1 line-clamp-2 flex-shrink-0 pr-6 text-sm font-medium">
											{video.title}
										</h4>
										<p class="text-muted-foreground mb-2 line-clamp-1 flex-shrink-0 text-xs">
											{video.description || '无简介'}
										</p>
										<div class="text-muted-foreground mt-auto text-xs">
											<div class="flex flex-wrap items-center gap-2">
												<span>🎬 {formatSubmissionMetricLabel(video.view)}</span>
												<span>💬 {formatSubmissionMetricLabel(video.danmaku)}</span>
												<span>📅 {formatSubmissionDateLabel(video.pubtime)}</span>
												<span class="font-mono text-xs">{video.bvid}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>

					{#if submissionVideos.length > 0}
						{#if showLoadMoreButton && hasMoreVideos}
							<div class="py-4 text-center">
								<button
									type="button"
									class="rounded-md border border-transparent bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									onclick={onLoadMore}
									disabled={isLoadingMore}
								>
									{#if isLoadingMore}
										<Loading
											inline={true}
											showSpinner={true}
											spinnerClass="text-white"
											textClass="text-white"
											class="gap-2"
										/>
									{:else}
										加载更多 ({submissionVideos.length}/{submissionTotalCount})
									{/if}
								</button>
							</div>
						{:else if submissionTotalCount > 0}
							<div class="text-muted-foreground py-4 text-center text-sm">
								已加载全部 {submissionVideos.length} 个视频
							</div>
						{/if}
					{/if}
				{/if}
			</div>

			<!-- 确认按钮 -->
			<div class="flex flex-shrink-0 justify-end gap-3 border-t p-4">
				<button
					type="button"
					class="bg-card text-foreground hover:bg-muted rounded-md border border-gray-300 px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					onclick={onCancel}
				>
					取消
				</button>
				<button
					type="button"
					class="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					onclick={onConfirm}
				>
					确认选择 ({selectedSubmissionCount} 个视频)
				</button>
			</div>
		{/if}
	</SidePanel>
</div>
