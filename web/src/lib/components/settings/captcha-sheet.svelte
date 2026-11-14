<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CustomSelect } from '$lib/components/ui/select';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';

	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;

	export let riskControlEnabled = false;
	export let riskControlMode = 'manual';
	export let riskControlTimeout = 300;
	export let autoSolveService = '2captcha';
	export let autoSolveApiKey = '';
	export let autoSolveMaxRetries = 3;
	export let autoSolveTimeout = 300;

	export let isSaving = false;
	export let onSave: () => void = () => {};
</script>

<!-- 验证码风控设置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="验证码风控设置"
	description="v_voucher验证码风控配置，用于处理B站的风控验证"
	titleTooltip="设置遇到验证码风控时的处理模式、超时和自动识别参数。"
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
			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="risk-control-enabled">启用风控验证</Label>
					<input
						id="risk-control-enabled"
						type="checkbox"
						bind:checked={riskControlEnabled}
						class="h-4 w-4"
					/>
					<p class="text-muted-foreground text-xs">启用后，遇到v_voucher风控时将进行验证码验证</p>
				</div>

				<div class="space-y-2">
					<Label for="risk-control-mode">验证模式</Label>
					<CustomSelect
						id="risk-control-mode"
						value={riskControlMode}
						options={[
							{ value: 'manual', label: 'manual - 手动验证' },
							{ value: 'auto', label: 'auto - 自动验证' },
							{ value: 'skip', label: 'skip - 跳过验证' }
						]}
						onChange={(nextValue) => (riskControlMode = String(nextValue ?? 'manual'))}
						class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
					<p class="text-muted-foreground text-xs">
						manual: 弹出验证页面进行手动验证；auto: 使用第三方服务自动解决验证码；skip:
						直接跳过风控验证
					</p>
				</div>

				<div class="space-y-2">
					<Label for="risk-control-timeout">验证超时时间（秒）</Label>
					<Input
						id="risk-control-timeout"
						type="number"
						bind:value={riskControlTimeout}
						min="60"
						max="3600"
						placeholder="300"
					/>
					<p class="text-muted-foreground text-xs">
						用户完成验证码验证的最大等待时间，超时后将重新开始验证流程
					</p>
				</div>

				<!-- 自动验证配置 (仅在auto模式下显示) -->
				{#if riskControlMode === 'auto'}
					<div class="space-y-4 rounded-lg border bg-gray-50 p-4 dark:bg-gray-900/50">
						<h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">自动验证配置</h4>

						<div class="space-y-2">
							<Label for="auto-solve-service">验证码服务</Label>
							<CustomSelect
								id="auto-solve-service"
								value={autoSolveService}
								options={[
									{ value: '2captcha', label: '2Captcha' },
									{ value: 'anticaptcha', label: 'AntiCaptcha' }
								]}
								onChange={(nextValue) => (autoSolveService = String(nextValue ?? '2captcha'))}
								class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							/>
							<p class="text-muted-foreground text-xs">选择验证码识别服务提供商</p>
						</div>

						<div class="space-y-2">
							<Label for="auto-solve-api-key">API密钥</Label>
							<Input
								id="auto-solve-api-key"
								type="password"
								bind:value={autoSolveApiKey}
								placeholder="输入API密钥"
							/>
							<p class="text-muted-foreground text-xs">验证码服务的API密钥，请确保账户有足够余额</p>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="auto-solve-max-retries">最大重试次数</Label>
								<Input
									id="auto-solve-max-retries"
									type="number"
									bind:value={autoSolveMaxRetries}
									min="1"
									max="10"
									placeholder="3"
								/>
							</div>

							<div class="space-y-2">
								<Label for="auto-solve-timeout">识别超时（秒）</Label>
								<Input
									id="auto-solve-timeout"
									type="number"
									bind:value={autoSolveTimeout}
									min="60"
									max="600"
									placeholder="300"
								/>
							</div>
						</div>

						<div class="rounded-lg bg-yellow-100 p-3 dark:bg-yellow-900/20">
							<p class="text-sm text-yellow-700 dark:text-yellow-300">
								<strong>费用说明：</strong>
							</p>
							<div class="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
								<p>• 2Captcha: 约$2.99/1000次GeeTest验证</p>
								<p>• AntiCaptcha: 约$2.89/1000次GeeTest验证</p>
								<p>• 建议先小额充值测试服务稳定性</p>
								<p>• 识别失败不会扣费，但重试会产生费用</p>
							</div>
						</div>
					</div>
				{/if}

				<div class="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/20">
					<p class="text-sm text-blue-700 dark:text-blue-300">
						<strong>验证流程说明：</strong>
					</p>
					<div class="space-y-1 text-sm text-blue-700 dark:text-blue-300">
						<p>1. 当遇到v_voucher风控时，程序会自动暂停下载</p>
						<p>2. <strong>手动模式：</strong>在管理页面的 /captcha 路径提供验证界面</p>
						<p>3. <strong>自动模式：</strong>自动调用第三方服务识别验证码</p>
						<p>4. 完成验证后，程序会自动继续下载流程</p>
						<p>5. 验证结果会缓存1小时，避免重复验证</p>
					</div>
				</div>

				<div class="rounded-lg bg-orange-100 p-3 dark:bg-orange-900/20">
					<p class="text-sm text-orange-700 dark:text-orange-300">
						<strong>注意事项：</strong>
					</p>
					<div class="space-y-1 text-sm text-orange-700 dark:text-orange-300">
						<p>• <strong>手动模式：</strong>验证码验证需要在浏览器中手动完成</p>
						<p>• <strong>自动模式：</strong>需要有效的API密钥和账户余额</p>
						<p>• 建议将验证超时时间设置为3-5分钟</p>
						<p>• 跳过验证可能导致部分视频无法下载</p>
						<p>• 自动验证失败时会自动回退到手动模式</p>
					</div>
				</div>
			</div>
		</div>
		<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
			<Button type="submit" disabled={isSaving} class="w-full">
				{isSaving ? '保存中...' : '保存设置'}
			</Button>
		</SheetFooter>
	</form>
</ResponsiveSheet>
