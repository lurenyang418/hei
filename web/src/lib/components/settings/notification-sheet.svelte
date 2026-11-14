<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CustomSelect } from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';

	import type {
		NotificationChannel,
		NotificationSettingsStore,
		WebhookFormat
	} from '$lib/stores/settings/notification.svelte';

	export let store: NotificationSettingsStore;
	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;
</script>

<!-- 推送通知设置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="推送通知设置"
	description="配置扫描完成推送通知"
	titleTooltip="配置扫描完成后的推送渠道、测试发送和通知内容。"
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			store.save();
		}}
		class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}"
	>
		<div class="min-h-0 flex-1 space-y-6 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			<!-- 推送状态卡片 -->
			{#if store.status}
				<div
					class="rounded-lg border {store.activeChannel !== 'none'
						? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
						: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'} p-4"
				>
					<div class="flex items-center space-x-2">
						{#if store.activeChannel !== 'none'}
							<Badge variant="default" class="bg-green-500">已配置</Badge>
							<span class="text-sm text-green-700 dark:text-green-400">
								{store.activeChannel === 'telegram' ? 'Telegram' : 'Webhook'}已配置
							</span>
						{:else}
							<Badge variant="secondary">未配置</Badge>
							<span class="text-sm text-amber-700 dark:text-amber-400"> 请选择并配置通知渠道 </span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- 启用推送通知 -->
			<div class="space-y-4">
				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="notification-enabled"
						bind:checked={store.enabled}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label
						for="notification-enabled"
						class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						启用扫描完成推送通知
					</Label>
				</div>
				<p class="text-muted-foreground text-sm">当扫描完成且有新视频时，发送推送通知</p>
			</div>

			<!-- 选择通知渠道 -->
			<div class="space-y-4">
				<h3 class="text-base font-semibold">通知渠道</h3>

				<div class="space-y-2">
					<Label for="notification-channel">选择推送渠道</Label>
					<CustomSelect
						id="notification-channel"
						value={store.activeChannel}
						options={[
							{ value: 'none', label: '无' },
							{ value: 'telegram', label: 'Telegram' },
							{ value: 'webhook', label: 'Webhook' }
						]}
						onChange={(nextValue) =>
							(store.activeChannel = String(nextValue ?? 'none') as NotificationChannel)}
						class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
					<p class="text-muted-foreground text-sm">选择一个推送渠道，所有推送将发送到该渠道</p>
				</div>
			</div>

			<!-- Telegram配置 -->
			{#if store.activeChannel === 'telegram'}
				<div
					class="space-y-4 rounded-lg border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-800 dark:bg-sky-950/10"
				>
					<h3 class="text-base font-semibold">Telegram 配置</h3>

					<div class="space-y-2">
						<Label for="telegram-bot-token">Bot Token</Label>
						<Input
							id="telegram-bot-token"
							type="password"
							bind:value={store.telegramBotToken}
							placeholder={store.status?.configured
								? '已配置（留空保持不变）'
								: '请输入 Bot Token'}
						/>
						<p class="text-muted-foreground text-sm">
							通过 <a
								href="https://t.me/BotFather"
								target="_blank"
								class="text-primary hover:underline">@BotFather</a
							> 创建机器人后获取
						</p>
					</div>

					<div class="space-y-2">
						<Label for="telegram-chat-id">Chat ID</Label>
						<Input
							id="telegram-chat-id"
							type="text"
							bind:value={store.telegramChatId}
							placeholder="例如 123456789 或 -1001234567890"
						/>
						<p class="text-muted-foreground text-sm">
							私聊、群组或频道的 Chat ID；群组/频道通常以 -100 开头
						</p>
					</div>

					<div class="space-y-2">
						<Label for="telegram-api-base">API 地址（可选）</Label>
						<Input
							id="telegram-api-base"
							type="text"
							bind:value={store.telegramApiBase}
							placeholder="https://api.telegram.org"
						/>
						<p class="text-muted-foreground text-sm">
							默认 https://api.telegram.org；如使用反向代理或自建 Bot API，可填写对应地址
						</p>
					</div>
				</div>
			{/if}

			<!-- Webhook配置 -->
			{#if store.activeChannel === 'webhook'}
				<div
					class="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/10"
				>
					<h3 class="text-base font-semibold">Webhook配置</h3>

					<div class="space-y-2">
						<Label for="generic-webhook-format">Webhook格式</Label>
						<CustomSelect
							id="generic-webhook-format"
							value={store.webhookFormat}
							options={[
								{ value: 'auto', label: '自动识别（推荐）' },
								{ value: 'generic', label: '通用 JSON' },
								{ value: 'opensend', label: 'openSend' },
								{ value: 'custom', label: '自定义请求' },
								{ value: 'synology_chat', label: 'Synology Chat（群晖）' }
							]}
							onChange={(nextValue) => (store.webhookFormat = String(nextValue ?? 'auto') as WebhookFormat)}
							class="bg-background border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						/>
						<p class="text-muted-foreground text-sm">
							自动识别、openSend 与 Synology Chat 均为预设模板；自定义请求可发送任意 POST Body，
							不限制消息类型。Synology Chat 会按群晖要求发送 <code>payload=</code>
							表单。
						</p>
					</div>

					<div class="space-y-2">
						<Label for="generic-webhook-url">Webhook URL</Label>
						<Input
							id="generic-webhook-url"
							type="password"
							bind:value={store.webhookUrl}
							placeholder="https://example.com/notify/webhook"
						/>
						<p class="text-muted-foreground text-sm">
							{store.webhookFormat === 'synology_chat'
								? '将以 application/x-www-form-urlencoded 发送 payload=JSON，适用于 Synology Chat Incoming Webhook'
								: '将发送 JSON POST 请求到该地址，支持按响应内容判定成功'}
						</p>
					</div>

					<div class="space-y-2">
						<Label for="generic-webhook-token">Bearer Token（可选）</Label>
						<Input
							id="generic-webhook-token"
							type="password"
							bind:value={store.webhookBearerToken}
							placeholder="可选，自动带 Authorization: Bearer xxx"
						/>
						<p class="text-muted-foreground text-sm">
							留空则不附带认证头；openSend 模式下该值也会作为 apikey 发送
						</p>
					</div>

					<div class="space-y-2">
						<Label for="generic-webhook-custom-headers">自定义 Headers（可选）</Label>
						<Textarea
							id="generic-webhook-custom-headers"
							bind:value={store.webhookCustomHeaders}
							rows={6}
							placeholder={`{\n  "Authorization": "Bearer your-token",\n  "X-Channel": "clawbot"\n}`}
							class="font-mono text-xs"
						/>
						<div class="text-muted-foreground space-y-1 text-sm">
							<p>请填写 JSON 对象，键和值都必须是字符串。</p>
							<p>
								例如：<code>{'{"Authorization":"Bearer your-token","X-Channel":"clawbot"}'}</code>
							</p>
							<p>
								如与自动附带的 Bearer Token 或 openSend 的 apikey 同名，自定义 Headers
								会覆盖默认值。
							</p>
						</div>
					</div>

					{#if store.webhookFormat === 'custom'}
						<div class="space-y-2">
							<div class="flex items-center justify-between gap-3">
								<Label for="generic-webhook-custom-body">自定义 POST Body（任意文本）</Label>
								<div class="flex gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onclick={() => {
											store.webhookCustomBody = store.defaultWebhookCustomBody;
										}}
									>
										JSON 模板
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onclick={() => {
											store.webhookCustomBody = store.defaultWebhookFormBody;
											store.webhookCustomHeaders = '{"Content-Type":"application/x-www-form-urlencoded"}';
										}}
									>
										表单模板
									</Button>
								</div>
							</div>
							<Textarea
								id="generic-webhook-custom-body"
								bind:value={store.webhookCustomBody}
								rows={10}
								placeholder={store.defaultWebhookCustomBody}
								class="font-mono text-xs"
							/>
							<div class="text-muted-foreground space-y-1 text-sm">
								<p>
									支持占位符：&#123;&#123;source&#125;&#125;、&#123;&#123;title&#125;&#125;、&#123;&#123;content&#125;&#125;、&#123;&#123;channel&#125;&#125;、&#123;&#123;event&#125;&#125;、&#123;&#123;sent_at&#125;&#125;
								</p>
								<p>&#123;&#123;source&#125;&#125;：固定来源名</p>
								<p>&#123;&#123;title&#125;&#125;：推送标题</p>
								<p>&#123;&#123;content&#125;&#125;：推送正文内容</p>
								<p>&#123;&#123;channel&#125;&#125;：当前通知渠道名称，例如 webhook</p>
								<p>&#123;&#123;event&#125;&#125;：事件类型，例如 test_notification</p>
								<p>&#123;&#123;sent_at&#125;&#125;：发送时间</p>
								<p>
									可填写 JSON、<code>application/x-www-form-urlencoded</code> 或任意原始文本；不会限制消息类型。
								</p>
								<p>
									JSON 模板继续兼容原有安全替换；其他格式按原文本替换占位符。原始模板还支持 <code
										>&#123;&#123;title_json&#125;&#125;</code
									>
									和 <code>&#123;&#123;title_urlencoded&#125;&#125;</code>（其他字段同理）。
								</p>
							</div>
						</div>
					{/if}

					{#if store.webhookFormat === 'synology_chat'}
						<div class="space-y-2">
							<div class="flex items-center justify-between gap-3">
								<Label for="synology-chat-template">群晖 Chat 消息模板</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={() => {
										store.webhookSynologyChatTemplate = store.defaultSynologyChatTemplate;
									}}
								>
									填入模板
								</Button>
							</div>
							<Textarea
								id="synology-chat-template"
								bind:value={store.webhookSynologyChatTemplate}
								rows={8}
								placeholder={store.defaultSynologyChatTemplate}
								class="font-mono text-xs"
							/>
							<div class="text-muted-foreground space-y-1 text-sm">
								<p>
									这是纯文本模板，不会按 Markdown 解析；可直接使用群晖表情短码，例如 <code
										>:loudspeaker:</code
									>、<code>:mailbox_closed:</code>。
								</p>
								<p>
									支持占位符：&#123;&#123;title&#125;&#125;、&#123;&#123;content&#125;&#125;、&#123;&#123;source&#125;&#125;、&#123;&#123;channel&#125;&#125;、&#123;&#123;event&#125;&#125;、&#123;&#123;sent_at&#125;&#125;；&#123;&#123;content&#125;&#125;
									会自动移除 Markdown 标记。
								</p>
								<p>
									留空时使用默认模板：<code
										>:loudspeaker: ------&#123;&#123;title&#125;&#125;------ :loudspeaker:</code
									> 后换行显示正文。
								</p>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- 通用配置 -->
			{#if store.activeChannel !== 'none'}
				<div class="space-y-4">
					<h3 class="text-base font-semibold">推送设置</h3>

					<div class="space-y-2">
						<Label for="min-videos">最小视频数阈值</Label>
						<Input
							id="min-videos"
							type="number"
							bind:value={store.minVideos}
							min="1"
							max="100"
							placeholder="1"
						/>
						<p class="text-muted-foreground text-sm">
							只有新增视频数量达到此阈值时才会发送推送通知
						</p>
					</div>
				</div>
			{/if}

			<!-- 测试推送 -->
			{#if store.activeChannel !== 'none'}
				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
				>
					<h4 class="mb-3 font-medium text-blue-800 dark:text-blue-400">测试推送</h4>
					<p class="mb-3 text-sm text-blue-700 dark:text-blue-300">
						发送一条测试消息到您的推送接收端，验证配置是否正确。测试会优先使用当前输入内容（未保存也可测试）。
					</p>
					<Button type="button" variant="outline" size="sm" onclick={() => store.test()}>
						发送测试推送
					</Button>
				</div>
			{/if}

			<!-- 使用说明 -->
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
			>
				<h4 class="mb-3 font-medium text-gray-800 dark:text-gray-200">使用说明</h4>

				<div class="space-y-4">
					<!-- Telegram说明 -->
					<div>
						<p class="mb-2 font-medium text-gray-700 dark:text-gray-300">✈️ Telegram 配置</p>
						<ol class="list-inside list-decimal space-y-2 text-sm text-gray-600 dark:text-gray-400">
							<li>
								在 Telegram 中找 <a
									href="https://t.me/BotFather"
									target="_blank"
									class="text-primary hover:underline">@BotFather</a
								> 创建机器人，获取 Bot Token
							</li>
							<li>把机器人拉进目标群组/频道，或先与机器人私聊</li>
							<li>填写 Chat ID（群组/频道通常以 -100 开头）</li>
							<li>如访问 api.telegram.org 需要代理，可填写自定义 API 地址</li>
							<li>保存后使用测试按钮验证</li>
						</ol>
					</div>

					<!-- Webhook说明 -->
					<div>
						<p class="mb-2 font-medium text-gray-700 dark:text-gray-300">🔗 Webhook配置</p>
						<ol class="list-inside list-decimal space-y-2 text-sm text-gray-600 dark:text-gray-400">
							<li>准备可接收HTTP POST的Webhook地址</li>
							<li>将地址填入Webhook URL并保存</li>
							<li>如服务需要鉴权，填写Bearer Token</li>
							<li>使用测试按钮验证是否可收到推送</li>
						</ol>
					</div>

					<p class="text-sm text-gray-500 dark:text-gray-400">
						💡 选择一个渠道并配置后，扫描完成时将自动推送到该渠道
					</p>
				</div>
			</div>

			<!-- 推送内容示例 -->
			<div
				class="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/20"
			>
				<h4 class="mb-3 font-medium text-purple-800 dark:text-purple-400">推送内容示例</h4>
				<div class="space-y-2 font-mono text-sm text-purple-700 dark:text-purple-300">
					<p><strong>标题：</strong>扫描完成</p>
					<p><strong>内容：</strong></p>
					<div class="ml-4 space-y-1">
						<p>📊 扫描摘要</p>
						<p>- 扫描视频源: 5个</p>
						<p>- 新增视频: 12个</p>
						<p>- 扫描耗时: 3.5分钟</p>
						<p></p>
						<p>📹 新增视频详情</p>
						<p>🎬 收藏夹 - 我的收藏 (3个新视频)</p>
						<p>- 视频标题1 (BV1xx...)</p>
						<p>- 视频标题2 (BV1yy...)</p>
						<p>...</p>
					</div>
				</div>
			</div>
		</div>
		<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
			<Button type="submit" disabled={store.saving} class="w-full">
				{store.saving ? '保存中...' : '保存设置'}
			</Button>
		</SheetFooter>
	</form>
</ResponsiveSheet>
