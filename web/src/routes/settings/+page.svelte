<script lang="ts">
	import api from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { CustomSelect } from '$lib/components/ui/select';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import QrLogin from '$lib/components/qr-login.svelte';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';
	import DatabaseSheet from '$lib/components/settings/database-sheet.svelte';
	import AiRenameSheet from '$lib/components/settings/ai-rename-sheet.svelte';
	import NamingSheet from '$lib/components/settings/naming-sheet.svelte';
	import QualitySheet from '$lib/components/settings/quality-sheet.svelte';
	import DownloadSheet from '$lib/components/settings/download-sheet.svelte';
	import Aria2Sheet from '$lib/components/settings/aria2-sheet.svelte';
	import SystemSheet from '$lib/components/settings/system-sheet.svelte';
	import CaptchaSheet from '$lib/components/settings/captcha-sheet.svelte';
	import SectionHeader from '$lib/components/section-header.svelte';
	import { setBreadcrumb } from '$lib/stores/breadcrumb';
	import type {
		ConfigResponse,
		CredentialRefreshTestResponse,
		FilenamePreviewResponse,
		UserInfo,
		UpdateConfigRequest
	} from '$lib/types';
	import {
		DownloadIcon,
		FileTextIcon,
		KeyIcon,
		MessageSquareIcon,
		MonitorIcon,
		SettingsIcon,
		ShieldIcon,
		VideoIcon,
		BellIcon,
		SparklesIcon,
		RefreshCwIcon,
		DatabaseIcon,
		EyeIcon,
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { runRequest } from '$lib/utils/request.js';
	import { IsMobile, IsTablet } from '$lib/hooks/is-mobile.svelte.js';
	import Loading from '$lib/components/ui/Loading.svelte';

	let config: ConfigResponse | null = null;
	let loading = false;
	let saving = false;

	// 控制各个抽屉的开关状态
	let openSheet: string | null = null;

	// 获取代理后的图片URL
	function getProxiedImageUrl(originalUrl: string): string {
		if (!originalUrl) return '';
		// 使用后端代理端点
		return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
	}

	// 设置分类
	const settingCategories = [
		{
			id: 'naming',
			title: '文件命名',
			description: '配置视频、分页、番剧等文件命名模板',
			icon: FileTextIcon
		},
		{
			id: 'quality',
			title: '视频质量',
			description: '设置视频/音频质量、编解码器等参数',
			icon: VideoIcon
		},
		{
			id: 'download',
			title: '下载设置',
			description: '并行下载、并发控制、速率限制配置',
			icon: DownloadIcon
		},
		{
			id: 'danmaku',
			title: '弹幕设置',
			description: '弹幕显示样式和布局参数',
			icon: MessageSquareIcon
		},
		{
			id: 'credential',
			title: 'B站凭证',
			description: '配置B站登录凭证信息',
			icon: KeyIcon
		},




		{
			id: 'risk',
			title: '风控配置',
			description: 'UP主投稿获取风控策略',
			icon: ShieldIcon
		},
		{
			id: 'captcha',
			title: '验证码风控',
			description: 'v_voucher验证码风控配置',
			icon: ShieldIcon
		},
		{
			id: 'aria2',
			title: 'Aria2监控',
			description: '下载器健康检查和自动重启配置',
			icon: MonitorIcon
		},
		{
			id: 'notification',
			title: '推送通知',
			description: '扫描完成推送、Telegram/Webhook 配置',
			icon: BellIcon
		},
		{
			id: 'ai_rename',
			title: 'AI重命名',
			description: '使用AI自动重命名下载的视频文件',
			icon: SparklesIcon
		},
		{
			id: 'database',
			title: '数据库管理',
			description: '查看数据库状态，清理缓存与孤立记录',
			icon: DatabaseIcon
		},
		{
			id: 'system',
			title: '系统设置',
			description: '扫描间隔等其他设置',
			icon: SettingsIcon
		}
	];

	const settingTooltips = {
		naming: '调整视频、分页、番剧等文件命名规则，以及目录结构和媒体库兼容方式。',
		quality: '限制视频与音频清晰度、编码格式和优先选择范围。',
		download: '控制下载并发、速率限制、任务执行方式和下载器行为。',
		danmaku: '配置弹幕文件的显示样式、布局参数和同步策略。',
		credential: '填写 B 站登录凭证，影响会员画质、互动内容和受限接口访问。',
		risk: '调整投稿源扫描时的风控规避策略、批量设置和延迟参数。',
		captcha: '设置遇到验证码风控时的处理模式、超时和自动识别参数。',
		aria2: '配置外部 Aria2 的健康检查、自动重启和监控策略。',
		notification: '配置扫描完成后的推送渠道、测试发送和通知内容。',
		ai_rename: '配置 AI 自动重命名的启用范围、提示词和相关行为。',
		system: '调整扫描间隔、监听端口、路径模板和基础系统行为。',
		database:
			'查看数据库文件信息与各表数据量；可清理图片代理缓存、AI 对话历史、任务队列历史与孤立记录，执行 VACUUM 压缩或备份数据库。'
	} as const;

	function getSettingTooltip(id: string) {
		return settingTooltips[id as keyof typeof settingTooltips] ?? '';
	}

	const DEFAULT_CONFIG_VALUES = {
		interval: 1200,
		nfoIncludeGenre: true,
		bindAddress: '0.0.0.0:12345',
		parallelDownloadThreads: 4,
		codecs: ['AVC', 'HEV', 'AV1'],
		danmakuDuration: 15.0,
		danmakuFontSize: 25,
		danmakuWidthRatio: 1.2,
		danmakuHorizontalGap: 20.0,
		danmakuLaneSize: 32,
		danmakuFloatPercentage: 0.5,
		danmakuBottomPercentage: 0.3,
		danmakuOpacity: 76,
		danmakuOutline: 0.8,
		danmakuTimeOffset: 0.0,
		danmakuUpdateFreshDays: 3,
		danmakuUpdateFreshIntervalHours: 6,
		danmakuUpdateMatureDays: 30,
		danmakuUpdateMatureIntervalDays: 3,
		danmakuUpdateColdDays: 180,
		danmakuUpdateColdIntervalDays: 30,
		concurrentVideo: 3,
		concurrentPage: 2,
		rateLimit: 4,
		rateDuration: 250,
		largeSubmissionThreshold: 80,
		baseRequestDelay: 1000,
		largeSubmissionDelayMultiplier: 2,
		maxDelayMultiplier: 4,
		batchSize: 3,
		batchDelaySeconds: 2,
		autoBackoffBaseSeconds: 10,
		autoBackoffMaxMultiplier: 5,
		sourceDelaySeconds: 2,
		submissionSourceDelaySeconds: 5,
		dynamicApiDelayMultiplier: 1.5,
		largeSourceDownloadThreshold: 1000,
		largeSourceDownloadPageThreshold: 1000,
		largeSourceMaxVideosPerRound: 0,
		largeSourceMaxPagesPerRound: 2000,
		largeSourceConcurrentVideo: 1,
		largeSourceConcurrentPage: 1,
		largeSourcePlayurlLimit: 1,
		largeSourcePlayurlDurationMs: 1000,
		aria2HealthCheckInterval: 300,
		riskControlTimeout: 300,
		autoSolveMaxRetries: 3,
		autoSolveTimeout: 120,
		aiRenameTimeoutSeconds: 20,
		notificationMinVideos: 1
	} as const;

	function normalizeNumberInput(value: unknown, fallback: number): number {
		if (typeof value === 'number' && Number.isFinite(value)) {
			return value;
		}

		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed) {
				const parsed = Number(trimmed);
				if (Number.isFinite(parsed)) {
					return parsed;
				}
			}
		}

		return fallback;
	}

	// 并发提示用：输入框可能是空串/0/负数，统一兜成默认值，避免界面上算出 NaN 或 0
	function normalizeConcurrencyValue(value: unknown, fallback: number): number {
		const parsed = normalizeNumberInput(value, fallback);
		return parsed > 0 ? parsed : fallback;
	}

	// 表单数据
	let videoName = '{{upper_name}}';
	let pageName = '{{pubtime}}-{{bvid}}';
	let multiPageName = 'P{{pid_pad}}.{{ptitle}}';
	let bangumiName = '{{title}} S{{season_pad}}E{{pid_pad}} - {{ptitle}}';
	let folderStructure = 'Season {{season_pad}}';
	let bangumiFolderName = '{{title}}';
	let collectionFolderMode = 'unified';
	let collectionUnifiedName =
		'S01E{{episode_pad}}{{#if is_multi_page}}P{{pid_pad}}{{/if}} - {{title}}';
	let timeFormat = '%Y%m%d%H%M%S';
	let interval = 1200;
	let nfoTimeType = 'favtime';
	let nfoIncludeGenre = true;
	let bindAddress = '0.0.0.0:12345';
	let parallelDownloadEnabled = false;
	let parallelDownloadThreads = 4;
	let parallelDownloadUseAria2 = false;

	// 视频质量设置
	let videoMaxQuality = 'Quality8k';
	let videoMinQuality = 'Quality360p';
	let audioMaxQuality = 'QualityHiRES';
	let audioMinQuality = 'Quality64k';
	let codecs = ['AVC', 'HEV', 'AV1'];
	let noDolbyVideo = false;
	let noDolbyAudio = false;
	let noHdr = false;
	let noHires = false;

	// 弹幕设置
	let danmakuDuration = 15.0;
	let danmakuFont = '黑体';
	let danmakuFontSize = 25;
	let danmakuWidthRatio = 1.2;
	let danmakuHorizontalGap = 20.0;
	let danmakuLaneSize = 32;
	let danmakuFloatPercentage = 0.5;
	let danmakuBottomPercentage = 0.3;
	let danmakuOpacity = 76;
	let danmakuBold = true;
	let danmakuOutline = 0.8;
	let danmakuTimeOffset = 0.0;
	let danmakuUpdateEnabled = false;
	let danmakuUpdateFreshDays = 3;
	let danmakuUpdateFreshIntervalHours = 6;
	let danmakuUpdateMatureDays = 30;
	let danmakuUpdateMatureIntervalDays = 3;
	let danmakuUpdateColdDays = 180;
	let danmakuUpdateColdIntervalDays = 30;

	// 并发控制设置
	let concurrentVideo = 3;
	let concurrentPage = 2;
	let rateLimit = 4;
	let rateDuration = 250;

	// 「下载线程数」兜底后的值（空/0 时按默认 4 处理）
	$: effectiveDownloadThreads = normalizeConcurrencyValue(parallelDownloadThreads, 4);
	// 单文件最多使用的连接数
	$: effectiveMaxFileConnections = effectiveDownloadThreads;
	// 预估最大连接数（理论峰值）= 单文件最多连接数 × 同时处理视频数 × 每视频并发分页数
	$: effectiveConcurrentVideo = normalizeConcurrencyValue(concurrentVideo, 3);
	$: effectiveConcurrentPage = normalizeConcurrencyValue(concurrentPage, 2);
	$: estimatedMaxConnections =
		effectiveMaxFileConnections * effectiveConcurrentVideo * effectiveConcurrentPage;

	// 其他设置
	let cdnSorting = false;
	let scanDeletedVideos = false;
	let upperPath = ''; // UP主头像保存路径
	let favoriteQuickSubscribePath = ''; // 添加源页：收藏夹快捷订阅路径模板
	let collectionQuickSubscribePath = ''; // 添加源页：合集快捷订阅路径模板
	let submissionQuickSubscribePath = ''; // 添加源页：UP主投稿快捷订阅路径模板
	let bangumiQuickSubscribePath = ''; // 添加源页：番剧快捷订阅路径模板
	let pugvQuickSubscribePath = ''; // 添加源页：课程快捷订阅路径模板
	let ffmpegPath = ''; // ffmpeg可执行路径（文件或目录）

	// B站凭证设置
	let sessdata = '';
	let biliJct = '';
	let buvid3 = '';
	let dedeUserId = '';
	let acTimeValue = '';
	let buvid4 = '';
	let dedeUserIdCkMd5 = '';
	let credentialSaving = false;
	let credentialRefreshTesting = false;
	let credentialRefreshForceTesting = false;
	let credentialRefreshTestResult: CredentialRefreshTestResponse | null = null;
	let currentUser: UserInfo | null = null;

	// UP主投稿风控配置
	let largeSubmissionThreshold = 100;
	let baseRequestDelay = 200;
	let largeSubmissionDelayMultiplier = 2;

	// 风控验证配置
	let riskControlEnabled = false;
	let riskControlMode = 'manual';
	let riskControlTimeout = 300;
	let isSaving = false;

	// 自动验证配置
	let autoSolveService = '2captcha';
	let autoSolveApiKey = '';
	let autoSolveMaxRetries = 3;
	let autoSolveTimeout = 300;
	let enableProgressiveDelay = true;
	let maxDelayMultiplier = 4;
	let enableIncrementalFetch = true;
	let incrementalFallbackToFull = true;
	let enableBatchProcessing = false;
	let batchSize = 5;
	let batchDelaySeconds = 2;
	let enableAutoBackoff = true;
	let autoBackoffBaseSeconds = 10;
	let autoBackoffMaxMultiplier = 5;
	let sourceDelaySeconds = 2;
	let submissionSourceDelaySeconds = 5;
	let enableDynamicApiDelay = true;
	let dynamicApiDelayMultiplier = 1.5;
	let enableLargeSourceDownloadLimit = true;
	let largeSourceDownloadThreshold = 1000;
	let largeSourceDownloadPageThreshold = 1000;
	let largeSourceMaxVideosPerRound = 0;
	let largeSourceMaxPagesPerRound = 2000;
	let largeSourceConcurrentVideo = 1;
	let largeSourceConcurrentPage = 1;
	let largeSourcePlayurlLimit = 1;
	let largeSourcePlayurlDurationMs = 1000;
	let audioOnlyUseLowQnForPlayurl = true;

	// aria2监控配置
	let enableAria2HealthCheck = false;
	let enableAria2AutoRestart = false;
	let aria2HealthCheckInterval = 300;


	// 多P视频目录结构配置
	let multiPageUseSeasonStructure = false;

	// 合集目录结构配置
	let collectionUseSeasonStructure = false;

	// 番剧目录结构配置
	let bangumiUseSeasonStructure = false;

	// 推送通知配置
	let notificationEnabled = false;
	let activeNotificationChannel: 'none' | 'telegram' | 'webhook' = 'none';
	let telegramBotToken = '';
	let telegramChatId = '';
	let telegramApiBase = 'https://api.telegram.org';
	let webhookUrl = '';
	let webhookBearerToken = '';
	let webhookCustomHeaders = '';
	let webhookFormat: 'auto' | 'generic' | 'opensend' | 'custom' | 'synology_chat' = 'auto';
	let webhookCustomBody = '';
	let webhookSynologyChatTemplate = '';
	let notificationMinVideos = 1;
	let notificationSaving = false;
	let notificationStatus: {
		configured: boolean;
		enabled: boolean;
		last_notification_time: string | null;
		total_notifications_sent: number;
		last_error: string | null;
	} | null = null;

	// AI重命名配置
	let aiRenameEnabled = false;
	let aiRenameProvider = 'deepseek';
	let aiRenameBaseUrl = 'https://api.deepseek.com/v1';
	let aiRenameApiKey = '';
	let aiRenameModel = 'deepseek-v4-flash';
	let aiRenameTimeoutSeconds = 30;
	let aiRenameVideoPromptHint = '';
	let aiRenameAudioPromptHint = '';
	let aiRenameRenameParentDir = false;
	let aiRenameSaving = false;
	let aiRenameClearingCache = false;
	let aiRenameModels: string[] = [];
	let aiRenameModelsLoading = false;

	// 数据库管理
	let databaseStatus: {
		path: string;
		db_size_bytes: number;
		wal_size_bytes: number;
		reclaimable_bytes: number;
		tables: { table: string; rows: number; label: string }[];
	} | null = null;
	let databaseLoading = false;
	let databaseActionRunning = false;
	let databaseAction: {
		action:
			| 'clear_image_cache'
			| 'clear_ai_history'
			| 'clear_queue_history'
			| 'clean_orphans'
			| 'vacuum'
			| 'backup'
			| 'clean_logs';
		label: string;
		description: string;
		danger: boolean;
		keepDays: number;
	} | null = null;

	let databaseBackups: {
		name: string;
		path: string;
		size_bytes: number;
		created_at: string;
		is_import: boolean;
	}[] = [];
	let databaseBackupsLoading = false;
	let restoreTarget: { name: string; size_bytes: number; created_at: string } | null = null;
	let restoreRunning = false;
	let importFileInput: HTMLInputElement | undefined;
	let importRestoreTarget: { file: File; name: string; size_bytes: number } | null = null;
	let importRestoreRunning = false;

	const defaultWebhookCustomBody = `{
  "source": "{{source}}",
  "title": "{{title}}",
  "content": "{{content}}",
  "channel": "{{channel}}",
  "event": "{{event}}",
  "sent_at": "{{sent_at}}"
}`;
	const defaultWebhookFormBody = `message={{content_urlencoded}}`;
	const defaultSynologyChatTemplate = `:loudspeaker: ------{{title}}------ :loudspeaker:
{{content}}`;

	// 显示帮助信息的状态（在文件命名抽屉中使用）
	let showHelp = false;

	const danmakuUpdateHelp = {
		section:
			'已下载分页会按视频发布时间分阶段刷新弹幕。新鲜期刷新更频繁，成熟期和老化期逐步放缓，超过老化期后会进入冷冻阶段并停止后台轮询。',
		freshDays: '视频发布后，落在这个天数范围内的分页会被视为新鲜期。',
		freshIntervalHours: '新鲜期内后台检查弹幕更新的间隔，单位是小时。',
		matureDays: '超过新鲜期、但还没达到这个天数的分页会进入成熟期。',
		matureIntervalDays: '成熟期内后台检查弹幕更新的间隔，单位是天。',
		coldDays: '超过成熟期、但还没达到这个天数的分页会进入老化期；再往后会停止后台轮询。',
		coldIntervalDays: '老化期内后台检查弹幕更新的间隔，单位是天。'
	};

	// 验证相关状态
	let pageNameError = '';
	let pageNameValid = true;
	let multiPageNameError = '';
	let multiPageNameValid = true;
	let collectionUnifiedNameError = '';
	let collectionUnifiedNameValid = true;
	let bindAddressError = '';
	let bindAddressValid = true;
	let filenamePreview: FilenamePreviewResponse | null = null;
	let filenamePreviewLoading = false;
	let filenamePreviewError = '';
	let filenamePreviewTimer: ReturnType<typeof setTimeout> | null = null;
	let filenamePreviewRequestId = 0;
	let filenamePreviewSignature = '';

	// 互斥逻辑：视频文件名模板 vs 多P视频文件名模板
	let videoNameHasPath = false;
	let multiPageNameHasPath = false;

	// 变量说明
	const variableHelp = {
		video: [
			{
				name: '{{title}}',
				desc: '视频标题'
			},
			{ name: '{{show_title}}', desc: '节目标题（与title相同）' },
			{ name: '{{bvid}}', desc: 'BV号（视频编号）' },
			{ name: '{{upper_name}}', desc: 'UP主名称' },
			{ name: '{{upper_mid}}', desc: 'UP主ID' },
			{ name: '{{pubtime}}', desc: '视频发布时间' },
			{ name: '{{fav_time}}', desc: '视频收藏时间' },
			{ name: '{{ctime}}', desc: '视频创建时间' }
		],
		page: [
			{
				name: '{{title}}',
				desc: '视频标题（单P/多P模板可用）'
			},
			{ name: '{{bvid}}', desc: 'BV号（视频编号，单P/多P模板可用）' },
			{ name: '{{upper_name}}', desc: 'UP主名称（单P/多P模板可用）' },
			{ name: '{{upper_mid}}', desc: 'UP主ID（单P/多P模板可用）' },
			{ name: '{{pubtime}}', desc: '视频发布时间（单P/多P模板可用）' },
			{ name: '{{fav_time}}', desc: '视频收藏时间（单P/多P模板可用）' },
			{ name: '{{show_title}}', desc: '节目标题（与title相同）' },
			{ name: '{{ptitle}}', desc: '分页标题（页面名称）' },
			{ name: '{{long_title}}', desc: '分页长标题（非番剧可用）' },
			{ name: '{{pid}}', desc: '分页页号' },
			{ name: '{{pid_pad}}', desc: '补零的分页页号（如001、002）' },
			{ name: '{{episode}}', desc: '剧集号（番剧/重命名/合集统一模式可用）' },
			{ name: '{{episode_pad}}', desc: '补零的剧集号（番剧/重命名/合集统一模式可用）' },
			{ name: '{{is_multi_page}}', desc: '是否多P视频（合集统一模式可用）' },
			{ name: '{{season}}', desc: '季度号（番剧/多P视频可用）' },
			{ name: '{{season_pad}}', desc: '补零的季度号（番剧/多P视频可用）' },
			{ name: '{{series_title}}', desc: '番剧系列标题（仅番剧可用）' },
			{ name: '{{version}}', desc: '番剧版本信息（仅番剧可用）' },
			{ name: '{{year}}', desc: '发布年份（番剧/多P视频可用）' },
			{ name: '{{studio}}', desc: '制作公司/UP主名称（番剧/多P视频可用）' },
			{ name: '{{actors}}', desc: '演员信息（番剧/多P视频可用）' },
			{ name: '{{share_copy}}', desc: '分享文案（番剧/多P视频可用）' },
			{ name: '{{category}}', desc: '视频分类' },
			{ name: '{{content_type}}', desc: '内容类型（仅番剧可用）' },
			{ name: '{{status}}', desc: '播出状态（仅番剧可用）' },
			{ name: '{{ep_id}}', desc: '剧集ID（仅番剧可用）' },
			{ name: '{{season_id}}', desc: '季度ID（仅番剧可用）' },
			{ name: '{{resolution}}', desc: '视频分辨率（番剧/多P视频可用）' },
			{ name: '{{duration}}', desc: '视频时长（仅重命名可用）' },
			{ name: '{{width}}', desc: '视频宽度（仅重命名可用）' },
			{ name: '{{height}}', desc: '视频高度（仅重命名可用）' }
		],
		common: [
			{ name: '{{truncate title 10}}', desc: '截取函数示例：截取标题前10个字符' },
			{
				name: '{{truncate_bytes title 200}}',
				desc: '按 UTF-8 字节截取（中文约3字节/字）：把变量字节数控制在 200 以内，避免整个文件名超过 255 字节'
			},
			{
				name: '自动截断',
				desc: '生成的文件名超过 255 字节（中文按字节计）时会自动按字节智能截断并预留后缀空间，无需手动处理'
			},
			{ name: '路径分隔符', desc: '支持使用 / 或 \\\\ 创建子文件夹' }
		],
		time: [
			{ name: '%Y', desc: '年份（如2023）' },
			{ name: '%m', desc: '月份（如01-12）' },
			{ name: '%d', desc: '日期（如01-31）' },
			{ name: '%H', desc: '小时（如00-23）' },
			{ name: '%M', desc: '分钟（如00-59）' },
			{ name: '%S', desc: '秒数（如00-59）' }
		]
	};

	// NFO 时间类型选项
	const nfoTimeTypeOptions = [
		{ value: 'favtime', label: '收藏时间' },
		{ value: 'pubtime', label: '发布时间' }
	];

	// 视频质量选项
	const videoQualityOptions = [
		{ value: 'Quality8k', label: '8K超高清' },
		{ value: 'QualityDolby', label: '杜比视界' },
		{ value: 'QualityHdr', label: 'HDR真彩' },
		{ value: 'Quality4k', label: '4K超高清' },
		{ value: 'Quality1080p60', label: '1080P 60fps' },
		{ value: 'Quality1080pPLUS', label: '1080P+高码率' },
		{ value: 'Quality1080p', label: '1080P高清' },
		{ value: 'Quality720p', label: '720P高清' },
		{ value: 'Quality480p', label: '480P清晰' },
		{ value: 'Quality360p', label: '360P流畅' }
	];

	// 音频质量选项
	const audioQualityOptions = [
		{ value: 'QualityHiRES', label: 'Hi-Res无损' },
		{ value: 'Quality192k', label: '192K高品质' },
		{ value: 'QualityDolby', label: '杜比全景声' },
		{ value: 'Quality132k', label: '132K标准' },
		{ value: 'Quality64k', label: '64K省流' }
	];

	// 编解码器选项
	const codecOptions = [
		{ value: 'AVC', label: 'AVC/H.264' },
		{ value: 'HEV', label: 'HEVC/H.265' },
		{ value: 'AV1', label: 'AV1' }
	];

	// 响应式相关
	const isMobileQuery = new IsMobile();
	const isTabletQuery = new IsTablet();
	let isMobile: boolean = false;
	let isTablet: boolean = false;
	// eslint-disable-next-line svelte/no-immutable-reactive-statements
	$: isMobile = isMobileQuery.current;
	// eslint-disable-next-line svelte/no-immutable-reactive-statements
	$: isTablet = isTabletQuery.current;

	// 拖拽排序相关
	let draggedIndex: number | null = null;

	function handleDragStart(e: DragEvent, index: number) {
		if (e.dataTransfer) {
			draggedIndex = index;
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/html', '');
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDrop(e: DragEvent, dropIndex: number) {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== dropIndex) {
			const newCodecs = [...codecs];
			const draggedItem = newCodecs[draggedIndex];
			newCodecs.splice(draggedIndex, 1);
			newCodecs.splice(dropIndex, 0, draggedItem);
			codecs = newCodecs;
		}
		draggedIndex = null;
	}

	function removeCodec(index: number) {
		codecs = codecs.filter((_, i) => i !== index);
	}

	onMount(async () => {
		setBreadcrumb([
			{ label: '主页', href: '/' },
			{ label: '设置', isActive: true }
		]);

		await loadConfig();
		// 检查当前用户信息
		await checkCurrentUser();
		// 加载推送通知状态
		await loadNotificationStatus();
		// 加载推送通知配置
		await loadNotificationConfig();
	});

	async function loadConfig() {
		const response = await runRequest(() => api.getConfig(), {
			setLoading: (value) => (loading = value),
			context: '加载配置失败'
		});
		if (!response) return;

		config = response.data;

		// 填充表单
		videoName = config.video_name || '';
		pageName = config.page_name || '';
		multiPageName = config.multi_page_name || '';
		bangumiName = config.bangumi_name || '';
		folderStructure = config.folder_structure || '';
		bangumiFolderName = config.bangumi_folder_name || '{{title}}';
		collectionFolderMode = config.collection_folder_mode || 'separate';
		collectionUnifiedName = config.collection_unified_name || collectionUnifiedName;
		timeFormat = config.time_format || '';
		interval = config.interval || 1200;
		nfoTimeType = config.nfo_time_type || 'favtime';
		nfoIncludeGenre = config.nfo_include_genre ?? DEFAULT_CONFIG_VALUES.nfoIncludeGenre;
		bindAddress = config.bind_address || '0.0.0.0:12345';
		parallelDownloadEnabled = config.parallel_download_enabled || false;
		parallelDownloadThreads = config.parallel_download_threads || 4;
		parallelDownloadUseAria2 = config.parallel_download_use_aria2 ?? false;

		// 视频质量设置
		videoMaxQuality = config.video_max_quality || 'Quality8k';
		videoMinQuality = config.video_min_quality || 'Quality360p';
		audioMaxQuality = config.audio_max_quality || 'QualityHiRES';
		audioMinQuality = config.audio_min_quality || 'Quality64k';
		codecs = config.codecs || ['AVC', 'HEV', 'AV1'];
		noDolbyVideo = config.no_dolby_video || false;
		noDolbyAudio = config.no_dolby_audio || false;
		noHdr = config.no_hdr || false;
		noHires = config.no_hires || false;

		// 弹幕设置
		danmakuDuration = config.danmaku_duration || 15.0;
		danmakuFont = config.danmaku_font || '黑体';
		danmakuFontSize = config.danmaku_font_size || 25;
		danmakuWidthRatio = config.danmaku_width_ratio || 1.2;
		danmakuHorizontalGap = config.danmaku_horizontal_gap || 20.0;
		danmakuLaneSize = config.danmaku_lane_size || 32;
		danmakuFloatPercentage = config.danmaku_float_percentage || 0.5;
		danmakuBottomPercentage = config.danmaku_bottom_percentage || 0.3;
		danmakuOpacity = config.danmaku_opacity || 76;
		danmakuBold = config.danmaku_bold !== undefined ? config.danmaku_bold : true;
		danmakuOutline = config.danmaku_outline || 0.8;
		danmakuTimeOffset = config.danmaku_time_offset || 0.0;
		danmakuUpdateEnabled = config.danmaku_update_enabled ?? false;
		danmakuUpdateFreshDays = config.danmaku_update_fresh_days ?? 3;
		danmakuUpdateFreshIntervalHours = config.danmaku_update_fresh_interval_hours ?? 6;
		danmakuUpdateMatureDays = config.danmaku_update_mature_days ?? 30;
		danmakuUpdateMatureIntervalDays = config.danmaku_update_mature_interval_days ?? 3;
		danmakuUpdateColdDays = config.danmaku_update_cold_days ?? 180;
		danmakuUpdateColdIntervalDays = config.danmaku_update_cold_interval_days ?? 30;

		// 并发控制设置
		concurrentVideo = config.concurrent_video || 3;
		concurrentPage = config.concurrent_page || 2;
		rateLimit = config.rate_limit || 4;
		rateDuration = config.rate_duration || 250;

		// 其他设置
		cdnSorting = config.cdn_sorting || false;
		scanDeletedVideos = config.scan_deleted_videos || false;
		upperPath = config.upper_path || '';
		favoriteQuickSubscribePath = config.favorite_quick_subscribe_path || '';
		collectionQuickSubscribePath = config.collection_quick_subscribe_path || '';
		submissionQuickSubscribePath = config.submission_quick_subscribe_path || '';
		bangumiQuickSubscribePath = config.bangumi_quick_subscribe_path || '';
		pugvQuickSubscribePath = config.pugv_quick_subscribe_path || '';
		ffmpegPath = config.ffmpeg_path || '';

		// B站凭证设置
		sessdata = config.credential?.sessdata || '';
		biliJct = config.credential?.bili_jct || '';
		buvid3 = config.credential?.buvid3 || '';
		dedeUserId = config.credential?.dedeuserid || '';
		acTimeValue = config.credential?.ac_time_value || '';
		buvid4 = config.credential?.buvid4 || '';
		dedeUserIdCkMd5 = config.credential?.dedeuserid_ckmd5 || '';

		// UP主投稿风控配置
		largeSubmissionThreshold = config.large_submission_threshold || 100;
		baseRequestDelay = config.base_request_delay || 200;
		largeSubmissionDelayMultiplier = config.large_submission_delay_multiplier || 2;
		enableProgressiveDelay = config.enable_progressive_delay ?? true;
		maxDelayMultiplier = config.max_delay_multiplier || 4;
		enableIncrementalFetch = config.enable_incremental_fetch ?? true;
		incrementalFallbackToFull = config.incremental_fallback_to_full ?? true;
		enableBatchProcessing = config.enable_batch_processing || false;
		batchSize = config.batch_size || 5;
		batchDelaySeconds = config.batch_delay_seconds || 2;
		enableAutoBackoff = config.enable_auto_backoff ?? true;
		autoBackoffBaseSeconds = config.auto_backoff_base_seconds || 10;
		autoBackoffMaxMultiplier = config.auto_backoff_max_multiplier || 5;
		sourceDelaySeconds = config.source_delay_seconds ?? 2;
		submissionSourceDelaySeconds = config.submission_source_delay_seconds ?? 5;
		enableDynamicApiDelay = config.enable_dynamic_api_delay ?? true;
		dynamicApiDelayMultiplier = config.dynamic_api_delay_multiplier ?? 1.5;
		enableLargeSourceDownloadLimit = config.enable_large_source_download_limit ?? true;
		largeSourceDownloadThreshold =
			config.large_source_download_threshold ?? DEFAULT_CONFIG_VALUES.largeSourceDownloadThreshold;
		largeSourceDownloadPageThreshold =
			config.large_source_download_page_threshold ??
			DEFAULT_CONFIG_VALUES.largeSourceDownloadPageThreshold;
		largeSourceMaxVideosPerRound =
			config.large_source_max_videos_per_round ??
			DEFAULT_CONFIG_VALUES.largeSourceMaxVideosPerRound;
		largeSourceMaxPagesPerRound =
			config.large_source_max_pages_per_round ?? DEFAULT_CONFIG_VALUES.largeSourceMaxPagesPerRound;
		largeSourceConcurrentVideo =
			config.large_source_concurrent_video ?? DEFAULT_CONFIG_VALUES.largeSourceConcurrentVideo;
		largeSourceConcurrentPage =
			config.large_source_concurrent_page ?? DEFAULT_CONFIG_VALUES.largeSourceConcurrentPage;
		largeSourcePlayurlLimit =
			config.large_source_playurl_limit ?? DEFAULT_CONFIG_VALUES.largeSourcePlayurlLimit;
		largeSourcePlayurlDurationMs =
			config.large_source_playurl_duration_ms ?? DEFAULT_CONFIG_VALUES.largeSourcePlayurlDurationMs;
		audioOnlyUseLowQnForPlayurl = config.audio_only_use_low_qn_for_playurl ?? true;

		// 风控验证配置
		riskControlEnabled = config.risk_control?.enabled ?? false;
		riskControlMode = config.risk_control?.mode || 'manual';
		riskControlTimeout = config.risk_control?.timeout || 300;

		// 自动验证配置
		autoSolveService = config.risk_control?.auto_solve?.service || '2captcha';
		autoSolveApiKey = config.risk_control?.auto_solve?.api_key || '';
		autoSolveMaxRetries = config.risk_control?.auto_solve?.max_retries || 3;
		autoSolveTimeout = config.risk_control?.auto_solve?.solve_timeout || 300;

		// aria2监控配置
		enableAria2HealthCheck = config.enable_aria2_health_check ?? false;
		enableAria2AutoRestart = config.enable_aria2_auto_restart ?? false;
		aria2HealthCheckInterval = config.aria2_health_check_interval ?? 300;

		// 多P视频目录结构配置
		multiPageUseSeasonStructure = config.multi_page_use_season_structure ?? false;

		// 合集目录结构配置
		collectionUseSeasonStructure = config.collection_use_season_structure ?? false;

		// 番剧目录结构配置
		bangumiUseSeasonStructure = config.bangumi_use_season_structure ?? false;

		// AI重命名配置
		aiRenameEnabled = config.ai_rename?.enabled ?? false;
		aiRenameProvider = config.ai_rename?.provider === 'custom' ? 'custom' : 'deepseek';
		aiRenameBaseUrl = config.ai_rename?.base_url || 'https://api.deepseek.com/v1';
		aiRenameApiKey = config.ai_rename?.api_key || '';
		aiRenameModel = config.ai_rename?.model || 'deepseek-v4-flash';
		aiRenameTimeoutSeconds = config.ai_rename?.timeout_seconds ?? 30;
		aiRenameVideoPromptHint = config.ai_rename?.video_prompt_hint || '';
		aiRenameAudioPromptHint = config.ai_rename?.audio_prompt_hint || '';
		aiRenameRenameParentDir = config.ai_rename?.rename_parent_dir ?? false;
	}

	function scheduleFilenamePreview() {
		if (filenamePreviewTimer) {
			clearTimeout(filenamePreviewTimer);
		}
		filenamePreviewTimer = setTimeout(() => {
			void loadFilenamePreview();
		}, 300);
	}

	function getRequestErrorMessage(error: unknown) {
		if (error instanceof Error) return error.message;
		if (error && typeof error === 'object' && 'message' in error) {
			const message = (error as { message?: unknown }).message;
			if (typeof message === 'string') return message;
		}
		return '命名模板预览失败';
	}

	async function loadFilenamePreview() {
		if (!config || openSheet !== 'naming') return;

		const requestId = ++filenamePreviewRequestId;
		filenamePreviewLoading = true;
		filenamePreviewError = '';

		try {
			const response = await api.previewFilenameTemplates({
				video_name: videoName,
				page_name: pageName,
				multi_page_name: multiPageName,
				bangumi_name: bangumiName,
				folder_structure: folderStructure,
				bangumi_folder_name: bangumiFolderName,
				collection_folder_mode: collectionFolderMode,
				collection_unified_name: collectionUnifiedName,
				time_format: timeFormat,
				multi_page_use_season_structure: multiPageUseSeasonStructure,
				collection_use_season_structure: collectionUseSeasonStructure,
				bangumi_use_season_structure: bangumiUseSeasonStructure
			});
			if (requestId !== filenamePreviewRequestId) return;
			filenamePreview = response.data;
		} catch (error) {
			if (requestId !== filenamePreviewRequestId) return;
			filenamePreview = null;
			filenamePreviewError = getRequestErrorMessage(error);
		} finally {
			if (requestId === filenamePreviewRequestId) {
				filenamePreviewLoading = false;
			}
		}
	}

	$: {
		const nextSignature = JSON.stringify({
			openSheet,
			videoName,
			pageName,
			multiPageName,
			bangumiName,
			folderStructure,
			bangumiFolderName,
			collectionFolderMode,
			collectionUnifiedName,
			timeFormat,
			multiPageUseSeasonStructure,
			collectionUseSeasonStructure,
			bangumiUseSeasonStructure
		});
		if (config && openSheet === 'naming' && nextSignature !== filenamePreviewSignature) {
			filenamePreviewSignature = nextSignature;
			scheduleFilenamePreview();
		}
	}

	// 检查模板是否包含路径
	function hasPathSeparator(value: string) {
		return value.includes('/') || value.includes('\\');
	}

	// 仅检查 Handlebars 标签外的路径分隔符（避免把 {{/if}} 误判为路径）
	function hasPathSeparatorOutsideHandlebars(value: string) {
		let inTag = false;
		let tagEndLen = 0;

		for (let i = 0; i < value.length; i++) {
			if (!inTag && value[i] === '{' && value[i + 1] === '{') {
				let startLen = 2;
				while (i + startLen < value.length && value[i + startLen] === '{' && startLen < 4) {
					startLen++;
				}
				inTag = true;
				tagEndLen = startLen;
				i += startLen - 1;
				continue;
			}

			if (inTag) {
				const end = '}'.repeat(tagEndLen);
				if (tagEndLen > 0 && value.startsWith(end, i)) {
					inTag = false;
					tagEndLen = 0;
					i += end.length - 1;
				}
				continue;
			}

			if (value[i] === '/' || value[i] === '\\') return true;
		}

		return false;
	}

	// 验证单P视频文件名模板
	function validatePageName(value: string) {
		if (hasPathSeparatorOutsideHandlebars(value)) {
			pageNameError = '单P视频文件名模板不应包含路径分隔符 / 或 \\';
			pageNameValid = false;
			return false;
		}
		pageNameError = '';
		pageNameValid = true;
		return true;
	}

	// 验证多P视频文件名模板
	function validateMultiPageName(value: string) {
		if (hasPathSeparatorOutsideHandlebars(value)) {
			multiPageNameError = '多P视频文件名模板不应包含路径分隔符 / 或 \\';
			multiPageNameValid = false;
			return false;
		}
		multiPageNameError = '';
		multiPageNameValid = true;
		return true;
	}

	// 验证合集统一命名模板（统一模式/投稿源同UP分季生效）
	function validateCollectionUnifiedName(value: string) {
		const trimmed = value.trim();
		if (!trimmed) {
			collectionUnifiedNameError = '';
			collectionUnifiedNameValid = true;
			return true;
		}
		if (hasPathSeparatorOutsideHandlebars(trimmed)) {
			collectionUnifiedNameError = '合集统一命名模板不应包含路径分隔符 / 或 \\\\';
			collectionUnifiedNameValid = false;
			return false;
		}
		collectionUnifiedNameError = '';
		collectionUnifiedNameValid = true;
		return true;
	}

	// 验证服务器绑定地址
	function validateBindAddress(value: string) {
		const trimmedValue = value.trim();
		if (!trimmedValue) {
			bindAddressError = '';
			bindAddressValid = true;
			return true;
		}

		// 检查是否包含端口号
		if (trimmedValue.includes(':')) {
			// 格式：IP:端口
			const parts = trimmedValue.split(':');
			if (parts.length !== 2) {
				bindAddressError = '绑定地址格式错误，应为 "IP:端口" 或 "端口"';
				bindAddressValid = false;
				return false;
			}

			const port = parseInt(parts[1]);
			if (isNaN(port) || port < 1 || port > 65535) {
				bindAddressError = '端口号必须是1-65535之间的数字';
				bindAddressValid = false;
				return false;
			}
		} else {
			// 只有端口号
			const port = parseInt(trimmedValue);
			if (isNaN(port) || port < 1 || port > 65535) {
				bindAddressError = '端口号必须是1-65535之间的数字';
				bindAddressValid = false;
				return false;
			}
		}

		bindAddressError = '';
		bindAddressValid = true;
		return true;
	}

	// 实时校验端口输入
	$: validateBindAddress(bindAddress);

	// 互斥逻辑处理
	function handleVideoNameChange(value: string) {
		videoNameHasPath = hasPathSeparator(value);
		if (videoNameHasPath && multiPageNameHasPath) {
			// 如果视频文件名模板设置了路径，清空多P模板中的路径
			if (multiPageName.includes('/') || multiPageName.includes('\\')) {
				// 提取文件名部分，移除路径部分
				const parts = multiPageName.split(/[/\\]/);
				multiPageName = parts[parts.length - 1] || '{{title}}-P{{pid_pad}}';
				toast.info('已自动调整多P模板', {
					description: '移除了多P模板中的路径设置，避免冲突'
				});
			}
		}
	}

	function handleMultiPageNameChange(value: string) {
		validateMultiPageName(value);
		multiPageNameHasPath = hasPathSeparator(value);
		if (multiPageNameHasPath && videoNameHasPath) {
			// 如果多P模板设置了路径，清空视频文件名模板中的路径
			if (videoName.includes('/') || videoName.includes('\\')) {
				// 提取最后一个路径组件
				const parts = videoName.split(/[/\\]/);
				videoName = parts[parts.length - 1] || '{{title}}';
				toast.info('已自动调整视频模板', {
					description: '移除了视频模板中的路径设置，避免冲突'
				});
			}
		}
	}

	// 监听变化，实时验证和处理互斥
	$: {
		if (pageName) {
			validatePageName(pageName);
		}
		if (multiPageName) {
			validateMultiPageName(multiPageName);
		}
		if (collectionUnifiedName) {
			validateCollectionUnifiedName(collectionUnifiedName);
		}
		videoNameHasPath = hasPathSeparator(videoName);
		multiPageNameHasPath = hasPathSeparator(multiPageName);
	}

	// ===== 数据库管理 =====
	function formatBytes(bytes: number): string {
		if (!bytes || bytes <= 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const value = bytes / Math.pow(1024, index);
		return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
	}

	async function loadDatabaseStatus() {
		databaseLoading = true;
		try {
			const response = await runRequest(() => api.getDatabaseStatus(), {
				context: '获取数据库状态失败'
			});
			if (response) databaseStatus = response.data;
		} finally {
			databaseLoading = false;
		}
	}

	async function loadDatabaseBackups() {
		databaseBackupsLoading = true;
		try {
			const response = await runRequest(() => api.getDatabaseBackups(), {
				context: '获取数据库备份列表失败'
			});
			if (response) databaseBackups = response.data.backups;
		} finally {
			databaseBackupsLoading = false;
		}
	}

	async function confirmRestore(backup: { name: string; size_bytes: number; created_at: string }) {
		restoreTarget = backup;
	}

	async function runRestore() {
		if (!restoreTarget) return;
		const name = restoreTarget.name;
		restoreRunning = true;
		try {
			const response = await runRequest(() => api.restoreDatabase(name), {
				context: '恢复数据库失败'
			});
			if (response?.data?.success) {
				toast.success('恢复已安排', { description: response.data.message });
			} else if (response?.data) {
				toast.error('恢复失败', { description: response.data.message });
			}
		} finally {
			restoreRunning = false;
			restoreTarget = null;
		}
	}

	function selectImportFile() {
		importFileInput?.click();
	}

	function onImportFilePicked(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		importRestoreTarget = { file, name: file.name, size_bytes: file.size };
	}

	async function runImportRestore() {
		if (!importRestoreTarget) return;
		const target = importRestoreTarget;
		importRestoreRunning = true;
		try {
			const response = await runRequest(() => api.uploadRestoreBackup(target.file, target.name), {
				context: '导入备份包失败'
			});
			if (response?.data?.success) {
				toast.success('备份包已导入', { description: response.data.message });
				await loadDatabaseBackups();
			} else if (response?.data) {
				toast.error('导入备份包失败', { description: response.data.message });
			}
		} finally {
			importRestoreRunning = false;
			importRestoreTarget = null;
		}
	}

	function requestDatabaseAction(
		action:
			| 'clear_image_cache'
			| 'clear_ai_history'
			| 'clear_queue_history'
			| 'clean_orphans'
			| 'vacuum'
			| 'backup'
			| 'clean_logs',
		label: string,
		description: string,
		danger = false,
		keepDays = 7
	) {
		databaseAction = { action, label, description, danger, keepDays };
	}

	async function runDatabaseAction() {
		if (!databaseAction) return;
		const { action, label } = databaseAction;
		const keepDays = action === 'clean_logs' ? databaseAction.keepDays : undefined;
		databaseActionRunning = true;
		try {
			const response = await runRequest(() => api.runDatabaseMaintenance(action, keepDays), {
				context: `${label}失败`
			});
			if (response?.data?.success) {
				toast.success(`${label}成功`, { description: response.data.message });
				await loadDatabaseStatus();
			} else if (response?.data) {
				toast.error(`${label}失败`, { description: response.data.message });
			}
		} finally {
			databaseActionRunning = false;
			databaseAction = null;
		}
	}

	$: if (openSheet === 'database') {
		loadDatabaseStatus();
		loadDatabaseBackups();
	}


	async function saveConfig() {
		// 保存前验证
		if (!validatePageName(pageName)) {
			toast.error('配置验证失败', { description: pageNameError });
			return;
		}

		if (!validateMultiPageName(multiPageName)) {
			toast.error('配置验证失败', { description: multiPageNameError });
			return;
		}

		if (!validateCollectionUnifiedName(collectionUnifiedName)) {
			toast.error('配置验证失败', { description: collectionUnifiedNameError });
			return;
		}

		if (!validateBindAddress(bindAddress)) {
			toast.error('配置验证失败', { description: bindAddressError });
			return;
		}

		const params: UpdateConfigRequest = {
			video_name: videoName,
			page_name: pageName,
			multi_page_name: multiPageName,
			bangumi_name: bangumiName,
			folder_structure: folderStructure,
			bangumi_folder_name: bangumiFolderName,
			collection_folder_mode: collectionFolderMode,
			collection_unified_name: collectionUnifiedName,
			time_format: timeFormat,
			interval: normalizeNumberInput(interval, DEFAULT_CONFIG_VALUES.interval),
			nfo_time_type: nfoTimeType,
			nfo_include_genre: nfoIncludeGenre,
			bind_address: bindAddress,
			parallel_download_enabled: parallelDownloadEnabled,
			parallel_download_threads: normalizeNumberInput(
				parallelDownloadThreads,
				DEFAULT_CONFIG_VALUES.parallelDownloadThreads
			),
			parallel_download_use_aria2: parallelDownloadUseAria2,
			// 视频质量设置
			video_max_quality: videoMaxQuality,
			video_min_quality: videoMinQuality,
			audio_max_quality: audioMaxQuality,
			audio_min_quality: audioMinQuality,
			codecs: codecs.length > 0 ? codecs : [...DEFAULT_CONFIG_VALUES.codecs],
			no_dolby_video: noDolbyVideo,
			no_dolby_audio: noDolbyAudio,
			no_hdr: noHdr,
			no_hires: noHires,
			// 弹幕设置
			danmaku_duration: normalizeNumberInput(
				danmakuDuration,
				DEFAULT_CONFIG_VALUES.danmakuDuration
			),
			danmaku_font: danmakuFont,
			danmaku_font_size: normalizeNumberInput(
				danmakuFontSize,
				DEFAULT_CONFIG_VALUES.danmakuFontSize
			),
			danmaku_width_ratio: normalizeNumberInput(
				danmakuWidthRatio,
				DEFAULT_CONFIG_VALUES.danmakuWidthRatio
			),
			danmaku_horizontal_gap: normalizeNumberInput(
				danmakuHorizontalGap,
				DEFAULT_CONFIG_VALUES.danmakuHorizontalGap
			),
			danmaku_lane_size: normalizeNumberInput(
				danmakuLaneSize,
				DEFAULT_CONFIG_VALUES.danmakuLaneSize
			),
			danmaku_float_percentage: normalizeNumberInput(
				danmakuFloatPercentage,
				DEFAULT_CONFIG_VALUES.danmakuFloatPercentage
			),
			danmaku_bottom_percentage: normalizeNumberInput(
				danmakuBottomPercentage,
				DEFAULT_CONFIG_VALUES.danmakuBottomPercentage
			),
			danmaku_opacity: normalizeNumberInput(danmakuOpacity, DEFAULT_CONFIG_VALUES.danmakuOpacity),
			danmaku_bold: danmakuBold,
			danmaku_outline: normalizeNumberInput(danmakuOutline, DEFAULT_CONFIG_VALUES.danmakuOutline),
			danmaku_time_offset: normalizeNumberInput(
				danmakuTimeOffset,
				DEFAULT_CONFIG_VALUES.danmakuTimeOffset
			),
			danmaku_update_enabled: danmakuUpdateEnabled,
			danmaku_update_fresh_days: normalizeNumberInput(
				danmakuUpdateFreshDays,
				DEFAULT_CONFIG_VALUES.danmakuUpdateFreshDays
			),
			danmaku_update_fresh_interval_hours: normalizeNumberInput(
				danmakuUpdateFreshIntervalHours,
				DEFAULT_CONFIG_VALUES.danmakuUpdateFreshIntervalHours
			),
			danmaku_update_mature_days: normalizeNumberInput(
				danmakuUpdateMatureDays,
				DEFAULT_CONFIG_VALUES.danmakuUpdateMatureDays
			),
			danmaku_update_mature_interval_days: normalizeNumberInput(
				danmakuUpdateMatureIntervalDays,
				DEFAULT_CONFIG_VALUES.danmakuUpdateMatureIntervalDays
			),
			danmaku_update_cold_days: normalizeNumberInput(
				danmakuUpdateColdDays,
				DEFAULT_CONFIG_VALUES.danmakuUpdateColdDays
			),
			danmaku_update_cold_interval_days: normalizeNumberInput(
				danmakuUpdateColdIntervalDays,
				DEFAULT_CONFIG_VALUES.danmakuUpdateColdIntervalDays
			),
			// 并发控制设置
			concurrent_video: normalizeNumberInput(
				concurrentVideo,
				DEFAULT_CONFIG_VALUES.concurrentVideo
			),
			concurrent_page: normalizeNumberInput(concurrentPage, DEFAULT_CONFIG_VALUES.concurrentPage),
			rate_limit: normalizeNumberInput(rateLimit, DEFAULT_CONFIG_VALUES.rateLimit),
			rate_duration: normalizeNumberInput(rateDuration, DEFAULT_CONFIG_VALUES.rateDuration),
			// 其他设置
			cdn_sorting: cdnSorting,
			scan_deleted_videos: scanDeletedVideos,
			upper_path: upperPath,
			favorite_quick_subscribe_path: favoriteQuickSubscribePath,
			collection_quick_subscribe_path: collectionQuickSubscribePath,
			submission_quick_subscribe_path: submissionQuickSubscribePath,
			bangumi_quick_subscribe_path: bangumiQuickSubscribePath,
			pugv_quick_subscribe_path: pugvQuickSubscribePath,
			ffmpeg_path: ffmpegPath,
			// UP主投稿风控配置
			large_submission_threshold: normalizeNumberInput(
				largeSubmissionThreshold,
				DEFAULT_CONFIG_VALUES.largeSubmissionThreshold
			),
			base_request_delay: normalizeNumberInput(
				baseRequestDelay,
				DEFAULT_CONFIG_VALUES.baseRequestDelay
			),
			large_submission_delay_multiplier: normalizeNumberInput(
				largeSubmissionDelayMultiplier,
				DEFAULT_CONFIG_VALUES.largeSubmissionDelayMultiplier
			),
			enable_progressive_delay: enableProgressiveDelay,
			max_delay_multiplier: normalizeNumberInput(
				maxDelayMultiplier,
				DEFAULT_CONFIG_VALUES.maxDelayMultiplier
			),
			enable_incremental_fetch: enableIncrementalFetch,
			incremental_fallback_to_full: incrementalFallbackToFull,
			enable_batch_processing: enableBatchProcessing,
			batch_size: normalizeNumberInput(batchSize, DEFAULT_CONFIG_VALUES.batchSize),
			batch_delay_seconds: normalizeNumberInput(
				batchDelaySeconds,
				DEFAULT_CONFIG_VALUES.batchDelaySeconds
			),
			enable_auto_backoff: enableAutoBackoff,
			auto_backoff_base_seconds: normalizeNumberInput(
				autoBackoffBaseSeconds,
				DEFAULT_CONFIG_VALUES.autoBackoffBaseSeconds
			),
			auto_backoff_max_multiplier: normalizeNumberInput(
				autoBackoffMaxMultiplier,
				DEFAULT_CONFIG_VALUES.autoBackoffMaxMultiplier
			),
			source_delay_seconds: normalizeNumberInput(
				sourceDelaySeconds,
				DEFAULT_CONFIG_VALUES.sourceDelaySeconds
			),
			submission_source_delay_seconds: normalizeNumberInput(
				submissionSourceDelaySeconds,
				DEFAULT_CONFIG_VALUES.submissionSourceDelaySeconds
			),
			enable_dynamic_api_delay: enableDynamicApiDelay,
			dynamic_api_delay_multiplier: normalizeNumberInput(
				dynamicApiDelayMultiplier,
				DEFAULT_CONFIG_VALUES.dynamicApiDelayMultiplier
			),
			enable_large_source_download_limit: enableLargeSourceDownloadLimit,
			large_source_download_threshold: normalizeNumberInput(
				largeSourceDownloadThreshold,
				DEFAULT_CONFIG_VALUES.largeSourceDownloadThreshold
			),
			large_source_download_page_threshold: normalizeNumberInput(
				largeSourceDownloadPageThreshold,
				DEFAULT_CONFIG_VALUES.largeSourceDownloadPageThreshold
			),
			large_source_max_videos_per_round: normalizeNumberInput(
				largeSourceMaxVideosPerRound,
				DEFAULT_CONFIG_VALUES.largeSourceMaxVideosPerRound
			),
			large_source_max_pages_per_round: normalizeNumberInput(
				largeSourceMaxPagesPerRound,
				DEFAULT_CONFIG_VALUES.largeSourceMaxPagesPerRound
			),
			large_source_concurrent_video: normalizeNumberInput(
				largeSourceConcurrentVideo,
				DEFAULT_CONFIG_VALUES.largeSourceConcurrentVideo
			),
			large_source_concurrent_page: normalizeNumberInput(
				largeSourceConcurrentPage,
				DEFAULT_CONFIG_VALUES.largeSourceConcurrentPage
			),
			large_source_playurl_limit: normalizeNumberInput(
				largeSourcePlayurlLimit,
				DEFAULT_CONFIG_VALUES.largeSourcePlayurlLimit
			),
			large_source_playurl_duration_ms: normalizeNumberInput(
				largeSourcePlayurlDurationMs,
				DEFAULT_CONFIG_VALUES.largeSourcePlayurlDurationMs
			),
			audio_only_use_low_qn_for_playurl: audioOnlyUseLowQnForPlayurl,
			// aria2监控配置
			enable_aria2_health_check: enableAria2HealthCheck,
			enable_aria2_auto_restart: enableAria2AutoRestart,
			aria2_health_check_interval: normalizeNumberInput(
				aria2HealthCheckInterval,
				DEFAULT_CONFIG_VALUES.aria2HealthCheckInterval
			),
			// 多P视频目录结构配置
			multi_page_use_season_structure: multiPageUseSeasonStructure,
			// 合集目录结构配置
			collection_use_season_structure: collectionUseSeasonStructure,
			// 番剧目录结构配置
			bangumi_use_season_structure: bangumiUseSeasonStructure,
			// 风控验证配置
			risk_control_enabled: riskControlEnabled,
			risk_control_mode: riskControlMode,
			risk_control_timeout: normalizeNumberInput(
				riskControlTimeout,
				DEFAULT_CONFIG_VALUES.riskControlTimeout
			)
		};

		const response = await runRequest(() => api.updateConfig(params), {
			setLoading: (value) => (saving = value),
			context: '保存配置失败'
		});
		if (!response) return;

		if (response.data.success) {
			// 检查是否修改了bind_address，如果是则提醒需要重启
			const trimmedBindAddress = bindAddress.trim();
			const nextBindAddress = trimmedBindAddress
				? trimmedBindAddress.includes(':')
					? trimmedBindAddress
					: `0.0.0.0:${trimmedBindAddress}`
				: DEFAULT_CONFIG_VALUES.bindAddress;

			if (nextBindAddress !== (config?.bind_address ?? DEFAULT_CONFIG_VALUES.bindAddress)) {
				toast.success('保存成功', {
					description: '端口配置已更新，请重启程序使配置生效',
					duration: 8000 // 延长显示时间
				});
			} else {
				toast.success('保存成功', { description: response.data.message });
			}
			openSheet = null; // 关闭抽屉
		} else {
			toast.error('保存失败', { description: response.data.message });
		}
	}

	async function saveCredential() {
		const params = {
			sessdata: sessdata.trim(),
			bili_jct: biliJct.trim(),
			buvid3: buvid3.trim(),
			dedeuserid: dedeUserId.trim(),
			ac_time_value: acTimeValue.trim(),
			buvid4: buvid4.trim() || undefined,
			dedeuserid_ckmd5: dedeUserIdCkMd5.trim() || undefined
		};

		const response = await runRequest(() => api.updateCredential(params), {
			setLoading: (value) => (credentialSaving = value),
			context: '保存B站凭证失败'
		});
		if (!response) return;

		if (response.data.success) {
			toast.success('B站凭证保存成功', { description: response.data.message });
			// 重新加载配置以获取最新状态
			await loadConfig();
			openSheet = null; // 关闭抽屉
		} else {
			toast.error('保存失败', { description: response.data.message });
		}
	}

	async function testCredentialRefresh(force = false) {
		const response = await runRequest(() => api.testCredentialRefresh(force), {
			setLoading: (value) =>
				force ? (credentialRefreshForceTesting = value) : (credentialRefreshTesting = value),
			context: force ? '强制刷新B站凭据失败' : '测试B站凭据刷新失败'
		});
		if (!response) return;

		credentialRefreshTestResult = response.data;
		if (response.data.success) {
			toast.success(force ? '凭据强制刷新完成' : '凭据刷新测试通过', {
				description: response.data.message
			});
			if (force) await loadConfig();
		} else {
			toast.error(force ? '凭据强制刷新失败' : '凭据刷新测试失败', {
				description: response.data.diagnosis
			});
		}
	}

	// 处理扫码登录成功
	async function handleQrLoginSuccess(userInfo: UserInfo) {
		// 扫码登录成功后，凭证已经在后端保存
		toast.success(`欢迎，${userInfo.username}！登录成功`);
		// 更新当前用户信息
		currentUser = userInfo;
		// 重新加载配置以获取最新凭证
		await loadConfig();
		openSheet = null; // 关闭抽屉
	}

	// 处理扫码登录错误
	function handleQrLoginError(error: string) {
		toast.error('扫码登录失败: ' + error);
	}

	// 处理退出登录
	function handleLogout() {
		// 可以在这里清除凭证，但通常用户只是想切换账号
		toast.info('请扫码登录新账号');
	}

	// 检查当前用户信息
	async function checkCurrentUser() {
		const response = await runRequest(() => fetch('/api/auth/current-user'), {
			showErrorToast: false
		});
		if (!response) {
			currentUser = null;
			return;
		}

		if (response.ok) {
			const result = await response.json();
			if (result.status_code === 200 && result.data) {
				currentUser = result.data;
				return;
			}
		}

		currentUser = null;
	}

	// 加载推送通知状态
	async function loadNotificationStatus() {
		const response = await runRequest(() => api.getNotificationStatus(), {
			context: '加载推送通知状态失败',
			showErrorToast: false
		});
		if (!response?.data) return;

		notificationStatus = response.data;
		notificationEnabled = response.data.enabled;
	}

	// 保存推送通知配置
	async function saveNotificationConfig() {
		type NotificationUpdateConfig = Parameters<typeof api.updateNotificationConfig>[0];
		const config: NotificationUpdateConfig = {
			active_channel: activeNotificationChannel,
			enable_scan_notifications: notificationEnabled,
			notification_min_videos: normalizeNumberInput(
				notificationMinVideos,
				DEFAULT_CONFIG_VALUES.notificationMinVideos
			)
		};

		// 根据选择的渠道提交相应配置
		if (activeNotificationChannel === 'telegram') {
			config.telegram_bot_token = telegramBotToken.trim();
			config.telegram_chat_id = telegramChatId.trim();
			config.telegram_api_base = telegramApiBase.trim();
		} else if (activeNotificationChannel === 'webhook') {
			config.webhook_url = webhookUrl.trim();
			config.webhook_bearer_token = webhookBearerToken.trim();
			config.webhook_custom_headers = webhookCustomHeaders.trim();
			config.webhook_format = webhookFormat;
			config.webhook_custom_body = webhookCustomBody.trim();
			config.webhook_synology_chat_template = webhookSynologyChatTemplate;
		}

		const response = await runRequest(() => api.updateNotificationConfig(config), {
			setLoading: (value) => (notificationSaving = value),
			context: '保存推送通知配置失败'
		});
		if (!response) return;

		const ok = response.status_code === 200;
		const msg = typeof response.data === 'string' ? response.data : '推送配置更新成功';
		if (ok) {
			toast.success('推送通知配置保存成功', { description: msg });
			// 重新加载状态
			await loadNotificationStatus();
			openSheet = null; // 关闭抽屉
		} else {
			toast.error('保存失败', { description: msg || '推送配置更新失败' });
		}
	}

	async function saveRiskControlConfig() {
		const config: UpdateConfigRequest = {
			risk_control_enabled: riskControlEnabled,
			risk_control_mode: riskControlMode,
			risk_control_timeout: normalizeNumberInput(
				riskControlTimeout,
				DEFAULT_CONFIG_VALUES.riskControlTimeout
			),
			risk_control_auto_solve_service: autoSolveService,
			risk_control_auto_solve_api_key: autoSolveApiKey.trim(),
			risk_control_auto_solve_max_retries: normalizeNumberInput(
				autoSolveMaxRetries,
				DEFAULT_CONFIG_VALUES.autoSolveMaxRetries
			),
			risk_control_auto_solve_timeout: normalizeNumberInput(
				autoSolveTimeout,
				DEFAULT_CONFIG_VALUES.autoSolveTimeout
			)
		};

		const response = await runRequest(() => api.updateConfig(config), {
			setLoading: (value) => (isSaving = value),
			context: '保存验证码风控配置失败'
		});
		if (!response) return;

		if (response.data.success) {
			toast.success('验证码风控配置保存成功');
			// 重新加载配置以确保同步
			await loadConfig();
			openSheet = null; // 关闭抽屉
		} else {
			toast.error('保存失败', { description: response.data.message });
		}
	}

	// 保存AI重命名配置
	async function saveAiRenameConfig() {
		const config: UpdateConfigRequest = {
			ai_rename_enabled: aiRenameEnabled,
			ai_rename_provider: aiRenameProvider.trim(),
			ai_rename_base_url: aiRenameBaseUrl.trim(),
			ai_rename_api_key: aiRenameApiKey.trim(),
			ai_rename_model: aiRenameModel.trim(),
			ai_rename_timeout_seconds: normalizeNumberInput(
				aiRenameTimeoutSeconds,
				DEFAULT_CONFIG_VALUES.aiRenameTimeoutSeconds
			),
			ai_rename_video_prompt_hint: aiRenameVideoPromptHint,
			ai_rename_audio_prompt_hint: aiRenameAudioPromptHint,
			ai_rename_rename_parent_dir: aiRenameRenameParentDir
		};

		const response = await runRequest(() => api.updateConfig(config), {
			setLoading: (value) => (aiRenameSaving = value),
			context: '保存AI重命名配置失败'
		});
		if (!response) return;

		if (response.data.success) {
			toast.success('AI重命名配置保存成功');
			// 重新加载配置以确保同步
			await loadConfig();
			openSheet = null; // 关闭抽屉
		} else {
			toast.error('保存失败', { description: response.data.message });
		}
	}

	// 清除所有AI对话历史缓存
	async function handleClearAllAiCache() {
		const response = await runRequest(() => api.clearAiRenameCache(), {
			setLoading: (value) => (aiRenameClearingCache = value),
			context: '清除AI缓存失败'
		});
		if (!response) return;

		if (response.data.success) {
			toast.success('已清除所有AI对话历史缓存');
		} else {
			toast.error('清除失败', { description: response.data.message });
		}
	}

	// 从服务商 /models 端点获取可用模型（前端直连，需服务商允许跨域）
	async function fetchAiRenameModels() {
		const base = aiRenameBaseUrl.trim().replace(/\/+$/, '');
		const key = aiRenameApiKey.trim();
		if (!base) {
			toast.error('请先填写 API Base URL');
			return;
		}
		if (!key) {
			toast.error('请先填写 API Key');
			return;
		}

		aiRenameModelsLoading = true;
		try {
			const response = await fetch(`${base}/models`, {
				headers: { Authorization: `Bearer ${key}` }
			});
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			const payload = await response.json();
			const models: string[] = Array.isArray(payload?.data)
				? payload.data
						.map((item: { id?: string }) => item?.id)
						.filter((id: string | undefined): id is string => Boolean(id))
				: [];
			if (models.length === 0) {
				throw new Error('服务商未返回模型列表');
			}
			aiRenameModels = [...new Set(models)].sort((a, b) => a.localeCompare(b));
			toast.success(`已获取 ${aiRenameModels.length} 个模型`);
		} catch (error) {
			toast.error('获取模型列表失败', {
				description: `${error instanceof Error ? error.message : String(error)}；可手动填写模型名称`
			});
		} finally {
			aiRenameModelsLoading = false;
		}
	}

	// 加载推送通知配置
	async function loadNotificationConfig() {
		const response = await runRequest(() => api.getNotificationConfig(), {
			context: '加载推送通知配置失败',
			showErrorToast: false
		});
		if (!response?.data) return;

		// 加载激活渠道
		activeNotificationChannel = (response.data.active_channel || 'none') as
			| 'none'
			| 'telegram'
			| 'webhook';

		notificationEnabled = response.data.enable_scan_notifications;
		notificationMinVideos = response.data.notification_min_videos;

		// 加载 Telegram 配置（如果有）
		telegramBotToken = response.data.telegram_bot_token || '';
		telegramChatId = response.data.telegram_chat_id || '';
		telegramApiBase = response.data.telegram_api_base || 'https://api.telegram.org';

		// 加载通用Webhook配置（如果有）
		webhookUrl = response.data.webhook_url || '';
		webhookBearerToken = response.data.webhook_bearer_token || '';
		webhookCustomHeaders = response.data.webhook_custom_headers || '';
		webhookFormat =
			(response.data.webhook_format as
				| 'auto'
				| 'generic'
				| 'opensend'
				| 'custom'
				| 'synology_chat'
				| undefined) || 'auto';
		webhookCustomBody = response.data.webhook_custom_body || '';
		webhookSynologyChatTemplate =
			response.data.webhook_synology_chat_template ||
			(webhookFormat === 'synology_chat' ? defaultSynologyChatTemplate : '');
	}

	// 测试推送通知
	async function testNotification() {
		type TestNotificationParams = Parameters<typeof api.testNotification>[0];
		const request: TestNotificationParams = {
			active_channel: activeNotificationChannel
		};

		if (activeNotificationChannel === 'telegram') {
			request.telegram_bot_token = telegramBotToken.trim();
			request.telegram_chat_id = telegramChatId.trim();
			request.telegram_api_base = telegramApiBase.trim();
		} else if (activeNotificationChannel === 'webhook') {
			request.webhook_url = webhookUrl.trim();
			request.webhook_bearer_token = webhookBearerToken.trim();
			request.webhook_custom_headers = webhookCustomHeaders.trim();
			request.webhook_format = webhookFormat;
			request.webhook_custom_body = webhookCustomBody.trim();
			request.webhook_synology_chat_template = webhookSynologyChatTemplate;
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
</script>

<svelte:head>
	<title>设置</title>
</svelte:head>

<div class="py-2">
	<div class="mx-auto px-4">
		<div class="bg-card rounded-lg border shadow-sm {isMobile ? 'p-4' : 'p-6'}">
			<h1
				class="font-bold {isMobile ? 'mb-4 text-xl' : 'mb-6 text-2xl'}"
				title="管理下载、命名、弹幕、通知和系统行为等配置"
			>
				系统设置
			</h1>

			{#if loading}
				<Loading />
			{:else}
				<!-- 设置分类卡片列表 -->
				<div
					class="grid gap-3 {isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3'}"
				>
					{#each settingCategories as category (category.id)}
						<Card
							class="hover:border-primary/50 gap-0 py-4 cursor-pointer transition-all hover:shadow-md {isMobile
								? 'min-h-[80px]'
								: ''}"
							onclick={() => (openSheet = category.id)}
						>
							<CardHeader class="px-4 py-0">
								<div class="flex {isMobile ? 'flex-col gap-2' : 'items-start gap-3'}">
									<div class="bg-primary/10 rounded-lg p-2 {isMobile ? 'self-start' : ''}">
										<svelte:component
											this={category.icon}
											class="text-primary {isMobile ? 'h-4 w-4' : 'h-5 w-5'}"
										/>
									</div>
									<div class="flex-1">
										<CardTitle
											class={isMobile ? 'text-sm' : 'text-base'}
											title={getSettingTooltip(category.id)}
										>
											{category.title}
										</CardTitle>
										<CardDescription class="mt-1 {isMobile ? 'text-xs' : 'text-sm'} line-clamp-2"
											>{category.description}</CardDescription
										>
									</div>
								</div>
							</CardHeader>
						</Card>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<NamingSheet
	open={openSheet === 'naming'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	bind:videoName
	bind:pageName
	bind:multiPageName
	bind:bangumiName
	bind:folderStructure
	bind:bangumiFolderName
	bind:collectionFolderMode
	bind:collectionUnifiedName
	bind:timeFormat
	bind:multiPageUseSeasonStructure
	bind:collectionUseSeasonStructure
	bind:bangumiUseSeasonStructure
	bind:nfoTimeType
	bind:nfoIncludeGenre
	videoNameHasPath={videoNameHasPath}
	multiPageNameHasPath={multiPageNameHasPath}
	pageNameValid={pageNameValid}
	pageNameError={pageNameError}
	multiPageNameValid={multiPageNameValid}
	multiPageNameError={multiPageNameError}
	collectionUnifiedNameValid={collectionUnifiedNameValid}
	collectionUnifiedNameError={collectionUnifiedNameError}
	filenamePreview={filenamePreview}
	filenamePreviewLoading={filenamePreviewLoading}
	filenamePreviewError={filenamePreviewError}
	saving={saving}
	variableHelp={variableHelp}
	onSave={saveConfig}
	onVideoNameChange={handleVideoNameChange}
	onMultiPageNameChange={handleMultiPageNameChange}
	onValidateCollectionUnifiedName={validateCollectionUnifiedName}
/>

<QualitySheet
	open={openSheet === 'quality'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	bind:videoMaxQuality
	bind:videoMinQuality
	bind:audioMaxQuality
	bind:audioMinQuality
	bind:codecs
	bind:noDolbyVideo
	bind:noDolbyAudio
	bind:noHdr
	bind:noHires
	videoQualityOptions={videoQualityOptions}
	audioQualityOptions={audioQualityOptions}
	codecOptions={codecOptions}
	saving={saving}
	onSave={saveConfig}
/>

<DownloadSheet
	open={openSheet === 'download'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	bind:parallelDownloadEnabled
	bind:parallelDownloadThreads
	bind:parallelDownloadUseAria2
	bind:concurrentVideo
	bind:concurrentPage
	bind:rateLimit
	bind:rateDuration
	effectiveMaxFileConnections={effectiveMaxFileConnections}
	effectiveConcurrentVideo={effectiveConcurrentVideo}
	effectiveConcurrentPage={effectiveConcurrentPage}
	estimatedMaxConnections={estimatedMaxConnections}
	saving={saving}
	onSave={saveConfig}
/>

<!-- 弹幕设置抽屉 -->
<ResponsiveSheet
	open={openSheet === 'danmaku'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	title="弹幕设置"
	description="弹幕显示样式和布局参数"
	titleTooltip={getSettingTooltip('danmaku')}
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			saveConfig();
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
						<h5 class="cursor-help font-medium" title={danmakuUpdateHelp.section}>弹幕增量更新</h5>
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
							title={danmakuUpdateHelp.freshDays}>新鲜期天数</Label
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
							title={danmakuUpdateHelp.freshIntervalHours}
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
							title={danmakuUpdateHelp.matureDays}
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
							title={danmakuUpdateHelp.matureIntervalDays}
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
							title={danmakuUpdateHelp.coldDays}>老化期截至天数</Label
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
							title={danmakuUpdateHelp.coldIntervalDays}
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

<!-- B站凭证设置抽屉 -->
<ResponsiveSheet
	open={openSheet === 'credential'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	title="B站凭证设置"
	description="配置B站登录凭证信息"
	titleTooltip={getSettingTooltip('credential')}
	{isMobile}
>
	<div slot="header">
		<div class="text-foreground font-semibold">B站凭证设置</div>
		<div class="text-muted-foreground text-sm">配置B站登录凭证信息</div>
		{#if currentUser}
			<div
				class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20"
			>
				<div class="flex items-center space-x-3">
					<div class="bg-muted relative h-10 w-10 overflow-hidden rounded-full">
						{#if currentUser.avatar_url}
							<img
								src={getProxiedImageUrl(currentUser.avatar_url)}
								alt={currentUser.username}
								class="h-full w-full object-cover"
								loading="lazy"
							/>
						{:else}
							<div
								class="bg-muted flex h-full w-full items-center justify-center text-xs font-semibold"
							>
								{currentUser.username.slice(0, 2).toUpperCase()}
							</div>
						{/if}
					</div>
					<div class="flex-1">
						<div class="text-sm font-semibold text-green-800 dark:text-green-200">
							当前登录：{currentUser.username}
						</div>
						<div class="text-xs text-green-600 dark:text-green-400">UID: {currentUser.user_id}</div>
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
						saveCredential();
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
									提示：SESSDATA、bili_jct、buvid3、DedeUserID是必填项，ac_time_value、buvid4、DedeUserID__ckMd5可选
								</div>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
							<div class="space-y-2">
								<Label for="sessdata">SESSDATA *</Label>
								<Input
									id="sessdata"
									type="password"
									bind:value={sessdata}
									placeholder="请输入SESSDATA"
								/>
							</div>

							<div class="space-y-2">
								<Label for="bili-jct">bili_jct *</Label>
								<Input
									id="bili-jct"
									type="password"
									bind:value={biliJct}
									placeholder="请输入bili_jct"
								/>
							</div>

							<div class="space-y-2">
								<Label for="buvid3">buvid3 *</Label>
								<Input id="buvid3" bind:value={buvid3} placeholder="请输入buvid3" />
							</div>

							<div class="space-y-2">
								<Label for="dedeuserid">DedeUserID *</Label>
								<Input id="dedeuserid" bind:value={dedeUserId} placeholder="请输入DedeUserID" />
							</div>

							<div class="space-y-2 md:col-span-2">
								<Label for="ac-time-value">ac_time_value (可选)</Label>
								<Input
									id="ac-time-value"
									bind:value={acTimeValue}
									placeholder="请输入ac_time_value（可选）"
								/>
							</div>

							<div class="space-y-2">
								<Label for="buvid4">buvid4 (可选)</Label>
								<Input id="buvid4" bind:value={buvid4} placeholder="请输入buvid4（可选）" />
							</div>

							<div class="space-y-2">
								<Label for="dedeuserid-ckmd5">DedeUserID__ckMd5 (可选)</Label>
								<Input
									id="dedeuserid-ckmd5"
									bind:value={dedeUserIdCkMd5}
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
									{#if sessdata && biliJct && buvid3 && dedeUserId}
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
										onclick={() => testCredentialRefresh(false)}
										disabled={credentialRefreshTesting || credentialRefreshForceTesting}
										class="w-full sm:w-auto"
									>
										<RefreshCwIcon class={credentialRefreshTesting ? 'animate-spin' : ''} />
										{credentialRefreshTesting ? '测试中...' : '测试刷新'}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onclick={() => testCredentialRefresh(true)}
										disabled={credentialRefreshTesting || credentialRefreshForceTesting}
										class="w-full border-amber-300 text-amber-700 hover:bg-amber-50 sm:w-auto dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30"
									>
										<RefreshCwIcon class={credentialRefreshForceTesting ? 'animate-spin' : ''} />
										{credentialRefreshForceTesting ? '强刷中...' : '强制刷新'}
									</Button>
								</div>
							</div>

							{#if credentialRefreshTestResult}
								<div
									class={`rounded-md border p-3 ${
										credentialRefreshTestResult.success
											? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
											: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
									}`}
								>
									<div class="mb-2 flex flex-wrap items-center gap-2">
										<Badge
											variant={credentialRefreshTestResult.success ? 'default' : 'secondary'}
											class={credentialRefreshTestResult.success
												? 'bg-green-600 text-white'
												: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'}
										>
											{credentialRefreshTestResult.success ? '通过' : '失败'}
										</Badge>
										<span class="text-sm font-medium text-slate-900 dark:text-slate-100">
											{credentialRefreshTestResult.message}
										</span>
									</div>

									<div
										class="grid grid-cols-1 gap-2 text-xs text-slate-700 sm:grid-cols-2 dark:text-slate-300"
									>
										<div>阶段：{credentialRefreshTestResult.stage}</div>
										<div>类型：{credentialRefreshTestResult.error_type ?? '无'}</div>
										<div>建议重试：{credentialRefreshTestResult.should_retry ? '是' : '否'}</div>
										<div>
											凭据：{credentialRefreshTestResult.credential_fields.has_credential
												? '已加载'
												: '未加载'}
										</div>
									</div>

									<div class="mt-2 text-xs text-slate-700 dark:text-slate-300">
										{credentialRefreshTestResult.diagnosis}
									</div>

									<div class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
										<div class="bg-background rounded border px-2 py-1">
											SESSDATA：{credentialRefreshTestResult.credential_fields.sessdata_len}
										</div>
										<div class="bg-background rounded border px-2 py-1">
											bili_jct：{credentialRefreshTestResult.credential_fields.bili_jct_len}
										</div>
										<div class="bg-background rounded border px-2 py-1">
											buvid3：{credentialRefreshTestResult.credential_fields.buvid3_len}
										</div>
										<div class="bg-background rounded border px-2 py-1">
											DedeUserID：{credentialRefreshTestResult.credential_fields.dedeuserid_len}
										</div>
										<div class="bg-background rounded border px-2 py-1">
											ac_time_value：{credentialRefreshTestResult.credential_fields
												.ac_time_value_len}
										</div>
										<div class="bg-background rounded border px-2 py-1">
											buvid4：{credentialRefreshTestResult.credential_fields.has_buvid4
												? '有'
												: '无'}
										</div>
										<div class="bg-background rounded border px-2 py-1 sm:col-span-2">
											DedeUserID__ckMd5：{credentialRefreshTestResult.credential_fields
												.has_dedeuserid_ckmd5
												? '有'
												: '无'}
										</div>
									</div>

									{#if credentialRefreshTestResult.details}
										<pre
											class="bg-background mt-3 max-h-36 overflow-auto rounded border p-2 text-xs whitespace-pre-wrap text-slate-700 dark:text-slate-300">{credentialRefreshTestResult.details}</pre>
									{/if}
								</div>
							{/if}
						</div>
					</div>
					<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
						<Button type="submit" disabled={credentialSaving} class="w-full">
							{credentialSaving ? '保存中...' : '保存凭证'}
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
							onLoginSuccess={handleQrLoginSuccess}
							onLoginError={handleQrLoginError}
							onLogout={handleLogout}
						/>
					</div>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</ResponsiveSheet>

<!-- 风控配置抽屉 -->
<ResponsiveSheet
	open={openSheet === 'risk'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	title="风控配置"
	description="UP主投稿获取风控策略，用于优化大量视频UP主的获取"
	titleTooltip={getSettingTooltip('risk')}
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			saveConfig();
		}}
		class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}"
	>
		<div class="min-h-0 flex-1 space-y-6 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			<!-- 基础优化配置 -->
			<div
				class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-blue-800 dark:text-blue-200">🎯 基础优化配置</h3>
				<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
					<div class="space-y-2">
						<Label for="large-submission-threshold">大量视频UP主阈值</Label>
						<Input
							id="large-submission-threshold"
							type="number"
							bind:value={largeSubmissionThreshold}
							min="10"
							max="1000"
							placeholder="100"
						/>
						<p class="text-muted-foreground text-xs">超过此视频数量的UP主将启用风控策略</p>
					</div>

					<div class="space-y-2">
						<Label for="base-request-delay">基础请求间隔（毫秒）</Label>
						<Input
							id="base-request-delay"
							type="number"
							bind:value={baseRequestDelay}
							min="50"
							max="2000"
							placeholder="200"
						/>
						<p class="text-muted-foreground text-xs">每个请求之间的基础延迟时间</p>
					</div>

					<div class="space-y-2">
						<Label for="large-submission-delay-multiplier">大量视频延迟倍数</Label>
						<Input
							id="large-submission-delay-multiplier"
							type="number"
							bind:value={largeSubmissionDelayMultiplier}
							min="1"
							max="10"
							step="0.5"
							placeholder="2"
						/>
						<p class="text-muted-foreground text-xs">大量视频UP主的延迟倍数</p>
					</div>

					<div class="space-y-2">
						<Label for="max-delay-multiplier">最大延迟倍数</Label>
						<Input
							id="max-delay-multiplier"
							type="number"
							bind:value={maxDelayMultiplier}
							min="1"
							max="20"
							step="0.5"
							placeholder="4"
						/>
						<p class="text-muted-foreground text-xs">渐进式延迟的最大倍数限制</p>
					</div>
				</div>

				<div class="mt-4 flex items-center space-x-2">
					<input
						type="checkbox"
						id="enable-progressive-delay"
						bind:checked={enableProgressiveDelay}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label for="enable-progressive-delay" class="text-sm">启用渐进式延迟</Label>
					<p class="text-muted-foreground ml-2 text-xs">随着请求次数增加逐步延长延迟时间</p>
				</div>

				<div class="mt-4 space-y-4 border-t border-blue-200 pt-4 dark:border-blue-800">
					<h4 class="text-sm font-medium text-blue-700 dark:text-blue-300">动态API配置</h4>
					<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
						<div class="space-y-2">
							<Label for="dynamic-api-delay-multiplier">动态API延迟倍数</Label>
							<Input
								id="dynamic-api-delay-multiplier"
								type="number"
								bind:value={dynamicApiDelayMultiplier}
								min="0.1"
								max="10"
								step="0.1"
								placeholder="1.5"
							/>
							<p class="text-muted-foreground text-xs">相对于基础请求间隔的倍率（推荐 1.2~2.0）</p>
						</div>

						<div class="flex items-center space-x-2">
							<input
								type="checkbox"
								id="enable-dynamic-api-delay"
								bind:checked={enableDynamicApiDelay}
								class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
							/>
							<Label for="enable-dynamic-api-delay" class="text-sm">启用动态API延迟</Label>
						</div>
					</div>
					<div class="rounded-md bg-yellow-50 p-3 dark:bg-yellow-950/20">
						<p class="text-xs text-yellow-800 dark:text-yellow-200">
							动态API每次最多返回 12
							条记录。首次全量扫描请求次数多，建议保持启用延迟，后续增量扫描耗时较小。
						</p>
					</div>
				</div>
			</div>

			<!-- 增量获取配置 -->
			<div
				class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-green-800 dark:text-green-200">📈 增量获取配置</h3>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="enable-incremental-fetch"
							bind:checked={enableIncrementalFetch}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="enable-incremental-fetch" class="text-sm">启用增量获取</Label>
						<p class="text-muted-foreground ml-2 text-xs">优先获取最新视频，减少不必要的请求</p>
					</div>

					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="incremental-fallback-to-full"
							bind:checked={incrementalFallbackToFull}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="incremental-fallback-to-full" class="text-sm"
							>增量获取失败时回退到全量获取</Label
						>
						<p class="text-muted-foreground ml-2 text-xs">确保数据完整性</p>
					</div>
				</div>
			</div>

			<!-- 分批处理配置 -->
			<div
				class="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-purple-800 dark:text-purple-200">
					📦 分批处理配置
				</h3>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="enable-batch-processing"
							bind:checked={enableBatchProcessing}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="enable-batch-processing" class="text-sm">启用分批处理</Label>
						<p class="text-muted-foreground ml-2 text-xs">将大量请求分批处理，降低服务器压力</p>
					</div>

					{#if enableBatchProcessing}
						<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
							<div class="space-y-2">
								<Label for="batch-size">分批大小（页数）</Label>
								<Input
									id="batch-size"
									type="number"
									bind:value={batchSize}
									min="1"
									max="20"
									placeholder="5"
								/>
								<p class="text-muted-foreground text-xs">每批处理的页数</p>
							</div>

							<div class="space-y-2">
								<Label for="batch-delay-seconds">批次间延迟（秒）</Label>
								<Input
									id="batch-delay-seconds"
									type="number"
									bind:value={batchDelaySeconds}
									min="1"
									max="60"
									placeholder="2"
								/>
								<p class="text-muted-foreground text-xs">每批之间的等待时间</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- 自动退避配置 -->
			<div
				class="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-orange-800 dark:text-orange-200">
					🔄 自动退避配置
				</h3>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="enable-auto-backoff"
							bind:checked={enableAutoBackoff}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="enable-auto-backoff" class="text-sm">启用自动退避</Label>
						<p class="text-muted-foreground ml-2 text-xs">遇到错误时自动增加延迟时间</p>
					</div>

					{#if enableAutoBackoff}
						<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
							<div class="space-y-2">
								<Label for="auto-backoff-base-seconds">自动退避基础时间（秒）</Label>
								<Input
									id="auto-backoff-base-seconds"
									type="number"
									bind:value={autoBackoffBaseSeconds}
									min="1"
									max="300"
									placeholder="10"
								/>
								<p class="text-muted-foreground text-xs">遇到错误时的基础等待时间</p>
							</div>

							<div class="space-y-2">
								<Label for="auto-backoff-max-multiplier">自动退避最大倍数</Label>
								<Input
									id="auto-backoff-max-multiplier"
									type="number"
									bind:value={autoBackoffMaxMultiplier}
									min="1"
									max="20"
									placeholder="5"
								/>
								<p class="text-muted-foreground text-xs">退避时间的最大倍数限制</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- 视频源间延迟配置 -->
			<div
				class="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-indigo-800 dark:text-indigo-200">
					⏱️ 视频源间延迟配置
				</h3>
				<div class="space-y-4">
					<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
						<div class="space-y-2">
							<Label for="source-delay-seconds">通用视频源间延迟（秒）</Label>
							<Input
								id="source-delay-seconds"
								type="number"
								bind:value={sourceDelaySeconds}
								min="0"
								max="60"
								placeholder="2"
							/>
							<p class="text-muted-foreground text-xs">
								每个视频源之间的基础延迟时间（收藏夹、合集等）
							</p>
						</div>

						<div class="space-y-2">
							<Label for="submission-source-delay-seconds">UP主投稿源间延迟（秒）</Label>
							<Input
								id="submission-source-delay-seconds"
								type="number"
								bind:value={submissionSourceDelaySeconds}
								min="0"
								max="60"
								placeholder="5"
							/>
							<p class="text-muted-foreground text-xs">
								UP主投稿之间的特殊延迟时间（建议设置更长）
							</p>
						</div>
					</div>

					<div class="rounded-lg bg-indigo-100 p-3 dark:bg-indigo-900/20">
						<p class="text-sm text-indigo-700 dark:text-indigo-300">
							<strong>说明：</strong
							>在扫描多个视频源时，系统会在每个源之间自动添加延迟，避免连续请求触发风控。
							UP主投稿通常需要更长的延迟，因为其视频数量可能较多。设置为0可禁用延迟。
						</p>
					</div>
				</div>
			</div>

			<!-- 大源下载限制配置 -->
			<div
				class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20"
			>
				<h3 class="mb-3 text-sm font-medium text-red-800 dark:text-red-200">🧯 大源下载限制配置</h3>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="enable-large-source-download-limit"
							bind:checked={enableLargeSourceDownloadLimit}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label for="enable-large-source-download-limit" class="text-sm">启用大源下载保护</Label>
						<p class="text-muted-foreground ml-2 text-xs">
							针对视频数或分P数较大的投稿源限制下载并发、每轮下载数量和 playurl 请求频率
						</p>
					</div>

					{#if enableLargeSourceDownloadLimit}
						<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
							<div class="space-y-2">
								<Label for="large-source-download-threshold">大源判定阈值（视频数）</Label>
								<Input
									id="large-source-download-threshold"
									type="number"
									bind:value={largeSourceDownloadThreshold}
									min="1"
									max="100000"
									placeholder="1000"
								/>
								<p class="text-muted-foreground text-xs">源内视频数超过该值时启用下载阶段保护</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-download-page-threshold">大源判定阈值（分P数）</Label>
								<Input
									id="large-source-download-page-threshold"
									type="number"
									bind:value={largeSourceDownloadPageThreshold}
									min="0"
									max="100000"
									placeholder="1000"
								/>
								<p class="text-muted-foreground text-xs">
									源内已识别分P数或本轮待处理分P数超过该值时启用下载阶段保护；0 表示关闭分P阈值判定
								</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-max-videos-per-round">每轮最多下载视频数</Label>
								<Input
									id="large-source-max-videos-per-round"
									type="number"
									bind:value={largeSourceMaxVideosPerRound}
									min="0"
									max="10000"
									placeholder="0"
								/>
								<p class="text-muted-foreground text-xs">0 表示不限制；未下载的视频下轮继续处理</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-max-pages-per-round">每轮最多下载分页数</Label>
								<Input
									id="large-source-max-pages-per-round"
									type="number"
									bind:value={largeSourceMaxPagesPerRound}
									min="0"
									max="100000"
									placeholder="2000"
								/>
								<p class="text-muted-foreground text-xs">按整视频截断，避免半个多P视频被误标完成</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-concurrent-video">下载视频并发</Label>
								<Input
									id="large-source-concurrent-video"
									type="number"
									bind:value={largeSourceConcurrentVideo}
									min="1"
									max="32"
									placeholder="1"
								/>
								<p class="text-muted-foreground text-xs">
									大源下载阶段建议保持 1，降低连续取流压力
								</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-concurrent-page">单视频分页并发</Label>
								<Input
									id="large-source-concurrent-page"
									type="number"
									bind:value={largeSourceConcurrentPage}
									min="1"
									max="32"
									placeholder="1"
								/>
								<p class="text-muted-foreground text-xs">控制同一视频多P分页并发下载数量</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-playurl-limit">playurl 请求数</Label>
								<Input
									id="large-source-playurl-limit"
									type="number"
									bind:value={largeSourcePlayurlLimit}
									min="1"
									max="100"
									placeholder="1"
								/>
								<p class="text-muted-foreground text-xs">每个限制窗口内允许的取流请求数</p>
							</div>

							<div class="space-y-2">
								<Label for="large-source-playurl-duration-ms">playurl 限制窗口（毫秒）</Label>
								<Input
									id="large-source-playurl-duration-ms"
									type="number"
									bind:value={largeSourcePlayurlDurationMs}
									min="1"
									max="60000"
									placeholder="1000"
								/>
								<p class="text-muted-foreground text-xs">默认 1000 毫秒，即每秒最多 1 次取流请求</p>
							</div>

							<div class="flex items-center space-x-2">
								<input
									type="checkbox"
									id="audio-only-use-low-qn-for-playurl"
									bind:checked={audioOnlyUseLowQnForPlayurl}
									class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
								/>
								<Label for="audio-only-use-low-qn-for-playurl" class="text-sm"
									>仅音频下载使用低清晰度取流</Label
								>
							</div>
						</div>

						<div class="rounded-lg bg-red-100 p-3 dark:bg-red-900/20">
							<p class="text-sm text-red-700 dark:text-red-300">
								<strong>说明：</strong
								>大源保护只限制下载阶段；视频数或分P数超过阈值都会触发。已下载成功的视频会正常更新状态，未进入本轮预算的视频不会误写断点，下次扫描会继续从未完成部分处理。
								默认 playurl 限速为 1 次/秒。
							</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- 使用建议 -->
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
			>
				<h3 class="mb-3 text-sm font-medium text-gray-800 dark:text-gray-200">💡 使用建议</h3>
				<div class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
					<p><strong>小型UP主（&lt;100视频）：</strong> 使用默认设置即可</p>
					<p><strong>中型UP主（100-500视频）：</strong> 启用渐进式延迟和增量获取</p>
					<p><strong>大型UP主（500-1000视频）：</strong> 启用分批处理，设置较大的延迟倍数</p>
					<p>
						<strong>超大型UP主（&gt;1000视频）：</strong> 启用所有风控策略，适当增加各项延迟参数
					</p>
					<p><strong>频繁遇到412错误：</strong> 增加基础请求间隔和延迟倍数</p>
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

<Aria2Sheet
	open={openSheet === 'aria2'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	bind:enableAria2HealthCheck
	bind:enableAria2AutoRestart
	bind:aria2HealthCheckInterval
	saving={saving}
	onSave={saveConfig}
/>

<SystemSheet
	open={openSheet === 'system'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	bind:interval
	bind:bindAddress
	bind:cdnSorting
	bind:scanDeletedVideos
	bind:upperPath
	bind:ffmpegPath
	bind:favoriteQuickSubscribePath
	bind:collectionQuickSubscribePath
	bind:submissionQuickSubscribePath
	bind:bangumiQuickSubscribePath
	bind:pugvQuickSubscribePath
	bindAddressValid={bindAddressValid}
	bindAddressError={bindAddressError}
	saving={saving}
	onSave={saveConfig}
/>

<!-- 推送通知设置抽屉片段 -->
<ResponsiveSheet
	open={openSheet === 'notification'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	title="推送通知设置"
	description="配置扫描完成推送通知"
	titleTooltip={getSettingTooltip('notification')}
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			saveNotificationConfig();
		}}
		class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}"
	>
		<div class="min-h-0 flex-1 space-y-6 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			<!-- 推送状态卡片 -->
			{#if notificationStatus}
				<div
					class="rounded-lg border {activeNotificationChannel !== 'none'
						? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
						: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'} p-4"
				>
					<div class="flex items-center space-x-2">
						{#if activeNotificationChannel !== 'none'}
							<Badge variant="default" class="bg-green-500">已配置</Badge>
							<span class="text-sm text-green-700 dark:text-green-400">
								{activeNotificationChannel === 'telegram' ? 'Telegram' : 'Webhook'}已配置
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
						bind:checked={notificationEnabled}
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
						value={activeNotificationChannel}
						options={[
							{ value: 'none', label: '无' },
							{ value: 'telegram', label: 'Telegram' },
							{ value: 'webhook', label: 'Webhook' }
						]}
						onChange={(nextValue) =>
							(activeNotificationChannel = String(
								nextValue ?? 'none'
							) as typeof activeNotificationChannel)}
						class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
					<p class="text-muted-foreground text-sm">选择一个推送渠道，所有推送将发送到该渠道</p>
				</div>
			</div>

			<!-- Telegram配置 -->
			{#if activeNotificationChannel === 'telegram'}
				<div
					class="space-y-4 rounded-lg border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-800 dark:bg-sky-950/10"
				>
					<h3 class="text-base font-semibold">Telegram 配置</h3>

					<div class="space-y-2">
						<Label for="telegram-bot-token">Bot Token</Label>
						<Input
							id="telegram-bot-token"
							type="password"
							bind:value={telegramBotToken}
							placeholder={notificationStatus?.configured
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
							bind:value={telegramChatId}
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
							bind:value={telegramApiBase}
							placeholder="https://api.telegram.org"
						/>
						<p class="text-muted-foreground text-sm">
							默认 https://api.telegram.org；如使用反向代理或自建 Bot API，可填写对应地址
						</p>
					</div>
				</div>
			{/if}

			<!-- Webhook配置 -->
			{#if activeNotificationChannel === 'webhook'}
				<div
					class="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/10"
				>
					<h3 class="text-base font-semibold">Webhook配置</h3>

					<div class="space-y-2">
						<Label for="generic-webhook-format">Webhook格式</Label>
						<CustomSelect
							id="generic-webhook-format"
							value={webhookFormat}
							options={[
								{ value: 'auto', label: '自动识别（推荐）' },
								{ value: 'generic', label: '通用 JSON' },
								{ value: 'opensend', label: 'openSend' },
								{ value: 'custom', label: '自定义请求' },
								{ value: 'synology_chat', label: 'Synology Chat（群晖）' }
							]}
							onChange={(nextValue) =>
								(webhookFormat = String(nextValue ?? 'auto') as typeof webhookFormat)}
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
							bind:value={webhookUrl}
							placeholder="https://example.com/notify/webhook"
						/>
						<p class="text-muted-foreground text-sm">
							{webhookFormat === 'synology_chat'
								? '将以 application/x-www-form-urlencoded 发送 payload=JSON，适用于 Synology Chat Incoming Webhook'
								: '将发送 JSON POST 请求到该地址，支持按响应内容判定成功'}
						</p>
					</div>

					<div class="space-y-2">
						<Label for="generic-webhook-token">Bearer Token（可选）</Label>
						<Input
							id="generic-webhook-token"
							type="password"
							bind:value={webhookBearerToken}
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
							bind:value={webhookCustomHeaders}
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

					{#if webhookFormat === 'custom'}
						<div class="space-y-2">
							<div class="flex items-center justify-between gap-3">
								<Label for="generic-webhook-custom-body">自定义 POST Body（任意文本）</Label>
								<div class="flex gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onclick={() => {
											webhookCustomBody = defaultWebhookCustomBody;
										}}
									>
										JSON 模板
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onclick={() => {
											webhookCustomBody = defaultWebhookFormBody;
											webhookCustomHeaders = '{"Content-Type":"application/x-www-form-urlencoded"}';
										}}
									>
										表单模板
									</Button>
								</div>
							</div>
							<Textarea
								id="generic-webhook-custom-body"
								bind:value={webhookCustomBody}
								rows={10}
								placeholder={defaultWebhookCustomBody}
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

					{#if webhookFormat === 'synology_chat'}
						<div class="space-y-2">
							<div class="flex items-center justify-between gap-3">
								<Label for="synology-chat-template">群晖 Chat 消息模板</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={() => {
										webhookSynologyChatTemplate = defaultSynologyChatTemplate;
									}}
								>
									填入模板
								</Button>
							</div>
							<Textarea
								id="synology-chat-template"
								bind:value={webhookSynologyChatTemplate}
								rows={8}
								placeholder={defaultSynologyChatTemplate}
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
			{#if activeNotificationChannel !== 'none'}
				<div class="space-y-4">
					<h3 class="text-base font-semibold">推送设置</h3>

					<div class="space-y-2">
						<Label for="min-videos">最小视频数阈值</Label>
						<Input
							id="min-videos"
							type="number"
							bind:value={notificationMinVideos}
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
			{#if activeNotificationChannel !== 'none'}
				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
				>
					<h4 class="mb-3 font-medium text-blue-800 dark:text-blue-400">测试推送</h4>
					<p class="mb-3 text-sm text-blue-700 dark:text-blue-300">
						发送一条测试消息到您的推送接收端，验证配置是否正确。测试会优先使用当前输入内容（未保存也可测试）。
					</p>
					<Button type="button" variant="outline" size="sm" onclick={testNotification}>
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
			<Button type="submit" disabled={notificationSaving} class="w-full">
				{notificationSaving ? '保存中...' : '保存设置'}
			</Button>
		</SheetFooter>
	</form>
</ResponsiveSheet>

<CaptchaSheet
	open={openSheet === 'captcha'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	bind:riskControlEnabled
	bind:riskControlMode
	bind:riskControlTimeout
	bind:autoSolveService
	bind:autoSolveApiKey
	bind:autoSolveMaxRetries
	bind:autoSolveTimeout
	isSaving={isSaving}
	onSave={saveRiskControlConfig}
/>

<AiRenameSheet
	open={openSheet === 'ai_rename'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	bind:aiRenameEnabled
	bind:aiRenameProvider
	bind:aiRenameBaseUrl
	bind:aiRenameApiKey
	bind:aiRenameModel
	bind:aiRenameTimeoutSeconds
	bind:aiRenameVideoPromptHint
	bind:aiRenameAudioPromptHint
	bind:aiRenameRenameParentDir
	aiRenameSaving={aiRenameSaving}
	aiRenameClearingCache={aiRenameClearingCache}
	aiRenameModels={aiRenameModels}
	aiRenameModelsLoading={aiRenameModelsLoading}
	onSave={saveAiRenameConfig}
	onClearCache={handleClearAllAiCache}
	onFetchModels={fetchAiRenameModels}
/>

<DatabaseSheet
	open={openSheet === 'database'}
	onOpenChange={(next) => {
		if (!next) openSheet = null;
	}}
	{isMobile}
	{databaseStatus}
	{databaseLoading}
	{databaseBackups}
	{databaseBackupsLoading}
	bind:databaseAction
	{databaseActionRunning}
	bind:restoreTarget
	{restoreRunning}
	bind:importRestoreTarget
	{importRestoreRunning}
	bind:importFileInput
	onLoadStatus={loadDatabaseStatus}
	onLoadBackups={loadDatabaseBackups}
	onRequestAction={requestDatabaseAction}
	onRunAction={runDatabaseAction}
	onRestore={runRestore}
	onConfirmRestore={confirmRestore}
	onSelectImport={selectImportFile}
	onImportPicked={onImportFilePicked}
	onImportRestore={runImportRestore}
	{formatBytes}
/>
