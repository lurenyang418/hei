<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import * as Tabs from '$lib/components/ui/tabs';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';
	import QrLogin from '$lib/components/qr-login.svelte';
	import { RefreshCwIcon } from '@lucide/svelte';
	import type { CredentialSettingsStore } from '$lib/stores/settings/credential.svelte';

	export let store: CredentialSettingsStore;
	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;
	export let getProxiedImageUrl: (url: string) => string = () => '';
</script>

<!-- B站凭证设置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="B站凭证设置"
	description="配置B站登录凭证信息"
	titleTooltip="填写 B 站登录凭证，影响会员画质、互动内容和受限接口访问。"
	{isMobile}
>
	<div slot="header">
		<div class="text-foreground font-semibold">B站凭证设置</div>
		<div class="text-muted-foreground text-sm">配置B站登录凭证信息</div>
		{#if store.currentUser}
			<div
				class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20"
			>
				<div class="flex items-center space-x-3">
					<div class="bg-muted relative h-10 w-10 overflow-hidden rounded-full">
						{#if store.currentUser.avatar_url}
							<img
								src={getProxiedImageUrl(store.currentUser.avatar_url)}
								alt={store.currentUser.username}
								class="h-full w-full object-cover"
								loading="lazy"
							/>
						{:else}
							<div
								class="bg-muted flex h-full w-full items-center justify-center text-xs font-semibold"
							>
								{store.currentUser.username.slice(0, 2).toUpperCase()}
							</div>
						{/if}
					</div>
					<div class="flex-1">
						<div class="text-sm font-semibold text-green-800 dark:text-green-200">
							当前登录：{store.currentUser.username}
						</div>
						<div class="text-xs text-green-600 dark:text-green-400">
							UID: {store.currentUser.user_id}
						</div>
					</div>
					<Badge variant="default" class="bg-green-500">已登录</Badge>
				</div>
			</div>
		{/if}
	</div>
	<div class="flex min-h-0 flex-1 flex-col">
		<Tabs.Root value="manual" class="flex min-h-0 flex-1 flex-col">
			<Tabs.List
				class="grid w-full grid-cols-2 {isMobile ? 'mx-4' : 'mx-6'} mt-4"
				style="width: calc(100% - {isMobile ? '2rem' : '3rem'});"
			>
				<Tabs.Trigger value="manual">手动输入凭证</Tabs.Trigger>
				<Tabs.Trigger value="qr">扫码登录</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="manual" class="min-h-0 flex-1">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						store.save();
					}}
					class="flex h-full flex-col"
				>
					<div
						class="min-h-0 flex-1 space-y-6 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}"
					>
						<div
							class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20"
						>
							<div class="space-y-2 text-sm text-amber-800 dark:text-amber-200">
								<div class="font-medium">🔐 如何获取B站登录凭证：</div>
								<ol class="ml-4 list-decimal space-y-1">
									<li>在浏览器中登录B站</li>
									<li>按F12打开开发者工具</li>
									<li>切换到"网络"(Network)标签</li>
									<li>刷新页面，找到任意一个请求</li>
									<li>在请求头中找到Cookie字段，复制对应的值</li>
								</ol>
								<div class="mt-2 text-xs text-amber-600 dark:text-amber-400">
									💡
									提示：SESSDATA、bili_jct、store.buvid3、DedeUserID是必填项，ac_time_value、store.buvid4、DedeUserID__ckMd5可选
								</div>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
							<div class="space-y-2">
								<Label for="store.sessdata">SESSDATA *</Label>
								<Input
									id="store.sessdata"
									type="password"
									bind:value={store.sessdata}
									placeholder="请输入SESSDATA"
								/>
							</div>

							<div class="space-y-2">
								<Label for="bili-jct">bili_jct *</Label>
								<Input
									id="bili-jct"
									type="password"
									bind:value={store.biliJct}
									placeholder="请输入bili_jct"
								/>
							</div>

							<div class="space-y-2">
								<Label for="store.buvid3">store.buvid3 *</Label>
								<Input id="store.buvid3" bind:value={store.buvid3} placeholder="请输入buvid3" />
							</div>

							<div class="space-y-2">
								<Label for="dedeuserid">DedeUserID *</Label>
								<Input
									id="dedeuserid"
									bind:value={store.dedeUserId}
									placeholder="请输入DedeUserID"
								/>
							</div>

							<div class="space-y-2 md:col-span-2">
								<Label for="ac-time-value">ac_time_value (可选)</Label>
								<Input
									id="ac-time-value"
									bind:value={store.acTimeValue}
									placeholder="请输入ac_time_value（可选）"
								/>
							</div>

							<div class="space-y-2">
								<Label for="store.buvid4">store.buvid4 (可选)</Label>
								<Input
									id="store.buvid4"
									bind:value={store.buvid4}
									placeholder="请输入buvid4（可选）"
								/>
							</div>

							<div class="space-y-2">
								<Label for="dedeuserid-ckmd5">DedeUserID__ckMd5 (可选)</Label>
								<Input
									id="dedeuserid-ckmd5"
									bind:value={store.dedeUserIdCkMd5}
									placeholder="请输入DedeUserID__ckMd5（可选）"
								/>
							</div>
						</div>

						<div
							class="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20"
						>
							<div class="text-sm text-green-800 dark:text-green-200">
								<div class="mb-1 font-medium">✅ 凭证状态检查：</div>
								<div class="text-xs">
									{#if store.sessdata && store.biliJct && store.buvid3 && store.dedeUserId}
										<span class="text-green-600 dark:text-green-400">✓ 必填凭证已填写完整</span>
									{:else}
										<span class="text-orange-600 dark:text-orange-400">⚠ 请填写所有必填凭证项</span
										>
									{/if}
								</div>
							</div>
						</div>

						<div
							class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/30"
						>
							<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<div class="text-sm font-medium text-slate-900 dark:text-slate-100">
										自动刷新诊断
									</div>
									<div class="text-xs text-slate-600 dark:text-slate-400">
										字段长度、错误阶段、错误类型。
									</div>
								</div>
								<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onclick={() => store.testRefresh(false)}
										disabled={store.refreshTesting || store.refreshForceTesting}
										class="w-full sm:w-auto"
									>
										<RefreshCwIcon class={store.refreshTesting ? 'animate-spin' : ''} />
										{store.refreshTesting ? '测试中...' : '测试刷新'}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onclick={() => store.testRefresh(true)}
										disabled={store.refreshTesting || store.refreshForceTesting}
										class="w-full border-amber-300 text-amber-700 hover:bg-amber-50 sm:w-auto dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30"
									>
										<RefreshCwIcon class={store.refreshForceTesting ? 'animate-spin' : ''} />
										{store.refreshForceTesting ? '强刷中...' : '强制刷新'}
									</Button>
								</div>
							</div>

							{#if store.testResult}
								<div
									class={`rounded-md border p-3 ${
										store.testResult.success
											? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
											: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
									}`}
								>
									<div class="mb-2 flex flex-wrap items-center gap-2">
										<Badge
											variant={store.testResult.success ? 'default' : 'secondary'}
											class={store.testResult.success
												? 'bg-green-600 text-white'
												: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'}
										>
											{store.testResult.success ? '通过' : '失败'}
										</Badge>
										<span class="text-sm font-medium text-slate-900 dark:text-slate-100">
											{store.testResult.message}
										</span>
									</div>

									<div
										class="grid grid-cols-1 gap-2 text-xs text-slate-700 sm:grid-cols-2 dark:text-slate-300"
									>
										<div>阶段：{store.testResult.stage}</div>
										<div>类型：{store.testResult.error_type ?? '无'}</div>
										<div>建议重试：{store.testResult.should_retry ? '是' : '否'}</div>
										<div>
											凭据：{store.testResult.credential_fields.has_credential
												? '已加载'
												: '未加载'}
										</div>
									</div>

									<div class="mt-2 text-xs text-slate-700 dark:text-slate-300">
										{store.testResult.diagnosis}
									</div>

									<div class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
										<div class="bg-background rounded border px-2 py-1">
											SESSDATA：{store.testResult.credential_fields.sessdata_len}
										</div>
										<div class="bg-background rounded border px-2 py-1">
											bili_jct：{store.testResult.credential_fields.bili_jct_len}
										</div>
										<div class="bg-background rounded border px-2 py-1">
											store.buvid3：{store.testResult.credential_fields.buvid3_len}
										</div>
										<div class="bg-background rounded border px-2 py-1">
											DedeUserID：{store.testResult.credential_fields.dedeuserid_len}
										</div>
										<div class="bg-background rounded border px-2 py-1">
											ac_time_value：{store.testResult.credential_fields.ac_time_value_len}
										</div>
										<div class="bg-background rounded border px-2 py-1">
											store.buvid4：{store.testResult.credential_fields.has_buvid4 ? '有' : '无'}
										</div>
										<div class="bg-background rounded border px-2 py-1 sm:col-span-2">
											DedeUserID__ckMd5：{store.testResult.credential_fields.has_dedeuserid_ckmd5
												? '有'
												: '无'}
										</div>
									</div>

									{#if store.testResult.details}
										<pre
											class="bg-background mt-3 max-h-36 overflow-auto rounded border p-2 text-xs whitespace-pre-wrap text-slate-700 dark:text-slate-300">{store
												.testResult.details}</pre>
									{/if}
								</div>
							{/if}
						</div>
					</div>
					<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
						<Button type="submit" disabled={store.saving} class="w-full">
							{store.saving ? '保存中...' : '保存凭证'}
						</Button>
					</SheetFooter>
				</form>
			</Tabs.Content>

			<Tabs.Content value="qr" class="min-h-0 flex-1">
				<div
					class="flex h-full min-h-0 flex-col overflow-y-auto {isMobile
						? 'px-4 py-4'
						: 'px-6 py-6'}"
				>
					<div class="mx-auto w-full max-w-md">
						<QrLogin
							onLoginSuccess={store.handleQrLoginSuccess}
							onLoginError={store.handleQrLoginError}
							onLogout={store.handleLogout}
						/>
					</div>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</ResponsiveSheet>
