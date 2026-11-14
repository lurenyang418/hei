<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { VIDEO_SOURCES, type VideoSourceType } from '$lib/consts';
	import type { VideoSourcesResponse } from '$lib/types';

	export let open = false;
	export let selectedSourceType: VideoSourceType | '' = '';
	export let selectedSourceId = '';
	export let videoSources: VideoSourcesResponse | null = null;
	export let forceReset = false;
	export let resetAllTasks = true;
	export let resetTaskPages = false;
	export let resetTaskVideo = false;
	export let resetTaskInfo = false;
	export let resetTaskDanmaku = false;
	export let resetTaskSubtitle = false;
	export let resettingAll = false;
	export let onResetAllTasksChange: () => void = () => {};
	export let onSpecificTaskChange: () => void = () => {};
	export let onConfirm: () => void = () => {};
</script>

<!-- 批量重置确认对话框 -->
<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>批量重置确认</AlertDialog.Title>
			<AlertDialog.Description>
				{#if selectedSourceType && selectedSourceId && videoSources}
					{@const sourceConfig = Object.values(VIDEO_SOURCES).find(
						(config) => config.type === selectedSourceType
					)}
					{@const sources = videoSources[selectedSourceType as VideoSourceType]}
					{@const currentSource = sources?.find((s) => s.id.toString() === selectedSourceId)}
					{#if sourceConfig && currentSource}
						确定要重置「{currentSource.name}」视频源下的所有视频状态吗？此操作将清除失败状态并重新开始下载。
					{:else}
						确定要重置当前筛选条件下的所有视频状态吗？此操作将清除失败状态并重新开始下载。
					{/if}
				{:else}
					确定要重置所有视频状态吗？此操作将清除失败状态并重新开始下载。
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<div class="space-y-4 py-4">
			<!-- 重置模式选择 -->
			<div class="space-y-2">
				<div class="text-sm font-medium">重置模式：</div>
				<div class="space-y-2 rounded-lg border p-3">
					<label class="flex items-center gap-2">
						<input type="radio" bind:group={forceReset} value={false} />
						<span class="text-sm">只重置失败的任务（推荐）</span>
					</label>
					<label class="flex items-center gap-2">
						<input type="radio" bind:group={forceReset} value={true} />
						<span class="text-sm">强制重置所有任务（包括已完成的）</span>
					</label>
				</div>
			</div>

			<!-- 任务类型选择 -->
			<div class="space-y-3">
				<div class="text-sm font-medium">选择要重置的任务类型：</div>

				<!-- 重置所有任务 -->
				<label class="flex items-center gap-2">
					<input
						type="checkbox"
						bind:checked={resetAllTasks}
						onchange={onResetAllTasksChange}
						class="rounded border-gray-300"
					/>
					<span class="text-sm font-medium">重置所有任务类型</span>
				</label>

				<!-- 或选择特定任务 -->
				<div class="ml-4 space-y-2">
					<div class="text-muted-foreground text-sm">或选择特定任务：</div>

					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={resetTaskPages}
							onchange={onSpecificTaskChange}
							disabled={resetAllTasks}
							class="rounded border-gray-300"
						/>
						<span class="text-sm">重置视频封面</span>
					</label>

					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={resetTaskVideo}
							onchange={onSpecificTaskChange}
							disabled={resetAllTasks}
							class="rounded border-gray-300"
						/>
						<span class="text-sm">重置视频内容</span>
					</label>

					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={resetTaskInfo}
							onchange={onSpecificTaskChange}
							disabled={resetAllTasks}
							class="rounded border-gray-300"
						/>
						<span class="text-sm">重置视频信息</span>
					</label>

					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={resetTaskDanmaku}
							onchange={onSpecificTaskChange}
							disabled={resetAllTasks}
							class="rounded border-gray-300"
						/>
						<span class="text-sm">重置视频弹幕</span>
					</label>

					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={resetTaskSubtitle}
							onchange={onSpecificTaskChange}
							disabled={resetAllTasks}
							class="rounded border-gray-300"
						/>
						<span class="text-sm">重置视频字幕</span>
					</label>
				</div>

				<!-- 注意事项 -->
				<div class="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
					<div class="text-sm text-yellow-800">
						<strong>说明：</strong>
						<ul class="mt-1 list-inside list-disc">
							<li>"只重置失败的任务"模式只会重置状态为失败的任务</li>
							<li>"强制重置"模式会将所有选中的任务重置为"未开始"状态</li>
							<li>选择特定任务类型时，会同时重置对应的分P下载状态</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={resettingAll}>取消</AlertDialog.Cancel>
			<AlertDialog.Action onclick={onConfirm} disabled={resettingAll}>
				{resettingAll ? '重置中...' : '确认重置'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
