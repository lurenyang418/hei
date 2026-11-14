<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';

	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;

	export let danmakuDuration = 15.0;
	export let danmakuFont = '黑体';
	export let danmakuFontSize = 25;
	export let danmakuWidthRatio = 1.2;
	export let danmakuHorizontalGap = 20.0;
	export let danmakuLaneSize = 32;
	export let danmakuFloatPercentage = 0.5;
	export let danmakuBottomPercentage = 0.3;
	export let danmakuOpacity = 76;
	export let danmakuBold = true;
	export let danmakuOutline = 0.8;
	export let danmakuTimeOffset = 0.0;

	export let danmakuUpdateEnabled = false;
	export let danmakuUpdateFreshDays = 3;
	export let danmakuUpdateFreshIntervalHours = 6;
	export let danmakuUpdateMatureDays = 30;
	export let danmakuUpdateMatureIntervalDays = 3;
	export let danmakuUpdateColdDays = 180;
	export let danmakuUpdateColdIntervalDays = 30;

	export let updateHelp: Record<string, string> = {};
	export let saving = false;
	export let onSave: () => void = () => {};
</script>

<!-- 弹幕设置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="弹幕设置"
	description="弹幕显示样式和布局参数"
	titleTooltip="配置弹幕文件的显示样式、布局参数和同步策略。"
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
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
				<div class="space-y-2">
					<Label for="danmaku-duration">弹幕持续时间（秒）</Label>
					<Input
						id="danmaku-duration"
						type="number"
						bind:value={danmakuDuration}
						min="1"
						max="60"
						step="0.1"
						placeholder="15.0"
					/>
				</div>

				<div class="space-y-2">
					<Label for="danmaku-font">字体</Label>
					<Input id="danmaku-font" bind:value={danmakuFont} placeholder="黑体" />
				</div>

				<div class="space-y-2">
					<Label for="danmaku-font-size">字体大小</Label>
					<Input
						id="danmaku-font-size"
						type="number"
						bind:value={danmakuFontSize}
						min="10"
						max="200"
						placeholder="25"
					/>
				</div>

				<div class="space-y-2">
					<Label for="danmaku-width-ratio">宽度比例</Label>
					<Input
						id="danmaku-width-ratio"
						type="number"
						bind:value={danmakuWidthRatio}
						min="0.1"
						max="3.0"
						step="0.1"
						placeholder="1.2"
					/>
				</div>

				<div class="space-y-2">
					<Label for="danmaku-horizontal-gap">水平间距</Label>
					<Input
						id="danmaku-horizontal-gap"
						type="number"
						bind:value={danmakuHorizontalGap}
						min="0"
						max="500"
						step="1"
						placeholder="20.0"
					/>
				</div>

				<div class="space-y-2">
					<Label for="danmaku-lane-size">轨道高度</Label>
					<Input
						id="danmaku-lane-size"
						type="number"
						bind:value={danmakuLaneSize}
						min="10"
						max="200"
						placeholder="32"
					/>
				</div>

				<div class="space-y-2">
					<Label for="danmaku-float-percentage">滚动弹幕占比</Label>
					<Input
						id="danmaku-float-percentage"
						type="number"
						bind:value={danmakuFloatPercentage}
						min="0"
						max="1"
						step="0.1"
						placeholder="0.5"
					/>
				</div>

				<div class="space-y-2">
					<Label for="danmaku-bottom-percentage">底部弹幕占比</Label>
					<Input
						id="danmaku-bottom-percentage"
						type="number"
						bind:value={danmakuBottomPercentage}
						min="0"
						max="1"
						step="0.1"
						placeholder="0.3"
					/>
				</div>

				<div class="space-y-2">
					<Label for="danmaku-opacity">不透明度（0-255）</Label>
					<Input
						id="danmaku-opacity"
						type="number"
						bind:value={danmakuOpacity}
						min="0"
						max="255"
						placeholder="76"
					/>
				</div>

				<div class="space-y-2">
					<Label for="danmaku-outline">描边宽度</Label>
					<Input
						id="danmaku-outline"
						type="number"
						bind:value={danmakuOutline}
						min="0"
						max="5"
						step="0.1"
						placeholder="0.8"
					/>
				</div>

				<div class="space-y-2">
					<Label for="danmaku-time-offset">时间偏移（秒）</Label>
					<Input
						id="danmaku-time-offset"
						type="number"
						bind:value={danmakuTimeOffset}
						step="0.1"
						placeholder="0.0"
					/>
				</div>

				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="danmaku-bold"
						bind:checked={danmakuBold}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label for="danmaku-bold" class="text-sm">加粗字体</Label>
				</div>
			</div>

			<div class="rounded-lg border p-3">
				<div class="mb-3 flex items-center justify-between gap-3">
					<div>
						<h5 class="cursor-help font-medium" title={updateHelp.section}>弹幕增量更新</h5>
						<p class="text-muted-foreground mt-1 text-xs">
							按视频发布时间分阶段刷新已下载分页的弹幕，并在冷冻期后停止后台轮询。
						</p>
					</div>
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							bind:checked={danmakuUpdateEnabled}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<span>启用</span>
					</label>
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
					<div class="space-y-2">
						<Label
							for="danmaku-update-fresh-days"
							class="cursor-help"
							title={updateHelp.freshDays}>新鲜期天数</Label
						>
						<Input
							id="danmaku-update-fresh-days"
							type="number"
							bind:value={danmakuUpdateFreshDays}
							min="0"
							placeholder="3"
							disabled={!danmakuUpdateEnabled}
						/>
					</div>

					<div class="space-y-2">
						<Label
							for="danmaku-update-fresh-hours"
							class="cursor-help"
							title={updateHelp.freshIntervalHours}
						>
							新鲜期刷新间隔（小时）
						</Label>
						<Input
							id="danmaku-update-fresh-hours"
							type="number"
							bind:value={danmakuUpdateFreshIntervalHours}
							min="1"
							placeholder="6"
							disabled={!danmakuUpdateEnabled}
						/>
					</div>

					<div class="space-y-2">
						<Label
							for="danmaku-update-mature-days"
							class="cursor-help"
							title={updateHelp.matureDays}
						>
							成熟期截至天数
						</Label>
						<Input
							id="danmaku-update-mature-days"
							type="number"
							bind:value={danmakuUpdateMatureDays}
							min="0"
							placeholder="30"
							disabled={!danmakuUpdateEnabled}
						/>
					</div>

					<div class="space-y-2">
						<Label
							for="danmaku-update-mature-interval"
							class="cursor-help"
							title={updateHelp.matureIntervalDays}
						>
							成熟期刷新间隔（天）
						</Label>
						<Input
							id="danmaku-update-mature-interval"
							type="number"
							bind:value={danmakuUpdateMatureIntervalDays}
							min="1"
							placeholder="3"
							disabled={!danmakuUpdateEnabled}
						/>
					</div>

					<div class="space-y-2">
						<Label
							for="danmaku-update-cold-days"
							class="cursor-help"
							title={updateHelp.coldDays}>老化期截至天数</Label
						>
						<Input
							id="danmaku-update-cold-days"
							type="number"
							bind:value={danmakuUpdateColdDays}
							min="0"
							placeholder="180"
							disabled={!danmakuUpdateEnabled}
						/>
					</div>

					<div class="space-y-2">
						<Label
							for="danmaku-update-cold-interval"
							class="cursor-help"
							title={updateHelp.coldIntervalDays}
						>
							老化期刷新间隔（天）
						</Label>
						<Input
							id="danmaku-update-cold-interval"
							type="number"
							bind:value={danmakuUpdateColdIntervalDays}
							min="1"
							placeholder="30"
							disabled={!danmakuUpdateEnabled}
						/>
					</div>
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
