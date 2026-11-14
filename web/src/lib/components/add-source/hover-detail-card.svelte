<script lang="ts">
	import { fade } from 'svelte/transition';
	import BiliImage from '$lib/components/bili-image.svelte';
	import type { HoveredItem, VideoCategory } from '$lib/types';

	export let hoveredItem: HoveredItem | null = null;
	export let mousePosition: { x: number; y: number } = { x: 0, y: 0 };
	export let sourceType: VideoCategory = 'collection';
	export let sourceId = '';
	export let selectedSeasons: string[] = [];
</script>

<!-- 统一的悬停详情框 -->
{#if hoveredItem}
	<div
		class="bg-card pointer-events-none fixed z-50 max-w-md rounded-lg border p-4 shadow-2xl transition-all duration-150 ease-out"
		style="left: {mousePosition.x}px; top: {mousePosition.y}px;"
		transition:fade={{ duration: 200 }}
	>
		{#if hoveredItem.type === 'search'}
			<!-- 搜索结果详情内容 -->
			<div class="flex gap-4">
				<BiliImage
					src={hoveredItem.data.cover}
					alt={hoveredItem.data.title}
					class="{sourceType === 'bangumi'
						? 'h-32 w-24'
						: 'h-20 w-32'} flex-shrink-0 rounded object-cover"
					placeholder="无图片"
					placeholderClass="text-sm"
				/>
				<div class="min-w-0 flex-1">
					<div class="mb-1 flex items-center gap-2">
						<h4 class="flex-1 text-sm font-semibold">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html hoveredItem.data.title}
						</h4>
						{#if hoveredItem.data.result_type}
							<span
								class="flex-shrink-0 rounded px-1.5 py-0.5 text-xs {hoveredItem.data.result_type ===
								'media_bangumi'
									? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
									: hoveredItem.data.result_type === 'media_ft'
										? 'bg-red-100 text-red-700'
										: hoveredItem.data.result_type === 'bili_user'
											? 'bg-blue-100 text-blue-700'
											: hoveredItem.data.result_type === 'video'
												? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
												: 'text-foreground bg-gray-100'}"
							>
								{hoveredItem.data.result_type === 'media_bangumi'
									? '番剧'
									: hoveredItem.data.result_type === 'media_ft'
										? '影视'
										: hoveredItem.data.result_type === 'bili_user'
											? 'UP主'
											: hoveredItem.data.result_type === 'video'
												? '视频'
												: hoveredItem.data.result_type}
							</span>
						{/if}
					</div>
					<p class="text-muted-foreground mb-2 text-xs">作者：{hoveredItem.data.author}</p>
					{#if hoveredItem.data.description}
						<p class="text-muted-foreground mb-2 line-clamp-4 text-xs">
							{hoveredItem.data.description}
						</p>
					{/if}
					<div class="flex flex-wrap gap-2 text-xs">
						{#if hoveredItem.data.play}
							<span class="text-muted-foreground flex items-center gap-1">
								<span>▶</span> 播放：{hoveredItem.data.play > 10000
									? (hoveredItem.data.play / 10000).toFixed(1) + '万'
									: hoveredItem.data.play}
							</span>
						{/if}
						{#if hoveredItem.data.danmaku}
							<span class="text-muted-foreground flex items-center gap-1">
								<span>💬</span> 弹幕：{hoveredItem.data.danmaku > 10000
									? (hoveredItem.data.danmaku / 10000).toFixed(1) + '万'
									: hoveredItem.data.danmaku}
							</span>
						{/if}
						{#if sourceType === 'bangumi' && hoveredItem.data.season_id}
							<span class="text-muted-foreground">Season ID: {hoveredItem.data.season_id}</span>
						{/if}
						{#if hoveredItem.data.bvid}
							<span class="text-muted-foreground">BV号: {hoveredItem.data.bvid}</span>
						{/if}
					</div>
				</div>
			</div>
		{:else if hoveredItem.type === 'season'}
			<!-- 季度选择详情内容 -->
			<div class="flex gap-4">
				<BiliImage
					src={hoveredItem.data.cover}
					alt={hoveredItem.data.season_title}
					class="h-32 w-24 flex-shrink-0 rounded object-cover"
					placeholder="无封面"
					placeholderClass="text-sm"
				/>
				<div class="min-w-0 flex-1">
					<div class="mb-1 flex items-center gap-2">
						<h4 class="flex-1 text-sm font-semibold">
							{hoveredItem.data.full_title || hoveredItem.data.season_title}
						</h4>
						<span
							class="flex-shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300"
						>
							番剧
						</span>
					</div>

					<div class="space-y-2 text-xs">
						{#if hoveredItem.data.description}
							<div class="text-foreground mb-3 line-clamp-3 text-sm leading-relaxed">
								{hoveredItem.data.description}
							</div>
						{/if}

						<div class="flex flex-wrap gap-3">
							<span class="text-muted-foreground"
								>Season ID: <span class="font-mono text-gray-800 dark:text-gray-200"
									>{hoveredItem.data.season_id}</span
								></span
							>
							{#if hoveredItem.data.media_id}
								<span class="text-muted-foreground"
									>Media ID: <span class="font-mono text-gray-800 dark:text-gray-200"
										>{hoveredItem.data.media_id}</span
									></span
								>
							{/if}
						</div>

						{#if hoveredItem.data.episode_count}
							<div class="text-muted-foreground flex items-center gap-1">
								<span>📺</span> 总集数：{hoveredItem.data.episode_count} 集
							</div>
						{/if}

						{#if hoveredItem.data.season_id === sourceId}
							<div class="font-medium text-purple-600">🎯 当前选择的季度</div>
						{/if}

						{#if selectedSeasons.includes(hoveredItem.data.season_id)}
							<div class="font-medium text-green-600">✅ 已选择下载</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
