<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import FilterOptionEditor from '$lib/components/filter-option-editor.svelte';
	import type { FilterOption } from '$lib/types';

	export let open = false;
	export let sourceName = '';
	export let inheritGlobal = true;
	export let filterOptionDraft: FilterOption;
	export let saving = false;
	export let onSave: () => void = () => {};
</script>

<!-- 源级流过滤/码率设置对话框 -->
<AlertDialog.Root bind:open>
	<AlertDialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
		<AlertDialog.Header>
			<AlertDialog.Title title="单独设置该同步源使用的视频/音频质量筛选规则">
				源级码率设置
			</AlertDialog.Title>
			<AlertDialog.Description>
				为「{sourceName}」单独设置视频质量、音频质量和编码优先级；继承全局时会使用设置页的全局视频质量配置。
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="mt-4 space-y-5">
			<div class="flex items-center justify-between rounded-lg border p-3">
				<div class="space-y-1">
					<Label for="filter-option-inherit-global">继承全局流过滤设置</Label>
					<p class="text-muted-foreground text-xs">
						开启后清空该源的自定义配置；关闭后保存当前编辑器内容作为该源专用码率规则。
					</p>
				</div>
				<Switch id="filter-option-inherit-global" disabled={saving} bind:checked={inheritGlobal} />
			</div>

			{#if inheritGlobal}
				<div class="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
					当前将继承全局配置。如需给该专集、UP、收藏夹或稍后再看任务单独限码率，请关闭上面的开关。
				</div>
			{:else}
				<FilterOptionEditor
					value={filterOptionDraft}
					disabled={saving}
					on:change={(event) => (filterOptionDraft = event.detail)}
				/>
			{/if}
		</div>

		<AlertDialog.Footer class="mt-4">
			<Button size="sm" variant="outline" disabled={saving} onclick={() => (open = false)}>
				取消
			</Button>
			<Button size="sm" disabled={saving} onclick={onSave}>
				{saving ? '保存中…' : '保存'}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
