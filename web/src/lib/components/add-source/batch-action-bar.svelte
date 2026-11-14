<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';

	export let isMobile = false;
	export let selectedCount = 0;
	export let adding = false;
	export let progress: { current: number; total: number } = { current: 0, total: 0 };
	export let onClear: () => void = () => {};
	export let onOpenDialog: () => void = () => {};
</script>

<!-- 批量操作工具栏 -->
<div
	class="fixed {isMobile
		? 'right-4 bottom-4 left-4'
		: 'bottom-6 left-1/2 -translate-x-1/2'} z-50 rounded-lg border border-blue-500 bg-blue-600 px-4 py-3 text-white shadow-xl transition-all duration-300 dark:border-blue-600 dark:bg-blue-700"
	transition:fly={{ y: 100, duration: 300 }}
>
	<div class="flex {isMobile ? 'flex-col gap-3' : 'items-center gap-4'}">
		<div class="text-sm font-medium {isMobile ? 'text-center' : ''}">
			已选择 {selectedCount} 个视频源
		</div>
		<div class="flex gap-2 {isMobile ? 'justify-center' : ''}">
			<Button
				size="sm"
				variant="secondary"
				onclick={onClear}
				class="border-white/30 bg-white/20 text-xs text-white hover:bg-white/30"
			>
				清空
			</Button>
			<Button
				size="sm"
				variant="secondary"
				onclick={onOpenDialog}
				disabled={adding}
				class="bg-white text-xs text-blue-600 hover:bg-gray-100 dark:text-blue-700"
			>
				{adding ? '添加中...' : '批量添加'}
			</Button>
		</div>
	</div>
	{#if adding}
		<div class="mt-2 text-xs text-blue-100 dark:text-blue-200 {isMobile ? 'text-center' : ''}">
			正在添加 ({progress.current}/{progress.total})
		</div>
	{/if}
</div>
