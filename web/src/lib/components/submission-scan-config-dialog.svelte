<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';

	export let open = false;
	export let batchSize = '0';
	export let adaptiveScan = false;
	export let adaptiveMaxHours = '24';
	export let loading = false;
	export let saving = false;
	export let onReload: () => void = () => {};
	export let onSave: () => void = () => {};
</script>

<!-- B站源扫描优化弹窗 -->
<AlertDialog.Root bind:open>
	<AlertDialog.Content class="max-w-2xl">
		<AlertDialog.Header>
			<AlertDialog.Title title="配置合集、收藏夹和UP主投稿源的扫描优化策略">
				B站源扫描优化
			</AlertDialog.Title>
			<AlertDialog.Description>
				分批扫描覆盖合集、收藏夹和UP主投稿源；自适应会对长期无更新的源自动降频，减少风控概率。
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="mt-3 grid gap-4 md:grid-cols-3">
			<div class="space-y-1">
				<Label>每轮扫描数量</Label>
				<Input type="number" min="0" step="1" disabled={loading || saving} bind:value={batchSize} />
				<div class="text-muted-foreground text-xs">
					0 表示不限制；统计合集、收藏夹和投稿源总数。源多时建议从 20~40 开始。
				</div>
			</div>

			<div class="flex items-center gap-3 md:pt-7">
				<Switch disabled={loading || saving} bind:checked={adaptiveScan} />
				<div class="space-y-0.5">
					<Label>自适应扫描频率</Label>
					<div class="text-muted-foreground text-xs">
						合集、收藏夹和投稿源连续无更新时都会逐步延长扫描间隔。
					</div>
				</div>
			</div>

			<div class="space-y-1">
				<Label>最大间隔（小时）</Label>
				<Input
					type="number"
					min="1"
					max="168"
					step="1"
					disabled={!adaptiveScan || loading || saving}
					bind:value={adaptiveMaxHours}
				/>
				<div class="text-muted-foreground text-xs">范围 1~168。</div>
			</div>
		</div>

		<AlertDialog.Footer class="mt-4">
			<Button size="sm" variant="outline" disabled={loading || saving} onclick={onReload}>
				刷新
			</Button>
			<Button size="sm" variant="outline" disabled={saving} onclick={() => (open = false)}>
				关闭
			</Button>
			<Button size="sm" disabled={loading || saving} onclick={onSave}>
				{saving ? '保存中…' : '保存'}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
