<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { X } from '@lucide/svelte';
	import BatchCheckbox from '$lib/components/batch-checkbox.svelte';
	import BiliImage from '$lib/components/bili-image.svelte';
	import SelectAllButton from '$lib/components/select-all-button.svelte';
	import SidePanel from '$lib/components/side-panel.svelte';
	import { formatSubmissionMetricLabel } from '$lib/utils/submission';
	import type { SearchResultItem, VideoCategory } from '$lib/types';

	export let isCompactLayout = false;
	export let isMobile = false;
	export let batchMode = false;
	export let sourceType: VideoCategory = 'collection';
	export let searchResults: SearchResultItem[] = [];
	export let searchTotalResults = 0;
	export let filteredSearchResults: SearchResultItem[] = [];
	export let batchCheckboxStates: Record<string, boolean> = {};
	export let enableSearchAnimations = false;

	export let isBangumiSeasonExists: (seasonId: string) => boolean = () => false;
	export let isSubmissionExists: (mid: number) => boolean = () => false;
	export let isBatchSelected: (key: string) => boolean = () => false;

	export let onClose: () => void = () => {};
	export let onSelectAll: () => void = () => {};
	export let onSelectResult: (result: SearchResultItem) => void = () => {};
	export let onToggleBatch: (key: string, result: SearchResultItem) => void = () => {};
	export let onMouseEnter: (result: SearchResultItem, event: MouseEvent) => void = () => {};
	export let onMouseLeave: () => void = () => {};
	export let onMouseMove: (event: MouseEvent) => void = () => {};
</script>

<!-- 右侧：搜索结果区域 -->
<div class={isCompactLayout ? 'w-full' : 'min-w-[550px] flex-1'} transition:fly={{ x: 300, duration: 300 }}>
	<SidePanel
		isMobile={isCompactLayout}
		title="搜索结果"
		subtitle={`共找到 ${searchTotalResults} 个结果`}
		headerClass="bg-muted"
		bodyClass="flex-1 overflow-hidden p-3"
		footerClass="border-t p-3 text-center"
		showFooter={searchResults.length > 0}
	>
		{#snippet actions()}
			{#if batchMode && sourceType === 'submission'}
				<SelectAllButton onclick={onSelectAll} />
			{/if}
			<button onclick={onClose} class="text-muted-foreground hover:text-foreground p-1 text-xl">
				<X class="h-5 w-5" />
			</button>
		{/snippet}

		<div class="seasons-grid-container h-full">
			<div
				class="grid gap-4 {isMobile ? 'grid-cols-1' : ''}"
				style={isMobile ? '' : 'grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));'}
			>
				{#each filteredSearchResults as result, i (result.bvid || result.season_id || result.mid || i)}
					{@const isBangumiExisting =
						sourceType === 'bangumi' &&
						!!result.season_id &&
						isBangumiSeasonExists(result.season_id)}
					{@const isExternalExisting = false}
					{@const itemKey = `search_${result.bvid || result.season_id || result.mid || i}`}
					<button
						onclick={() => {
							if (batchMode && sourceType === 'submission') {
								onToggleBatch(itemKey, result);
							} else {
								onSelectResult(result);
							}
						}}
						onmouseenter={(e) => onMouseEnter(result, e)}
						onmouseleave={onMouseLeave}
						onmousemove={onMouseMove}
						class="hover:bg-muted relative flex transform items-start gap-3 rounded-lg border p-4 text-left transition-all duration-300 hover:scale-102 hover:shadow-md {isBangumiExisting
							? 'opacity-60'
							: ''} {batchMode && isBatchSelected(itemKey)
							? 'bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-950'
							: ''}"
						transition:fly={{
							y: 50,
							duration: enableSearchAnimations ? 300 : 0,
							delay: enableSearchAnimations ? i * 50 : 0
						}}
						animate:flip={{ duration: enableSearchAnimations ? 300 : 0 }}
						disabled={isBangumiExisting || isExternalExisting}
					>
						<!-- 批量模式下的复选框 -->
						{#if batchMode && sourceType === 'submission'}
							<BatchCheckbox
								checked={batchCheckboxStates[itemKey] || false}
								onclick={(e) => {
									e.stopPropagation();
									onToggleBatch(itemKey, result);
								}}
							/>
						{/if}
						<BiliImage
							src={result.cover}
							alt={result.title}
							class="{sourceType === 'bangumi'
								? 'h-20 w-14'
								: 'h-14 w-20'} flex-shrink-0 rounded object-cover"
							placeholder="无图片"
						/>
						<div class="min-w-0 flex-1">
							<div class="mb-1 flex items-center gap-2">
								<h4 class="text-foreground flex-1 truncate text-sm font-medium">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html result.title}
								</h4>
								{#if result.result_type}
									<span
										class="flex-shrink-0 rounded px-1.5 py-0.5 text-xs {result.result_type ===
										'media_bangumi'
											? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
											: result.result_type === 'media_ft'
												? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
												: result.result_type === 'bili_user'
													? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
													: result.result_type === 'video'
														? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
														: 'text-foreground bg-gray-100 dark:bg-gray-800'}"
									>
										{result.result_type === 'media_bangumi'
											? '番剧'
											: result.result_type === 'media_ft'
												? '影视'
												: result.result_type === 'bili_user'
													? 'UP主'
													: result.result_type === 'video'
														? '视频'
														: result.result_type}
									</span>
								{/if}
								<!-- 显示已存在标记 -->
								{#if isExternalExisting}
									<span
										class="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
									>
										已添加
									</span>
								{/if}
								{#if sourceType === 'submission' && result.mid && isSubmissionExists(Number(result.mid))}
									<span
										class="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
									>
										已添加
									</span>
								{/if}
								{#if isBangumiExisting}
									<span
										class="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
									>
										已添加
									</span>
								{/if}
							</div>
							<p class="text-muted-foreground truncate text-xs">
								{result.author}{#if result.result_type === 'bili_user' && result.follower !== undefined && result.follower !== null}
									<span class="ml-2"
										>· 粉丝:
										{formatSubmissionMetricLabel(result.follower)}</span
									>
								{/if}
							</p>
							{#if result.description}
								<p class="text-muted-foreground/70 mt-1 line-clamp-2 text-xs">
									{result.description}
								</p>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		</div>
		{#snippet footer()}
			<span class="text-muted-foreground text-xs">
				共显示 {searchResults.length} 个结果
				{#if searchTotalResults > searchResults.length}
					（总共 {searchTotalResults} 个）
				{/if}
			</span>
		{/snippet}
	</SidePanel>
</div>
