import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import { normalizeNumberInput } from '$lib/utils/number';

export type NotificationChannel = 'none' | 'telegram' | 'webhook';
export type WebhookFormat = 'auto' | 'generic' | 'opensend' | 'custom' | 'synology_chat';

export type NotificationStatus = {
	configured: boolean;
	enabled: boolean;
	last_notification_time: string | null;
	total_notifications_sent: number;
	last_error: string | null;
} | null;

export const DEFAULT_WEBHOOK_CUSTOM_BODY = `{
  "source": "{{source}}",
  "title": "{{title}}",
  "content": "{{content}}",
  "channel": "{{channel}}",
  "event": "{{event}}",
  "sent_at": "{{sent_at}}"
}`;

export const DEFAULT_WEBHOOK_FORM_BODY = `message={{content_urlencoded}}`;

export const DEFAULT_SYNOLOGY_CHAT_TEMPLATE = `:loudspeaker: ------{{title}}------ :loudspeaker:
{{content}}`;

const DEFAULT_MIN_VIDEOS = 1;

/**
 * 推送通知设置域：状态 + 读取 / 保存 / 测试推送。
 */
export class NotificationSettingsStore {
	enabled = $state(false);
	activeChannel = $state<NotificationChannel>('none');
	minVideos = $state<number>(DEFAULT_MIN_VIDEOS);
	saving = $state(false);
	status = $state<NotificationStatus>(null);

	telegramBotToken = $state('');
	telegramChatId = $state('');
	telegramApiBase = $state('https://api.telegram.org');

	webhookUrl = $state('');
	webhookBearerToken = $state('');
	webhookCustomHeaders = $state('');
	webhookFormat = $state<WebhookFormat>('auto');
	webhookCustomBody = $state('');
	webhookSynologyChatTemplate = $state('');

	readonly defaultWebhookCustomBody = DEFAULT_WEBHOOK_CUSTOM_BODY;
	readonly defaultWebhookFormBody = DEFAULT_WEBHOOK_FORM_BODY;
	readonly defaultSynologyChatTemplate = DEFAULT_SYNOLOGY_CHAT_TEMPLATE;

	/** 加载推送状态（是否已配置 / 上次推送时间等） */
	async loadStatus(): Promise<void> {
		const response = await runRequest(() => api.getNotificationStatus(), {
			context: '加载推送通知状态失败',
			showErrorToast: false
		});
		if (!response?.data) return;

		this.status = response.data;
		this.enabled = response.data.enabled;
	}

	/** 加载推送渠道与 Telegram / Webhook 表单内容 */
	async loadConfig(): Promise<void> {
		const response = await runRequest(() => api.getNotificationConfig(), {
			context: '加载推送通知配置失败',
			showErrorToast: false
		});
		if (!response?.data) return;

		const data = response.data;
		this.activeChannel = (data.active_channel || 'none') as NotificationChannel;
		this.enabled = data.enable_scan_notifications;
		this.minVideos = data.notification_min_videos;

		this.telegramBotToken = data.telegram_bot_token || '';
		this.telegramChatId = data.telegram_chat_id || '';
		this.telegramApiBase = data.telegram_api_base || 'https://api.telegram.org';

		this.webhookUrl = data.webhook_url || '';
		this.webhookBearerToken = data.webhook_bearer_token || '';
		this.webhookCustomHeaders = data.webhook_custom_headers || '';
		this.webhookFormat = (data.webhook_format as WebhookFormat | undefined) || 'auto';
		this.webhookCustomBody = data.webhook_custom_body || '';
		this.webhookSynologyChatTemplate =
			data.webhook_synology_chat_template ||
			(this.webhookFormat === 'synology_chat' ? DEFAULT_SYNOLOGY_CHAT_TEMPLATE : '');
	}

	/** 按当前渠道保存推送配置 */
	async save(): Promise<void> {
		type NotificationUpdateConfig = Parameters<typeof api.updateNotificationConfig>[0];
		const payload: NotificationUpdateConfig = {
			active_channel: this.activeChannel,
			enable_scan_notifications: this.enabled,
			notification_min_videos: normalizeNumberInput(this.minVideos, DEFAULT_MIN_VIDEOS)
		};

		if (this.activeChannel === 'telegram') {
			payload.telegram_bot_token = this.telegramBotToken.trim();
			payload.telegram_chat_id = this.telegramChatId.trim();
			payload.telegram_api_base = this.telegramApiBase.trim();
		} else if (this.activeChannel === 'webhook') {
			payload.webhook_url = this.webhookUrl.trim();
			payload.webhook_bearer_token = this.webhookBearerToken.trim();
			payload.webhook_custom_headers = this.webhookCustomHeaders.trim();
			payload.webhook_format = this.webhookFormat;
			payload.webhook_custom_body = this.webhookCustomBody.trim();
			payload.webhook_synology_chat_template = this.webhookSynologyChatTemplate;
		}

		const response = await runRequest(() => api.updateNotificationConfig(payload), {
			setLoading: (value) => (this.saving = value),
			context: '保存推送通知配置失败'
		});
		if (!response) return;

		toast.success('推送通知配置已保存');
		await this.loadStatus();
	}

	/** 用当前输入内容发送测试推送（未保存也可测试） */
	async test(): Promise<void> {
		type TestNotificationParams = Parameters<typeof api.testNotification>[0];
		const request: TestNotificationParams = {
			active_channel: this.activeChannel
		};

		if (this.activeChannel === 'telegram') {
			request.telegram_bot_token = this.telegramBotToken.trim();
			request.telegram_chat_id = this.telegramChatId.trim();
			request.telegram_api_base = this.telegramApiBase.trim();
		} else if (this.activeChannel === 'webhook') {
			request.webhook_url = this.webhookUrl.trim();
			request.webhook_bearer_token = this.webhookBearerToken.trim();
			request.webhook_custom_headers = this.webhookCustomHeaders.trim();
			request.webhook_format = this.webhookFormat;
			request.webhook_custom_body = this.webhookCustomBody.trim();
			request.webhook_synology_chat_template = this.webhookSynologyChatTemplate;
		}

		const response = await runRequest(() => api.testNotification(request), {
			context: '测试推送失败'
		});
		if (!response) return;

		if (response.data.success) {
			toast.success('测试推送发送成功', { description: '请检查您的推送接收端' });
		} else {
			toast.error('测试推送失败', { description: response.data.message });
		}
	}
}
