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
	import { setBreadcrumb } from '$lib/stores/breadcrumb';
	import type { ConfigResponse } from '$lib/types';
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
		DatabaseIcon
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { runRequest } from '$lib/utils/request.js';
	import { NotificationSettingsStore } from '$lib/stores/settings/notification.svelte';
	import { SettingsNamingStore } from '$lib/stores/settings/naming.svelte';
	import { CredentialSettingsStore } from '$lib/stores/settings/credential.svelte';
	import { CaptchaSettingsStore } from '$lib/stores/settings/captcha.svelte';
	import { AiRenameSettingsStore } from '$lib/stores/settings/ai-rename.svelte';
	import { MainConfigStore } from '$lib/stores/settings/config.svelte';
	import { DatabaseSettingsStore } from '$lib/stores/settings/database.svelte';
	import { IsMobile, IsTablet } from '$lib/hooks/is-mobile.svelte.js';
	import Loading from '$lib/components/ui/Loading.svelte';

	let config: ConfigResponse | null = null;
	let loading = false;

	// 各设置域的状态容器（runes class，见 $lib/stores/settings）
	const notification = new NotificationSettingsStore();
	const naming = new SettingsNamingStore();
	const credential = new CredentialSettingsStore({
		reloadConfig: loadConfig,
		closeSheet: () => (openSheet = null)
	});
	const captcha = new CaptchaSettingsStore({
		reloadConfig: loadConfig,
		closeSheet: () => (openSheet = null)
	});

	const aiRename = new AiRenameSettingsStore({
		reloadConfig: loadConfig,
		closeSheet: () => (openSheet = null)
	});

	const mainConfig = new MainConfigStore({
		closeSheet: () => (openSheet = null),
		naming,
		captcha
	});

	const database = new DatabaseSettingsStore();

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

	// AI重命名配置

	// 数据库管理

	// 视频质量选项

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

	onMount(async () => {
		setBreadcrumb([
			{ label: '主页', href: '/' },
			{ label: '设置', isActive: true }
		]);

		await loadConfig();
		// 检查当前用户信息
		await credential.checkCurrentUser();
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

		mainConfig.applyFromConfig(config);
		naming.applyFromConfig(config);
		credential.applyFromConfig(config);
		captcha.applyFromConfig(config);
		aiRename.applyFromConfig(config);
	}

	// 命名模板变化时按需刷新预览（签名比较在 store 内完成）
	$: naming.refreshOnChange(naming.signature, openSheet === 'naming');

	$: if (openSheet === 'database') {
		database.loadAll();
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
							class="hover:border-primary/50 cursor-pointer gap-0 py-4 transition-all hover:shadow-md {isMobile
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
	saving={mainConfig.saving}
	onSave={() => mainConfig.save()}
/>

<QualitySheet
	open={openSheet === 'quality'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	store={mainConfig}
/>

<DownloadSheet
	open={openSheet === 'download'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	store={mainConfig}
/>

<DanmakuSheet
	open={openSheet === 'danmaku'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	store={mainConfig}
/>

<CredentialSheet
	open={openSheet === 'credential'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	store={credential}
	{getProxiedImageUrl}
/>

<RiskSheet
	open={openSheet === 'risk'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	store={mainConfig}
/>

<Aria2Sheet
	open={openSheet === 'aria2'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	store={mainConfig}
/>

<SystemSheet
	open={openSheet === 'system'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	store={mainConfig}
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
	store={captcha}
/>

<AiRenameSheet
	open={openSheet === 'ai_rename'}
	onOpenChange={(open) => {
		if (!open) openSheet = null;
	}}
	{isMobile}
	store={aiRename}
/>

<DatabaseSheet
	open={openSheet === 'database'}
	onOpenChange={(next) => {
		if (!next) openSheet = null;
	}}
	{isMobile}
	store={database}
/>
