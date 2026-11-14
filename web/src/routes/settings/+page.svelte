<script lang="ts">
	import api from '$lib/api';
	import { Card, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import DatabaseSheet from '$lib/components/settings/database-sheet.svelte';
	import NotificationSheet from '$lib/components/settings/notification-sheet.svelte';
	import AiRenameSheet from '$lib/components/settings/ai-rename-sheet.svelte';
	import NamingSheet from '$lib/components/settings/naming-sheet.svelte';
	import QualitySheet from '$lib/components/settings/quality-sheet.svelte';
	import DownloadSheet from '$lib/components/settings/download-sheet.svelte';
	import Aria2Sheet from '$lib/components/settings/aria2-sheet.svelte';
	import SystemSheet from '$lib/components/settings/system-sheet.svelte';
	import CaptchaSheet from '$lib/components/settings/captcha-sheet.svelte';
	import DanmakuSheet from '$lib/components/settings/danmaku-sheet.svelte';
	import CredentialSheet from '$lib/components/settings/credential-sheet.svelte';
	import RiskSheet from '$lib/components/settings/risk-sheet.svelte';
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
	import { normalizeConcurrencyValue, normalizeNumberInput } from '$lib/utils/number';
	import { NotificationSettingsStore } from '$lib/stores/settings/notification.svelte';
	import { SettingsNamingStore } from '$lib/stores/settings/naming.svelte';
	import { IsMobile, IsTablet } from '$lib/hooks/is-mobile.svelte.js';
	import Loading from '$lib/components/ui/Loading.svelte';

	let config: ConfigResponse | null = null;
	let loading = false;
	let saving = false;

	// 各设置域的状态容器（runes class，见 $lib/stores/settings）
	const notification = new NotificationSettingsStore();
	const naming = new SettingsNamingStore();

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


	// 表单数据（命名域字段见 naming store）
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
	let bindAddressError = '';
	let bindAddressValid = true;

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
		// 加载推送通知配置
		await notification.loadStatus();
		await notification.loadConfig();
	});

	async function loadConfig() {
		const response = await runRequest(() => api.getConfig(), {
			setLoading: (value) => (loading = value),
			context: '加载配置失败'
		});
		if (!response) return;

		config = response.data;

		// 填充表单（命名域交给 store）
		naming.applyFromConfig(config);
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

		// 合集目录结构配置

		// 番剧目录结构配置

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




	// 命名模板变化时按需刷新预览（签名比较在 store 内完成）
	$: naming.refreshOnChange(naming.signature, openSheet === 'naming');






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
		if (!naming.validateAll()) {
			toast.error('配置验证失败', { description: naming.firstValidationError });
			return;
		}

		if (!validateBindAddress(bindAddress)) {
			toast.error('配置验证失败', { description: bindAddressError });
			return;
		}

		const params: UpdateConfigRequest = {
			...naming.toPayload(),
			interval: normalizeNumberInput(interval, DEFAULT_CONFIG_VALUES.interval),
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
	store={naming}
	{saving}
	onSave={saveConfig}
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

<DanmakuSheet
	open={openSheet === 'danmaku'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	bind:danmakuDuration
	bind:danmakuFont
	bind:danmakuFontSize
	bind:danmakuWidthRatio
	bind:danmakuHorizontalGap
	bind:danmakuLaneSize
	bind:danmakuFloatPercentage
	bind:danmakuBottomPercentage
	bind:danmakuOpacity
	bind:danmakuBold
	bind:danmakuOutline
	bind:danmakuTimeOffset
	bind:danmakuUpdateEnabled
	bind:danmakuUpdateFreshDays
	bind:danmakuUpdateFreshIntervalHours
	bind:danmakuUpdateMatureDays
	bind:danmakuUpdateMatureIntervalDays
	bind:danmakuUpdateColdDays
	bind:danmakuUpdateColdIntervalDays
	updateHelp={danmakuUpdateHelp}
	saving={saving}
	onSave={saveConfig}
/>

<CredentialSheet
	open={openSheet === 'credential'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	bind:sessdata
	bind:biliJct
	bind:buvid3
	bind:dedeUserId
	bind:acTimeValue
	bind:buvid4
	bind:dedeUserIdCkMd5
	currentUser={currentUser}
	credentialSaving={credentialSaving}
	credentialRefreshTesting={credentialRefreshTesting}
	credentialRefreshForceTesting={credentialRefreshForceTesting}
	credentialRefreshTestResult={credentialRefreshTestResult}
	getProxiedImageUrl={getProxiedImageUrl}
	onSave={saveCredential}
	onTestRefresh={testCredentialRefresh}
	onQrLoginSuccess={handleQrLoginSuccess}
	onQrLoginError={handleQrLoginError}
	onLogout={handleLogout}
/>

<RiskSheet
	open={openSheet === 'risk'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	bind:largeSubmissionThreshold
	bind:baseRequestDelay
	bind:largeSubmissionDelayMultiplier
	bind:maxDelayMultiplier
	bind:enableProgressiveDelay
	bind:dynamicApiDelayMultiplier
	bind:enableDynamicApiDelay
	bind:enableIncrementalFetch
	bind:incrementalFallbackToFull
	bind:enableBatchProcessing
	bind:batchSize
	bind:batchDelaySeconds
	bind:enableAutoBackoff
	bind:autoBackoffBaseSeconds
	bind:autoBackoffMaxMultiplier
	bind:sourceDelaySeconds
	bind:submissionSourceDelaySeconds
	bind:enableLargeSourceDownloadLimit
	bind:largeSourceDownloadThreshold
	bind:largeSourceDownloadPageThreshold
	bind:largeSourceMaxVideosPerRound
	bind:largeSourceMaxPagesPerRound
	bind:largeSourceConcurrentVideo
	bind:largeSourceConcurrentPage
	bind:largeSourcePlayurlLimit
	bind:largeSourcePlayurlDurationMs
	bind:audioOnlyUseLowQnForPlayurl
	saving={saving}
	onSave={saveConfig}
/>

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

<NotificationSheet
	store={notification}
	open={openSheet === 'notification'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
/>

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
