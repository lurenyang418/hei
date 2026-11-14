<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { SlidersHorizontal as SlidersHorizontalIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import FilterOptionEditor from '$lib/components/filter-option-editor.svelte';
	import type { BatchSelectedItem, FilterOption } from '$lib/types';

	export let open = false;
	export let selectedItems: Map<string, BatchSelectedItem> = new Map();
	export let batchBasePath = '';
	export let selectedTemplate = '';
	export let filterOptionInheritGlobal = true;
	export let filterOptionDraft: FilterOption;
	export let collectionAggregateEnabled = false;
	export let adding = false;
	export let selectedSourceType: string | null = null;
	export let canStart = false;
	export let getPathForItem: (item: BatchSelectedItem) => string = () => '';
	export let getItemTypeLabel: (item: BatchSelectedItem) => string = () => '';
	export let onStart: () => void = () => {};
	export let onCancel: () => void = () => {};
</script>

<!-- 批量添加配置对话框 -->
{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		transition:fade
	>
		<div
			class="bg-card mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border shadow-lg"
			transition:fly={{ y: -50 }}
		>
			<div class="border-b p-4">
				<h3 class="text-lg font-semibold">批量添加配置</h3>
				<p class="text-muted-foreground mt-1 text-sm">将添加 {selectedItems.size} 个视频源</p>
			</div>

			<div class="space-y-4 p-4">
				<div>
					<div class="mb-2 flex items-center justify-between gap-3">
						<Label for="batch-base-path">本次保存路径 / 路径模板</Label>
						{#if selectedTemplate}
							<Button
								type="button"
								size="sm"
								variant="outline"
								onclick={() => {
									batchBasePath = selectedTemplate;
								}}
							>
								恢复快捷模板
							</Button>
						{/if}
					</div>
					<Input
						id="batch-base-path"
						bind:value={batchBasePath}
						placeholder={selectedTemplate || '/Downloads'}
						class="mt-1"
					/>
					{#if selectedTemplate}
						<div
							class="mt-2 space-y-1 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30"
						>
							<p class="text-xs text-blue-700 dark:text-blue-300">
								已从当前源类型的快捷订阅路径模板带入默认值，本次批量添加可临时改成任意路径或任意模板。
							</p>
							<p class="text-xs text-blue-700 dark:text-blue-300">
								支持 <code>{'{{name}}'}</code> 变量；如果不包含该变量，则所有选中项会使用同一个路径。
							</p>
						</div>
					{:else}
						<p class="text-muted-foreground mt-1 text-xs">
							未配置快捷模板时，所有选中的视频源将保存到此路径。支持手动填写 <code
								>{'{{name}}'}</code
							> 变量。
						</p>
					{/if}
				</div>

				<div class="space-y-3">
					<div
						class="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30"
					>
						<div class="flex items-center gap-2 pr-3">
							<SlidersHorizontalIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
							<div>
								<div class="text-sm font-medium text-blue-800 dark:text-blue-200">
									批量源级码率/流过滤
								</div>
								<p class="mt-1 text-xs text-blue-600 dark:text-blue-300">
									当前设置会应用到本次批量添加的每个视频源。
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-xs text-blue-700 dark:text-blue-300">继承全局</span>
							<label class="relative inline-flex cursor-pointer items-center">
								<input
									type="checkbox"
									bind:checked={filterOptionInheritGlobal}
									class="peer sr-only"
								/>
								<div
									class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-blue-500"
								></div>
							</label>
						</div>
					</div>

					{#if !filterOptionInheritGlobal}
						<div
							class="rounded-md border border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-gray-900"
						>
							<FilterOptionEditor
								value={filterOptionDraft}
								disabled={adding}
								on:change={(event) => (filterOptionDraft = event.detail)}
							/>
						</div>
					{/if}
				</div>

				{#if selectedSourceType === 'collection'}
					<div class="space-y-2">
						<Label>合集聚合</Label>
						<div
							class="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30"
						>
							<div class="pr-3">
								<div class="text-sm font-medium text-blue-800 dark:text-blue-200">
									按同UP合集绝对顺序聚合
								</div>
								<p class="mt-1 text-xs text-blue-600 dark:text-blue-300">
									批量添加的合集源将按各自UP远端合集/系列列表顺序映射 Season
									xx，并归并到对应UP合集根目录。
								</p>
							</div>
							<label class="relative inline-flex cursor-pointer items-center">
								<input
									type="checkbox"
									bind:checked={collectionAggregateEnabled}
									class="peer sr-only"
								/>
								<div
									class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-blue-500"
								></div>
							</label>
						</div>
					</div>
				{/if}

				<div class="max-h-60 overflow-y-auto rounded border">
					<div class="space-y-2 p-3">
						{#each Array.from(selectedItems.entries()) as [itemKey, item] (itemKey)}
							<div class="bg-muted flex items-center justify-between rounded p-2 text-sm">
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium">{item.name}</div>
									<div class="text-muted-foreground truncate text-xs">
										{getPathForItem(item)}
									</div>
								</div>
								<span class="bg-background ml-2 rounded px-2 py-1 text-xs">
									{getItemTypeLabel(item)}
								</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<div class="flex justify-end gap-2 border-t p-4">
				<Button variant="outline" onclick={onCancel} disabled={adding}>取消</Button>
				<Button onclick={onStart} disabled={adding || !canStart}>
					{adding ? '添加中...' : '开始添加'}
				</Button>
			</div>
		</div>
	</div>
{/if}
